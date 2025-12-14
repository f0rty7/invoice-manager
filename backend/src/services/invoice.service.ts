import { database } from '../db/connection';
import type { Invoice, InvoiceFilters, InvoiceStats, PaginatedResponse, FlatItem, FilterOptionsResponse } from '@pdf-invoice/shared';
import { ObjectId } from 'mongodb';

// Cache entry interface for stats
interface StatsCacheEntry {
  data: InvoiceStats;
  timestamp: number;
}

export class InvoiceService {
  // In-memory cache for stats with TTL
  private statsCache: Map<string, StatsCacheEntry> = new Map();
  private readonly STATS_CACHE_TTL = 60000; // 60 seconds

  // Parse DD-MM-YYYY (e.g. "14-12-2025") into a real Date (UTC midnight).
  // Returns null for empty/invalid inputs.
  private parseDDMMYYYY(dateStr: string | null | undefined): Date | null {
    if (!dateStr) return null;
    const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(dateStr.trim());
    if (!m) return null;
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yyyy = Number(m[3]);
    if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) return null;
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    // Construct UTC date to avoid local TZ shifts.
    const d = new Date(Date.UTC(yyyy, mm - 1, dd));
    // Validate round-trip (catches invalid dates like 31-02-2025).
    if (d.getUTCFullYear() !== yyyy || d.getUTCMonth() !== mm - 1 || d.getUTCDate() !== dd) return null;
    return d;
  }

  // Helper to escape special regex characters
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Helper to compute spending pattern thresholds for individual items
  private async getItemSpendingPatternThreshold(
    baseQuery: any, 
    pattern: 'above_avg' | 'below_avg' | 'top_10_pct' | 'bottom_10_pct'
  ): Promise<{ field: string; operator: string; value: number } | null> {
    // Build pipeline to get item prices
    const basePipeline = [
      { $match: baseQuery },
      { $unwind: '$items' },
      { $project: { price: '$items.price' } }
    ];

    if (pattern === 'above_avg' || pattern === 'below_avg') {
      // Calculate average item price
      const avgResult = await database.invoices.aggregate([
        ...basePipeline,
        { $group: { _id: null, avg: { $avg: '$price' } } }
      ]).toArray();
      
      const avg = avgResult[0]?.avg || 0;
      return {
        field: 'price',
        operator: pattern === 'above_avg' ? '$gt' : '$lt',
        value: avg
      };
    }

    if (pattern === 'top_10_pct' || pattern === 'bottom_10_pct') {
      // Get count of items
      const countResult = await database.invoices.aggregate([
        ...basePipeline,
        { $count: 'total' }
      ]).toArray();
      
      const total = countResult[0]?.total || 0;
      if (total === 0) return null;

      const percentileIndex = Math.floor(total * 0.1);
      const sortDir = pattern === 'top_10_pct' ? -1 : 1;

      // Get the threshold value at the percentile
      const thresholdResult = await database.invoices.aggregate([
        ...basePipeline,
        { $sort: { price: sortDir } },
        { $skip: percentileIndex },
        { $limit: 1 }
      ]).toArray();

      const threshold = thresholdResult[0]?.price;
      if (threshold === undefined) return null;

      return {
        field: 'price',
        operator: pattern === 'top_10_pct' ? '$gte' : '$lte',
        value: threshold
      };
    }

    return null;
  }

  // Helper to compute spending pattern thresholds
  private async getSpendingPatternMatch(
    baseQuery: any, 
    pattern: 'above_avg' | 'below_avg' | 'top_10_pct' | 'bottom_10_pct'
  ): Promise<any | null> {
    if (pattern === 'above_avg' || pattern === 'below_avg') {
      // Calculate average
      const avgResult = await database.invoices.aggregate([
        { $match: baseQuery },
        { $group: { _id: null, avg: { $avg: '$items_total' } } }
      ]).toArray();
      
      const avg = avgResult[0]?.avg || 0;
      return pattern === 'above_avg' 
        ? { items_total: { $gt: avg } }
        : { items_total: { $lt: avg } };
    }

    if (pattern === 'top_10_pct' || pattern === 'bottom_10_pct') {
      // Get count and calculate percentile threshold
      const countResult = await database.invoices.aggregate([
        { $match: baseQuery },
        { $count: 'total' }
      ]).toArray();
      
      const total = countResult[0]?.total || 0;
      if (total === 0) return null;

      const percentileIndex = Math.floor(total * 0.1);
      const sortDir = pattern === 'top_10_pct' ? -1 : 1;

      // Get the threshold value at the percentile
      const thresholdResult = await database.invoices.aggregate([
        { $match: baseQuery },
        { $sort: { items_total: sortDir } },
        { $skip: percentileIndex },
        { $limit: 1 },
        { $project: { items_total: 1 } }
      ]).toArray();

      const threshold = thresholdResult[0]?.items_total;
      if (threshold === undefined) return null;

      return pattern === 'top_10_pct'
        ? { items_total: { $gte: threshold } }
        : { items_total: { $lte: threshold } };
    }

    return null;
  }

  // Helper to clear stats cache
  private clearStatsCache(): void {
    this.statsCache.clear();
  }

  // Helper to get cache key for stats
  private getStatsCacheKey(userId: string, isAdmin: boolean): string {
    return `${userId}_${isAdmin ? 'admin' : 'user'}`;
  }

  async checkExists(order_no: string, invoice_no: string | null): Promise<boolean> {
    const existing = await database.invoices.findOne(
      { order_no, invoice_no }, 
      { projection: { _id: 1 } }
    );
    return !!existing;
  }

  async bulkInsert(invoices: Invoice[], userId: string, username: string): Promise<number> {
    if (!invoices.length) return 0;

    const now = new Date();
    
    // Build lookup queries using compound key (order_no + invoice_no)
    const lookupQueries = invoices.map(inv => ({
      order_no: inv.order_no,
      invoice_no: inv.invoice_no
    }));
    
    const existingInvoices = await database.invoices
      .find({ $or: lookupQueries })
      .toArray();
    
    // Create a map using composite key for quick lookup
    const existingMap = new Map(
      existingInvoices.map(inv => [`${inv.order_no}|${inv.invoice_no}`, inv])
    );
    
    // Build bulk write operations
    const operations: any[] = [];
    let affected = 0;

    for (const invoice of invoices) {
      const compositeKey = `${invoice.order_no}|${invoice.invoice_no}`;
      const existing = existingMap.get(compositeKey);

      const date_obj = this.parseDDMMYYYY(invoice.date ?? null);
      const items_count = (invoice.items?.length ?? 0);

      if (existing) {
        // Check if this is a duplicate with same totals
        const sameTotals =
          existing.items_total === invoice.items_total &&
          (existing.items?.length ?? 0) === (invoice.items?.length ?? 0);

        if (sameTotals) {
          // Duplicate with same totals and item count; skip
          continue;
        }

        // Update operation for changed invoice
        operations.push({
          updateOne: {
            filter: { order_no: invoice.order_no, invoice_no: invoice.invoice_no },
            update: {
              $set: {
                ...invoice,
                user_id: userId,
                username,
                items: invoice.items,
                items_total: invoice.items_total,
                date_obj,
                items_count,
                updated_at: now
              },
              $setOnInsert: {
                created_at: existing.created_at ?? (existing as any).date ?? now
              }
            }
          }
        });
        affected += 1;
      } else {
        // Insert operation for new invoice
        operations.push({
          updateOne: {
            filter: { order_no: invoice.order_no, invoice_no: invoice.invoice_no },
            update: {
              $setOnInsert: {
                ...invoice,
                user_id: userId,
                username,
                date_obj,
                items_count,
                created_at: now,
                updated_at: now
              }
            },
            upsert: true
          }
        });
        affected += 1;
      }
    }

    // Execute bulk write if we have operations
    if (operations.length === 0) {
      return 0;
    }

    // Use bulkWrite with ordered: false to continue on errors and handle duplicates gracefully
    try {
      await database.invoices.bulkWrite(operations, { ordered: false });
    } catch (error: any) {
      // Handle duplicate key errors gracefully
      if (error.code === 11000) {
        console.warn('Duplicate key error during bulk insert, some invoices may already exist');
      } else {
        throw error;
      }
    }

    // Clear stats cache since data has changed
    this.clearStatsCache();

    return affected;
  }

  async getInvoices(filters: InvoiceFilters, userId: string, isAdmin: boolean): Promise<PaginatedResponse<Invoice>> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};
    
    // Users can only see their own invoices unless admin
    if (!isAdmin) {
      query.user_id = userId;
    } else if (filters.user_id) {
      query.user_id = filters.user_id;
    } else if (filters.username) {
      query.username = filters.username;
    }

    // Date range filter (prefer date_obj for correctness)
    const dateFromObj = this.parseDDMMYYYY(filters.date_from ?? null);
    const dateToObj = this.parseDDMMYYYY(filters.date_to ?? null);
    if (dateFromObj || dateToObj) {
      query.date_obj = {};
      if (dateFromObj) query.date_obj.$gte = dateFromObj;
      if (dateToObj) query.date_obj.$lte = dateToObj;
    }

    // Category filter - supports both single and multi-select
    if (filters.categories?.length) {
      query['items.category'] = { $in: filters.categories };
    } else if (filters.category) {
      query['items.category'] = filters.category;
    }

    // Price range filter
    if (filters.price_min !== undefined || filters.price_max !== undefined) {
      query.items_total = {};
      if (filters.price_min !== undefined) {
        query.items_total.$gte = filters.price_min;
      }
      if (filters.price_max !== undefined) {
        query.items_total.$lte = filters.price_max;
      }
    }

    // Delivery partner filter
    if (filters.delivery_partner) {
      query['delivery_partner.known_name'] = filters.delivery_partner;
    }
    // Multi-select delivery partners (inclusion)
    if (filters.delivery_partners?.length) {
      query['delivery_partner.known_name'] = {
        ...(query['delivery_partner.known_name'] ?? {}),
        $in: filters.delivery_partners
      };
    }

    // Direct order_no filter
    if (filters.order_no) {
      query.order_no = { $regex: this.escapeRegex(filters.order_no), $options: 'i' };
    }

    // Direct invoice_no filter
    if (filters.invoice_no) {
      query.invoice_no = { $regex: this.escapeRegex(filters.invoice_no), $options: 'i' };
    }

    // Combined text search
    if (filters.search) {
      const searchRegex = new RegExp(this.escapeRegex(filters.search), 'i');
      query.$or = [
        { order_no: searchRegex },
        { invoice_no: searchRegex },
        { 'items.description': searchRegex },
        { 'delivery_partner.known_name': searchRegex }
      ];
    }

    // Item-level search
    if (filters.item_search) {
      query['items.description'] = { $regex: this.escapeRegex(filters.item_search), $options: 'i' };
    }

    // Item-level filtering with $elemMatch
    const itemMatch: any = {};
    if (filters.item_qty_min !== undefined) {
      itemMatch.qty = { ...itemMatch.qty, $gte: filters.item_qty_min };
    }
    if (filters.item_qty_max !== undefined) {
      itemMatch.qty = { ...itemMatch.qty, $lte: filters.item_qty_max };
    }
    if (filters.item_unit_price_min !== undefined) {
      itemMatch.unit_price = { ...itemMatch.unit_price, $gte: filters.item_unit_price_min };
    }
    if (filters.item_unit_price_max !== undefined) {
      itemMatch.unit_price = { ...itemMatch.unit_price, $lte: filters.item_unit_price_max };
    }
    if (Object.keys(itemMatch).length > 0) {
      query.items = { $elemMatch: itemMatch };
    }

    // Exclusion filters (Phase 3)
    if (filters.exclude_categories?.length) {
      if (query['items.category']) {
        // Combine with existing category filter
        query['items.category'] = { ...query['items.category'], $nin: filters.exclude_categories };
      } else {
        query['items.category'] = { $nin: filters.exclude_categories };
      }
    }

    if (filters.exclude_delivery_partners?.length) {
      query['delivery_partner.known_name'] = {
        ...(query['delivery_partner.known_name'] ?? {}),
        $nin: filters.exclude_delivery_partners
      };
    }

    const hasExplicitSort = !!filters.sort_by && !!filters.sort_dir;

    // Determine sort field and direction (use date_obj; do not default silently to date)
    const sortField = !hasExplicitSort
      ? 'created_at'
      : (filters.sort_by === 'total' ? 'items_total' :
        filters.sort_by === 'items_count' ? 'items_count' :
        filters.sort_by === 'delivery_partner' ? 'delivery_partner.known_name' :
        filters.sort_by === 'date' ? 'date_obj' :
        'created_at');
    const sortDir = !hasExplicitSort ? -1 : (filters.sort_dir === 'asc' ? 1 : -1);

    // Use aggregation with $facet to get data and count in a single query
    const pipeline: any[] = [
      { $match: query },
    ];

    // Temporary fallback for older docs (or before backfill): if date range or date sort requested,
    // parse the string `date` and coalesce into date_obj.
    const needsDateFallback = (!!dateFromObj || !!dateToObj) || (hasExplicitSort && filters.sort_by === 'date');
    if (needsDateFallback) {
      pipeline.push({
        $addFields: {
          _parsed_date: {
            $dateFromString: {
              dateString: '$date',
              format: '%d-%m-%Y',
              onError: null,
              onNull: null
            }
          },
          date_obj: { $ifNull: ['$date_obj', '$_parsed_date'] }
        }
      });
    }

    // Add items_count field for filtering or sorting
    const needsItemsCount = filters.sort_by === 'items_count' || 
                            filters.items_count_min !== undefined || 
                            filters.items_count_max !== undefined;
    
    if (needsItemsCount) {
      pipeline.push({
        $addFields: { items_count: { $size: '$items' } }
      });
      
      // Add items_count filtering if needed
      const itemsCountMatch: any = {};
      if (filters.items_count_min !== undefined) {
        itemsCountMatch.items_count = { ...itemsCountMatch.items_count, $gte: filters.items_count_min };
      }
      if (filters.items_count_max !== undefined) {
        itemsCountMatch.items_count = { ...itemsCountMatch.items_count, $lte: filters.items_count_max };
      }
      if (Object.keys(itemsCountMatch).length > 0) {
        pipeline.push({ $match: itemsCountMatch });
      }
    }

    // Time-based filters (Phase 3) - parse DD-MM-YYYY date format
    const needsDateParsing = filters.day_of_week?.length || 
                             filters.month !== undefined || 
                             filters.year !== undefined || 
                             filters.is_weekend !== undefined;

    if (needsDateParsing) {
      // Add parsed date field
      pipeline.push({
        $addFields: {
          _parsed_date: {
            $dateFromString: {
              dateString: '$date',
              format: '%d-%m-%Y',
              onError: null,
              onNull: null
            }
          }
        }
      });

      const dateMatch: any = {};

      // Day of week filter (1=Sunday, 2=Monday, ..., 7=Saturday in MongoDB)
      if (filters.day_of_week?.length) {
        // Convert from JS format (0=Sun) to MongoDB format (1=Sun)
        const mongoDays = filters.day_of_week.map(d => d + 1);
        dateMatch.$expr = { 
          ...dateMatch.$expr,
          $in: [{ $dayOfWeek: '$_parsed_date' }, mongoDays] 
        };
      }

      // Month filter (1-12)
      if (filters.month !== undefined) {
        pipeline.push({
          $match: {
            $expr: { $eq: [{ $month: '$_parsed_date' }, filters.month] }
          }
        });
      }

      // Year filter
      if (filters.year !== undefined) {
        pipeline.push({
          $match: {
            $expr: { $eq: [{ $year: '$_parsed_date' }, filters.year] }
          }
        });
      }

      // Weekend filter (Saturday=7, Sunday=1 in MongoDB)
      if (filters.is_weekend !== undefined) {
        const weekendDays = [1, 7]; // Sunday and Saturday in MongoDB
        const weekdayDays = [2, 3, 4, 5, 6]; // Monday to Friday
        pipeline.push({
          $match: {
            $expr: { 
              $in: [
                { $dayOfWeek: '$_parsed_date' }, 
                filters.is_weekend ? weekendDays : weekdayDays
              ] 
            }
          }
        });
      }

      // Day of week filter
      if (filters.day_of_week?.length) {
        const mongoDays = filters.day_of_week.map(d => d + 1);
        pipeline.push({
          $match: {
            $expr: { $in: [{ $dayOfWeek: '$_parsed_date' }, mongoDays] }
          }
        });
      }
    }

    // Spending pattern filters (Phase 3) - two-pass query
    if (filters.spending_pattern) {
      const spendingMatch = await this.getSpendingPatternMatch(query, filters.spending_pattern);
      if (spendingMatch) {
        pipeline.push({ $match: spendingMatch });
      }
    }

    const stableTieBreak = !hasExplicitSort
      ? { _id: -1 }
      : { created_at: -1, _id: -1 };

    pipeline.push(
      { $sort: { [sortField]: sortDir, ...stableTieBreak } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit }
          ],
          total: [
            { $count: 'count' }
          ]
        }
      }
    );

    const result = await database.invoices.aggregate(pipeline).toArray();
    const aggregateData = result[0];
    
    const data = aggregateData.data;
    const total = aggregateData.total[0]?.count || 0;

    return {
      data,
      total,
      page,
      limit,
      has_more: skip + data.length < total
    };
  }

  async aggregateInvoices(
    filters: InvoiceFilters,
    userId: string,
    isAdmin: boolean
  ): Promise<{ total_amount: number; total_count: number }> {
    // Build query (same as getInvoices, but no pagination/sort needed for totals)
    const query: any = {};

    if (!isAdmin) {
      query.user_id = userId;
    } else if (filters.user_id) {
      query.user_id = filters.user_id;
    } else if (filters.username) {
      query.username = filters.username;
    }

    const dateFromObj = this.parseDDMMYYYY(filters.date_from ?? null);
    const dateToObj = this.parseDDMMYYYY(filters.date_to ?? null);
    if (dateFromObj || dateToObj) {
      query.date_obj = {};
      if (dateFromObj) query.date_obj.$gte = dateFromObj;
      if (dateToObj) query.date_obj.$lte = dateToObj;
    }

    if (filters.categories?.length) {
      query['items.category'] = { $in: filters.categories };
    } else if (filters.category) {
      query['items.category'] = filters.category;
    }

    if (filters.price_min !== undefined || filters.price_max !== undefined) {
      query.items_total = {};
      if (filters.price_min !== undefined) query.items_total.$gte = filters.price_min;
      if (filters.price_max !== undefined) query.items_total.$lte = filters.price_max;
    }

    if (filters.delivery_partner) {
      query['delivery_partner.known_name'] = filters.delivery_partner;
    }
    if (filters.delivery_partners?.length) {
      query['delivery_partner.known_name'] = {
        ...(query['delivery_partner.known_name'] ?? {}),
        $in: filters.delivery_partners
      };
    }

    if (filters.order_no) {
      query.order_no = { $regex: this.escapeRegex(filters.order_no), $options: 'i' };
    }

    if (filters.invoice_no) {
      query.invoice_no = { $regex: this.escapeRegex(filters.invoice_no), $options: 'i' };
    }

    if (filters.search) {
      const searchRegex = new RegExp(this.escapeRegex(filters.search), 'i');
      query.$or = [
        { order_no: searchRegex },
        { invoice_no: searchRegex },
        { 'items.description': searchRegex },
        { 'delivery_partner.known_name': searchRegex }
      ];
    }

    if (filters.item_search) {
      query['items.description'] = { $regex: this.escapeRegex(filters.item_search), $options: 'i' };
    }

    const itemMatch: any = {};
    if (filters.item_qty_min !== undefined) {
      itemMatch.qty = { ...itemMatch.qty, $gte: filters.item_qty_min };
    }
    if (filters.item_qty_max !== undefined) {
      itemMatch.qty = { ...itemMatch.qty, $lte: filters.item_qty_max };
    }
    if (filters.item_unit_price_min !== undefined) {
      itemMatch.unit_price = { ...itemMatch.unit_price, $gte: filters.item_unit_price_min };
    }
    if (filters.item_unit_price_max !== undefined) {
      itemMatch.unit_price = { ...itemMatch.unit_price, $lte: filters.item_unit_price_max };
    }
    if (Object.keys(itemMatch).length > 0) {
      query.items = { $elemMatch: itemMatch };
    }

    if (filters.exclude_categories?.length) {
      if (query['items.category']) {
        query['items.category'] = { ...query['items.category'], $nin: filters.exclude_categories };
      } else {
        query['items.category'] = { $nin: filters.exclude_categories };
      }
    }

    if (filters.exclude_delivery_partners?.length) {
      query['delivery_partner.known_name'] = {
        ...(query['delivery_partner.known_name'] ?? {}),
        $nin: filters.exclude_delivery_partners
      };
    }

    const pipeline: any[] = [{ $match: query }];

    const needsDateFallback = !!dateFromObj || !!dateToObj;
    if (needsDateFallback) {
      pipeline.push({
        $addFields: {
          _parsed_date: {
            $dateFromString: {
              dateString: '$date',
              format: '%d-%m-%Y',
              onError: null,
              onNull: null
            }
          },
          date_obj: { $ifNull: ['$date_obj', '$_parsed_date'] }
        }
      });
    }

    const needsItemsCount =
      filters.items_count_min !== undefined ||
      filters.items_count_max !== undefined;
    if (needsItemsCount) {
      pipeline.push({ $addFields: { items_count: { $size: '$items' } } });
      const itemsCountMatch: any = {};
      if (filters.items_count_min !== undefined) {
        itemsCountMatch.items_count = { ...itemsCountMatch.items_count, $gte: filters.items_count_min };
      }
      if (filters.items_count_max !== undefined) {
        itemsCountMatch.items_count = { ...itemsCountMatch.items_count, $lte: filters.items_count_max };
      }
      pipeline.push({ $match: itemsCountMatch });
    }

    const needsDateParsing =
      filters.day_of_week?.length ||
      filters.month !== undefined ||
      filters.year !== undefined ||
      filters.is_weekend !== undefined;
    if (needsDateParsing) {
      pipeline.push({
        $addFields: {
          _parsed_date: {
            $dateFromString: {
              dateString: '$date',
              format: '%d-%m-%Y',
              onError: null,
              onNull: null
            }
          }
        }
      });

      if (filters.month !== undefined) {
        pipeline.push({ $match: { $expr: { $eq: [{ $month: '$_parsed_date' }, filters.month] } } });
      }
      if (filters.year !== undefined) {
        pipeline.push({ $match: { $expr: { $eq: [{ $year: '$_parsed_date' }, filters.year] } } });
      }
      if (filters.is_weekend !== undefined) {
        const weekendDays = [1, 7];
        const weekdayDays = [2, 3, 4, 5, 6];
        pipeline.push({
          $match: {
            $expr: {
              $in: [
                { $dayOfWeek: '$_parsed_date' },
                filters.is_weekend ? weekendDays : weekdayDays
              ]
            }
          }
        });
      }
      if (filters.day_of_week?.length) {
        const mongoDays = filters.day_of_week.map(d => d + 1);
        pipeline.push({ $match: { $expr: { $in: [{ $dayOfWeek: '$_parsed_date' }, mongoDays] } } });
      }
    }

    if (filters.spending_pattern) {
      const spendingMatch = await this.getSpendingPatternMatch(query, filters.spending_pattern);
      if (spendingMatch) pipeline.push({ $match: spendingMatch });
    }

    pipeline.push({
      $group: {
        _id: null,
        total_amount: { $sum: { $ifNull: ['$items_total', 0] } },
        total_count: { $sum: 1 }
      }
    });

    const res = await database.invoices.aggregate(pipeline).toArray();
    const row = res[0] || { total_amount: 0, total_count: 0 };
    return { total_amount: row.total_amount || 0, total_count: row.total_count || 0 };
  }

  async getInvoiceById(id: string, userId: string, isAdmin: boolean): Promise<Invoice | null> {
    const query: any = { _id: new ObjectId(id) };
    
    if (!isAdmin) {
      query.user_id = userId;
    }

    return database.invoices.findOne(query);
  }

  async deleteInvoice(id: string, userId: string, isAdmin: boolean): Promise<boolean> {
    const query: any = { _id: new ObjectId(id) };
    
    if (!isAdmin) {
      query.user_id = userId;
    }

    const result = await database.invoices.deleteOne(query);
    
    // Clear stats cache since data has changed
    if (result.deletedCount > 0) {
      this.clearStatsCache();
    }
    
    return result.deletedCount > 0;
  }

  async getStats(userId: string, isAdmin: boolean): Promise<InvoiceStats> {
    // Check cache first
    const cacheKey = this.getStatsCacheKey(userId, isAdmin);
    const cached = this.statsCache.get(cacheKey);
    
    if (cached) {
      const now = Date.now();
      // Return cached data if not expired
      if (now - cached.timestamp < this.STATS_CACHE_TTL) {
        return cached.data;
      } else {
        // Remove expired cache entry
        this.statsCache.delete(cacheKey);
      }
    }

    // No valid cache, fetch from database
    const match: any = isAdmin ? {} : { user_id: userId };

    const pipeline = [
      { $match: match },
      {
        $facet: {
          total: [
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                total: { $sum: '$items_total' }
              }
            }
          ],
          by_category: [
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.category',
                count: { $sum: 1 },
                total: { $sum: '$items.price' }
              }
            }
          ],
          by_month: [
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m', date: { $toDate: '$date' } }
                },
                count: { $sum: 1 },
                total: { $sum: '$items_total' }
              }
            }
          ]
        }
      }
    ];

    const result = await database.invoices.aggregate(pipeline).toArray();
    const data = result[0];

    const totalStats = data.total[0] || { count: 0, total: 0 };
    const by_category: Record<string, { count: number; total: number }> = {};
    const by_month: Record<string, { count: number; total: number }> = {};

    for (const cat of data.by_category) {
      by_category[cat._id] = { count: cat.count, total: cat.total };
    }

    for (const month of data.by_month) {
      by_month[month._id] = { count: month.count, total: month.total };
    }

    const stats: InvoiceStats = {
      total_invoices: totalStats.count,
      total_amount: totalStats.total,
      by_category,
      by_month
    };

    // Cache the result
    this.statsCache.set(cacheKey, {
      data: stats,
      timestamp: Date.now()
    });

    return stats;
  }

  async getUniqueCategories(userId: string, isAdmin: boolean): Promise<string[]> {
    const match: any = isAdmin ? {} : { user_id: userId };

    // Use distinct() to leverage the multikey index on items.category
    const categories = await database.invoices.distinct('items.category', match);
    
    // Filter out empty/null categories and sort in memory
    return categories.filter(Boolean).sort();
  }

  async getUniqueDeliveryPartners(userId: string, isAdmin: boolean): Promise<string[]> {
    const match: any = isAdmin ? {} : { user_id: userId };

    // Use distinct() to get unique delivery partner known_names
    const partners = await database.invoices.distinct('delivery_partner.known_name', match);
    
    // Filter out empty/null partners and sort in memory
    return partners.filter(Boolean).sort();
  }

  async getFilterOptions(userId: string, isAdmin: boolean): Promise<FilterOptionsResponse> {
    const match: any = isAdmin ? {} : { user_id: userId };

    const [partners, categories] = await Promise.all([
      database.invoices.aggregate([
        { $match: match },
        { $group: { _id: '$delivery_partner.known_name', count: { $sum: 1 } } },
        { $match: { _id: { $ne: null } } },
        { $sort: { count: -1, _id: 1 } },
        { $project: { _id: 0, value: '$_id', count: 1 } }
      ]).toArray(),
      database.invoices.aggregate([
        { $match: match },
        { $unwind: '$items' },
        { $group: { _id: '$items.category', count: { $sum: 1 } } },
        { $match: { _id: { $ne: null } } },
        { $sort: { count: -1, _id: 1 } },
        { $project: { _id: 0, value: '$_id', count: 1 } }
      ]).toArray()
    ]);

    return {
      partners: partners as any,
      categories: categories as any
    };
  }

  async getItems(filters: InvoiceFilters, userId: string, isAdmin: boolean): Promise<PaginatedResponse<FlatItem>> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    // Build base query for invoices
    const query: any = {};
    
    // Users can only see their own invoices unless admin
    if (!isAdmin) {
      query.user_id = userId;
    } else if (filters.user_id) {
      query.user_id = filters.user_id;
    } else if (filters.username) {
      query.username = filters.username;
    }

    // Date range filter (prefer date_obj for correctness)
    const dateFromObj = this.parseDDMMYYYY(filters.date_from ?? null);
    const dateToObj = this.parseDDMMYYYY(filters.date_to ?? null);
    if (dateFromObj || dateToObj) {
      query.date_obj = {};
      if (dateFromObj) query.date_obj.$gte = dateFromObj;
      if (dateToObj) query.date_obj.$lte = dateToObj;
    }

    // Category filter - supports both single and multi-select
    if (filters.categories?.length) {
      query['items.category'] = { $in: filters.categories };
    } else if (filters.category) {
      query['items.category'] = filters.category;
    }

    // Delivery partner filter
    if (filters.delivery_partner) {
      query['delivery_partner.known_name'] = filters.delivery_partner;
    }
    // Multi-select delivery partners (inclusion)
    if (filters.delivery_partners?.length) {
      query['delivery_partner.known_name'] = {
        ...(query['delivery_partner.known_name'] ?? {}),
        $in: filters.delivery_partners
      };
    }

    // Direct order_no filter
    if (filters.order_no) {
      query.order_no = { $regex: this.escapeRegex(filters.order_no), $options: 'i' };
    }

    // Direct invoice_no filter
    if (filters.invoice_no) {
      query.invoice_no = { $regex: this.escapeRegex(filters.invoice_no), $options: 'i' };
    }

    // Combined text search
    if (filters.search) {
      const searchRegex = new RegExp(this.escapeRegex(filters.search), 'i');
      query.$or = [
        { order_no: searchRegex },
        { invoice_no: searchRegex },
        { 'items.description': searchRegex },
        { 'delivery_partner.known_name': searchRegex }
      ];
    }

    // Item-level search
    if (filters.item_search) {
      query['items.description'] = { $regex: this.escapeRegex(filters.item_search), $options: 'i' };
    }

    // Exclusion filters
    if (filters.exclude_categories?.length) {
      if (query['items.category']) {
        query['items.category'] = { ...query['items.category'], $nin: filters.exclude_categories };
      } else {
        query['items.category'] = { $nin: filters.exclude_categories };
      }
    }

    if (filters.exclude_delivery_partners?.length) {
      query['delivery_partner.known_name'] = {
        ...(query['delivery_partner.known_name'] ?? {}),
        $nin: filters.exclude_delivery_partners
      };
    }

    const hasExplicitSort = !!filters.sort_by && !!filters.sort_dir;

    // Determine sort field and direction for items (server-side, stable default when none selected)
    const sortField = !hasExplicitSort
      ? 'invoice_id'
      : (filters.sort_by === 'date' ? '_invoice_date' :
        filters.sort_by === 'total' ? 'price' :
        filters.sort_by === 'price' ? 'price' :
        filters.sort_by === 'qty' ? 'qty' :
        filters.sort_by === 'category' ? 'category' :
        filters.sort_by === 'delivery_partner' ? 'delivery_partner' :
        'invoice_id');
    const sortDir = !hasExplicitSort ? -1 : (filters.sort_dir === 'asc' ? 1 : -1);

    // Build aggregation pipeline with $unwind
    const pipeline: any[] = [
      { $match: query },
      { $unwind: '$items' },
      {
        $project: {
          _id: 0,
          sr: '$items.sr',
          description: '$items.description',
          qty: '$items.qty',
          unit_price: '$items.unit_price',
          price: '$items.price',
          category: '$items.category',
          invoice_id: { $toString: '$_id' },
          invoice_no: 1,
          order_no: 1,
          date: 1,
          delivery_partner: '$delivery_partner.known_name'
        }
      }
    ];

    // Temporary fallback: parse `date` string into a real date for correct date sorting.
    // Also coalesce in case the invoice doc already has date_obj.
    const needsDateSort = hasExplicitSort && filters.sort_by === 'date';
    if (needsDateSort) {
      pipeline.push({
        $addFields: {
          _invoice_date: {
            $ifNull: [
              '$date_obj',
              {
                $dateFromString: {
                  dateString: '$date',
                  format: '%d-%m-%Y',
                  onError: null,
                  onNull: null
                }
              }
            ]
          }
        }
      });
    }

    // Add item-level filters after $unwind
    const itemFilters: any = {};
    
    if (filters.item_qty_min !== undefined) {
      itemFilters.qty = { ...itemFilters.qty, $gte: filters.item_qty_min };
    }
    if (filters.item_qty_max !== undefined) {
      itemFilters.qty = { ...itemFilters.qty, $lte: filters.item_qty_max };
    }
    if (filters.item_unit_price_min !== undefined) {
      itemFilters.unit_price = { ...itemFilters.unit_price, $gte: filters.item_unit_price_min };
    }
    if (filters.item_unit_price_max !== undefined) {
      itemFilters.unit_price = { ...itemFilters.unit_price, $lte: filters.item_unit_price_max };
    }
    if (filters.price_min !== undefined) {
      itemFilters.price = { ...itemFilters.price, $gte: filters.price_min };
    }
    if (filters.price_max !== undefined) {
      itemFilters.price = { ...itemFilters.price, $lte: filters.price_max };
    }

    // Apply category filter at item level after unwind
    if (filters.categories?.length) {
      itemFilters.category = { $in: filters.categories };
    } else if (filters.category) {
      itemFilters.category = filters.category;
    }
    if (filters.exclude_categories?.length) {
      itemFilters.category = { ...itemFilters.category, $nin: filters.exclude_categories };
    }

    if (Object.keys(itemFilters).length > 0) {
      pipeline.push({ $match: itemFilters });
    }

    // Time-based filters - parse DD-MM-YYYY date format
    const needsDateParsing = filters.day_of_week?.length || 
                             filters.month !== undefined || 
                             filters.year !== undefined || 
                             filters.is_weekend !== undefined;

    if (needsDateParsing) {
      // Add parsed date field
      pipeline.push({
        $addFields: {
          _parsed_date: {
            $dateFromString: {
              dateString: '$date',
              format: '%d-%m-%Y',
              onError: null,
              onNull: null
            }
          }
        }
      });

      // Month filter (1-12)
      if (filters.month !== undefined) {
        pipeline.push({
          $match: {
            $expr: { $eq: [{ $month: '$_parsed_date' }, filters.month] }
          }
        });
      }

      // Year filter
      if (filters.year !== undefined) {
        pipeline.push({
          $match: {
            $expr: { $eq: [{ $year: '$_parsed_date' }, filters.year] }
          }
        });
      }

      // Weekend filter (Saturday=7, Sunday=1 in MongoDB)
      if (filters.is_weekend !== undefined) {
        const weekendDays = [1, 7]; // Sunday and Saturday in MongoDB
        const weekdayDays = [2, 3, 4, 5, 6]; // Monday to Friday
        pipeline.push({
          $match: {
            $expr: { 
              $in: [
                { $dayOfWeek: '$_parsed_date' }, 
                filters.is_weekend ? weekendDays : weekdayDays
              ] 
            }
          }
        });
      }

      // Day of week filter (convert from JS 0=Sun to MongoDB 1=Sun)
      if (filters.day_of_week?.length) {
        const mongoDays = filters.day_of_week.map(d => d + 1);
        pipeline.push({
          $match: {
            $expr: { $in: [{ $dayOfWeek: '$_parsed_date' }, mongoDays] }
          }
        });
      }
    }

    // Spending pattern filter for items (based on individual item prices)
    if (filters.spending_pattern) {
      const threshold = await this.getItemSpendingPatternThreshold(query, filters.spending_pattern);
      if (threshold) {
        pipeline.push({
          $match: {
            [threshold.field]: { [threshold.operator]: threshold.value }
          }
        });
      }
    }

    // Add sort, facet for pagination
    pipeline.push(
      { $sort: { [sortField]: sortDir, invoice_id: -1, sr: 1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit }
          ],
          total: [
            { $count: 'count' }
          ]
        }
      }
    );

    const result = await database.invoices.aggregate(pipeline).toArray();
    const aggregateData = result[0];
    
    const data = aggregateData.data as FlatItem[];
    const total = aggregateData.total[0]?.count || 0;

    return {
      data,
      total,
      page,
      limit,
      has_more: skip + data.length < total
    };
  }

  async aggregateItems(
    filters: InvoiceFilters,
    userId: string,
    isAdmin: boolean
  ): Promise<{ total_price: number; total_count: number }> {
    // Base invoice match (same as getItems)
    const query: any = {};
    if (!isAdmin) {
      query.user_id = userId;
    } else if (filters.user_id) {
      query.user_id = filters.user_id;
    } else if (filters.username) {
      query.username = filters.username;
    }

    const dateFromObj = this.parseDDMMYYYY(filters.date_from ?? null);
    const dateToObj = this.parseDDMMYYYY(filters.date_to ?? null);
    if (dateFromObj || dateToObj) {
      query.date_obj = {};
      if (dateFromObj) query.date_obj.$gte = dateFromObj;
      if (dateToObj) query.date_obj.$lte = dateToObj;
    }

    if (filters.categories?.length) {
      query['items.category'] = { $in: filters.categories };
    } else if (filters.category) {
      query['items.category'] = filters.category;
    }

    if (filters.delivery_partner) {
      query['delivery_partner.known_name'] = filters.delivery_partner;
    }
    if (filters.delivery_partners?.length) {
      query['delivery_partner.known_name'] = {
        ...(query['delivery_partner.known_name'] ?? {}),
        $in: filters.delivery_partners
      };
    }

    if (filters.order_no) {
      query.order_no = { $regex: this.escapeRegex(filters.order_no), $options: 'i' };
    }
    if (filters.invoice_no) {
      query.invoice_no = { $regex: this.escapeRegex(filters.invoice_no), $options: 'i' };
    }

    if (filters.search) {
      const searchRegex = new RegExp(this.escapeRegex(filters.search), 'i');
      query.$or = [
        { order_no: searchRegex },
        { invoice_no: searchRegex },
        { 'items.description': searchRegex },
        { 'delivery_partner.known_name': searchRegex }
      ];
    }

    if (filters.item_search) {
      query['items.description'] = { $regex: this.escapeRegex(filters.item_search), $options: 'i' };
    }

    if (filters.exclude_categories?.length) {
      if (query['items.category']) {
        query['items.category'] = { ...query['items.category'], $nin: filters.exclude_categories };
      } else {
        query['items.category'] = { $nin: filters.exclude_categories };
      }
    }

    if (filters.exclude_delivery_partners?.length) {
      query['delivery_partner.known_name'] = {
        ...(query['delivery_partner.known_name'] ?? {}),
        $nin: filters.exclude_delivery_partners
      };
    }

    const pipeline: any[] = [
      { $match: query },
      { $unwind: '$items' },
      {
        $project: {
          qty: '$items.qty',
          unit_price: '$items.unit_price',
          price: '$items.price',
          category: '$items.category',
          date: 1,
          date_obj: 1,
          delivery_partner: '$delivery_partner.known_name'
        }
      }
    ];

    // Item-level filters after unwind
    const itemFilters: any = {};
    if (filters.item_qty_min !== undefined) {
      itemFilters.qty = { ...itemFilters.qty, $gte: filters.item_qty_min };
    }
    if (filters.item_qty_max !== undefined) {
      itemFilters.qty = { ...itemFilters.qty, $lte: filters.item_qty_max };
    }
    if (filters.item_unit_price_min !== undefined) {
      itemFilters.unit_price = { ...itemFilters.unit_price, $gte: filters.item_unit_price_min };
    }
    if (filters.item_unit_price_max !== undefined) {
      itemFilters.unit_price = { ...itemFilters.unit_price, $lte: filters.item_unit_price_max };
    }
    if (filters.price_min !== undefined) {
      itemFilters.price = { ...itemFilters.price, $gte: filters.price_min };
    }
    if (filters.price_max !== undefined) {
      itemFilters.price = { ...itemFilters.price, $lte: filters.price_max };
    }

    if (filters.categories?.length) {
      itemFilters.category = { $in: filters.categories };
    } else if (filters.category) {
      itemFilters.category = filters.category;
    }
    if (filters.exclude_categories?.length) {
      itemFilters.category = { ...itemFilters.category, $nin: filters.exclude_categories };
    }

    if (Object.keys(itemFilters).length > 0) {
      pipeline.push({ $match: itemFilters });
    }

    const needsDateParsing =
      filters.day_of_week?.length ||
      filters.month !== undefined ||
      filters.year !== undefined ||
      filters.is_weekend !== undefined;
    if (needsDateParsing) {
      pipeline.push({
        $addFields: {
          _parsed_date: {
            $dateFromString: {
              dateString: '$date',
              format: '%d-%m-%Y',
              onError: null,
              onNull: null
            }
          }
        }
      });

      if (filters.month !== undefined) {
        pipeline.push({ $match: { $expr: { $eq: [{ $month: '$_parsed_date' }, filters.month] } } });
      }
      if (filters.year !== undefined) {
        pipeline.push({ $match: { $expr: { $eq: [{ $year: '$_parsed_date' }, filters.year] } } });
      }
      if (filters.is_weekend !== undefined) {
        const weekendDays = [1, 7];
        const weekdayDays = [2, 3, 4, 5, 6];
        pipeline.push({
          $match: {
            $expr: {
              $in: [
                { $dayOfWeek: '$_parsed_date' },
                filters.is_weekend ? weekendDays : weekdayDays
              ]
            }
          }
        });
      }
      if (filters.day_of_week?.length) {
        const mongoDays = filters.day_of_week.map(d => d + 1);
        pipeline.push({ $match: { $expr: { $in: [{ $dayOfWeek: '$_parsed_date' }, mongoDays] } } });
      }
    }

    if (filters.spending_pattern) {
      const threshold = await this.getItemSpendingPatternThreshold(query, filters.spending_pattern);
      if (threshold) {
        pipeline.push({ $match: { [threshold.field]: { [threshold.operator]: threshold.value } } });
      }
    }

    pipeline.push({
      $group: {
        _id: null,
        total_price: { $sum: { $ifNull: ['$price', 0] } },
        total_count: { $sum: 1 }
      }
    });

    const res = await database.invoices.aggregate(pipeline).toArray();
    const row = res[0] || { total_price: 0, total_count: 0 };
    return { total_price: row.total_price || 0, total_count: row.total_count || 0 };
  }
}

export const invoiceService = new InvoiceService();


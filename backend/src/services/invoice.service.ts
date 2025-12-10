import { database } from '../db/connection';
import type { Invoice, InvoiceFilters, InvoiceStats, PaginatedResponse } from '@pdf-invoice/shared';
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

  // Helper to clear stats cache
  private clearStatsCache(): void {
    this.statsCache.clear();
  }

  // Helper to get cache key for stats
  private getStatsCacheKey(userId: string, isAdmin: boolean): string {
    return `${userId}_${isAdmin ? 'admin' : 'user'}`;
  }

  async checkExists(order_no: string): Promise<boolean> {
    const existing = await database.invoices.findOne({ order_no }, { projection: { _id: 1 } });
    return !!existing;
  }

  async bulkInsert(invoices: Invoice[], userId: string, username: string): Promise<number> {
    if (!invoices.length) return 0;

    const now = new Date();
    
    // First, check for existing invoices to determine if we need to update or insert
    const orderNumbers = invoices.map(inv => inv.order_no);
    const existingInvoices = await database.invoices
      .find({ order_no: { $in: orderNumbers } })
      .toArray();
    
    // Create a map of existing invoices for quick lookup
    const existingMap = new Map(existingInvoices.map(inv => [inv.order_no, inv]));
    
    // Build bulk write operations
    const operations: any[] = [];
    let affected = 0;

    for (const invoice of invoices) {
      const existing = existingMap.get(invoice.order_no);

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
            filter: { order_no: invoice.order_no },
            update: {
              $set: {
                ...invoice,
                user_id: userId,
                username,
                items: invoice.items,
                items_total: invoice.items_total,
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
            filter: { order_no: invoice.order_no },
            update: {
              $setOnInsert: {
                ...invoice,
                user_id: userId,
                username,
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

    // Use transactions for multiple operations to ensure atomicity
    if (operations.length > 1) {
      const client = database.getClient();
      const session = client.startSession();
      
      try {
        await session.withTransaction(async () => {
          await database.invoices.bulkWrite(operations, { session });
        });
      } catch (error: any) {
        // Handle duplicate key errors gracefully
        if (error.code === 11000) {
          console.warn('Duplicate key error during bulk insert, some invoices may already exist');
        } else {
          throw error;
        }
      } finally {
        await session.endSession();
      }
    } else {
      // Single operation doesn't need transaction
      try {
        await database.invoices.bulkWrite(operations);
      } catch (error: any) {
        if (error.code === 11000) {
          console.warn('Duplicate key error during insert');
        } else {
          throw error;
        }
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

    // Date range filter
    if (filters.date_from || filters.date_to) {
      query.date = {};
      if (filters.date_from) {
        query.date.$gte = filters.date_from;
      }
      if (filters.date_to) {
        query.date.$lte = filters.date_to;
      }
    }

    // Category filter
    if (filters.category) {
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

    // Use aggregation with $facet to get data and count in a single query
    const pipeline = [
      { $match: query },
      { $sort: { date: -1, created_at: -1 } },
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
    ];

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
}

export const invoiceService = new InvoiceService();


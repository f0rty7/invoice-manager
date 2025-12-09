import { database } from '../db/connection';
import type { Invoice, InvoiceFilters, InvoiceStats, PaginatedResponse } from '@pdf-invoice/shared';
import { ObjectId } from 'mongodb';

export class InvoiceService {
  async checkExists(order_no: string): Promise<boolean> {
    const existing = await database.invoices.findOne({ order_no });
    return !!existing;
  }

  async bulkInsert(invoices: Invoice[], userId: string, username: string): Promise<number> {
    if (!invoices.length) return 0;

    const operations = invoices.map(invoice => {
      const doc = {
        ...invoice,
        user_id: userId,
        username: username,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      return {
        updateOne: {
          filter: { order_no: invoice.order_no },
          update: { $setOnInsert: doc },
          upsert: true
        }
      };
    });

    try {
      const result = await database.invoices.bulkWrite(operations, { ordered: false });
      return result.upsertedCount;
    } catch (error: any) {
      // Handle duplicate key errors gracefully
      if (error.code === 11000) {
        return 0; // All were duplicates
      }
      throw error;
    }
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

    // Execute query with pagination
    const [data, total] = await Promise.all([
      database.invoices
        .find(query)
        .sort({ date: -1, created_at: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      database.invoices.countDocuments(query)
    ]);

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
    return result.deletedCount > 0;
  }

  async getStats(userId: string, isAdmin: boolean): Promise<InvoiceStats> {
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

    return {
      total_invoices: totalStats.count,
      total_amount: totalStats.total,
      by_category,
      by_month
    };
  }
}

export const invoiceService = new InvoiceService();


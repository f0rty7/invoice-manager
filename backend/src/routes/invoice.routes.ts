import { Hono } from 'hono';
import { authMiddleware, adminMiddleware, type AuthContext } from '../middleware/auth';
import { invoiceService } from '../services/invoice.service';
import { pdfParserService } from '../services/pdf-parser.service';
import type { JwtPayload } from '../utils/jwt';
import type { InvoiceFilters } from '@pdf-invoice/shared';

const invoiceRouter = new Hono<{ Variables: AuthContext }>();

// Upload and parse PDFs
invoiceRouter.post('/upload', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JwtPayload;
    const formData = await c.req.formData();

    // Collect all files from the "files" field; parseBody() keeps only the last item.
    const fileArray = formData
      .getAll('files')
      .filter(f => f instanceof Blob) as Array<Blob & { name: string }>;

    if (!fileArray.length) {
      return c.json({
        success: false,
        error: 'No files provided'
      }, 400);
    }

    const results = [];
    let insertedCount = 0;

    for (const file of fileArray) {
      if (!file || typeof file === 'string') continue;
      
      try {
        // Parse PDF
        const buffer = await file.arrayBuffer();
        const parseResult = await pdfParserService.parsePDF(Buffer.from(buffer));
        
        // Insert invoices
        const inserted = await invoiceService.bulkInsert(
          parseResult.invoices,
          user.userId,
          user.username
        );
        
        insertedCount += inserted;
        results.push({
          filename: file.name,
          success: true,
          invoices: parseResult.invoices,
          inserted
        });
      } catch (error) {
        results.push({
          filename: file.name,
          success: false,
          error: error instanceof Error ? error.message : 'Parse error'
        });
      }
    }

    return c.json({
      success: true,
      data: {
        results,
        total_inserted: insertedCount
      }
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }, 500);
  }
});

// Get invoices with filters
invoiceRouter.get('/', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JwtPayload;
    const query = c.req.query();
    
    const filters: InvoiceFilters = {
      user_id: query.user_id,
      username: query.username,
      date_from: query.date_from,
      date_to: query.date_to,
      category: query.category,
      price_min: query.price_min ? parseFloat(query.price_min) : undefined,
      price_max: query.price_max ? parseFloat(query.price_max) : undefined,
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 20,
      // Phase 1: New filters
      delivery_partner: query.delivery_partner,
      search: query.search,
      order_no: query.order_no,
      invoice_no: query.invoice_no,
      sort_by: query.sort_by as InvoiceFilters['sort_by'],
      sort_dir: query.sort_dir as InvoiceFilters['sort_dir'],
      // Phase 2: Core enhancements
      categories: query.categories ? query.categories.split(',') : undefined,
      item_search: query.item_search,
      item_qty_min: query.item_qty_min ? parseFloat(query.item_qty_min) : undefined,
      item_qty_max: query.item_qty_max ? parseFloat(query.item_qty_max) : undefined,
      item_unit_price_min: query.item_unit_price_min ? parseFloat(query.item_unit_price_min) : undefined,
      item_unit_price_max: query.item_unit_price_max ? parseFloat(query.item_unit_price_max) : undefined,
      items_count_min: query.items_count_min ? parseInt(query.items_count_min) : undefined,
      items_count_max: query.items_count_max ? parseInt(query.items_count_max) : undefined,
      // Phase 3: Time and pattern filters
      day_of_week: query.day_of_week ? query.day_of_week.split(',').map(Number) : undefined,
      month: query.month ? parseInt(query.month) : undefined,
      year: query.year ? parseInt(query.year) : undefined,
      is_weekend: query.is_weekend === 'true' ? true : query.is_weekend === 'false' ? false : undefined,
      exclude_categories: query.exclude_categories ? query.exclude_categories.split(',') : undefined,
      exclude_delivery_partners: query.exclude_delivery_partners ? query.exclude_delivery_partners.split(',') : undefined,
      spending_pattern: query.spending_pattern as InvoiceFilters['spending_pattern']
    };

    const result = await invoiceService.getInvoices(
      filters,
      user.userId,
      user.role === 'admin'
    );

    return c.json({
      success: true,
      data: result
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch invoices'
    }, 500);
  }
});

// Search invoices with filters (POST body)
invoiceRouter.post('/search', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JwtPayload;
    const filters = (await c.req.json()) as InvoiceFilters;

    const result = await invoiceService.getInvoices(
      filters,
      user.userId,
      user.role === 'admin'
    );

    return c.json({
      success: true,
      data: result
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch invoices'
    }, 500);
  }
});

// Aggregate invoices (total amount + count) across all filtered rows
invoiceRouter.post('/aggregate', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JwtPayload;
    const filters = (await c.req.json()) as InvoiceFilters;

    const data = await invoiceService.aggregateInvoices(
      filters,
      user.userId,
      user.role === 'admin'
    );

    return c.json({ success: true, data });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to aggregate invoices'
    }, 500);
  }
});

// Get statistics (must come before /:id to avoid matching "stats" as an ID)
invoiceRouter.get('/stats/summary', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JwtPayload;
    
    const stats = await invoiceService.getStats(
      user.userId,
      user.role === 'admin'
    );

    return c.json({
      success: true,
      data: stats
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch statistics'
    }, 500);
  }
});

// Get unique categories (must come before /:id to avoid matching "categories" as an ID)
invoiceRouter.get('/categories', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JwtPayload;
    
    const categories = await invoiceService.getUniqueCategories(
      user.userId,
      user.role === 'admin'
    );

    return c.json({
      success: true,
      data: categories
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch categories'
    }, 500);
  }
});

// Get unique delivery partners (must come before /:id to avoid matching as an ID)
invoiceRouter.get('/delivery-partners', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JwtPayload;
    
    const partners = await invoiceService.getUniqueDeliveryPartners(
      user.userId,
      user.role === 'admin'
    );

    return c.json({
      success: true,
      data: partners
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch delivery partners'
    }, 500);
  }
});

// Get filter options (partners/categories with counts) for header multi-select menus
invoiceRouter.get('/filter-options', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JwtPayload;

    const options = await invoiceService.getFilterOptions(
      user.userId,
      user.role === 'admin'
    );

    return c.json({
      success: true,
      data: options
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch filter options'
    }, 500);
  }
});

// Get all items (flattened from invoices) - must come before /:id
invoiceRouter.get('/items', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JwtPayload;
    const query = c.req.query();
    
    const filters: InvoiceFilters = {
      user_id: query.user_id,
      username: query.username,
      date_from: query.date_from,
      date_to: query.date_to,
      category: query.category,
      price_min: query.price_min ? parseFloat(query.price_min) : undefined,
      price_max: query.price_max ? parseFloat(query.price_max) : undefined,
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 20,
      delivery_partner: query.delivery_partner,
      search: query.search,
      order_no: query.order_no,
      invoice_no: query.invoice_no,
      sort_by: query.sort_by as InvoiceFilters['sort_by'],
      sort_dir: query.sort_dir as InvoiceFilters['sort_dir'],
      categories: query.categories ? query.categories.split(',') : undefined,
      item_search: query.item_search,
      item_qty_min: query.item_qty_min ? parseFloat(query.item_qty_min) : undefined,
      item_qty_max: query.item_qty_max ? parseFloat(query.item_qty_max) : undefined,
      item_unit_price_min: query.item_unit_price_min ? parseFloat(query.item_unit_price_min) : undefined,
      item_unit_price_max: query.item_unit_price_max ? parseFloat(query.item_unit_price_max) : undefined,
      exclude_categories: query.exclude_categories ? query.exclude_categories.split(',') : undefined,
      exclude_delivery_partners: query.exclude_delivery_partners ? query.exclude_delivery_partners.split(',') : undefined,
      // Time filters
      day_of_week: query.day_of_week ? query.day_of_week.split(',').map(Number) : undefined,
      month: query.month ? parseInt(query.month) : undefined,
      year: query.year ? parseInt(query.year) : undefined,
      is_weekend: query.is_weekend === 'true' ? true : query.is_weekend === 'false' ? false : undefined,
      // Spending pattern
      spending_pattern: query.spending_pattern as InvoiceFilters['spending_pattern']
    };

    const result = await invoiceService.getItems(
      filters,
      user.userId,
      user.role === 'admin'
    );

    return c.json({
      success: true,
      data: result
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch items'
    }, 500);
  }
});

// Search items with filters (POST body) - must come before /:id
invoiceRouter.post('/items/search', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JwtPayload;
    const filters = (await c.req.json()) as InvoiceFilters;

    const result = await invoiceService.getItems(
      filters,
      user.userId,
      user.role === 'admin'
    );

    return c.json({
      success: true,
      data: result
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch items'
    }, 500);
  }
});

// Aggregate items (total price + count) across all filtered rows
invoiceRouter.post('/items/aggregate', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JwtPayload;
    const filters = (await c.req.json()) as InvoiceFilters;

    const data = await invoiceService.aggregateItems(
      filters,
      user.userId,
      user.role === 'admin'
    );

    return c.json({ success: true, data });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to aggregate items'
    }, 500);
  }
});

// Get single invoice
invoiceRouter.get('/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JwtPayload;
    const id = c.req.param('id');
    
    const invoice = await invoiceService.getInvoiceById(
      id,
      user.userId,
      user.role === 'admin'
    );

    if (!invoice) {
      return c.json({
        success: false,
        error: 'Invoice not found'
      }, 404);
    }

    return c.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch invoice'
    }, 500);
  }
});

// Delete invoice
invoiceRouter.delete('/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JwtPayload;
    const id = c.req.param('id');
    
    const deleted = await invoiceService.deleteInvoice(
      id,
      user.userId,
      user.role === 'admin'
    );

    if (!deleted) {
      return c.json({
        success: false,
        error: 'Invoice not found or unauthorized'
      }, 404);
    }

    return c.json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete invoice'
    }, 500);
  }
});

export { invoiceRouter };


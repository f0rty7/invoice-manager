import { Hono } from 'hono';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { invoiceService } from '../services/invoice.service';
import { pdfParserService } from '../services/pdf-parser.service';
import type { JwtPayload } from '../utils/jwt';
import type { InvoiceFilters } from '@pdf-invoice/shared';

const invoiceRouter = new Hono();

// Upload and parse PDFs
invoiceRouter.post('/upload', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JwtPayload;
    const formData = await c.req.formData();

    // Collect all files from the "files" field; parseBody() keeps only the last item.
    const fileArray = formData
      .getAll('files')
      .filter((f): f is File => f instanceof File);

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
      limit: query.limit ? parseInt(query.limit) : 20
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

// Get statistics
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

export { invoiceRouter };


import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { compress } from 'hono/compress';
import { logger } from 'hono/logger';
import { database } from './db/connection';
import { CONFIG } from './config';
import { errorHandler } from './middleware/error';
import { authRouter } from './routes/auth.routes';
import { invoiceRouter } from './routes/invoice.routes';
import { filterRouter } from './routes/filter.routes';
import { authService } from './services/auth.service';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', compress());
app.use('*', cors({
  origin: CONFIG.cors.frontendUrl,
  credentials: true,
}));
app.use('*', errorHandler);

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.route('/api/auth', authRouter);
app.route('/api/invoices', invoiceRouter);
app.route('/api/filters', filterRouter);

// 404 handler
app.notFound((c) => {
  return c.json({ success: false, error: 'Not found' }, 404);
});

// Start server
async function startServer() {
  try {
    // Connect to database
    await database.connect();
    
    // Initialize admin user
    await authService.initializeAdminUser();
    
    // Start HTTP server
    console.log(`🚀 Server starting on port ${CONFIG.server.port}`);
    
    serve({
      fetch: app.fetch,
      port: CONFIG.server.port
    });
    
    console.log(`✅ Server running at http://localhost:${CONFIG.server.port}`);
    console.log(`📚 API endpoints:`);
    console.log(`   - POST   /api/auth/register`);
    console.log(`   - POST   /api/auth/login`);
    console.log(`   - POST   /api/invoices/upload`);
    console.log(`   - GET    /api/invoices`);
    console.log(`   - GET    /api/invoices/:id`);
    console.log(`   - DELETE /api/invoices/:id`);
    console.log(`   - GET    /api/invoices/stats/summary`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await database.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await database.disconnect();
  process.exit(0);
});

startServer();

export default app;


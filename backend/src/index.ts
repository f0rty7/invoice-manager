import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { compress } from 'hono/compress';
import { logger } from 'hono/logger';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { database } from './db/connection';
import { CONFIG } from './config';
import { errorHandler } from './middleware/error';
import { authRouter } from './routes/auth.routes';
import { invoiceRouter } from './routes/invoice.routes';
import { filterRouter } from './routes/filter.routes';
import { authService } from './services/auth.service';

const app = new Hono();

const FRONTEND_DIST_ROOT = path.resolve(
  process.cwd(),
  '../frontend/dist/pdf-invoice-frontend/browser'
);

function contentTypeForExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js': return 'text/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.svg': return 'image/svg+xml';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.webp': return 'image/webp';
    case '.ico': return 'image/x-icon';
    case '.woff': return 'font/woff';
    case '.woff2': return 'font/woff2';
    case '.ttf': return 'font/ttf';
    case '.otf': return 'font/otf';
    default: return 'application/octet-stream';
  }
}

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

// Frontend (production build) preview: serve Angular dist + SPA fallback
app.get('*', async (c) => {
  const url = new URL(c.req.url);
  const pathname = decodeURIComponent(url.pathname);

  // Never try to serve frontend assets for API routes
  if (pathname === '/health' || pathname === '/api' || pathname.startsWith('/api/')) {
    return c.notFound();
  }

  const requestPath = pathname === '/' ? '/index.html' : pathname;
  const ext = path.posix.extname(requestPath);

  // SPA fallback for routes without an extension (e.g. /login, /dashboard)
  const relativeFsPath = ext ? requestPath.replace(/^\/+/, '') : 'index.html';
  const resolvedPath = path.resolve(FRONTEND_DIST_ROOT, relativeFsPath);

  // Path traversal protection
  const rel = path.relative(FRONTEND_DIST_ROOT, resolvedPath);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return c.text('Bad request', 400);
  }

  try {
    const fileStat = await stat(resolvedPath);
    if (!fileStat.isFile()) {
      return c.text('Not found', 404);
    }

    const body = await readFile(resolvedPath);
    const ct = contentTypeForExt(ext || '.html');

    return c.body(body, 200, {
      'Content-Type': ct,
      'Cache-Control': 'no-cache',
    });
  } catch {
    // For non-file routes we already mapped to index.html; missing means build isn't present.
    return c.text('Not found', 404);
  }
});

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


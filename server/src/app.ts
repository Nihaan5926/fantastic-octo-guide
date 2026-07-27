import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import http from 'http';
import path from 'path';
import { config } from './config';
import { db, testConnection } from './db/knex';
import { moduleRegistry } from './core/module-registry';
import { eventBus } from './core/event-bus';
import { createWebSocketServer, getIO } from './websocket';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { bootstrapDatabase } from './db/bootstrap';
import { authenticate } from './middleware/auth';
import { generalLimiter } from './middleware/rate-limiter';
import { maintenanceGuard } from './middleware/maintenance';
import { apiKeyAuth } from './middleware/api-key-auth';

export async function createApp() {
  const app = express();
  const server = http.createServer(app);

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: config.cors.origin, credentials: true }));
  app.use(compression());
  app.use(morgan('dev'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use('/uploads', express.static(path.resolve(config.upload.dir)));

  // Serve static client build in production
  const clientDist = process.env.CLIENT_DIST || path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));

  const io = createWebSocketServer(server);

  await testConnection();

  // Ensure ALL tables and columns exist before loading modules
  await bootstrapDatabase(db);

  const moduleDir = path.resolve(__dirname, 'modules');
  await moduleRegistry.loadAll(moduleDir, { db, io, eventBus });

  // Apply general rate limiter to all API routes (100 req/min per IP)
  app.use('/api', generalLimiter);

  // API key authentication (before JWT auth)
  app.use('/api', apiKeyAuth);

  // Maintenance mode guard (after API key auth so admin API keys work)
  app.use(maintenanceGuard);

  // Mount all module routers
  for (const mod of moduleRegistry.getAll()) {
    app.use(mod.manifest.apiPrefix, mod.router);
    console.log(`  Route: ${mod.manifest.apiPrefix}`);
  }

  // API info endpoint
  app.get('/api', (_req, res) => {
    const modules = moduleRegistry.getAllManifests().map((m) => ({
      name: m.name,
      version: m.version,
      category: m.category,
      permissions: m.permissions,
      apiPrefix: m.apiPrefix,
    }));
    res.json({
      name: 'Intel Platform API',
      version: '1.0.0',
      modules,
      navItems: moduleRegistry.getAllManifests().flatMap((m) => m.navItems),
      dashboardWidgets: moduleRegistry.getAllManifests().flatMap((m) => m.dashboardWidgets),
    });
  });

  // Health check with deploy version for cache busting
  app.get('/api/health', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      deploySalt: config.deploySalt.substring(0, 8),
      buildTime: config.buildTime,
      db: 'connected',
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      modules: moduleRegistry.getAll().length,
    });
  });

  // Deploy version endpoint for cache bust detection
  app.get('/api/deploy-version', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ deploySalt: config.deploySalt.substring(0, 8), buildTime: config.buildTime });
  });

  // SPA fallback — serve index.html for all non-API routes
  // Add cache busting: set no-cache on HTML so browser always checks for updates
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.sendFile(path.resolve(clientDist, 'index.html'));
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return { app, server, io, eventBus };
}

if (require.main === module) {
  createApp().then(({ server }) => {
    server.listen(config.port, () => {
      console.log(`[Server] Running on http://localhost:${config.port}`);
      console.log(`[Server] WebSocket ready`);
    });
  }).catch((err) => {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  });
}

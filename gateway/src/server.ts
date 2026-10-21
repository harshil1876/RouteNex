import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { type AppConfig, config } from './config.js';
import { createAuthMiddleware } from './middleware/auth.js';
import { createRateLimitMiddleware } from './middleware/rate-limit.js';
import { ProviderRegistry } from './providers/registry.js';
import { CircuitBreaker } from './router/circuit-breaker.js';
import { RoutingEngine } from './router/engine.js';
import { createChatRoute } from './routes/chat.js';
import { createExplainRoute } from './routes/explain.js';
import { createHealthRoute } from './routes/health.js';
import { createModelsRoute } from './routes/models.js';
import { createUsageRoute } from './routes/usage.js';
import { RequestStore } from './storage/sqlite.js';

/**
 * Creates and configures the Hono application with all middleware and routes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AdminStore } from './storage/admin-store.js';
import { createAdminRoutes } from './routes/admin.js';
import { createMessagesRoute } from './routes/messages.js';
import { mountStaticDashboard } from './middleware/static-dashboard.js';
import { ResponseCache } from './router/cache.js';
import { createMcpRoute } from './routes/mcp.js';

export function createApp(appConfig: AppConfig = config) {
  const app = new Hono();
  const startTime = Date.now();

  // 1. Initialize core subsystems
  const adminStore = new AdminStore('./routenex_admin.json', !appConfig.persistenceEnabled);
  const registry = new ProviderRegistry(appConfig);
  const circuitBreaker = new CircuitBreaker();
  const responseCache = new ResponseCache();
  const store = new RequestStore(appConfig.dbPath, appConfig.persistenceEnabled);
  const engine = new RoutingEngine(
    registry,
    circuitBreaker,
    appConfig,
    (m) => adminStore.resolveAlias(m),
    (m) => adminStore.findCombo(m),
    adminStore
  );

  // 2. Global Middleware
  // OWASP Security Headers
  app.use('*', async (c, next) => {
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('X-XSS-Protection', '1; mode=block');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    await next();
  });

  // 10MB Request Body Guard
  app.use('*', async (c, next) => {
    const len = c.req.header('content-length');
    if (len && parseInt(len, 10) > 10 * 1024 * 1024) {
      return c.json(
        {
          error: {
            message: 'Payload Too Large: maximum request body size is 10MB',
            type: 'invalid_request_error',
            code: 'PAYLOAD_TOO_LARGE',
          },
        },
        413
      );
    }
    await next();
  });

  app.use(
    '*',
    cors({
      origin: '*',
      allowHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
      allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      exposeHeaders: ['Retry-After'],
    })
  );

  app.use('*', createRateLimitMiddleware(appConfig.rateLimitRpm));
  app.use('*', createAuthMiddleware(appConfig.apiKey, adminStore));

  // 3. Mount Route Handlers
  const healthRoute = createHealthRoute(registry, startTime);
  const chatRoute = createChatRoute(engine, store, appConfig, responseCache);
  const modelsRoute = createModelsRoute(registry, adminStore);
  const explainRoute = createExplainRoute(engine);
  const usageRoute = createUsageRoute(store);
  const adminRoute = createAdminRoutes(adminStore, registry, appConfig, store);
  const messagesRoute = createMessagesRoute(engine, store, appConfig, responseCache);
  const mcpRoute = createMcpRoute(engine, registry, circuitBreaker, adminStore);

  // Health routes
  app.route('/', healthRoute);

  // Admin routes (for self-hosted Open Source Web Console)
  app.route('/v1/admin', adminRoute);

  // Model Context Protocol (MCP) Server
  app.route('/v1', mcpRoute);
  app.route('/', mcpRoute);

  // OpenAI-compatible and Anthropic-compatible routes
  app.route('/v1', chatRoute);
  app.route('/v1', messagesRoute);
  app.route('/v1', modelsRoute);
  app.route('/v1', explainRoute);
  app.route('/v1', usageRoute);

  // Also support root endpoints for flexibility
  app.route('/', chatRoute);
  app.route('/', messagesRoute);
  app.route('/', modelsRoute);
  app.route('/', explainRoute);
  app.route('/', usageRoute);

  // 4. Standalone Dashboard Asset Serving (serves built dist/ if available)
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const distCandidatePaths = [
    path.resolve(process.cwd(), 'dist'),
    path.resolve(process.cwd(), '..', 'dist'),
    path.resolve(currentDir, '../../dist'),
    path.resolve(currentDir, '../dist'),
    path.resolve(currentDir, '../../../dist'),
  ];
  const staticRoot = distCandidatePaths.find((p) => fs.existsSync(p));
  if (staticRoot) {
    mountStaticDashboard(app, staticRoot);
  }

  return { app, registry, circuitBreaker, store, engine, adminStore, responseCache };
}

/**
 * Starts the HTTP server on configured host and port.
 */
export function startServer(appConfig: AppConfig = config) {
  const { app, registry, store, adminStore, engine, circuitBreaker, responseCache } = createApp(appConfig);

  const server = serve(
    {
      fetch: app.fetch,
      port: appConfig.port,
      hostname: appConfig.host,
    },
    (info) => {
      const configuredList = registry
        .getConfiguredAdapters()
        .map((a) => a.id)
        .join(', ');

      console.log(`\n======================================================`);
      console.log(`  RouteNex Gateway running on http://${info.address}:${info.port}`);
      if (adminStore.initialSetupToken) {
        console.log(`\x1b[35m  ┌─────────────────────────────────────────────────────────┐\x1b[0m`);
        console.log(`\x1b[35m  │ RouteNex Local Admin Password:                          │\x1b[0m`);
        console.log(`\x1b[35m  │ \x1b[1m\x1b[36m${adminStore.initialSetupToken}\x1b[0m\x1b[35m │\x1b[0m`);
        console.log(`\x1b[35m  │ (One-time password for local web console access)        │\x1b[0m`);
        console.log(`\x1b[35m  └─────────────────────────────────────────────────────────┘\x1b[0m`);
      }
      console.log(`  Auth:        ${appConfig.apiKey ? 'Enabled (Bearer token required)' : 'Disabled (Localhost dev mode)'}`);
      console.log(`  Security:    AES-256-GCM Keystore Active • Virtual Keys Hashed`);
      console.log(`  Providers:   [${configuredList}]`);
      console.log(`  Mock Mode:   ${appConfig.mockMode ? 'Active (zero-cost offline testing)' : 'Disabled'}`);
      console.log(`  Persistence: ${appConfig.persistenceEnabled ? appConfig.dbPath : 'Disabled'}`);
      console.log(`======================================================\n`);
    }
  );

  const shutdown = () => {
    console.log('Shutting down RouteNex Gateway...');
    store.close();
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return { app, server, registry, store, adminStore, engine, circuitBreaker };
}

// High-availability anti-crash protection guards
process.on('uncaughtException', (err) => {
  console.error('[RouteNex Guard] Caught uncaughtException:', err?.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[RouteNex Guard] Caught unhandledRejection:', reason);
});

// Auto-start when executed directly as entrypoint
const isMain = Boolean(
  process.argv[1] &&
  (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js')) &&
  !process.argv[1].includes('vitest')
);

if (isMain) {
  startServer(config);
}



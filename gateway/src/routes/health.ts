import { Hono } from 'hono';
import type { ProviderRegistry } from '../providers/registry.js';

/**
 * Creates healthcheck route handlers.
 */
export function createHealthRoute(registry: ProviderRegistry, startTime: number = Date.now()) {
  const router = new Hono();

  const handleHealth = (c: any) => {
    const uptimeSeconds = Number(((Date.now() - startTime) / 1000).toFixed(1));
    const configured = registry
      .getConfiguredAdapters()
      .filter((a) => a.id !== 'mock')
      .map((a) => a.id);

    return c.json({
      status: 'ok',
      version: '0.2.4',
      uptime_seconds: uptimeSeconds,
      providers: {
        configured,
        mock: true,
      },
    });
  };

  router.get('/health', handleHealth);
  router.get('/health/live', handleHealth);

  return router;
}

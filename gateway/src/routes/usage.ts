import { Hono } from 'hono';
import type { RequestStore } from '../storage/sqlite.js';

/**
 * Creates usage and telemetry metrics route handler.
 */
export function createUsageRoute(store: RequestStore) {
  const router = new Hono();

  router.get('/usage', (c) => {
    const stats = store.getUsageStats();
    const limitQuery = c.req.query('recent');
    const limit = limitQuery ? parseInt(limitQuery, 10) : 0;

    const response: Record<string, unknown> = {
      ...stats,
    };

    if (limit > 0) {
      response.recent_requests = store.getRecentRequests(limit);
    }

    return c.json(response);
  });

  return router;
}

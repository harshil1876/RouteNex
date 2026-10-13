import { Hono } from 'hono';
import type { ProviderRegistry } from '../providers/registry.js';

/**
 * Creates the models listing route handler conforming to OpenAI GET /v1/models spec.
 */
export function createModelsRoute(registry: ProviderRegistry) {
  const router = new Hono();

  router.get('/models', (c) => {
    const catalog = registry.getModelCatalog();
    return c.json({
      object: 'list',
      data: catalog,
    });
  });

  return router;
}

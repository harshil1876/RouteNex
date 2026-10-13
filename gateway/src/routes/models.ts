import { Hono } from 'hono';
import type { ProviderRegistry } from '../providers/registry.js';
import type { AdminStore } from '../storage/admin-store.js';

/**
 * Creates the models listing route handler conforming to OpenAI GET /v1/models spec.
 */
export function createModelsRoute(registry: ProviderRegistry, adminStore?: AdminStore) {
  const router = new Hono();

  router.get('/models', (c) => {
    const catalog = registry.getModelCatalog();
    const comboModels = adminStore
      ? adminStore.getCombos().map((combo) => ({
          id: combo.slug,
          object: 'model',
          created: Math.floor(new Date(combo.createdAt).getTime() / 1000),
          owned_by: 'routenex-combo',
          routenex: {
            provider: 'combo',
            capabilities: {
              chat: true,
              streaming: true,
              tool_calls: true,
              vision: false,
              json_mode: true,
            },
            pricing: {
              prompt_per_million: 0,
              completion_per_million: 0,
              provenance: 'ESTIMATED' as const,
              updated_at: combo.createdAt,
            },
            description: combo.description,
            targets: combo.targets,
          },
        }))
      : [];

    return c.json({
      object: 'list',
      data: [...comboModels, ...catalog],
    });
  });

  return router;
}


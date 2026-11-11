import { Hono } from 'hono';
import type { ProviderRegistry } from '../providers/registry.js';
import type { AdminStore } from '../storage/admin-store.js';

/**
 * Creates the models listing route handler conforming to OpenAI GET /v1/models spec
 * with Claude Code CLI Discovery Aliases (claude-combo-*, claude-worker-*, claude-free-*).
 */
export function createModelsRoute(registry: ProviderRegistry, adminStore?: AdminStore) {
  const router = new Hono();

  router.get('/models', (c) => {
    const catalog = registry.getModelCatalog();

    const combos = adminStore ? adminStore.getCombos() : [];
    const workers = adminStore ? adminStore.getWorkers() : [];

    const comboModels = combos.map((combo) => ({
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
    }));

    // Claude Code CLI Discovery Aliases for Combos (claude-combo-<slug>)
    const claudeComboModels = combos.map((combo) => {
      const cleanSlug = combo.slug.replace(/^combo\//, '');
      return {
        id: `claude-combo-${cleanSlug}`,
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
          description: `[Claude Code Discovery Alias] ${combo.name}: ${combo.description}`,
          targets: combo.targets,
        },
      };
    });

    const workerModels = workers.map((w) => ({
      id: `worker/${w.slug}`,
      object: 'model',
      created: Math.floor(new Date(w.createdAt || Date.now()).getTime() / 1000),
      owned_by: 'routenex-worker',
      routenex: {
        provider: 'nexworker',
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
          updated_at: w.updatedAt || new Date().toISOString(),
        },
        description: w.role || `${w.name} Specialist Worker`,
        targets: [w.brainModel],
      },
    }));

    // Claude Code CLI Discovery Aliases for Workers (claude-worker-<slug>)
    const claudeWorkerModels = workers.map((w) => {
      const cleanSlug = w.slug.replace(/^worker\//, '');
      return {
        id: `claude-worker-${cleanSlug}`,
        object: 'model',
        created: Math.floor(new Date(w.createdAt || Date.now()).getTime() / 1000),
        owned_by: 'routenex-worker',
        routenex: {
          provider: 'nexworker',
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
            updated_at: w.updatedAt || new Date().toISOString(),
          },
          description: `[Claude Code Discovery Alias] ${w.name} Specialist Worker`,
          targets: [w.brainModel],
        },
      };
    });

    // Zero-Key / Free Discovery Aliases
    const claudeFreeModels = [
      {
        id: 'claude-free-pollinations-openai',
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'routenex-free',
        routenex: {
          provider: 'pollinations',
          capabilities: { chat: true, streaming: true, tool_calls: true, vision: false, json_mode: true },
          pricing: { prompt_per_million: 0, completion_per_million: 0, provenance: 'ESTIMATED' as const, updated_at: new Date().toISOString() },
          description: 'Claude Code Discovery Alias: Zero-key free Pollinations AI endpoint',
          targets: ['pollinations/openai'],
        },
      },
      {
        id: 'claude-free-groq-llama-3-3-70b',
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'routenex-free',
        routenex: {
          provider: 'groq',
          capabilities: { chat: true, streaming: true, tool_calls: true, vision: false, json_mode: true },
          pricing: { prompt_per_million: 0, completion_per_million: 0, provenance: 'ESTIMATED' as const, updated_at: new Date().toISOString() },
          description: 'Claude Code Discovery Alias: Groq Llama 3.3 70B Versatile inference',
          targets: ['groq/llama-3.3-70b-versatile'],
        },
      },
      {
        id: 'claude-free-cerebras-llama-3-3-70b',
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'routenex-free',
        routenex: {
          provider: 'cerebras',
          capabilities: { chat: true, streaming: true, tool_calls: true, vision: false, json_mode: true },
          pricing: { prompt_per_million: 0, completion_per_million: 0, provenance: 'ESTIMATED' as const, updated_at: new Date().toISOString() },
          description: 'Claude Code Discovery Alias: Cerebras Llama 3.3 70B ultra-fast inference',
          targets: ['cerebras/llama-3.3-70b'],
        },
      },
      {
        id: 'claude-free-gemini-2-5-flash',
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'routenex-free',
        routenex: {
          provider: 'gemini',
          capabilities: { chat: true, streaming: true, tool_calls: true, vision: true, json_mode: true },
          pricing: { prompt_per_million: 0, completion_per_million: 0, provenance: 'ESTIMATED' as const, updated_at: new Date().toISOString() },
          description: 'Claude Code Discovery Alias: Google Gemini 2.5 Flash free endpoint',
          targets: ['gemini/gemini-2.5-flash'],
        },
      },
    ];

    return c.json({
      object: 'list',
      data: [
        ...claudeComboModels,
        ...claudeWorkerModels,
        ...claudeFreeModels,
        ...comboModels,
        ...workerModels,
        ...catalog,
      ],
    });
  });

  return router;
}

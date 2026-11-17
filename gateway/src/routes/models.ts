import { Hono } from 'hono';
import { ProviderRegistry } from '../providers/registry.js';
import type { AdminStore } from '../storage/admin-store.js';

/**
 * Creates the models listing route handler conforming to OpenAI GET /v1/models spec
 * with Claude Code CLI Discovery Aliases (claude-combo-*, claude-worker-*, claude-free-*).
 */
export function createModelsRoute(registry: ProviderRegistry, adminStore?: AdminStore) {
  const router = new Hono();

  router.get('/models', (c) => {
    const accept = c.req.header('accept') || '';
    if (accept.includes('text/html') && !accept.includes('application/json')) {
      return c.redirect('/dashboard?tab=providers');
    }
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

  // GET /v1/models/:model - OpenAI-compatible retrieve model endpoint
  router.get('/models/:model{.*}', (c) => {
    const accept = c.req.header('accept') || '';
    if (accept.includes('text/html') && !accept.includes('application/json')) {
      return c.redirect('/dashboard?tab=providers');
    }
    const rawParam = c.req.param('model');
    const modelId = decodeURIComponent(rawParam).replace(/^\//, '');

    // 1. Check registry static or dynamic catalog
    const entry = registry.getModel(modelId);
    if (entry) {
      return c.json(ProviderRegistry.toModelInfo(entry));
    }

    // 2. Check Combos
    const combos = adminStore ? adminStore.getCombos() : [];
    const foundCombo = combos.find((cb) => cb.slug === modelId || cb.id === modelId || `claude-combo-${cb.slug.replace(/^combo\//, '')}` === modelId);
    if (foundCombo) {
      return c.json({
        id: foundCombo.slug,
        object: 'model',
        created: Math.floor(new Date(foundCombo.createdAt).getTime() / 1000),
        owned_by: 'routenex-combo',
        routenex: {
          provider: 'combo',
          capabilities: { chat: true, streaming: true, tool_calls: true, vision: false, json_mode: true },
          pricing: { prompt_per_million: 0, completion_per_million: 0, provenance: 'ESTIMATED' as const, updated_at: foundCombo.createdAt },
          description: foundCombo.description,
          targets: foundCombo.targets,
        },
      });
    }

    // 3. Check Workers
    const workers = adminStore ? adminStore.getWorkers() : [];
    const foundWorker = workers.find((w) => `worker/${w.slug}` === modelId || w.id === modelId || `claude-worker-${w.slug}` === modelId);
    if (foundWorker) {
      return c.json({
        id: `worker/${foundWorker.slug}`,
        object: 'model',
        created: Math.floor(new Date(foundWorker.createdAt || Date.now()).getTime() / 1000),
        owned_by: 'routenex-worker',
        routenex: {
          provider: 'nexworker',
          capabilities: { chat: true, streaming: true, tool_calls: true, vision: false, json_mode: true },
          pricing: { prompt_per_million: 0, completion_per_million: 0, provenance: 'ESTIMATED' as const, updated_at: foundWorker.updatedAt || new Date().toISOString() },
          description: foundWorker.role || `${foundWorker.name} Specialist Worker`,
          targets: [foundWorker.brainModel],
        },
      });
    }

    return c.json(
      {
        error: {
          message: `The model '${modelId}' does not exist or you do not have access to it.`,
          type: 'invalid_request_error',
          param: 'model',
          code: 'model_not_found',
        },
      },
      404
    );
  });

  return router;
}

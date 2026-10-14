import { Hono } from 'hono';
import type { ProviderRegistry } from '../providers/registry.js';
import type { RoutingEngine } from '../router/engine.js';
import type { CircuitBreaker } from '../router/circuit-breaker.js';
import type { AdminStore } from '../storage/admin-store.js';

export const MCP_TOOLS = [
  {
    name: 'list_models',
    description: 'List all registered AI models in RouteNex catalog with pricing provenance, capabilities, and provider status.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: { type: 'string', description: 'Filter by provider ID (e.g. "groq", "cerebras", "mistral", "nvidia")' },
        free_only: { type: 'boolean', description: 'Only return $0/free tier models' },
      },
    },
  },
  {
    name: 'explain_route',
    description: 'Simulate and explain the routing decision for a request without executing upstream.',
    inputSchema: {
      type: 'object',
      properties: {
        model: { type: 'string', description: 'Requested model or "auto"' },
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              role: { type: 'string', enum: ['system', 'user', 'assistant'] },
              content: { type: 'string' },
            },
            required: ['role', 'content'],
          },
          description: 'Chat messages to evaluate',
        },
        strategy: {
          type: 'string',
          enum: ['cost', 'latency', 'balanced', 'lkgp', 'headroom', 'reset-window', 'cache-optimized'],
          description: 'Routing strategy to apply',
        },
      },
      required: ['messages'],
    },
  },
  {
    name: 'get_free_tier_quotas',
    description: 'Get active free tier providers, quotas (RPM/daily limits), and remaining headroom (Groq, Cerebras, Mistral, Pollinations, SambaNova, etc.).',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'test_provider_health',
    description: 'Test connection and latency to a specific provider or all active providers.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: { type: 'string', description: 'Provider ID (e.g. "groq", "cerebras", "pollinations") or "all"' },
      },
      required: ['provider'],
    },
  },
  {
    name: 'upsert_combo',
    description: 'Create or update a custom routing combo with model list, strategy, and fallback chain.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Combo name/slug' },
        models: { type: 'array', items: { type: 'string' }, description: 'Ordered list of model IDs for fallback' },
        strategy: {
          type: 'string',
          enum: ['cost', 'latency', 'balanced', 'lkgp', 'headroom', 'reset-window', 'cache-optimized'],
          description: 'Strategy to use across the models',
        },
        description: { type: 'string', description: 'Optional combo description' },
        enabled: { type: 'boolean', description: 'Whether the combo is active' },
      },
      required: ['name', 'models', 'strategy'],
    },
  },
];

/**
 * Handles JSON-RPC 2.0 requests following Model Context Protocol (MCP) standard.
 */
export async function handleMcpJsonRpc(
  body: any,
  engine: RoutingEngine,
  registry: ProviderRegistry,
  circuitBreaker: CircuitBreaker,
  adminStore: AdminStore
): Promise<any> {
  const { id, method, params } = body || {};

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'routenex-mcp',
          version: '1.0.0',
        },
      },
    };
  }

  if (method === 'notifications/initialized') {
    return { jsonrpc: '2.0' };
  }

  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools: MCP_TOOLS,
      },
    };
  }

  if (method === 'tools/call') {
    const toolName = params?.name;
    const args = params?.arguments || {};

    let toolResult: any;

    try {
      if (toolName === 'list_models') {
        let models = registry.getAllModels();
        if (args.provider) {
          models = models.filter((m) => m.provider === args.provider);
        }
        if (args.free_only) {
          models = models.filter(
            (m) => (m.pricing?.prompt_per_million ?? 0) === 0 || m.id.includes(':free')
          );
        }
        toolResult = models.map((m) => ({
          id: m.id,
          provider: m.provider,
          context_length: m.context_length,
          free: (m.pricing?.prompt_per_million ?? 0) === 0 || m.id.includes(':free'),
          pricing: m.pricing,
          capabilities: m.capabilities,
          tos_status: m.tos_status || 'official',
        }));
      } else if (toolName === 'explain_route') {
        const explanation = engine.explain(
          {
            model: args.model || 'auto',
            messages: args.messages || [{ role: 'user', content: 'Ping' }],
            stream: false,
            n: 1,
            provider: args.strategy ? { allow_fallbacks: true, sort: args.strategy } : undefined,
          },
          `mcp-${Date.now()}`
        );
        toolResult = explanation;
      } else if (toolName === 'get_free_tier_quotas') {
        toolResult = {
          total_free_tokens_available: '1.6 Billion+',
          providers: [
            { provider: 'pollinations', quota: 'Unlimited / Anonymous', free: true },
            { provider: 'duckduckgo', quota: 'Unlimited / Anonymous', free: true, tos_status: 'caution' },
            { provider: 'groq', quota: '14,400 req/day', rate_limit: '30 RPM', free: true, failures: circuitBreaker.getFailureCount('groq') },
            { provider: 'cerebras', quota: '1,000,000 tokens/day', rate_limit: '2,000 tok/s', free: true, failures: circuitBreaker.getFailureCount('cerebras') },
            { provider: 'mistral', quota: '1 Billion tokens/mo', free: true, failures: circuitBreaker.getFailureCount('mistral') },
            { provider: 'siliconflow', quota: '20M tokens starter bonus', free: true, failures: circuitBreaker.getFailureCount('siliconflow') },
            { provider: 'nvidia', quota: '1,000 free credits', free: true, failures: circuitBreaker.getFailureCount('nvidia') },
            { provider: 'sambanova', quota: 'Meta-Llama 3.3 serverless free', free: true, failures: circuitBreaker.getFailureCount('sambanova') },
            { provider: 'zhipu', quota: 'GLM-4-Flash 100% Free', free: true, failures: circuitBreaker.getFailureCount('zhipu') },
            { provider: 'gemini', quota: '1,500 req/day', rate_limit: '15 RPM', free: true, failures: circuitBreaker.getFailureCount('gemini') },
          ],
        };
      } else if (toolName === 'test_provider_health') {
        if (args.provider === 'all') {
          const configured = registry.getConfiguredAdapters();
          const checks = await Promise.all(
            configured.map(async (a) => {
              const start = Date.now();
              try {
                const ok = await a.healthCheck();
                return { provider: a.id, name: a.name, status: ok ? 'healthy' : 'unreachable', latency_ms: Date.now() - start };
              } catch (err: any) {
                return { provider: a.id, name: a.name, status: 'error', error: err.message, latency_ms: Date.now() - start };
              }
            })
          );
          toolResult = checks;
        } else {
          const a = registry.getAdapter(args.provider);
          if (!a) {
            toolResult = { error: `Provider '${args.provider}' not found.` };
          } else {
            const start = Date.now();
            try {
              const ok = await a.healthCheck();
              toolResult = { provider: a.id, name: a.name, status: ok ? 'healthy' : 'unreachable', latency_ms: Date.now() - start };
            } catch (err: any) {
              toolResult = { provider: a.id, name: a.name, status: 'error', error: err.message, latency_ms: Date.now() - start };
            }
          }
        }
      } else if (toolName === 'upsert_combo') {
        adminStore.upsertCombo({
          id: args.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
          name: args.name,
          description: args.description || `MCP combo: ${args.name}`,
          models: args.models,
          strategy: args.strategy,
          enabled: args.enabled ?? true,
        });
        toolResult = { success: true, message: `Combo '${args.name}' configured.`, models: args.models, strategy: args.strategy };
      } else {
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method or tool '${toolName}' not found.`,
          },
        };
      }

      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(toolResult, null, 2),
            },
          ],
        },
      };
    } catch (err: any) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32000,
          message: err.message || 'Tool execution error',
        },
      };
    }
  }

  return {
    jsonrpc: '2.0',
    id,
    error: {
      code: -32601,
      message: `Unknown MCP method '${method}'.`,
    },
  };
}

/**
 * Creates the Hono route handler for MCP HTTP and SSE transports.
 */
export function createMcpRoute(
  engine: RoutingEngine,
  registry: ProviderRegistry,
  circuitBreaker: CircuitBreaker,
  adminStore: AdminStore
): Hono {
  const router = new Hono();

  // POST /mcp or POST /v1/mcp
  router.post('/mcp', async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body) {
      return c.json({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' } }, 400);
    }

    const response = await handleMcpJsonRpc(body, engine, registry, circuitBreaker, adminStore);
    return c.json(response);
  });

  // GET /mcp/tools or GET /v1/mcp/tools - Quick HTTP inspection
  router.get('/mcp/tools', (c) => {
    return c.json({
      tools: MCP_TOOLS,
    });
  });

  return router;
}

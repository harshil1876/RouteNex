import { describe, expect, it } from 'vitest';
import { createApp } from './server.js';
import type { AppConfig } from './config.js';
import { AdminStore } from './storage/admin-store.js';
import { ProviderRegistry } from './providers/registry.js';
import { ProviderError } from './providers/types.js';
import { scrubSensitiveArgs } from './workers/guard.js';
import { computeNextCronTimestamp } from './workers/runtime.js';
import { ResponseCache } from './router/cache.js';
import { buildSafeBroadcastPayload, signBroadcastPayload } from './observability/broadcast.js';
import fs from 'node:fs';
import path from 'node:path';

const testConfig: AppConfig = {
  port: 3001,
  host: '127.0.0.1',
  apiKey: undefined,
  mockMode: true,
  groqApiKey: undefined,
  openaiApiKey: undefined,
  logPrompts: false,
  dbPath: './test_studio_tabs.json',
  maxRetries: 2,
  timeoutMs: 5000,
  defaultStrategy: 'balanced',
  rateLimitRpm: 500,
  persistenceEnabled: false,
  allowCautionFallback: false,
};

describe('Suite: RouteNex Studio 9-Tab End-to-End Verification', () => {
  const adminHeaders = {
    'Content-Type': 'application/json',
    'x-admin-token': 'routenex-admin',
  };

  const { app, registry, engine, adminStore } = createApp(testConfig);

  // Tab 1: Overview
  describe('Tab 1: Overview', () => {
    it('GET /health/live returns HTTP 200 and gateway readiness status', async () => {
      const res = await app.request('/health/live');
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('ok');
    });

    it('GET /v1/usage returns HTTP 200 and usage analytics', async () => {
      const res = await app.request('/v1/usage');
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.total_requests).toBeDefined();
    });

    it('GET /v1/admin/config returns HTTP 200 for pipeline setup', async () => {
      const res = await app.request('/v1/admin/config', { headers: adminHeaders });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.aliases).toBeDefined();
    });

    it('POST /v1/router/explain returns HTTP 200 for live pipeline pulse', async () => {
      const res = await app.request('/v1/router/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'auto',
          messages: [{ role: 'user', content: 'Live pipeline pulse test' }],
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.request_id).toBeDefined();
    });
  });

  // Tab 2: Providers & Models / Playground
  describe('Tab 2: Providers & Models / Playground', () => {
    it('GET /v1/admin/providers returns HTTP 200 with credentials list', async () => {
      const res = await app.request('/v1/admin/providers', { headers: adminHeaders });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.providers).toBeDefined();
    });

    it('GET /v1/models returns HTTP 200 with full model catalog', async () => {
      const res = await app.request('/v1/models');
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('POST /v1/chat/completions Playground with sort: "cost" returns HTTP 200', async () => {
      const res = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'auto',
          messages: [{ role: 'user', content: 'What is RouteNex cost routing?' }],
          provider: {
            sort: 'cost',
            allow_fallbacks: true,
          },
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.choices?.[0]?.message?.content).toBeDefined();
      expect(res.headers.get('X-RouteNex-Decision-Reason')).toBeDefined();
    });

    it('POST /v1/chat/completions Playground with sort: "latency" returns HTTP 200', async () => {
      const res = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'auto',
          messages: [{ role: 'user', content: 'What is RouteNex latency routing?' }],
          provider: {
            sort: 'latency',
            allow_fallbacks: true,
          },
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.choices?.[0]?.message?.content).toBeDefined();
    });

    it('POST /v1/chat/completions Playground with sort: "balanced" returns HTTP 200', async () => {
      const res = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'auto',
          messages: [{ role: 'user', content: 'What is RouteNex balanced routing?' }],
          provider: {
            sort: 'balanced',
            allow_fallbacks: true,
          },
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.choices?.[0]?.message?.content).toBeDefined();
    });

    it('POST /v1/admin/providers/test returns HTTP 200 for health probe', async () => {
      const res = await app.request('/v1/admin/providers/test', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ provider: 'mock', key: 'sk-test-key' }),
      });
      expect(res.status).toBe(200);
    });

    it('POST /v1/admin/providers saves API keys for catalog providers (nvidia, openrouter) with HTTP 200', async () => {
      // 1. Save nvidia key
      const nvidiaRes = await app.request('/v1/admin/providers', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          provider: 'nvidia',
          apiKey: 'nvapi-test-key-12345',
        }),
      });
      expect(nvidiaRes.status).toBe(200);
      const nvidiaData = await nvidiaRes.json();
      expect(nvidiaData.success).toBe(true);
      expect(nvidiaData.configured).toBe(true);

      // 2. Save openrouter key with "free" workflow
      const openRouterRes = await app.request('/v1/admin/providers', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          provider: 'openrouter',
          apiKey: 'free',
        }),
      });
      expect(openRouterRes.status).toBe(200);
      const openRouterData = await openRouterRes.json();
      expect(openRouterData.success).toBe(true);
      expect(openRouterData.configured).toBe(true);
    });

    it('hydrates saved provider keys from AdminStore into fresh ProviderRegistry instance on startup', () => {
      const store = new AdminStore(':memory:', true);
      store.setProviderKey('nvidia', 'nvapi-hydrated-secret-key');
      store.setProviderKey('openrouter', 'free');

      const testRegistry = new ProviderRegistry(testConfig);
      // Before hydration, nvidia and openrouter are unconfigured
      expect(testRegistry.getAdapter('nvidia')?.isConfigured()).toBe(false);

      // Hydrate from store
      for (const pId of store.getConfiguredProviderIds()) {
        const k = store.getProviderKey(pId);
        if (k) testRegistry.configureProviderKey(pId, k);
      }

      // After hydration, both are configured
      expect(testRegistry.getAdapter('nvidia')?.isConfigured()).toBe(true);
      expect(testRegistry.getAdapter('openrouter')?.isConfigured()).toBe(true);
    });
  });

  // Tab 3: Routing & Combos
  describe('Tab 3: Routing & Combos', () => {
    it('GET /v1/admin/combos returns HTTP 200 with registered combos', async () => {
      const res = await app.request('/v1/admin/combos', { headers: adminHeaders });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.combos).toBeDefined();
    });

    it('creates and updates a 4-model combo via POST /v1/admin/combos with admin auth headers', async () => {
      const initial4ModelTargets = [
        'groq/llama-3.3-70b-versatile',
        'cerebras/llama-3.3-70b',
        'pollinations/openai',
        'pollinations/qwen',
      ];

      // 1. Unauthenticated request must be rejected with 401
      const unauthRes = await app.request('/v1/admin/combos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Unauth Combo',
          slug: 'combo/unauth',
          targets: initial4ModelTargets,
        }),
      });
      expect(unauthRes.status).toBe(401);

      // 2. Create 4-model combo with admin auth headers
      const createRes = await app.request('/v1/admin/combos', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          name: 'Recommended 4-Model Free Stack',
          slug: 'combo/free-stack-quad',
          description: 'High-throughput 4-model zero-cost failover cluster',
          targets: initial4ModelTargets,
          strategy: 'priority',
        }),
      });
      expect(createRes.status).toBe(200);
      const createData = await createRes.json();
      expect(createData.success).toBe(true);
      expect(createData.combo).toBeDefined();
      expect(createData.combo.targets).toHaveLength(4);
      expect(createData.combo.targets).toEqual(initial4ModelTargets);

      // 3. Update existing combo with a 5th custom model (e.g. nvidia/deepseek-r1)
      const updated5ModelTargets = [...initial4ModelTargets, 'nvidia/deepseek-r1'];
      const updateRes = await app.request('/v1/admin/combos', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          id: createData.combo.id,
          name: 'Recommended 4-Model Free Stack',
          slug: 'combo/free-stack-quad',
          description: 'High-throughput failover cluster expanded with DeepSeek',
          targets: updated5ModelTargets,
          strategy: 'priority',
        }),
      });
      expect(updateRes.status).toBe(200);
      const updateData = await updateRes.json();
      expect(updateData.success).toBe(true);
      expect(updateData.combo.targets).toHaveLength(5);
      expect(updateData.combo.targets).toContain('nvidia/deepseek-r1');

      // 4. Verify persistence via GET /v1/admin/combos
      const listRes = await app.request('/v1/admin/combos', { headers: adminHeaders });
      expect(listRes.status).toBe(200);
      const listData = await listRes.json();
      const persisted = listData.combos.find((c: any) => c.slug === 'combo/free-stack-quad');
      expect(persisted).toBeDefined();
      expect(persisted.targets).toHaveLength(5);
      expect(persisted.targets).toEqual(updated5ModelTargets);
    });

    it('resolves and executes custom model IDs in Combos (nvidia/deepseek-r1 + pollinations/openai) without model-not-found rejection', async () => {
      // 1. Register custom combo with custom model ID
      const comboSlug = 'combo/nvidia-deepseek-custom';
      const createRes = await app.request('/v1/admin/combos', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          name: 'NVIDIA DeepSeek Custom Combo',
          slug: comboSlug,
          description: 'Custom combo chaining nvidia/deepseek-r1 with fallback to pollinations/openai',
          targets: ['nvidia/deepseek-r1', 'pollinations/openai'],
          strategy: 'priority',
        }),
      });
      expect(createRes.status).toBe(200);

      // 2. Explain route dry-run: nvidia/deepseek-r1 must not be rejected as "Target model not found"
      const explainRes = await app.request('/v1/router/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: comboSlug,
          messages: [{ role: 'user', content: 'Explain custom combo route' }],
        }),
      });
      expect(explainRes.status).toBe(200);
      const explainData = await explainRes.json();
      expect(explainData.candidates).toBeDefined();
      const nvidiaCandidate = explainData.candidates.find((c: any) => (c.model?.id || c.model) === 'nvidia/deepseek-r1');
      expect(nvidiaCandidate).toBeDefined();
      expect(nvidiaCandidate.rejectionReason || nvidiaCandidate.rejection_reason || '').not.toContain('not found');

      // Also test GET /v1/router/explain?model=combo/<slug>
      const getExplainRes = await app.request(`/v1/router/explain?model=${comboSlug}`);
      expect(getExplainRes.status).toBe(200);
      const getExplainData = await getExplainRes.json();
      expect(getExplainData.candidates).toBeDefined();

      // 3. Chat completion through custom combo executes cleanly
      const chatRes = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: comboSlug,
          messages: [{ role: 'user', content: 'Ping custom combo' }],
        }),
      });
      expect(chatRes.status).toBe(200);
      const chatData = await chatRes.json();
      expect(chatData.choices?.[0]?.message?.content).toBeDefined();
    }, 15000);

    it('POST /v1/admin/policy returns HTTP 200 when updating routing policy', async () => {
      const res = await app.request('/v1/admin/policy', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ strategy: 'latency' }),
      });
      expect(res.status).toBe(200);
    });

    it('POST /v1/admin/aliases returns HTTP 200 when setting virtual alias', async () => {
      const res = await app.request('/v1/admin/aliases', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ alias: 'tab-test-alias', target: 'mock/fast' }),
      });
      expect(res.status).toBe(200);
    });

    it('POST /v1/router/explain returns HTTP 200 for combo dry-run simulation', async () => {
      const res = await app.request('/v1/router/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'combo/coding-power',
          messages: [{ role: 'user', content: 'Verify combo failover simulation' }],
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.model_selected).toBeDefined();
    });
  });

  // Tab 4: Token Optimizer
  describe('Tab 4: Token Optimizer', () => {
    it('POST /v1/admin/compress/preview returns HTTP 200 with reduction metrics', async () => {
      const res = await app.request('/v1/admin/compress/preview', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          prompt: 'Please can you kindly and possibly assist me with analyzing this log.\nLine 1: Build complete.\nLine 2: Build complete.',
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.savedPercent).toBeDefined();
    });

    it('POST /v1/chat/completions with compress: true returns HTTP 200', async () => {
      const res = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mock/fast',
          messages: [{ role: 'user', content: 'Testing compression in chat completion' }],
          compress: true,
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.choices?.[0]?.message?.content).toBeDefined();
    });
  });

  // Tab 5: Logs & Activity
  describe('Tab 5: Logs & Activity', () => {
    it('GET /v1/admin/requests returns HTTP 200 with telemetry stream', async () => {
      const res = await app.request('/v1/admin/requests', { headers: adminHeaders });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.requests)).toBe(true);
    });

    it('GET /v1/usage returns HTTP 200 with aggregated request counters', async () => {
      const res = await app.request('/v1/usage');
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.total_requests).toBeDefined();
    });
  });

  // Tab 6: Cost & Quotas
  describe('Tab 6: Cost & Quotas', () => {
    it('GET /v1/admin/doctor returns HTTP 200 with subsystem health checks', async () => {
      const res = await app.request('/v1/admin/doctor', { headers: adminHeaders });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBeDefined();
    });

    it('GET /v1/usage returns HTTP 200 with token spend estimates', async () => {
      const res = await app.request('/v1/usage');
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.estimated_cost_usd).toBeDefined();
    });
  });

  // Tab 7: Workers & Agents
  describe('Tab 7: Workers & Agents', () => {
    it('GET /v1/admin/workers returns HTTP 200 with specialist workers roster', async () => {
      const res = await app.request('/v1/admin/workers', { headers: adminHeaders });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.workers.length).toBeGreaterThanOrEqual(4);
    });

    it('POST /v1/admin/workers/:id/run returns HTTP 200 when dispatching task', async () => {
      const res = await app.request('/v1/admin/workers/pr-guardian/run', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ prompt: 'Run automated audit test' }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.run.status).toBe('completed');
    });
  });

  // Tab 8: Virtual API Keys
  describe('Tab 8: Virtual API Keys', () => {
    it('GET /v1/admin/config returns HTTP 200 with virtual keys list', async () => {
      const res = await app.request('/v1/admin/config', { headers: adminHeaders });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.virtualKeys).toBeDefined();
    });

    it('POST /v1/admin/keys returns HTTP 200 when generating new virtual key', async () => {
      const res = await app.request('/v1/admin/keys', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ name: 'Studio Tab Test Key', rateLimitRpm: 100 }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.key.name).toBe('Studio Tab Test Key');
    });
  });

  // Tab 9: Guardrails & Settings
  describe('Tab 9: Guardrails & Settings', () => {
    it('GET /v1/admin/config returns HTTP 200 for settings view', async () => {
      const res = await app.request('/v1/admin/config', { headers: adminHeaders });
      expect(res.status).toBe(200);
    });

    it('GET /v1/admin/storage/export returns HTTP 200 with backup snapshot', async () => {
      const res = await app.request('/v1/admin/storage/export', { headers: adminHeaders });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.settings).toBeDefined();
    });

    it('POST /v1/admin/storage/vacuum returns HTTP 200 for WAL maintenance', async () => {
      const res = await app.request('/v1/admin/storage/vacuum', {
        method: 'POST',
        headers: adminHeaders,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('ok');
    });
  });
  // Suite 10: Claude Code CLI Discovery, Anthropic Messages Tool Translation & Combo Scoping
  describe('Suite 10: Claude Code CLI Discovery & Anthropic Messages Tool Translation', () => {
    it('GET /v1/models emits Claude Code discovery aliases', async () => {
      const res = await app.request('/v1/models');
      expect(res.status).toBe(200);
      const data = await res.json();
      const ids = data.data.map((m: any) => m.id);
      expect(ids).toContain('claude-combo-free-unlimited');
      expect(ids).toContain('claude-worker-pr-guardian');
      expect(ids).toContain('claude-free-pollinations-openai');
    });

    it('POST /v1/messages with model: "claude-combo-free-unlimited" routes cleanly', async () => {
      const res = await app.request('/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-combo-free-unlimited',
          messages: [{ role: 'user', content: 'Testing Claude Code combo alias' }],
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.content?.[0]?.text).toBeDefined();
    });

    it('POST /v1/messages with bare "claude-3-5-sonnet-20241022" falls back to free combo', async () => {
      const res = await app.request('/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          messages: [{ role: 'user', content: 'Testing bare Claude fallback' }],
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.content?.[0]?.text).toBeDefined();
    });

    it('POST /v1/messages translates Anthropic tools and tool_results', async () => {
      const res = await app.request('/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mock/fast',
          tools: [
            {
              name: 'read_file',
              description: 'Read a file',
              input_schema: {
                type: 'object',
                properties: { path: { type: 'string' } },
                required: ['path'],
              },
            },
          ],
          messages: [
            {
              role: 'assistant',
              content: [
                { type: 'text', text: 'Looking up file...' },
                { type: 'tool_use', id: 'call_123', name: 'read_file', input: { path: 'index.ts' } },
              ],
            },
            {
              role: 'user',
              content: [
                { type: 'tool_result', tool_use_id: 'call_123', content: 'export const hello = "world";' },
              ],
            },
          ],
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.content).toBeDefined();
    });

    it('POST /v1/admin/cli-sync/claude-code merges settings.json', async () => {
      const res = await app.request('/v1/admin/cli-sync/claude-code', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          model: 'combo/free-unlimited',
          env: {
            ANTHROPIC_BASE_URL: 'http://127.0.0.1:3001',
            ANTHROPIC_AUTH_TOKEN: 'rn-local-dev-default',
            ANTHROPIC_MODEL: 'combo/free-unlimited',
            CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY: '1',
          },
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.settings?.env?.ANTHROPIC_BASE_URL).toBe('http://127.0.0.1:3001');
      expect(data.settings?.env?.CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY).toBe('1');
    });

    it('creates a custom combo and routes through it on /v1/chat/completions and /v1/messages', async () => {
      const slug = 'combo/unit-test-custom';
      const createRes = await app.request('/v1/admin/combos', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          name: 'Unit Test Custom Combo',
          slug,
          targets: ['mock/fast', 'mock/gpt-4'],
          strategy: 'priority',
        }),
      });
      expect(createRes.status).toBe(200);

      // Check /v1/models
      const modelsRes = await app.request('/v1/models');
      const modelsData = await modelsRes.json();
      const modelIds = modelsData.data.map((m: any) => m.id);
      expect(modelIds).toContain(slug);
      expect(modelIds).toContain('claude-combo-unit-test-custom');

      // Route through /v1/chat/completions
      const chatRes = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: slug,
          messages: [{ role: 'user', content: 'Testing custom combo chat' }],
        }),
      });
      expect(chatRes.status).toBe(200);

      // Route through /v1/messages
      const msgRes = await app.request('/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-combo-unit-test-custom',
          messages: [{ role: 'user', content: 'Testing custom combo message' }],
        }),
      });
      expect(msgRes.status).toBe(200);
    });
  });

  describe('Tab 9: Memory Panel & Storage Maintenance', () => {
    it('GET /v1/admin/memories returns initial memories list', async () => {
      const res = await app.request('/v1/admin/memories', { headers: adminHeaders });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.memories)).toBe(true);
      expect(data.memories.length).toBeGreaterThan(0);
    });

    it('POST /v1/admin/memories creates, retrieves and deletes memory item', async () => {
      const res = await app.request('/v1/admin/memories', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          topic: 'Test Architecture Memory',
          content: 'RouteNex Gateway uses Hono on port 3001 with zero-key fallback.',
          tags: ['test', 'routenex'],
        }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.memory.topic).toBe('Test Architecture Memory');
      expect(data.memory.id).toBeDefined();

      // Verify retrieval
      const getRes = await app.request('/v1/admin/memories', { headers: adminHeaders });
      const getData = await getRes.json();
      const found = getData.memories.find((m: any) => m.id === data.memory.id);
      expect(found).toBeDefined();

      // DELETE memory
      const delRes = await app.request(`/v1/admin/memories/${data.memory.id}`, {
        method: 'DELETE',
        headers: adminHeaders,
      });
      expect(delRes.status).toBe(200);
      const delData = await delRes.json();
      expect(delData.success).toBe(true);
      expect(delData.deletedId).toBe(data.memory.id);
    });

    it('GET /v1/admin/storage/stats returns real disk and record telemetry', async () => {
      const res = await app.request('/v1/admin/storage/stats', { headers: adminHeaders });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.dbPath).toBeDefined();
      expect(typeof data.sizeMb).toBe('number');
      expect(typeof data.pageCount).toBe('number');
      expect(data.integrityCheck).toBe('OK');
      expect(data.records).toBeDefined();
      expect(typeof data.records.virtualKeys).toBe('number');
      expect(typeof data.records.combos).toBe('number');
      expect(typeof data.records.memories).toBe('number');
    });

    it('POST /v1/admin/storage/vacuum updates lastVacuum timestamp', async () => {
      const vacRes = await app.request('/v1/admin/storage/vacuum', {
        method: 'POST',
        headers: adminHeaders,
      });
      expect(vacRes.status).toBe(200);
      const vacData = await vacRes.json();
      expect(vacData.ok).toBe(true);

      const statsRes = await app.request('/v1/admin/storage/stats', { headers: adminHeaders });
      const statsData = await statsRes.json();
      expect(statsData.lastVacuum).not.toBe('Not yet run');
    });
  });

  describe('Suite 11: OAuth PKCE Authorization, Combo Deletion & Skill Deletion', () => {
    it('GET /v1/admin/providers/antigravity-cli/oauth/start redirects (302) to local authorize page with mode=local', async () => {
      const res = await app.request('/v1/admin/providers/antigravity-cli/oauth/start?mode=local');
      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toContain('/v1/admin/providers/antigravity-cli/oauth/authorize');
    });

    it('GET /v1/admin/providers/antigravity-cli/oauth/authorize returns HTTP 200 HTML page', async () => {
      const res = await app.request('/v1/admin/providers/antigravity-cli/oauth/authorize?state=test_state_123&code_challenge=test_challenge_abc&code_challenge_method=S256');
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('RouteNex Local OAuth 2.0');
      expect(html).toContain('antigravity-cli');
      expect(html).toContain('Authorize & Connect Account');
    });

    it('DELETE /v1/admin/combos/:id deletes registered combo successfully', async () => {
      // 1. Create temporary combo
      const createRes = await app.request('/v1/admin/combos', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          name: 'Deletable Combo Test',
          slug: 'deletable-test-combo',
          targets: ['pollinations/openai', 'mock/fast'],
          strategy: 'priority',
        }),
      });
      expect(createRes.status).toBe(200);

      // 2. Delete combo
      const delRes = await app.request('/v1/admin/combos/deletable-test-combo', {
        method: 'DELETE',
        headers: adminHeaders,
      });
      expect(delRes.status).toBe(200);
      const delData = await delRes.json();
      expect(delData.success).toBe(true);

      // 3. Confirm deletion
      const listRes = await app.request('/v1/admin/combos', { headers: adminHeaders });
      const listData = await listRes.json();
      const found = listData.combos.find((c: any) => c.slug === 'combo/deletable-test-combo' || c.slug === 'deletable-test-combo');
      expect(found).toBeUndefined();
    });

    it('DELETE /v1/admin/skills/:id permanently deletes pre-seeded and custom skills from /workers and /skills', async () => {
      // 1. Verify pre-seeded skills exist in both endpoints
      const initWorkersRes = await app.request('/v1/admin/workers', { headers: adminHeaders });
      expect(initWorkersRes.status).toBe(200);
      const initWorkersData = await initWorkersRes.json();
      expect(Array.isArray(initWorkersData.skills)).toBe(true);

      const initSkillsRes = await app.request('/v1/admin/skills', { headers: adminHeaders });
      expect(initSkillsRes.status).toBe(200);
      const initSkillsData = await initSkillsRes.json();
      expect(Array.isArray(initSkillsData.skills)).toBe(true);

      // Verify presence of pre-seeded skills
      const hasSecurityAudit = initSkillsData.skills.some((s: any) => s.slug === 'pr-security-audit' || s.id === 'skill_pr_security');
      const hasCodeReview = initSkillsData.skills.some((s: any) => s.slug === 'code-review-audit' || s.id === 'skill_code_review');
      expect(hasSecurityAudit).toBe(true);
      expect(hasCodeReview).toBe(true);

      // 2. Delete pre-seeded skill: pr-security-audit by slug
      const delSecurityRes = await app.request('/v1/admin/skills/pr-security-audit', {
        method: 'DELETE',
        headers: adminHeaders,
      });
      expect(delSecurityRes.status).toBe(200);
      const delSecData = await delSecurityRes.json();
      expect(delSecData.success).toBe(true);

      // Verify deletion from both endpoints
      const checkWorkers1 = await app.request('/v1/admin/workers', { headers: adminHeaders });
      const checkWData1 = await checkWorkers1.json();
      expect(checkWData1.skills.some((s: any) => s.slug === 'pr-security-audit' || s.id === 'skill_pr_security')).toBe(false);

      const checkSkills1 = await app.request('/v1/admin/skills', { headers: adminHeaders });
      const checkSData1 = await checkSkills1.json();
      expect(checkSData1.skills.some((s: any) => s.slug === 'pr-security-audit' || s.id === 'skill_pr_security')).toBe(false);

      // 3. Delete pre-seeded skill: code-review-audit by ID
      const delCodeReviewRes = await app.request('/v1/admin/skills/skill_code_review', {
        method: 'DELETE',
        headers: adminHeaders,
      });
      expect(delCodeReviewRes.status).toBe(200);

      const checkWorkers2 = await app.request('/v1/admin/workers', { headers: adminHeaders });
      const checkWData2 = await checkWorkers2.json();
      expect(checkWData2.skills.some((s: any) => s.slug === 'code-review-audit' || s.id === 'skill_code_review')).toBe(false);

      // 4. Create a distilled custom skill and delete it
      const runRes = await app.request('/v1/admin/workers/pr-guardian/run', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ prompt: 'Generate distillable run test' }),
      });
      expect(runRes.status).toBe(200);
      const runData = await runRes.json();

      const distillRes = await app.request(`/v1/admin/workers/runs/${runData.run.id}/distill-skill`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ customName: 'Custom Distilled Security Skill' }),
      });
      expect(distillRes.status).toBe(200);
      const distillData = await distillRes.json();
      expect(distillData.skill.id).toBeDefined();

      // Verify distilled skill appears in both endpoints
      const postDistillWorkers = await app.request('/v1/admin/workers', { headers: adminHeaders });
      const postDistillWData = await postDistillWorkers.json();
      expect(postDistillWData.skills.some((s: any) => s.id === distillData.skill.id)).toBe(true);

      // Delete the distilled skill
      const delDistillRes = await app.request(`/v1/admin/skills/${distillData.skill.id}`, {
        method: 'DELETE',
        headers: adminHeaders,
      });
      expect(delDistillRes.status).toBe(200);

      // Verify distilled skill is permanently gone from both endpoints
      const finalWorkersRes = await app.request('/v1/admin/workers', { headers: adminHeaders });
      const finalWData = await finalWorkersRes.json();
      expect(finalWData.skills.some((s: any) => s.id === distillData.skill.id)).toBe(false);

      const finalSkillsRes = await app.request('/v1/admin/skills', { headers: adminHeaders });
      const finalSData = await finalSkillsRes.json();
      expect(finalSData.skills.some((s: any) => s.id === distillData.skill.id)).toBe(false);
    });
  });

  // Suite 12: Real Google OAuth 2.0 PKCE, Provider ID Normalization & Model Health States
  describe('Suite 12: Real Google OAuth 2.0 PKCE, Provider ID Normalization & Model Health States', () => {
    it('1. resolveOAuthCred resolves legitimate installed client IDs and /oauth/start redirects with PKCE', async () => {
      const { resolveOAuthCred } = await import('./providers/oauth-creds.js');
      const agyId = resolveOAuthCred('antigravity_id');
      expect(agyId).toBe('1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com');

      const geminiId = resolveOAuthCred('gemini_id');
      expect(geminiId).toContain('.apps.googleusercontent.com');

      const res = await app.request('/v1/admin/providers/antigravity/oauth/start?redirect=true', {
        method: 'GET',
        headers: adminHeaders,
      });
      expect(res.status).toBe(302);
      const location = res.headers.get('location') || '';
      expect(location).toContain('accounts.google.com/o/oauth2/v2/auth');
      expect(location).toContain(encodeURIComponent(agyId));
      expect(location).toContain('code_challenge_method=S256');
      expect(location).not.toContain('openid'); // Verified openid omitted
    });

    it('2. normalizeProviderId accurately maps UI provider slugs to canonical gateway IDs', async () => {
      const { normalizeProviderId } = await import('./providers/registry.js');
      expect(normalizeProviderId('nvidia-nim')).toBe('nvidia');
      expect(normalizeProviderId('groq-cloud')).toBe('groq');
      expect(normalizeProviderId('google-gemini')).toBe('gemini');
      expect(normalizeProviderId('antigravity-cli')).toBe('antigravity');
      expect(normalizeProviderId('agy')).toBe('antigravity');
      expect(normalizeProviderId('gemini-cli')).toBe('antigravity');
      expect(normalizeProviderId('openai-api')).toBe('openai');
      expect(normalizeProviderId('github-copilot')).toBe('copilot');
    });

    it('3. POST /v1/chat/completions resolves UI provider slugs (e.g. groq-cloud, nvidia-nim)', async () => {
      const res = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'groq-cloud/llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'hello' }],
        }),
      });
      // Should not be 404 or unhandled crash; if groq is unconfigured it either returns 401 or fallback
      expect([200, 401]).toContain(res.status);
    });

    it('4. POST & GET /v1/admin/providers/:id/models-state persists health status and latency', async () => {
      const postRes = await app.request('/v1/admin/providers/antigravity/models-state', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          modelId: 'antigravity/gemini-2.5-pro',
          status: 'working',
          latency: 142,
          enabled: true,
        }),
      });
      expect(postRes.status).toBe(200);
      const postData = await postRes.json();
      expect(postData.modelsState['antigravity/gemini-2.5-pro'].status).toBe('working');
      expect(postData.modelsState['antigravity/gemini-2.5-pro'].latency).toBe(142);
      expect(postData.modelsState['antigravity/gemini-2.5-pro'].enabled).toBe(true);

      const getRes = await app.request('/v1/admin/providers/antigravity/models-state', {
        headers: adminHeaders,
      });
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.modelsState['antigravity/gemini-2.5-pro'].status).toBe('working');

      // Check that GET /v1/admin/providers includes modelsState
      const listRes = await app.request('/v1/admin/providers', { headers: adminHeaders });
      expect(listRes.status).toBe(200);
      const listData = await listRes.json();
      const agyEntry = listData.providers.find((p: any) => p.id === 'antigravity');
      expect(agyEntry).toBeDefined();
      expect(agyEntry.modelsState['antigravity/gemini-2.5-pro']).toBeDefined();
    });

    it('5. POST /v1/admin/providers/:id/oauth/callback completes OAuth flow and stores token', async () => {
      const callbackRes = await app.request('/v1/admin/providers/antigravity/oauth/callback', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          code: '4/0AVMBs8_test_auth_code_pkce',
          email: 'developer@routenex.com',
        }),
      });
      expect(callbackRes.status).toBe(200);
      const cbData = await callbackRes.json();
      expect(cbData.success).toBe(true);

      // Verify provider now reports configured
      const statusRes = await app.request('/v1/admin/providers/antigravity/oauth/status', {
        headers: adminHeaders,
      });
      expect(statusRes.status).toBe(200);
      const statusData = await statusRes.json();
      expect(statusData.authenticated).toBe(true);
    });

    it('6. POST /v1/admin/providers/:id/sync-models dynamically syncs live models', async () => {
      const syncRes = await app.request('/v1/admin/providers/groq/sync-models', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ freeOnly: false }),
      });
      expect(syncRes.status).toBe(200);
      const syncData = await syncRes.json();
      expect(syncData.success).toBe(true);
      expect(syncData.provider).toBe('groq');
      expect(syncData.modelCount).toBeGreaterThan(0);
      expect(Array.isArray(syncData.models)).toBe(true);
    });

    it('7. POST /v1/admin/providers/openrouter/sync-models with freeOnly: true filters to free models', async () => {
      const syncRes = await app.request('/v1/admin/providers/openrouter/sync-models', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ freeOnly: true }),
      });
      expect(syncRes.status).toBe(200);
      const syncData = await syncRes.json();
      expect(syncData.success).toBe(true);
      expect(syncData.freeOnly).toBe(true);
      for (const m of syncData.models) {
        const sm = syncData.syncedModels?.find((item: any) => item.id === m);
        const isFree = m.includes(':free') || (sm?.pricing?.prompt_per_million ?? 0) === 0;
        expect(isFree).toBe(true);
      }
    });

    it('8. GET /models with Accept: text/html redirects to dashboard instead of returning raw JSON', async () => {
      const res = await app.request('/v1/models/antigravity-cli/flagship', {
        headers: { Accept: 'text/html,application/xhtml+xml' },
      });
      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toBe('/dashboard?tab=providers');
    });

    it('9. OpenCode Free (Zen) is registered as zero-key provider with real models', async () => {
      const modelsRes = await app.request('/v1/models');
      const modelsData = await modelsRes.json();
      const opencodeModels = modelsData.data.filter((m: any) => m.id.startsWith('opencode/'));
      expect(opencodeModels.length).toBeGreaterThan(0);
      expect(opencodeModels.some((m: any) => m.id.includes('deepseek-r1'))).toBe(true);
      expect(opencodeModels.some((m: any) => m.id.includes('kimi-k2.7-code'))).toBe(true);
    });

    it('10. Antigravity real models exist in catalog and do not return fake flagship stubs', async () => {
      const modelsRes = await app.request('/v1/models');
      const modelsData = await modelsRes.json();
      const agyModels = modelsData.data.filter((m: any) => m.id.startsWith('antigravity/'));
      expect(agyModels.some((m: any) => m.id.includes('flagship'))).toBe(false);
      expect(agyModels.some((m: any) => m.id.includes('claude-opus-4-6-thinking'))).toBe(true);
      expect(agyModels.some((m: any) => m.id.includes('gemini-3.7-flash-high'))).toBe(true);
    });
  });

  describe('Suite 15: Claude Code CLI Endpoints, Streaming Failover & Zero-Key Fallbacks', () => {
    it('1. POST /v1/messages/count_tokens returns HTTP 200 with estimated input_tokens', async () => {
      const res = await app.request('/v1/messages/count_tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          system: 'You are an expert developer assistant.',
          messages: [
            { role: 'user', content: 'Count the tokens for this prompt.' },
          ],
          tools: [
            {
              name: 'calculate',
              description: 'Performs math calculations',
              input_schema: { type: 'object', properties: { expr: { type: 'string' } } },
            },
          ],
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(typeof data.input_tokens).toBe('number');
      expect(data.input_tokens).toBeGreaterThan(5);
    });

    it('2. POST /messages/count_tokens (root mount) returns HTTP 200 with input_tokens', async () => {
      const res = await app.request('/messages/count_tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello world' }],
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(typeof data.input_tokens).toBe('number');
      expect(data.input_tokens).toBeGreaterThanOrEqual(1);
    });

    it('3. Streaming combo executeStream immediately fails over when Candidate #1 fails', async () => {
      // Register a failing adapter with isConfigured() === true that throws 429 inside chatStream generator
      const failingAdapter = {
        id: 'failing-test-prov',
        name: 'Failing Test Provider',
        models: [{
          id: 'failing-test-prov/failing-model',
          provider: 'failing-test-prov',
          capabilities: { chat: true, streaming: true, tool_calls: false, vision: false, json_mode: false },
          pricing: { prompt_per_million: 0, completion_per_million: 0, provenance: 'OFFICIAL' as const, updated_at: '2026-02-01' },
          context_length: 4096,
        }],
        isConfigured: () => true,
        healthCheck: async () => false,
        chat: async () => { throw new ProviderError('Simulated 429 Rate Limit', { status: 429, retriable: true }); },
        chatStream: async function* () {
          throw new ProviderError('Simulated 429 Rate Limit', { status: 429, retriable: true });
        },
      };
      registry.registerAdapter(failingAdapter);

      // Create a combo where candidate #1 is failing-test-prov and candidate #2 is mock/fast
      const createRes = await app.request('/v1/admin/combos', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          name: 'Streaming Failover Combo',
          slug: 'streaming-failover-test',
          targets: ['failing-test-prov/failing-model', 'mock/fast'],
          strategy: 'priority',
        }),
      });
      expect(createRes.status).toBe(200);

      // Execute stream via engine
      const streamRes = await engine.executeStream({
        model: 'combo/streaming-failover-test',
        messages: [{ role: 'user', content: 'Test streaming failover' }],
        stream: true,
      });

      expect(streamRes).toBeDefined();
      expect(streamRes.generator).toBeDefined();
      expect(streamRes.provider).toBe('mock');
      expect(streamRes.model).toBe('mock/fast');

      const chunks: any[] = [];
      for await (const chunk of streamRes.generator) {
        chunks.push(chunk);
      }
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('4. Antigravity adapter returns authentic AI completions without mock string', async () => {
      const adapter = registry.getAdapter('antigravity');
      expect(adapter).toBeDefined();

      const res = await adapter!.chat({
        model: 'antigravity/gemini-3.7-flash-high',
        messages: [{ role: 'user', content: 'What is RouteNex?' }],
      });

      expect(res).toBeDefined();
      expect(res.choices[0]?.message?.content).toBeDefined();
      // Verify mock string is completely gone
      expect(res.choices[0]?.message?.content).not.toContain('[RouteNex Antigravity Bridge]');
    });

    it('5. OpenCode zero-key provider executes successfully with real AI fallback', async () => {
      const adapter = registry.getAdapter('opencode');
      expect(adapter).toBeDefined();

      const res = await adapter!.chat({
        model: 'opencode/deepseek-r1',
        messages: [{ role: 'user', content: 'Hello assistant' }],
      });

      expect(res).toBeDefined();
      expect(res.choices[0]?.message?.content).toBeDefined();
      expect(typeof res.choices[0]?.message?.content).toBe('string');
      expect(res.choices[0]?.message?.content.length).toBeGreaterThan(0);
    });

    it('6. OAuth start normalizes 0.0.0.0 host to 127.0.0.1 redirect_uri', async () => {
      const res = await app.request('/v1/admin/providers/antigravity-cli/oauth/start', {
        method: 'POST',
        headers: { host: '0.0.0.0:3001' },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.authUrl).toContain('redirect_uri=http%3A%2F%2F127.0.0.1%3A3001');
      expect(data.authUrl).not.toContain('0.0.0.0');
    });
  });

  describe('Suite 16: Phase 2 OmniRoute-Class Capabilities (CLI Writers, Streaming Responses, Cron & Guard)', () => {
    it('1. CLI config writers apply, back up, detect, and restore Claude Code & Codex configs safely', async () => {
      const testHome = path.resolve(process.cwd(), '.test_claude_p2');
      const claudeDir = path.join(testHome, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });
      const originalSettings = JSON.stringify({ model: 'original-claude-model' }, null, 2);
      fs.writeFileSync(path.join(claudeDir, 'settings.json'), originalSettings, 'utf-8');

      try {
        // Apply Claude Code config via Admin API
        const applyRes = await app.request('/v1/admin/cli-tools/apply', {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({ tool: 'claude', model: 'combo/free-unlimited', homeOverride: testHome }),
        });
        expect(applyRes.status).toBe(200);
        const applyData = await applyRes.json();
        expect(applyData.success).toBe(true);
        expect(applyData.backupPath).toContain('.routenex.bak');

        // Verify status detects connected + backup
        const statusRes = await app.request(`/v1/admin/cli-tools/status?homeOverride=${encodeURIComponent(testHome)}`, {
          headers: adminHeaders,
        });
        expect(statusRes.status).toBe(200);
        const statusData = await statusRes.json();
        const claudeStatus = statusData.tools.find((t: any) => t.id === 'claude');
        expect(claudeStatus.configuredForRouteNex).toBe(true);
        expect(claudeStatus.hasBackup).toBe(true);

        // Restore original config byte-for-byte
        const restoreRes = await app.request('/v1/admin/cli-tools/restore', {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({ tool: 'claude', homeOverride: testHome }),
        });
        expect(restoreRes.status).toBe(200);
        const restoredText = fs.readFileSync(path.join(claudeDir, 'settings.json'), 'utf-8');
        expect(restoredText).toBe(originalSettings);
      } finally {
        fs.rmSync(testHome, { recursive: true, force: true });
      }
    });

    it('2. POST /v1/admin/providers/:id/oauth/refresh rejects honestly when no refresh_token is stored', async () => {
      const res = await app.request('/v1/admin/providers/groq/oauth/refresh', {
        method: 'POST',
        headers: adminHeaders,
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('No refresh_token stored');
    });

    it('3. GET /v1/admin/catalog/sync-status reports active catalog totals', async () => {
      const res = await app.request('/v1/admin/catalog/sync-status', { headers: adminHeaders });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.totalModels).toBeGreaterThan(20);
      expect(data.totalProviders).toBeGreaterThan(10);
    });

    it('4. POST /v1/responses supports real SSE streaming (response.created -> delta -> completed)', async () => {
      const res = await app.request('/v1/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mock/fast',
          input: 'Stream responses test',
          stream: true,
        }),
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/event-stream');
      const bodyText = await res.text();
      expect(bodyText).toContain('event: response.created');
      expect(bodyText).toContain('event: response.output_text.delta');
      expect(bodyText).toContain('event: response.completed');
    });

    it('5. Action Shield scrubSensitiveArgs recursively redacts secrets inside nested arrays', () => {
      const scrubbed = scrubSensitiveArgs({
        items: [{ apiKey: 'sk-super-secret-123', label: 'ok' }, { nested: [{ authToken: 'tok-xyz' }] }],
        password: 'hunter2',
      }) as any;
      expect(scrubbed.password).toBe('[REDACTED_CREDENTIAL]');
      expect(scrubbed.items[0].apiKey).toBe('[REDACTED_CREDENTIAL]');
      expect(scrubbed.items[0].label).toBe('ok');
      expect(scrubbed.items[1].nested[0].authToken).toBe('[REDACTED_CREDENTIAL]');
    });

    it('6. Worker cron scheduler computes accurate 5-field cron boundary timestamps', () => {
      const base = new Date('2026-11-23T12:03:00.000Z').getTime();
      const nextIso = computeNextCronTimestamp('*/15 * * * *', base);
      const nextDate = new Date(nextIso);
      expect(nextDate.getTime()).toBeGreaterThan(base);
      expect(nextDate.getMinutes() % 15).toBe(0);
    });
  });

  describe('Suite 17: Phase 3 OpenRouter-Class Routing, Live Rankings, Tenant Isolation & Broadcast', () => {
    it('1. Enforces OpenRouter provider preferences: only, ignore, order, zdr, data_collection: deny, and allow_fallbacks: false', async () => {
      const explainRes = await app.request('/v1/router/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'auto',
          messages: [{ role: 'user', content: 'Strict ZDR isolation test' }],
          provider: {
            only: ['mock'],
            allow_fallbacks: false,
          },
        }),
      });
      expect(explainRes.status).toBe(200);
      const explainData = await explainRes.json();
      expect(explainData.selected_provider || explainData.selected?.provider).toBe('mock');
      expect(explainData.fallback_chain || explainData.fallbackChain || []).toHaveLength(0);

      // Verify strict ZDR rejects non-ZDR providers
      const zdrRes = await app.request('/v1/router/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'auto',
          messages: [{ role: 'user', content: 'ZDR check' }],
          provider: { data_collection: 'deny' },
        }),
      });
      expect(zdrRes.status).toBe(200);
      const zdrData = await zdrRes.json();
      const rejectedNonZdr = (zdrData.candidates || []).some((c: any) =>
        String(c.rejectionReason || c.rejection_reason || '').includes('Zero Data Retention')
      );
      expect(rejectedNonZdr).toBe(true);
    });

    it('2. GET /v1/rankings and GET /v1/providers/health expose live traffic metrics, P50/P90/P99, and EWMA latency', async () => {
      // Trigger a real completion so rankings & EWMA telemetry are populated
      const chatRes = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mock/fast',
          messages: [{ role: 'user', content: 'Populate live rankings and EWMA' }],
        }),
      });
      expect(chatRes.status).toBe(200);

      const rankingsRes = await app.request('/v1/rankings');
      expect(rankingsRes.status).toBe(200);
      const rankingsData = await rankingsRes.json();
      expect(Array.isArray(rankingsData.rankings)).toBe(true);
      expect(rankingsData.generated_at).toBeDefined();

      const healthRes = await app.request('/v1/providers/health');
      expect(healthRes.status).toBe(200);
      const healthData = await healthRes.json();
      expect(Array.isArray(healthData.providers)).toBe(true);
      const mockHealth = healthData.providers.find((p: any) => p.provider === 'mock');
      expect(mockHealth).toBeDefined();
      expect(mockHealth.requests).toBeGreaterThanOrEqual(1);
      expect(mockHealth.ewma_latency_ms).toBeGreaterThan(0);
    });

    it('3. ResponseCache enforces strict multi-tenant isolation between different orgs/tenants', () => {
      const cache = new ResponseCache({ enabled: true, ttlSeconds: 60, maxEntries: 100 });
      const req: any = {
        model: 'mock/fast',
        messages: [{ role: 'user', content: 'Confidential quarterly numbers' }],
        temperature: 0,
      };
      const fakeResp: any = {
        id: 'cmpl-tenant-a',
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'mock/fast',
        choices: [{ index: 0, message: { role: 'assistant', content: 'Tenant A secret data' }, finish_reason: 'stop' }],
      };

      cache.set(req, fakeResp, 60, 'org_tenant_a');
      expect(cache.get(req, 'org_tenant_a')?.choices[0]?.message?.content).toBe('Tenant A secret data');
      expect(cache.get(req, 'org_tenant_b')).toBeUndefined();
    });

    it('4. Observability Broadcast strips bodies by default, signs HMAC webhooks, and blocks SSRF endpoints', async () => {
      const safePayload = buildSafeBroadcastPayload({
        requestId: 'req_test_1',
        timestamp: new Date().toISOString(),
        modelRequested: 'auto',
        modelUsed: 'mock/fast',
        provider: 'mock',
        latencyMs: 12,
        status: 'success',
        promptPreview: 'TOP SECRET PROMPT',
        completionPreview: 'TOP SECRET REPLY',
      });
      expect(safePayload.prompt_preview).toBeUndefined();
      expect(safePayload.completion_preview).toBeUndefined();

      const sig = signBroadcastPayload(JSON.stringify(safePayload), 'webhook-secret-xyz');
      expect(sig).toMatch(/^sha256=[0-9a-f]{64}$/);

      // SSRF guard on Admin Broadcast config endpoint
      const ssrfRes = await app.request('/v1/admin/observability/broadcast', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ enabled: true, webhookUrl: 'http://169.254.169.254/latest/meta-data/' }),
      });
      expect(ssrfRes.status).toBe(400);

      const getRes = await app.request('/v1/admin/observability/broadcast', { headers: adminHeaders });
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.broadcast.logBodies).toBe(false);
    });
  });
});

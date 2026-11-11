import { describe, expect, it } from 'vitest';
import { createApp } from './server.js';
import type { AppConfig } from './config.js';

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

  const { app } = createApp(testConfig);

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
  });

  // Tab 3: Routing & Combos
  describe('Tab 3: Routing & Combos', () => {
    it('GET /v1/admin/combos returns HTTP 200 with registered combos', async () => {
      const res = await app.request('/v1/admin/combos', { headers: adminHeaders });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.combos).toBeDefined();
    });

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
});

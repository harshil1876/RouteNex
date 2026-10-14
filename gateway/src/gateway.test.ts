import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createApp } from './server.js';
import { MockProviderAdapter } from './providers/mock.js';
import { CircuitBreaker } from './router/circuit-breaker.js';
import { ProviderRegistry } from './providers/registry.js';
import { RoutingEngine } from './router/engine.js';
import { RequestStore } from './storage/sqlite.js';
import { PromptCompressor } from './router/compression.js';
import { AnthropicProviderAdapter } from './providers/anthropic.js';
import { GeminiProviderAdapter } from './providers/gemini.js';
import { OllamaProviderAdapter } from './providers/ollama.js';
import { MistralProviderAdapter } from './providers/mistral.js';
import { SiliconFlowProviderAdapter } from './providers/siliconflow.js';
import { DuckDuckGoProviderAdapter } from './providers/duckduckgo.js';
import type { AppConfig } from './config.js';

const testConfig: AppConfig = {
  port: 3001,
  host: '127.0.0.1',
  apiKey: undefined,
  mockMode: true,
  groqApiKey: undefined,
  openaiApiKey: undefined,
  logPrompts: false,
  dbPath: './test_routenex.json',
  maxRetries: 2,
  timeoutMs: 5000,
  defaultStrategy: 'balanced',
  rateLimitRpm: 100,
  persistenceEnabled: false,
};

describe('MockProviderAdapter', () => {
  it('generates deterministic chat completion', async () => {
    const mock = new MockProviderAdapter(10);
    const res = await mock.chat({
      model: 'mock/gpt-4',
      messages: [{ role: 'user', content: 'Hello world' }],
      stream: false,
      n: 1,
    });

    expect(res.id).toMatch(/^chatcmpl-/);
    expect(res.choices[0].message.content).toContain('Received: "Hello world"');
    expect(res.usage?.total_tokens).toBeGreaterThan(0);
  });

  it('streams chunks correctly', async () => {
    const mock = new MockProviderAdapter(5);
    const stream = mock.chatStream({
      model: 'mock/fast',
      messages: [{ role: 'user', content: 'Ping' }],
      stream: true,
      n: 1,
    });

    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].choices[0].delta.role).toBe('assistant');
    const lastChunk = chunks[chunks.length - 1];
    expect(lastChunk.choices[0].finish_reason).toBe('stop');
  });

  it('throws on simulated error model', async () => {
    const mock = new MockProviderAdapter(5);
    await expect(
      mock.chat({
        model: 'mock/error',
        messages: [{ role: 'user', content: 'Fail' }],
        stream: false,
        n: 1,
      })
    ).rejects.toThrow('Simulated mock provider failure');
  });
});

describe('CircuitBreaker', () => {
  it('transitions from CLOSED to OPEN after 3 failures, and HALF_OPEN after cooldown', () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 50, halfOpenSuccessThreshold: 2 });
    expect(cb.canExecute('groq')).toBe(true);

    cb.recordFailure('groq');
    cb.recordFailure('groq');
    expect(cb.getState('groq')).toBe('CLOSED');

    cb.recordFailure('groq');
    expect(cb.getState('groq')).toBe('OPEN');
    expect(cb.canExecute('groq')).toBe(false);
  });

  it('recovers from HALF_OPEN to CLOSED after consecutive successes', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 20, halfOpenSuccessThreshold: 2 });
    cb.recordFailure('mock');
    cb.recordFailure('mock');
    expect(cb.getState('mock')).toBe('OPEN');

    // Wait for cooldown
    await new Promise((r) => setTimeout(r, 30));
    expect(cb.getState('mock')).toBe('HALF_OPEN');
    expect(cb.canExecute('mock')).toBe(true);

    cb.recordSuccess('mock');
    expect(cb.getState('mock')).toBe('HALF_OPEN');
    cb.recordSuccess('mock');
    expect(cb.getState('mock')).toBe('CLOSED');
  });

  it('Layer 2 (Key Cooldown): handles 429 backoff per key without breaking other keys', async () => {
    const cb = new CircuitBreaker({ defaultKeyCooldownMs: 25 });
    const keyId = 'sk-groq-key-1';
    expect(cb.isKeyCoolingDown(keyId)).toBe(false);
    expect(cb.canExecute('groq', undefined, keyId)).toBe(true);

    cb.recordKeyCooldown(keyId, 25, 'Rate limited 429');
    expect(cb.isKeyCoolingDown(keyId)).toBe(true);
    expect(cb.canExecute('groq', undefined, keyId)).toBe(false);
    // Other key on same provider remains operational
    expect(cb.canExecute('groq', undefined, 'sk-groq-key-2')).toBe(true);

    await new Promise((r) => setTimeout(r, 35));
    expect(cb.isKeyCoolingDown(keyId)).toBe(false);
    expect(cb.canExecute('groq', undefined, keyId)).toBe(true);
  });

  it('Layer 3 (Model Lockout): isolates a failing model without knocking out sibling models on same provider', () => {
    const cb = new CircuitBreaker();
    const failingModel = 'groq/llama-3.3-70b-versatile';
    const healthyModel = 'groq/llama-3.1-8b-instant';

    expect(cb.canExecute('groq', failingModel)).toBe(true);
    expect(cb.canExecute('groq', healthyModel)).toBe(true);

    // Lock out only the 70B model
    cb.recordModelLockout(failingModel, 5000, 'Model overloaded 503');
    expect(cb.isModelLocked(failingModel)).toBe(true);
    expect(cb.canExecute('groq', failingModel)).toBe(false);

    // Sibling model remains fully functional
    expect(cb.isModelLocked(healthyModel)).toBe(false);
    expect(cb.canExecute('groq', healthyModel)).toBe(true);

    // Clear lockout on success
    cb.recordModelSuccess(failingModel);
    expect(cb.isModelLocked(failingModel)).toBe(false);
    expect(cb.canExecute('groq', failingModel)).toBe(true);
  });
});

describe('RoutingEngine', () => {
  it('routes explicit models directly', () => {
    const reg = new ProviderRegistry(testConfig);
    const cb = new CircuitBreaker();
    const engine = new RoutingEngine(reg, cb, testConfig);

    const selection = engine.resolveRoute({
      model: 'mock/fast',
      messages: [{ role: 'user', content: 'test' }],
      stream: false,
      n: 1,
    });

    expect(selection.primary.id).toBe('mock/fast');
    expect(selection.reasonCode).toBe('EXPLICIT_MODEL');
  });

  it('evaluates and scores auto routing candidates', () => {
    const reg = new ProviderRegistry(testConfig);
    const cb = new CircuitBreaker();
    const engine = new RoutingEngine(reg, cb, testConfig);

    const explanation = engine.explain(
      {
        model: 'auto',
        messages: [{ role: 'user', content: 'explain' }],
        stream: false,
        n: 1,
      },
      'req_exp'
    );

    expect(explanation.model_selected).toBeTruthy();
    expect(explanation.candidates_evaluated.length).toBeGreaterThan(0);
  });
});

describe('RequestStore', () => {
  it('aggregates usage stats correctly', () => {
    const store = new RequestStore('./test_mem.json', true);
    store.logRequest({
      request_id: 'r1',
      timestamp: new Date().toISOString(),
      model_requested: 'mock/fast',
      model_used: 'mock/fast',
      provider: 'mock',
      latency_ms: 50,
      status: 'success',
      token_usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      cost_estimate: { total_usd: 0.001, provenance: 'MEASURED', price_timestamp: null },
      routing_reason: 'test',
    });

    const stats = store.getUsageStats();
    expect(stats.total_requests).toBe(1);
    expect(stats.success_rate).toBe(1);
    expect(stats.tokens.total_tokens).toBe(30);
    expect(stats.estimated_cost_usd).toBe(0.001);
    store.close();
    try {
      if (fs.existsSync('./test_mem.json')) fs.unlinkSync('./test_mem.json');
    } catch {}
  });
});

describe('End-to-End Gateway API Routes', () => {
  const { app } = createApp(testConfig);

  it('GET /health/live returns ok and configured providers', async () => {
    const res = await app.request('/health/live');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.providers.mock).toBe(true);
  });

  it('GET /v1/models returns model catalog', async () => {
    const res = await app.request('/v1/models');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.object).toBe('list');
    expect(body.data.some((m: any) => m.id === 'mock/gpt-4')).toBe(true);
  });

  it('POST /v1/router/explain returns dry-run routing decision', async () => {
    const res = await app.request('/v1/router/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'auto',
        messages: [{ role: 'user', content: 'What is RouteNex?' }],
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.request_id).toMatch(/^exp_/);
    expect(body.candidates_evaluated.length).toBeGreaterThan(0);
  });

  it('POST /v1/chat/completions non-streaming returns completion with routenex metadata', async () => {
    const res = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mock/gpt-4',
        messages: [{ role: 'user', content: 'Integration test message' }],
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.choices[0].message.content).toContain('Integration test message');
    expect(body.routenex).toBeDefined();
    expect(body.routenex.provider).toBe('mock');
    expect(body.routenex.cost_estimate.provenance).toBeDefined();
  });

  it('POST /v1/chat/completions streaming returns SSE stream with [DONE]', async () => {
    const res = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mock/fast',
        messages: [{ role: 'user', content: 'Stream test' }],
        stream: true,
      }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const text = await res.text();
    expect(text).toContain('data: ');
    expect(text).toContain('data: [DONE]');
  });

  it('GET /v1/usage returns aggregated statistics', async () => {
    const res = await app.request('/v1/usage');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total_requests).toBeDefined();
    expect(body.success_rate).toBeDefined();
  });
});

describe('Middleware Tests', () => {
  it('enforces API key authentication when configured', async () => {
    const { app: authedApp } = createApp({ ...testConfig, apiKey: 'secret-key-123' });

    // Request without key fails
    const unauthedRes = await authedApp.request('/v1/models');
    expect(unauthedRes.status).toBe(401);

    // Request with invalid key fails
    const wrongKeyRes = await authedApp.request('/v1/models', {
      headers: { Authorization: 'Bearer wrong-key' },
    });
    expect(wrongKeyRes.status).toBe(401);

    // Request with valid key succeeds
    const validRes = await authedApp.request('/v1/models', {
      headers: { Authorization: 'Bearer secret-key-123' },
    });
    expect(validRes.status).toBe(200);

    // Health endpoint is exempted from auth
    const healthRes = await authedApp.request('/health/live');
    expect(healthRes.status).toBe(200);
  });

  it('enforces rate limits when threshold is exceeded', async () => {
    const { app: rateLimitedApp } = createApp({ ...testConfig, rateLimitRpm: 2 });

    const res1 = await rateLimitedApp.request('/v1/models');
    expect(res1.status).toBe(200);

    const res2 = await rateLimitedApp.request('/v1/models');
    expect(res2.status).toBe(200);

    const res3 = await rateLimitedApp.request('/v1/models');
    expect(res3.status).toBe(429);
    expect(res3.headers.get('retry-after')).toBeDefined();
    const body = await res3.json();
    expect(body.error.code).toBe('rate_limit_exceeded');
  });
});

describe('PromptCompressor', () => {
  it('compresses repetitive newlines and whitespace while preserving code blocks', () => {
    const rawText = `Line 1


Line 2    with    spaces

<!-- Hidden comment -->

\`\`\`python
def hello():
    # Keep 4-space indent
    return True
\`\`\`
`;

    const compressed = PromptCompressor.compressText(rawText);
    expect(compressed).not.toContain('<!-- Hidden comment -->');
    expect(compressed).not.toContain('\n\n\n');
    expect(compressed).toContain('Line 2 with spaces');
    expect(compressed).toContain('    # Keep 4-space indent');

    const result = PromptCompressor.compressMessages([
      { role: 'user', content: rawText },
    ]);
    expect(result.savedPercent).toBeGreaterThan(0);
    expect(result.estimatedTokensSaved).toBeGreaterThan(0);
  });
});

describe('New Provider Adapters', () => {
  it('Anthropic adapter registers models and handles unconfigured key safely', async () => {
    const adapter = new AnthropicProviderAdapter(undefined);
    expect(adapter.id).toBe('anthropic');
    expect(adapter.isConfigured()).toBe(false);
    expect(adapter.models.length).toBeGreaterThanOrEqual(3);
    expect(adapter.models.some((m) => m.id.includes('claude-3-5-sonnet'))).toBe(true);

    await expect(
      adapter.chat({
        model: 'anthropic/claude-3-5-haiku-20241022',
        messages: [{ role: 'user', content: 'Hi' }],
        stream: false,
        n: 1,
      })
    ).rejects.toThrow('Anthropic API key is not configured');
  });

  it('Gemini adapter registers models and handles unconfigured key safely', async () => {
    const adapter = new GeminiProviderAdapter(undefined);
    expect(adapter.id).toBe('gemini');
    expect(adapter.isConfigured()).toBe(false);
    expect(adapter.models.some((m) => m.id.includes('gemini-2.5-flash'))).toBe(true);
  });

  it('Ollama adapter registers local models and points to default endpoint', async () => {
    const adapter = new OllamaProviderAdapter();
    expect(adapter.id).toBe('ollama');
    expect(adapter.models.some((m) => m.id.includes('llama3.2'))).toBe(true);
  });

  it('Mistral adapter registers models including Codestral and handles unconfigured key', async () => {
    const adapter = new MistralProviderAdapter(undefined);
    expect(adapter.id).toBe('mistral');
    expect(adapter.isConfigured()).toBe(false);
    expect(adapter.models.some((m) => m.id.includes('codestral-latest'))).toBe(true);
    expect(adapter.models.some((m) => m.id.includes('mistral-small-latest'))).toBe(true);

    await expect(
      adapter.chat({
        model: 'mistral/codestral-latest',
        messages: [{ role: 'user', content: 'def solve():' }],
        stream: false,
        n: 1,
      })
    ).rejects.toThrow('Mistral API key is not configured');
  });

  it('SiliconFlow adapter registers reasoning models and handles unconfigured key', async () => {
    const adapter = new SiliconFlowProviderAdapter(undefined);
    expect(adapter.id).toBe('siliconflow');
    expect(adapter.isConfigured()).toBe(false);
    expect(adapter.models.some((m) => m.id.includes('DeepSeek-V3'))).toBe(true);
    expect(adapter.models.some((m) => m.id.includes('DeepSeek-R1'))).toBe(true);

    await expect(
      adapter.chat({
        model: 'siliconflow/deepseek-ai/DeepSeek-V3',
        messages: [{ role: 'user', content: 'Analyze this algorithm' }],
        stream: false,
        n: 1,
      })
    ).rejects.toThrow('SiliconFlow API key is not configured');
  });

  it('DuckDuckGo adapter is zero-key configured and provides anonymous chat models', async () => {
    const adapter = new DuckDuckGoProviderAdapter();
    expect(adapter.id).toBe('duckduckgo');
    expect(adapter.isConfigured()).toBe(true);
    expect(adapter.models.length).toBeGreaterThanOrEqual(4);
    expect(adapter.models.some((m) => m.id === 'duckduckgo/gpt-4o-mini')).toBe(true);
    expect(adapter.models.some((m) => m.id === 'duckduckgo/claude-3-haiku')).toBe(true);
  });
});

describe('Secret Redaction & Privacy Guardrails (PRD Sec 52, 89)', () => {
  it('never leaks secret keys in error messages, health responses, or model catalogs', async () => {
    const sentinelSecret = 'sk-canary-secret-sentinel-never-leak-999';
    const { app: sentinelApp } = createApp({
      ...testConfig,
      apiKey: sentinelSecret,
      groqApiKey: sentinelSecret,
      openaiApiKey: sentinelSecret,
      anthropicApiKey: sentinelSecret,
      geminiApiKey: sentinelSecret,
    });

    // 1. Health endpoint test: provider keys must never be revealed
    const healthRes = await sentinelApp.request('/health/live');
    const healthText = await healthRes.text();
    expect(healthText).not.toContain(sentinelSecret);

    // 2. Models catalog: provider keys must never be revealed
    const modelsRes = await sentinelApp.request('/v1/models', {
      headers: { Authorization: `Bearer ${sentinelSecret}` },
    });
    const modelsText = await modelsRes.text();
    expect(modelsText).not.toContain(sentinelSecret);

    // 3. Error response: invalid route or bad JSON must never echo server secrets
    const errorRes = await sentinelApp.request('/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sentinelSecret}`,
      },
      body: JSON.stringify({ invalid_field: true }),
    });
    const errorText = await errorRes.text();
    expect(errorText).not.toContain(sentinelSecret);
  });
});

describe('Open Source Admin API & Virtual Keys (OmniRoute Pattern)', () => {
  const { app, adminStore } = createApp(testConfig);

  it('GET /v1/admin/config returns open source edition details and virtual keys', async () => {
    const res = await app.request('/v1/admin/config');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.edition).toBe('RouteNex Open Source');
    expect(body.virtualKeys.length).toBeGreaterThan(0);
    expect(body.aliases).toBeDefined();
    expect(body.providers.length).toBeGreaterThan(0);
  });

  it('generates virtual keys and authenticates requests with them', async () => {
    // 1. Create a new local virtual key
    const createRes = await app.request('/v1/admin/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Cursor IDE', rateLimitRpm: 120 }),
    });
    expect(createRes.status).toBe(200);
    const created = await createRes.json();
    expect(created.key.key).toMatch(/^rn-local-/);

    // 2. Create app with auth enabled and verify the virtual key is accepted
    const { app: authedApp, adminStore: authedAdminStore } = createApp({ ...testConfig, apiKey: 'master-secret' });
    const localVk = authedAdminStore.createVirtualKey('Cline Agent', 60);

    const authTestRes = await authedApp.request('/v1/models', {
      headers: { Authorization: `Bearer ${localVk.key}` },
    });
    expect(authTestRes.status).toBe(200);
  });

  it('manages model aliases and resolves them during routing', async () => {
    // Set alias "my-alias" -> "mock/fast"
    const aliasRes = await app.request('/v1/admin/aliases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alias: 'my-alias', targetModel: 'mock/fast' }),
    });
    expect(aliasRes.status).toBe(200);

    // Call chat completions using "my-alias"
    const chatRes = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'my-alias',
        messages: [{ role: 'user', content: 'Testing alias' }],
      }),
    });
    expect(chatRes.status).toBe(200);
    const chatBody = await chatRes.json();
    expect(chatBody.model).toBe('mock/fast');
    expect(chatBody.routenex.provider).toBe('mock');
  });

  it('GET /v1/admin/doctor returns full diagnostic report', async () => {
    const docRes = await app.request('/v1/admin/doctor');
    expect(docRes.status).toBe(200);
    const docBody = await docRes.json();
    expect(docBody.diagnostics.length).toBeGreaterThanOrEqual(4);
    expect(docBody.diagnostics.every((d: any) => d.status === 'PASS' || d.status === 'WARN')).toBe(true);
  });

  it('manages Combos (grouped fallback clusters) and routes through them', async () => {
    // 1. GET /v1/admin/combos returns default combos
    const combosRes = await app.request('/v1/admin/combos');
    expect(combosRes.status).toBe(200);
    const combosBody = await combosRes.json();
    expect(combosBody.combos.length).toBeGreaterThanOrEqual(2);
    expect(combosBody.combos.some((c: any) => c.slug === 'combo/free-unlimited')).toBe(true);

    // 2. Create custom combo
    const createRes = await app.request('/v1/admin/combos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Unit Test Combo',
        slug: 'combo/test-cluster',
        description: 'Test failover cluster',
        targets: ['mock/fast', 'mock/gpt-4'],
      }),
    });
    expect(createRes.status).toBe(200);

    // 3. GET /v1/models includes the combo model
    const modelsRes = await app.request('/v1/models');
    expect(modelsRes.status).toBe(200);
    const modelsBody = await modelsRes.json();
    const foundCombo = modelsBody.data.find((m: any) => m.id === 'combo/test-cluster');
    expect(foundCombo).toBeDefined();
    expect(foundCombo.owned_by).toBe('routenex-combo');

    // 4. POST /v1/chat/completions using combo model routes successfully
    const chatRes = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'combo/test-cluster',
        messages: [{ role: 'user', content: 'Testing combo routing' }],
      }),
    });
    expect(chatRes.status).toBe(200);
    const chatBody = await chatRes.json();
    expect(chatBody.model).toBe('mock/fast');
    expect(chatBody.routenex.routing_reason).toContain('combo/test-cluster');
  });
});



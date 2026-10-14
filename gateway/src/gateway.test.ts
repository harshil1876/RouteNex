import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createApp } from './server.js';
import { MockProviderAdapter } from './providers/mock.js';
import { CircuitBreaker } from './router/circuit-breaker.js';
import { ProviderRegistry } from './providers/registry.js';
import { RoutingEngine, formatCostHeader } from './router/engine.js';
import { RequestStore } from './storage/sqlite.js';
import { PromptCompressor } from './router/compression.js';
import { AnthropicProviderAdapter } from './providers/anthropic.js';
import { GeminiProviderAdapter } from './providers/gemini.js';
import { OllamaProviderAdapter } from './providers/ollama.js';
import { MistralProviderAdapter } from './providers/mistral.js';
import { SiliconFlowProviderAdapter } from './providers/siliconflow.js';
import { DuckDuckGoProviderAdapter } from './providers/duckduckgo.js';
import { ResponseCache } from './router/cache.js';
import { encryptValue, decryptValue, maskSecret, hashToken } from './storage/crypto.js';
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
  allowCautionFallback: false,
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
  const { app } = createApp(testConfig);

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

  it('chat completions with compress: true attaches compression telemetry', async () => {
    const rawPrompt = "Explain   gravity   in   detail\n\n\n\n<!-- comment -->\nAnd relativity";
    const res = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mock/fast',
        messages: [{ role: 'user', content: rawPrompt }],
        compress: true,
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.routenex.compression).toBeDefined();
    expect(body.routenex.compression.saved_percent).toBeGreaterThan(0);
  });
});

describe('ResponseCache (0ms Semantic & Exact Caching)', () => {
  const { app } = createApp(testConfig);

  it('stores responses and serves identical requests from cache with 0ms latency', async () => {
    const cache = new ResponseCache({ ttlSeconds: 60 });
    const req = {
      model: 'mock/fast',
      messages: [{ role: 'user' as const, content: 'Cache test message 123' }],
    };

    expect(cache.get(req)).toBeUndefined();

    const mockResponse: any = {
      id: 'chatcmpl-test-1',
      object: 'chat.completion',
      created: 1700000000,
      model: 'mock/fast',
      choices: [{ index: 0, message: { role: 'assistant', content: 'Cached answer' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      routenex: {
        request_id: 'req_test',
        provider: 'mock',
        model_used: 'mock/fast',
        routing_reason: 'Direct',
        latency_ms: 120,
        cost_estimate: { total_usd: 0.0001, provenance: 'ESTIMATED' },
        fallback_attempts: 0,
      },
    };

    cache.set(req, mockResponse);

    const cached = cache.get(req);
    expect(cached).toBeDefined();
    expect(cached?.choices[0].message.content).toBe('Cached answer');
    expect(cached?.routenex?.cache_hit).toBe(true);
    expect(cached?.routenex?.latency_ms).toBe(0);

    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.tokensSaved).toBe(30);
  });

  it('/v1/chat/completions serves cached response on repeated identical query', async () => {
    const promptText = `Unique cache query ${Date.now()}`;
    const payload = {
      model: 'mock/fast',
      messages: [{ role: 'user', content: promptText }],
    };

    // First call: cache miss, executes against mock provider
    const res1 = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(res1.status).toBe(200);
    const body1 = await res1.json();
    expect(body1.routenex.cache_hit).toBeFalsy();

    // Second call: cache hit!
    const res2 = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(res2.status).toBe(200);
    const body2 = await res2.json();
    expect(body2.routenex.cache_hit).toBe(true);
    expect(body2.routenex.latency_ms).toBe(0);

    // Bypass cache with header
    const res3 = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-routenex-cache': 'false' },
      body: JSON.stringify(payload),
    });
    expect(res3.status).toBe(200);
    const body3 = await res3.json();
    expect(body3.routenex.cache_hit).toBeFalsy();
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

  it('AES-256-GCM encrypts provider credentials at rest and decrypts accurately', () => {
    const rawSecret = 'sk-live-super-secret-key-999xyz';
    const encrypted = encryptValue(rawSecret);

    expect(encrypted).toMatch(/^enc:v1:/);
    expect(encrypted).not.toContain(rawSecret);

    const decrypted = decryptValue(encrypted);
    expect(decrypted).toBe(rawSecret);

    // Masking check
    const masked = maskSecret(rawSecret);
    expect(masked).toBe('sk-live...9xyz');
  });

  it('verifies one-time admin setup token and handles session login', async () => {
    expect(adminStore.initialSetupToken).toBeDefined();
    const token = adminStore.initialSetupToken!;

    // 1. Valid login with terminal setup token
    const loginRes = await app.request('/v1/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    expect(loginRes.status).toBe(200);
    const loginBody = await loginRes.json();
    expect(loginBody.success).toBe(true);

    // 2. Invalid login rejected
    const badLoginRes = await app.request('/v1/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'wrong-token-abc' }),
    });
    expect(badLoginRes.status).toBe(401);

    // 3. GET /v1/admin/auth/verify checks token
    const verifyRes = await app.request('/v1/admin/auth/verify', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(verifyRes.status).toBe(200);
    const verifyBody = await verifyRes.json();
    expect(verifyBody.authenticated).toBe(true);
  });

  it('supports multi-key pooling per provider with round-robin load distribution', async () => {
    // Add two keys to Cerebras pool
    const poolRes1 = await app.request('/v1/admin/providers/pool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'cerebras', apiKey: 'csk-key-alpha-1111' }),
    });
    expect(poolRes1.status).toBe(200);

    const poolRes2 = await app.request('/v1/admin/providers/pool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'cerebras', apiKey: 'csk-key-beta-2222' }),
    });
    expect(poolRes2.status).toBe(200);
    const poolBody2 = await poolRes2.json();
    expect(poolBody2.poolSize).toBe(2);

    // Verify round-robin retrieval
    const k1 = adminStore.getProviderKey('cerebras');
    const k2 = adminStore.getProviderKey('cerebras');
    expect(k1).not.toBe(k2);
    expect([k1, k2]).toContain('csk-key-alpha-1111');
    expect([k1, k2]).toContain('csk-key-beta-2222');
  });

  it('runs batch model health testing across registered models', async () => {
    const testRes = await app.request('/v1/admin/providers/mock/test-models', {
      method: 'POST',
    });
    expect(testRes.status).toBe(200);
    const testBody = await testRes.json();
    expect(testBody.provider).toBe('mock');
    expect(testBody.testedCount).toBeGreaterThan(0);
    expect(testBody.results.some((r: any) => r.status === 'WORKING')).toBe(true);
  });

  it('POST /v1/messages handles native Anthropic protocol requests and maps responses', async () => {
    const res = await app.request('/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mock/fast',
        system: 'System instructions for Claude',
        messages: [{ role: 'user', content: 'Testing Anthropic messages route' }],
        max_tokens: 50,
        stream: false,
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe('message');
    expect(body.role).toBe('assistant');
    expect(body.content).toBeInstanceOf(Array);
    expect(body.content[0].type).toBe('text');
    expect(body.content[0].text).toContain('Received: "Testing Anthropic messages route"');
    expect(body.stop_reason).toBe('end_turn');
    expect(body.usage).toBeDefined();
    expect(body.usage.input_tokens).toBeGreaterThan(0);
    expect(body.routenex).toBeDefined();
  });

  it('POST /v1/messages supports streaming in Anthropic SSE format', async () => {
    const res = await app.request('/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mock/fast',
        messages: [{ role: 'user', content: 'Streaming Anthropic ping' }],
        stream: true,
      }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const streamText = await res.text();
    expect(streamText).toContain('event: message_start');
    expect(streamText).toContain('event: content_block_start');
    expect(streamText).toContain('event: content_block_delta');
    expect(streamText).toContain('event: message_stop');
  });

  it('loads 40+ providers from declarative catalog.json into model catalog', async () => {
    const res = await app.request('/v1/models');
    expect(res.status).toBe(200);
    const body = await res.json();
    const modelIds: string[] = body.data.map((m: any) => m.id);

    // Verify catalog models are registered
    expect(modelIds.some((id) => id.startsWith('nvidia/'))).toBe(true);
    expect(modelIds.some((id) => id.startsWith('openrouter/'))).toBe(true);
    expect(modelIds.some((id) => id.startsWith('together/'))).toBe(true);
    expect(modelIds.some((id) => id.startsWith('xai/'))).toBe(true);
    expect(modelIds.some((id) => id.startsWith('zhipu/'))).toBe(true);
  });
});

describe('4-Stage Prompt Compression & Optimizer Pipeline', () => {
  it('preserves code blocks, markdown tables, and URLs verbatim in Guard stage', () => {
    const raw = `
Here is a test:
<!-- strip this comment -->
\`\`\`typescript
const a = 1;
   const indented = 2;
\`\`\`

| Col 1 | Col 2 |
|---|---|
| A | B |

Visit https://example.com/api/v1?query=test
`;

    const res = PromptCompressor.compressMessages([{ role: 'user', content: raw }]);
    const output = res.messages[0].content!;

    // Fenced code preserved with whitespace
    expect(output).toContain('const a = 1;\n   const indented = 2;');
    // Table preserved
    expect(output).toContain('| Col 1 | Col 2 |');
    // URL preserved
    expect(output).toContain('https://example.com/api/v1?query=test');
    // HTML comment stripped
    expect(output).not.toContain('strip this comment');
    expect(res.stageBreakdown.stage1Saved).toBeGreaterThan(0);
  });

  it('compacts verbose stack traces in Stage 2 RTK compactor', () => {
    const stackTrace = `Error: Connection lost
    at query (c:/app/node_modules/pg/client.js:10:5)
    at pool (c:/app/node_modules/pg/pool.js:20:5)
    at runQuery (c:/app/node_modules/orm/exec.js:30:5)
    at fetchUser (c:/app/node_modules/services/user.js:40:5)
    at handler (c:/app/node_modules/routes/api.js:50:5)
    at Object.run (c:/app/node_modules/server.js:60:5)
    at main (c:/app/src/index.ts:15:1)`;

    const res = PromptCompressor.compressMessages([{ role: 'user', content: stackTrace }]);
    const output = res.messages[0].content!;

    expect(output).toContain('omitted for token efficiency');
    expect(res.stageBreakdown.stage2Saved).toBeGreaterThan(0);
  });

  it('deduplicates long repeated paragraphs across conversation turns in Stage 3', () => {
    const longParagraph = 'This is a very long and detailed instruction paragraph that explains all system requirements and formatting rules for the output. It is repeated in full detail across multiple turns.'.repeat(2);

    const messages = [
      { role: 'system' as const, content: longParagraph },
      { role: 'user' as const, content: `Please review this: \n\n${longParagraph}` },
    ];

    const res = PromptCompressor.compressMessages(messages, { stage3Dedup: true });
    expect(res.stageBreakdown.stage3Saved).toBeGreaterThan(0);
    expect(res.messages[1].content).toContain('[Repeated context omitted:');
  });

  it('removes conversational fluff in Stage 4 Caveman mode', () => {
    const fluffyText = 'Could you please kindly provide me with the answer? As an AI language model, thank you in advance.';
    const res = PromptCompressor.compressMessages(
      [{ role: 'user', content: fluffyText }],
      { stage4Caveman: true }
    );
    const output = res.messages[0].content!;
    expect(output).not.toContain('Could you please');
    expect(output).not.toContain('As an AI language model');
    expect(output).not.toContain('thank you in advance');
    expect(res.stageBreakdown.stage4Saved).toBeGreaterThan(0);
  });

  it('POST /v1/admin/compress/preview returns live token and stage statistics', async () => {
    const store = new RequestStore();
    const registry = new ProviderRegistry(testConfig);
    const cb = new CircuitBreaker();
    const engine = new RoutingEngine(registry, cb, testConfig);
    const { app } = createApp(testConfig, engine, store, registry, cb);

    const res = await app.request('/v1/admin/compress/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '<!-- comment --> Hello world   with   spaces.\n\n\n\nParagraph 2.',
        options: { stage1Lite: true },
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.originalChars).toBeGreaterThan(data.compressedChars);
    expect(data.compressedText).toBe('Hello world with spaces.\n\nParagraph 2.');
    expect(data.stageBreakdown).toBeDefined();
  });
});

describe('OpenRouter Model Tag Routing (:free, :nitro, :floor, :zdr)', () => {
  it('routes auto:nitro to lowest latency model', async () => {
    const store = new RequestStore();
    const registry = new ProviderRegistry(testConfig);
    const cb = new CircuitBreaker();
    const engine = new RoutingEngine(registry, cb, testConfig);

    const route = engine.resolveRoute({
      model: 'auto:nitro',
      messages: [{ role: 'user', content: 'test' }],
      n: 1,
    });

    expect(route.primary).toBeDefined();
    // mock/fast has 20ms latency vs 200ms for others
    expect(route.primary.id).toBe('mock/fast');
    expect(route.reasonCode).toBe('LATENCY_MINIMIZED');
  });

  it('routes auto:free and filters out paid models', async () => {
    const store = new RequestStore();
    const registry = new ProviderRegistry(testConfig);
    const cb = new CircuitBreaker();
    const engine = new RoutingEngine(registry, cb, testConfig);

    const route = engine.resolveRoute({
      model: 'auto:free',
      messages: [{ role: 'user', content: 'test' }],
      n: 1,
    });

    expect(route.primary).toBeDefined();
    // Free models should have 0 price
    const cost = (route.primary.pricing?.prompt_per_million ?? 0) + (route.primary.pricing?.completion_per_million ?? 0);
    expect(cost).toBe(0);
  });

  it('routes auto:zdr to zero data retention compliant providers', async () => {
    const store = new RequestStore();
    const registry = new ProviderRegistry(testConfig);
    const cb = new CircuitBreaker();
    const engine = new RoutingEngine(registry, cb, testConfig);

    const route = engine.resolveRoute({
      model: 'auto:zdr',
      messages: [{ role: 'user', content: 'test' }],
      n: 1,
    });

    expect(route.primary).toBeDefined();
    const zdrProviders = ['mock', 'groq', 'cerebras', 'mistral', 'deepseek', 'ollama'];
    expect(zdrProviders).toContain(route.primary.provider);
  });
});

describe('Routing Transparency Headers & Cost Provenance', () => {
  it('attaches all X-RouteNex-* transparency headers with cost provenance', async () => {
    const { app } = createApp(testConfig);
    const res = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mock/gpt-4',
        messages: [{ role: 'user', content: 'Testing transparency headers' }],
      }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('X-RouteNex-Request-Id')).toBeDefined();
    expect(res.headers.get('X-RouteNex-Selected-Provider')).toBe('mock');
    expect(res.headers.get('X-RouteNex-Selected-Model')).toBe('mock/gpt-4');
    expect(res.headers.get('X-RouteNex-Decision-Reason')).toBeDefined();
    expect(res.headers.get('X-RouteNex-Fallback-Count')).toBe('0');
    expect(res.headers.get('X-RouteNex-Tokens-Saved')).toBeDefined();
    expect(res.headers.get('X-RouteNex-Estimated-Cost-USD')).toBe('0.000000');
  });

  it('formats unknown cost as "unknown" and $0.00 as "0.000000"', () => {
    expect(formatCostHeader({ total_usd: 0 })).toBe('0.000000');
    expect(formatCostHeader({ total_usd: null })).toBe('unknown');
    expect(formatCostHeader(undefined)).toBe('unknown');
    expect(formatCostHeader({ total_usd: 0.000456 })).toBe('0.000456');
  });
});

describe('ToS Caution Guard & Provider Badges', () => {
  it('excludes caution providers (duckduckgo) from automatic auto routing', () => {
    const registry = new ProviderRegistry(testConfig);
    const cb = new CircuitBreaker();
    const engine = new RoutingEngine(registry, cb, testConfig);

    const route = engine.resolveRoute({
      model: 'auto',
      messages: [{ role: 'user', content: 'Test prompt' }],
      n: 1,
    });

    // Auto routing should never pick DuckDuckGo automatically because tos_status is caution
    expect(route.primary.provider).not.toBe('duckduckgo');
  });

  it('allows caution provider when explicitly targeted by model id', () => {
    const registry = new ProviderRegistry(testConfig);
    const cb = new CircuitBreaker();
    const engine = new RoutingEngine(registry, cb, testConfig);

    const route = engine.resolveRoute({
      model: 'duckduckgo/gpt-4o-mini',
      messages: [{ role: 'user', content: 'Test prompt' }],
      n: 1,
    });

    expect(route.primary.provider).toBe('duckduckgo');
    expect(route.primary.tos_status).toBe('caution');
  });

  it('appends caution providers to the tail of fallbackChain when allow_caution_fallback is true', () => {
    const registry = new ProviderRegistry(testConfig);
    const cb = new CircuitBreaker();
    const engine = new RoutingEngine(registry, cb, testConfig);

    const route = engine.resolveRoute({
      model: 'auto',
      messages: [{ role: 'user', content: 'Test prompt' }],
      provider: {
        allow_caution_fallback: true,
      },
      n: 1,
    });

    // Primary should still be an official provider
    expect(route.primary.tos_status).not.toBe('caution');
    expect(route.primary.provider).not.toBe('duckduckgo');

    // Caution provider should now be present in fallback chain
    const hasCautionInFallback = route.fallbackChain.some(
      (m) => m.provider === 'duckduckgo' && m.tos_status === 'caution'
    );
    expect(hasCautionInFallback).toBe(true);
  });

  it('supports allow_caution_fallback via global AppConfig', () => {
    const cautionFallbackConfig: AppConfig = {
      ...testConfig,
      allowCautionFallback: true,
    };
    const registry = new ProviderRegistry(cautionFallbackConfig);
    const cb = new CircuitBreaker();
    const engine = new RoutingEngine(registry, cb, cautionFallbackConfig);

    const route = engine.resolveRoute({
      model: 'auto',
      messages: [{ role: 'user', content: 'Test prompt' }],
      n: 1,
    });

    expect(route.primary.tos_status).not.toBe('caution');
    const hasCautionInFallback = route.fallbackChain.some((m) => m.provider === 'duckduckgo');
    expect(hasCautionInFallback).toBe(true);
  });
});

describe('Quota & Affinity Routing Strategies', () => {
  it('routes via cache-optimized affinity deterministically', () => {
    const registry = new ProviderRegistry(testConfig);
    const cb = new CircuitBreaker();
    const engine = new RoutingEngine(registry, cb, testConfig);

    const route1 = engine.resolveRoute({
      model: 'auto',
      messages: [{ role: 'user', content: 'System prompt prefix cache' }],
      provider: { sort: 'cache-optimized', allow_fallbacks: true },
      n: 1,
    });

    const route2 = engine.resolveRoute({
      model: 'auto',
      messages: [{ role: 'user', content: 'System prompt prefix cache' }],
      provider: { sort: 'cache-optimized', allow_fallbacks: true },
      n: 1,
    });

    expect(route1.primary.id).toBe(route2.primary.id);
    expect(route1.reasonCode).toBe('CACHE_AFFINITY');
  });

  it('routes via headroom strategy prioritizing highest capacity pools', () => {
    const registry = new ProviderRegistry(testConfig);
    const cb = new CircuitBreaker();
    const engine = new RoutingEngine(registry, cb, testConfig);

    const route = engine.resolveRoute({
      model: 'auto',
      messages: [{ role: 'user', content: 'High throughput query' }],
      provider: { sort: 'headroom', allow_fallbacks: true },
      n: 1,
    });

    expect(route.primary).toBeDefined();
    expect(route.reasonCode).toBe('HEADROOM_MAXIMIZED');
  });

  it('routes via reset-window strategy preferring non-penalized targets', () => {
    const registry = new ProviderRegistry(testConfig);
    const cb = new CircuitBreaker();
    const engine = new RoutingEngine(registry, cb, testConfig);

    const route = engine.resolveRoute({
      model: 'auto',
      messages: [{ role: 'user', content: 'Quick window test' }],
      provider: { sort: 'reset-window', allow_fallbacks: true },
      n: 1,
    });

    expect(route.primary).toBeDefined();
    expect(route.reasonCode).toBe('RESET_WINDOW_OPTIMIZED');
  });
});

describe('Built-in Model Context Protocol (MCP) Server', () => {
  it('GET /v1/mcp/tools lists the 5 autonomous tools', async () => {
    const { app } = createApp(testConfig);
    const res = await app.request('/v1/mcp/tools');
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.tools).toBeDefined();
    expect(data.tools.length).toBe(5);

    const toolNames = data.tools.map((t: any) => t.name);
    expect(toolNames).toContain('list_models');
    expect(toolNames).toContain('explain_route');
    expect(toolNames).toContain('get_free_tier_quotas');
    expect(toolNames).toContain('test_provider_health');
    expect(toolNames).toContain('upsert_combo');
  });

  it('POST /v1/mcp handles MCP initialize and tools/list protocol calls', async () => {
    const { app } = createApp(testConfig);

    // Initialize call
    const initRes = await app.request('/v1/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {},
      }),
    });
    expect(initRes.status).toBe(200);
    const initData = await initRes.json();
    expect(initData.result.serverInfo.name).toBe('routenex-mcp');

    // tools/list call
    const listRes = await app.request('/v1/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {},
      }),
    });
    expect(listRes.status).toBe(200);
    const listData = await listRes.json();
    expect(listData.result.tools.length).toBe(5);
  });

  it('POST /v1/mcp tools/call executes get_free_tier_quotas and upsert_combo', async () => {
    const { app } = createApp(testConfig);

    // get_free_tier_quotas call
    const quotaRes = await app.request('/v1/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'get_free_tier_quotas',
          arguments: {},
        },
      }),
    });
    expect(quotaRes.status).toBe(200);
    const quotaData = await quotaRes.json();
    const parsedText = JSON.parse(quotaData.result.content[0].text);
    expect(parsedText.total_free_tokens_available).toBe('1.6 Billion+');

    // upsert_combo call
    const comboRes = await app.request('/v1/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'upsert_combo',
          arguments: {
            name: 'mcp-autonomous-cluster',
            models: ['mock/fast', 'mock/gpt-4'],
            strategy: 'headroom',
          },
        },
      }),
    });
    expect(comboRes.status).toBe(200);
    const comboData = await comboRes.json();
    const comboText = JSON.parse(comboData.result.content[0].text);
    expect(comboText.success).toBe(true);
  });
});




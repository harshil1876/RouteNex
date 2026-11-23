import { describe, expect, it } from 'vitest';
import { createApp } from './server.js';
import { PromptCompressor } from './router/compression.js';
import { RoutingEngine } from './router/engine.js';
import { ProviderRegistry } from './providers/registry.js';
import { CircuitBreaker } from './router/circuit-breaker.js';
import { AdminStore } from './storage/admin-store.js';
import type { AppConfig } from './config.js';

const testConfig: AppConfig = {
  port: 3001,
  host: '127.0.0.1',
  apiKey: undefined,
  mockMode: true,
  groqApiKey: undefined,
  openaiApiKey: undefined,
  logPrompts: false,
  dbPath: './test_extreme_qa.json',
  maxRetries: 2,
  timeoutMs: 5000,
  defaultStrategy: 'balanced',
  rateLimitRpm: 500,
  persistenceEnabled: false,
  allowCautionFallback: false,
};

describe('Suite 11: Principal QA & Extreme Client Torture Test Suite', () => {
  const adminHeaders = {
    'Content-Type': 'application/json',
    'x-admin-token': 'routenex-admin',
  };

  // Test 1: Cline & Cursor Array Content + developer role
  it('Test 1 (P0): accepts Cline/Cursor multimodal array content and developer role on /v1/chat/completions', async () => {
    const { app } = createApp(testConfig);
    const res = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mock/fast',
        messages: [
          { role: 'developer', content: 'You are a principal engineer.' },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze this codebase architecture.' },
              {
                type: 'image_url',
                image_url: { url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' },
              },
            ],
          },
        ],
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.choices).toBeDefined();
    expect(data.choices[0].message.role).toBe('assistant');
    expect(data.choices[0].message.content).toContain('Analyze this codebase architecture');
  });

  // Test 2: Multi-turn OpenAI tool calling
  it('Test 2 (P0): supports multi-turn tool calling with tools, assistant tool_calls, and tool role', async () => {
    const { app } = createApp(testConfig);
    const res = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mock/fast',
        messages: [
          { role: 'user', content: 'Check weather in Tokyo' },
          {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: 'call_tokyo_weather_1',
                type: 'function',
                function: { name: 'get_weather', arguments: '{"city":"Tokyo"}' },
              },
            ],
          },
          {
            role: 'tool',
            tool_call_id: 'call_tokyo_weather_1',
            content: '{"temp": 18, "condition": "sunny"}',
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'get_weather',
              description: 'Get weather for city',
              parameters: { type: 'object', properties: { city: { type: 'string' } } },
            },
          },
        ],
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.choices).toBeDefined();
    expect(data.choices[0].message.content).toBeTruthy();
  });

  // Test 3: Anthropic array system and tool_result translation
  it('Test 3 (P0): handles Anthropic /v1/messages with array system cache_control and tool_result blocks', async () => {
    const { app } = createApp(testConfig);
    const res = await app.request('/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mock/fast',
        max_tokens: 1024,
        system: [
          {
            type: 'text',
            text: 'You are Claude Code subagent.',
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'toolu_read_file_1',
                content: 'export const status = "ok";',
              },
              {
                type: 'text',
                text: 'File content received, please proceed.',
              },
            ],
          },
        ],
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toMatch(/^msg_/);
    expect(data.content).toBeDefined();
    expect(data.content[0].text).toContain('File content received');
  });

  // Test 4: Credential-aware candidate filtering in resolveRoute & explain
  it('Test 4 (P1): /v1/router/explain filters unconfigured providers (groq: 0 keys) and enables them immediately upon key registration', async () => {
    const { app, adminStore } = createApp(testConfig);

    // Initial state: Groq has 0 keys
    const res1 = await app.request('/v1/router/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'auto',
        messages: [{ role: 'user', content: 'Ping' }],
      }),
    });

    expect(res1.status).toBe(200);
    const explain1 = await res1.json();
    const groqCandidate = explain1.candidates_evaluated.find((c: any) => c.provider === 'groq');
    expect(groqCandidate).toBeDefined();
    expect(groqCandidate.eligible).toBe(false);
    expect(groqCandidate.rejection_reason).toContain("no API key connected for provider 'groq'");

    // Add Groq API key via admin API
    const addRes = await app.request('/v1/admin/providers', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        provider: 'groq',
        apiKey: 'gsk_test1234567890abcdefghijklmnopqrstuvwxyz',
      }),
    });
    expect(addRes.status).toBe(200);

    // Re-check explain: Groq candidate is now eligible!
    const res2 = await app.request('/v1/router/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'auto:nitro',
        messages: [{ role: 'user', content: 'Ping' }],
      }),
    });

    expect(res2.status).toBe(200);
    const explain2 = await res2.json();
    const groqCandidate2 = explain2.candidates_evaluated.find((c: any) => c.provider === 'groq');
    expect(groqCandidate2).toBeDefined();
    expect(groqCandidate2.eligible).toBe(true);
  });

  // Test 5: Combo candidate filtering skips unconfigured providers
  it('Test 5 (P1): Combo clusters skip unconfigured target models with clear rejection reasons', async () => {
    const { app, adminStore } = createApp(testConfig);
    adminStore.upsertCombo({
      id: 'combo_qa_failover',
      name: 'QA Failover Combo',
      slug: 'qa-failover',
      description: 'Tests failover from unconfigured groq to active zero-key pollinations',
      strategy: 'priority',
      targets: ['groq/llama-3.3-70b-versatile', 'pollinations/openai'],
    });

    const res = await app.request('/v1/router/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'combo/qa-failover',
        messages: [{ role: 'user', content: 'Test combo routing' }],
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.selected_model).toBe('pollinations/openai');
    const groqTarget = data.candidates_evaluated.find((c: any) => c.model === 'groq/llama-3.3-70b-versatile');
    expect(groqTarget.eligible).toBe(false);
    expect(groqTarget.rejection_reason).toContain("no API key connected for provider 'groq'");
  });

  // Test 6: Bare claude-* fallback skips unconfigured combo targets
  it('Test 6 (P1): Bare claude-* fallback routes to available zero-key/mock models when Anthropic key is absent', async () => {
    const { app } = createApp(testConfig);
    const res = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Write a quick sort algorithm' }],
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.choices).toBeDefined();
    expect(data.choices[0].message.content.toLowerCase()).toMatch(/quick[\s\u2011-]*sort/);
  });

  // Test 7: 100KB+ Extreme Payload & ReDoS Protection
  it('Test 7 (P1): compresses a 100KB+ massive terminal stack trace log in < 100ms with > 50% savings and zero code corruption', () => {
    // Generate a 100KB payload containing repetitive stack frames and code fences
    const stackLines: string[] = [];
    for (let i = 0; i < 600; i++) {
      stackLines.push(`    at Object.runInternal (/Users/dev/project/node_modules/express/lib/router/layer.js:${i % 50 + 10}:12)`);
      stackLines.push(`    at next (/Users/dev/project/node_modules/express/lib/router/route.js:${i % 40 + 5}:14)`);
    }

    const codeSnippet = '```typescript\nfunction solve(x: number): number {\n  return x * 2;\n}\n```';
    const payload = [
      '# Terminal Debug Log',
      codeSnippet,
      '<!-- HTML build comment to remove -->',
      '\n\n\n\n\n',
      'Test run progress: ............................................................ 100/100',
      ...stackLines,
      codeSnippet,
    ].join('\n');

    expect(payload.length).toBeGreaterThan(80_000);

    const start = Date.now();
    const result = PromptCompressor.compressMessages([
      { role: 'user', content: payload },
    ]);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100);
    expect(result.savedPercent).toBeGreaterThan(50);
    const compressed = result.messages[0].content as string;
    // Verify both code blocks were preserved 100% byte-for-byte
    expect(compressed).toContain('function solve(x: number): number {\n  return x * 2;\n}');
    expect(compressed).not.toContain('<!-- HTML build comment to remove -->');
    expect(compressed).toContain('internal frames omitted for token efficiency');
  });

  // Test 8: Unicode Multi-Script & SQL Injection Guard Preservation
  it('Test 8 (P1): preserves CJK, Hindi, Arabic, Russian and SQL injection patterns byte-for-byte', () => {
    const textWithGuards = [
      '```sql',
      "SELECT * FROM users WHERE username = '--' OR 1=1;",
      'DROP TABLE session_tokens; -- inline comment',
      '```',
      '',
      'CJK: こんにちは世界！这是一个极端边缘测试。',
      'Hindi: नमस्ते दुनिया, रूटनेक्स गेटवे में आपका स्वागत है।',
      'Arabic: مرحبا بالعالم، نظام التوجيه الذكي للمؤسسات',
      'Russian: Привет, мир! Тестирование экстремальной совместимости.',
      '',
      'Regular text with `SELECT id FROM logs;` inline code.',
    ].join('\n');

    const result = PromptCompressor.compressText(textWithGuards);

    expect(result).toContain("SELECT * FROM users WHERE username = '--' OR 1=1;");
    expect(result).toContain('DROP TABLE session_tokens; -- inline comment');
    expect(result).toContain('こんにちは世界！这是一个极端边缘测试。');
    expect(result).toContain('नमस्ते दुनिया, रूटनेक्स गेटवे में आपका स्वागत है।');
    expect(result).toContain('مرحبا بالعالم، نظام التوجيه الذكي للمؤسسات');
    expect(result).toContain('Привет, мир! Тестирование экстремальной совместимости.');
    expect(result).toContain('`SELECT id FROM logs;`');
  });

  // Test 9: Multimodal Array Content Compression
  it('Test 9 (P1): compresses text blocks inside multimodal array content while preserving image_url blocks', () => {
    const messages = [
      {
        role: 'user' as const,
        content: [
          {
            type: 'text',
            text: 'Please kindly note that <!-- comment -->\n\n\nHere is the screenshot:\n\n\n',
          },
          {
            type: 'image_url',
            image_url: { url: 'https://example.com/screenshot.png' },
          },
        ],
      },
    ];

    const result = PromptCompressor.compressMessages(messages as any, { stage1Lite: true });
    expect(result.savedPercent).toBeGreaterThan(0);
    const blocks = result.messages[0].content as any[];
    expect(Array.isArray(blocks)).toBe(true);
    expect(blocks[0].text).toBe('Please kindly note that\n\nHere is the screenshot:');
    expect(blocks[1].image_url.url).toBe('https://example.com/screenshot.png');
  });

  // Test 10: Resilience: Malformed JSON, Empty Messages & Unknown Routes
  it('Test 10 (P2): handles malformed JSON, empty messages array, and unknown routes with standard HTTP error envelopes', async () => {
    const { app } = createApp(testConfig);

    // Malformed JSON
    const malformedRes = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"model": "mock/fast", "messages": [invalid-json',
    });
    expect([400, 500]).toContain(malformedRes.status);

    // Empty messages array
    const emptyRes = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mock/fast',
        messages: [],
      }),
    });
    expect(emptyRes.status).toBe(400);

    // Unknown route
    const notFoundRes = await app.request('/v1/unknown-endpoint');
    expect(notFoundRes.status).toBe(404);
  });

  // Test 11: 10MB Request Payload Guard
  it('Test 11 (P1): enforces 10MB payload size guard, returning HTTP 413 for oversized requests', async () => {
    const { app } = createApp(testConfig);
    const res = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'content-length': '15728640', // 15MB
      },
      body: JSON.stringify({ model: 'mock/fast', messages: [{ role: 'user', content: 'test' }] }),
    });

    expect(res.status).toBe(413);
    const data = await res.json();
    expect(data.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  // Test 12: 6 Default Production NexSkills Catalog Seeding
  it('Test 12 (P2): pre-seeds all 6 production-grade NexSkills in AdminStore', async () => {
    const { app } = createApp(testConfig);
    const res = await app.request('/v1/admin/skills', {
      headers: adminHeaders,
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.skills)).toBe(true);
    expect(data.skills.length).toBeGreaterThanOrEqual(6);

    const slugs = data.skills.map((s: any) => s.slug);
    expect(slugs).toContain('pr-security-audit');
    expect(slugs).toContain('log-root-cause-analyzer');
    expect(slugs).toContain('api-rate-limit-architect');
    expect(slugs).toContain('sql-query-optimizer');
    expect(slugs).toContain('test-suite-generator');
    expect(slugs).toContain('release-changelog-writer');
  });

  // Test 13: AdminStore hasProviderKey tracking
  it('Test 13 (P2): AdminStore hasProviderKey correctly reflects credential lifecycle', () => {
    const store = new AdminStore('./test_keys_lifecycle.json', true);
    expect(store.hasProviderKey('groq')).toBe(false);

    store.upsertProviderKey('groq', 'gsk_qa_live_key_999');
    expect(store.hasProviderKey('groq')).toBe(true);

    store.deleteProviderKey('groq');
    expect(store.hasProviderKey('groq')).toBe(false);
  });

  // Test 14: GET /v1/models/:model OpenAI-compatible model retrieval
  it('Test 14 (P1): GET /v1/models/:model retrieves individual model info and returns 404 for unknown models', async () => {
    const { app } = createApp(testConfig);

    // 14a. Retrieve registered model
    const res1 = await app.request('/v1/models/mock/fast');
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    expect(data1.id).toBe('mock/fast');
    expect(data1.object).toBe('model');

    // 14b. Retrieve combo model
    const res2 = await app.request('/v1/models/combo/free-unlimited');
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.id).toBe('combo/free-unlimited');
    expect(data2.routenex.provider).toBe('combo');

    // 14c. Unknown model returns 404
    const res3 = await app.request('/v1/models/nonexistent/model-999');
    expect(res3.status).toBe(404);
    const data3 = await res3.json();
    expect(data3.error.code).toBe('model_not_found');
  });

  // Test 15: Ollama baseUrl normalization prevents /v1/v1 duplication
  it('Test 15 (P0): OllamaProviderAdapter handles baseUrl ending in /v1 without double /v1/v1 duplication', async () => {
    const { OllamaProviderAdapter } = await import('./providers/ollama.js');
    const adapter1 = new OllamaProviderAdapter('http://localhost:11434');
    expect((adapter1 as any).baseUrl).toBe('http://localhost:11434/v1');

    const adapter2 = new OllamaProviderAdapter('http://localhost:11434/v1');
    expect((adapter2 as any).baseUrl).toBe('http://localhost:11434/v1');

    const adapter3 = new OllamaProviderAdapter('http://127.0.0.1:11434/v1///');
    expect((adapter3 as any).baseUrl).toBe('http://127.0.0.1:11434/v1');
  });

  // Test 16: VirtualKey allowedModels enforcement
  it('Test 16 (P0): Enforces VirtualKey allowedModels restriction with 403 model_not_allowed', async () => {
    const { app, adminStore } = createApp(testConfig);
    const restrictedKey = adminStore.createVirtualKey('Restricted Key', 60, { allowedModels: ['mock/fast'] });

    // Attempting unallowed model returns 403
    const resBlocked = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${restrictedKey.key}`,
      },
      body: JSON.stringify({
        model: 'mock/gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });
    expect(resBlocked.status).toBe(403);
    const blockedData = await resBlocked.json();
    expect(blockedData.error.code).toBe('model_not_allowed');

    // Attempting permitted model succeeds with 200
    const resAllowed = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${restrictedKey.key}`,
      },
      body: JSON.stringify({
        model: 'mock/fast',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });
    expect(resAllowed.status).toBe(200);
  });

  // Test 17: VirtualKey spend tracking on chat completions
  it('Test 17 (P1): Tracks virtual key spend on chat completions and enforces dailyBudgetUsd', async () => {
    const { app, adminStore } = createApp(testConfig);
    const budgetKey = adminStore.createVirtualKey('Budget Key', 60, { dailyBudgetUsd: 0.00001 });

    // Record spend to trigger cap
    adminStore.recordKeySpend(budgetKey.id, 0.05);

    // Subsequent request is rate-limited with 429
    const res = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${budgetKey.key}`,
      },
      body: JSON.stringify({
        model: 'mock/fast',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error.code).toBe('budget_exceeded');
  });

  // Test 18: SHA-256 pre-hashed timing-safe comparison
  it('Test 18 (P1): timingSafeEqual functions safely compare different-length strings in constant time', async () => {
    const { secureTimingSafeEqual } = await import('./storage/crypto.js');
    const { timingSafeEqualStr } = await import('./utils/security.ts');

    expect(secureTimingSafeEqual('secret-key-123', 'secret-key-123')).toBe(true);
    expect(secureTimingSafeEqual('short', 'much-longer-string-to-test-length-leak')).toBe(false);
    expect(secureTimingSafeEqual('', 'token')).toBe(false);

    expect(timingSafeEqualStr('hello', 'hello')).toBe(true);
    expect(timingSafeEqualStr('hello', 'world-difference')).toBe(false);
  });

  // Test 19: ChatCompletionRequestSchema preserves forward-compatible fields
  it('Test 19 (P1): ChatCompletionRequestSchema passes through max_completion_tokens and reasoning_effort', async () => {
    const { ChatCompletionRequestSchema } = await import('./schemas.js');
    const parsed = ChatCompletionRequestSchema.parse({
      model: 'openai/gpt-4o',
      messages: [{ role: 'user', content: 'Solve this' }],
      max_completion_tokens: 4096,
      reasoning_effort: 'medium',
      extra_vendor_param: 'passed-through',
    });

    expect(parsed.max_completion_tokens).toBe(4096);
    expect(parsed.reasoning_effort).toBe('medium');
    expect((parsed as any).extra_vendor_param).toBe('passed-through');
  });

  // Test 20: Provider Enablement & Persistence Across Gateway Sessions (Closing and Re-opening)
  it('Test 20 (P0): persists disabled provider state across gateway sessions and routes correctly', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const testDbPath = path.resolve('./test_provider_persistence.json');

    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

      // Session 1: Create store, disable provider
      const store1 = new AdminStore(testDbPath, false);
      expect(store1.isProviderEnabled('groq')).toBe(true);
      store1.setProviderEnabled('groq', false);
      expect(store1.isProviderEnabled('groq')).toBe(false);
      expect(store1.getDisabledProviders()).toContain('groq');
      await store1.flush();

      // Session 2: Simulate RouteNex restart by re-instantiating AdminStore from disk
      const store2 = new AdminStore(testDbPath, false);
      expect(store2.isProviderEnabled('groq')).toBe(false);
      expect(store2.getDisabledProviders()).toContain('groq');

      // Re-enable
      store2.setProviderEnabled('groq', true);
      expect(store2.isProviderEnabled('groq')).toBe(true);
      await store2.flush();

      // Session 3: Verify re-enabled status persisted to disk
      const store3 = new AdminStore(testDbPath, false);
      expect(store3.isProviderEnabled('groq')).toBe(true);
      expect(store3.getDisabledProviders()).not.toContain('groq');

      // API Level verification
      const { app, adminStore } = createApp(testConfig);
      const disableRes = await app.request('/v1/admin/providers/cerebras/state', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ enabled: false }),
      });
      expect(disableRes.status).toBe(200);
      const disableData = await disableRes.json();
      expect(disableData.success).toBe(true);
      expect(disableData.isEnabled).toBe(false);

      // Check GET /v1/admin/config
      const configRes = await app.request('/v1/admin/config', { headers: adminHeaders });
      expect(configRes.status).toBe(200);
      const configData = await configRes.json();
      expect(configData.disabledProviders).toContain('cerebras');
      const cerebrasEntry = configData.providers.find((p: any) => p.id === 'cerebras');
      expect(cerebrasEntry?.isEnabled).toBe(false);

      // Check GET /v1/admin/providers
      const provRes = await app.request('/v1/admin/providers', { headers: adminHeaders });
      expect(provRes.status).toBe(200);
      const provData = await provRes.json();
      const cerebrasProv = provData.providers.find((p: any) => p.id === 'cerebras');
      expect(cerebrasProv?.isEnabled).toBe(false);

      // Check toggle endpoint
      const toggleRes = await app.request('/v1/admin/providers/cerebras/toggle', {
        method: 'POST',
        headers: adminHeaders,
      });
      expect(toggleRes.status).toBe(200);
      const toggleData = await toggleRes.json();
      expect(toggleData.isEnabled).toBe(true);
      expect(adminStore.isProviderEnabled('cerebras')).toBe(true);
    } finally {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    }
  });
});

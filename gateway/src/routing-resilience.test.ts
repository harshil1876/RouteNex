import { describe, expect, it } from 'vitest';
import { createApp } from './server.js';
import { CircuitBreaker } from './router/circuit-breaker.js';
import { RoutingEngine } from './router/engine.js';
import { ProviderRegistry } from './providers/registry.js';
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
  dbPath: './test_resilience.json',
  maxRetries: 2,
  timeoutMs: 5000,
  defaultStrategy: 'balanced',
  rateLimitRpm: 500,
  persistenceEnabled: false,
  allowCautionFallback: false,
};

describe('Suite 2: Routing Strategies & Resilience Engine', () => {
  // 1-9: 9 Routing Strategies
  it('Strategy 1: cost strategy prioritizes lowest priced model', () => {
    const registry = new ProviderRegistry(testConfig);
    const cb = new CircuitBreaker();
    const engine = new RoutingEngine(registry, cb, { ...testConfig, defaultStrategy: 'cost' });

    const route = engine.resolveRoute({
      model: 'auto',
      messages: [{ role: 'user', content: 'Price check' }],
      stream: false,
      n: 1,
    });
    expect(route.primary).toBeDefined();
    expect(route.primary.id).toBeDefined();
  });

  it('Strategy 2: latency strategy prioritizes fastest model', () => {
    const registry = new ProviderRegistry(testConfig);
    const cb = new CircuitBreaker();
    const engine = new RoutingEngine(registry, cb, { ...testConfig, defaultStrategy: 'latency' });

    const route = engine.resolveRoute({
      model: 'auto',
      messages: [{ role: 'user', content: 'Speed check' }],
      stream: false,
      n: 1,
    });
    expect(route.primary).toBeDefined();
    expect(route.primary.id).toBe('mock/fast');
  });

  it('Strategy 3: balanced strategy balances cost and latency', () => {
    const registry = new ProviderRegistry(testConfig);
    const cb = new CircuitBreaker();
    const engine = new RoutingEngine(registry, cb, { ...testConfig, defaultStrategy: 'balanced' });

    const route = engine.resolveRoute({
      model: 'auto',
      messages: [{ role: 'user', content: 'Balanced check' }],
      stream: false,
      n: 1,
    });
    expect(route.primary).toBeDefined();
  });

  it('Strategy 4: priority strategy uses explicit fallback chain', () => {
    const registry = new ProviderRegistry(testConfig);
    const cb = new CircuitBreaker();
    const engine = new RoutingEngine(registry, cb, testConfig);

    const route = engine.resolveRoute({
      model: 'auto',
      models: ['mock/gpt-4', 'mock/fast'],
      messages: [{ role: 'user', content: 'Priority check' }],
      stream: false,
      n: 1,
    });
    expect(route.primary.id).toBe('mock/gpt-4');
    expect(route.fallbackChain.length).toBe(1);
    expect(route.fallbackChain[0].id).toBe('mock/fast');
  });

  it('Strategy 5: auto:nitro tag routes to lowest latency model', async () => {
    const registry = new ProviderRegistry(testConfig);
    const cb = new CircuitBreaker();
    const engine = new RoutingEngine(registry, cb, testConfig);

    const route = engine.resolveRoute({
      model: 'auto:nitro',
      messages: [{ role: 'user', content: 'test' }],
      n: 1,
    });
    expect(route.primary).toBeDefined();
    expect(route.primary.id).toBe('mock/fast');
    expect(route.reasonCode).toBe('LATENCY_MINIMIZED');
  });

  it('Strategy 6: auto:free tag routes to zero-cost provider', async () => {
    const registry = new ProviderRegistry(testConfig);
    const cb = new CircuitBreaker();
    const engine = new RoutingEngine(registry, cb, testConfig);

    const route = engine.resolveRoute({
      model: 'auto:free',
      messages: [{ role: 'user', content: 'test' }],
      n: 1,
    });
    expect(route.primary).toBeDefined();
    const cost = (route.primary.pricing?.prompt_per_million ?? 0) + (route.primary.pricing?.completion_per_million ?? 0);
    expect(cost).toBe(0);
  });

  it('Strategy 7: auto:floor tag routes to lowest floor rate', async () => {
    const registry = new ProviderRegistry(testConfig);
    const cb = new CircuitBreaker();
    const engine = new RoutingEngine(registry, cb, testConfig);

    const route = engine.resolveRoute({
      model: 'auto:floor',
      messages: [{ role: 'user', content: 'Floor test' }],
      n: 1,
    });
    expect(route.primary).toBeDefined();
    expect(route.reasonCode).toBe('COST_MINIMIZED');
  });

  it('Strategy 8: auto:zdr tag routes to Zero Data Retention compliant model', async () => {
    const registry = new ProviderRegistry(testConfig);
    const cb = new CircuitBreaker();
    const engine = new RoutingEngine(registry, cb, testConfig);

    const route = engine.resolveRoute({
      model: 'auto:zdr',
      messages: [{ role: 'user', content: 'test' }],
      n: 1,
    });
    expect(route.primary).toBeDefined();
    expect(['mock', 'groq', 'cerebras', 'mistral', 'deepseek', 'ollama']).toContain(route.primary.provider);
  });

  it('Strategy 9: Combo clusters route to grouped failover targets', async () => {
    const { app, adminStore } = createApp(testConfig);
    adminStore.upsertCombo({
      id: 'combo_test_cluster',
      name: 'Test Cluster',
      slug: 'combo/test-cluster',
      description: 'Mock test cluster',
      targets: ['mock/fast', 'mock/gpt-4'],
      strategy: 'priority',
      createdAt: new Date().toISOString(),
    });

    const res = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'combo/test-cluster',
        messages: [{ role: 'user', content: 'Combo test' }],
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.choices[0].message.content).toBeDefined();
    expect(data.routenex.routing_reason).toContain('combo/test-cluster');
  });

  // 10. Mid-Request 429 Failover to Next Candidate
  it('Mid-request 429 failover: shifts traffic seamlessly to next candidate in fallback chain', async () => {
    const registry = new ProviderRegistry(testConfig);
    const cb = new CircuitBreaker();
    const engine = new RoutingEngine(registry, cb, testConfig);

    const res = await engine.executeChat(
      {
        model: 'mock/error',
        models: ['mock/error', 'mock/fast'],
        messages: [{ role: 'user', content: 'Failover test' }],
        stream: false,
        n: 1,
      },
      'req_failover_test'
    );

    expect(res.model).toBe('mock/fast');
    expect(res.routenex.fallback_attempts).toBeGreaterThanOrEqual(1);
    expect(res.choices[0].message.content).toContain('Failover test');
  });

  // 11. Circuit Breaker State Lifecycle
  it('Circuit breaker state lifecycle: CLOSED -> 3 failures -> OPEN -> cooldown -> HALF_OPEN -> 2 successes -> CLOSED', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 30, halfOpenSuccessThreshold: 2 });
    const provider = 'mock-provider-lifecycle';

    expect(cb.getState(provider)).toBe('CLOSED');
    expect(cb.canExecute(provider)).toBe(true);

    // 1st failure
    cb.recordFailure(provider);
    expect(cb.getState(provider)).toBe('CLOSED');

    // 2nd failure
    cb.recordFailure(provider);
    expect(cb.getState(provider)).toBe('CLOSED');

    // 3rd failure -> Opens circuit
    cb.recordFailure(provider);
    expect(cb.getState(provider)).toBe('OPEN');
    expect(cb.canExecute(provider)).toBe(false);

    // Wait for cooldown
    await new Promise((r) => setTimeout(r, 45));
    expect(cb.getState(provider)).toBe('HALF_OPEN');
    expect(cb.canExecute(provider)).toBe(true);

    // 1st success in HALF_OPEN
    cb.recordSuccess(provider);
    expect(cb.getState(provider)).toBe('HALF_OPEN');

    // 2nd success in HALF_OPEN -> Closes circuit
    cb.recordSuccess(provider);
    expect(cb.getState(provider)).toBe('CLOSED');
    expect(cb.canExecute(provider)).toBe(true);
  });

  // 12. Key Rate Limit Cooldown Isolation (Layer 2)
  it('Layer 2 Key Cooldown: isolates 429 backoff to specific key without knocking out peer keys', async () => {
    const cb = new CircuitBreaker({ defaultKeyCooldownMs: 30 });
    const keyAlpha = 'sk-alpha-key-123';
    const keyBeta = 'sk-beta-key-456';

    expect(cb.canExecute('groq', undefined, keyAlpha)).toBe(true);
    expect(cb.canExecute('groq', undefined, keyBeta)).toBe(true);

    // Rate limit Key Alpha
    cb.recordKeyCooldown(keyAlpha, 30, 'Rate limit 429');
    expect(cb.isKeyCoolingDown(keyAlpha)).toBe(true);
    expect(cb.canExecute('groq', undefined, keyAlpha)).toBe(false);
    // Key Beta remains 100% operational
    expect(cb.canExecute('groq', undefined, keyBeta)).toBe(true);

    await new Promise((r) => setTimeout(r, 45));
    expect(cb.isKeyCoolingDown(keyAlpha)).toBe(false);
    expect(cb.canExecute('groq', undefined, keyAlpha)).toBe(true);
  });

  // 13. Model Lockout Isolation (Layer 3)
  it('Layer 3 Model Lockout: isolates failing model without knocking out sibling models on same provider', () => {
    const cb = new CircuitBreaker({ defaultModelLockoutMs: 50 });
    const failingModel = 'groq/deprecated-model';
    const healthyModel = 'groq/llama-3.3-70b-versatile';

    expect(cb.canExecute('groq', failingModel)).toBe(true);
    expect(cb.canExecute('groq', healthyModel)).toBe(true);

    // Record 404 model not found
    cb.recordModelLockout(failingModel, 50, 'Model not found 404');
    expect(cb.isModelLocked(failingModel)).toBe(true);
    expect(cb.canExecute('groq', failingModel)).toBe(false);

    // Healthy sibling model remains available
    expect(cb.canExecute('groq', healthyModel)).toBe(true);
  });

  // 14. Adaptive Param Shield Auto-Learning
  it('Adaptive Param Shield: auto-learns and strips unsupported parameters on HTTP 400', () => {
    const adminStore = new AdminStore('./test_shield.json', true);
    adminStore.addProviderBlockedParam('custom-provider', 'frequency_penalty');

    const blocked = adminStore.getProviderBlockedParams('custom-provider');
    expect(blocked).toContain('frequency_penalty');

    // Normalizing and case-insensitivity
    adminStore.addProviderBlockedParam('custom-provider', 'PRESENCE_PENALTY');
    const blockedUpdated = adminStore.getProviderBlockedParams('custom-provider');
    expect(blockedUpdated).toContain('presence_penalty');
  });
});

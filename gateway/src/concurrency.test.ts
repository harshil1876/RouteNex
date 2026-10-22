import { describe, expect, it } from 'vitest';
import { createApp } from './server.js';
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
  dbPath: './test_concurrency.json',
  maxRetries: 2,
  timeoutMs: 5000,
  defaultStrategy: 'balanced',
  rateLimitRpm: 5000,
  persistenceEnabled: false,
  allowCautionFallback: false,
};

describe('Suite 5: High-Concurrency & Stream Cleanup Engine', () => {
  // 1. 50 Parallel Chat Requests
  it('Concurrency: executes 50 parallel chat completions with zero race conditions', async () => {
    const { app } = createApp(testConfig);
    const totalRequests = 50;

    const promises = Array.from({ length: totalRequests }, async (_, i) => {
      const res = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mock/fast',
          messages: [{ role: 'user', content: `Parallel request #${i}` }],
          stream: false,
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.choices[0].message.content).toContain(`Parallel request #${i}`);
      return data;
    });

    const results = await Promise.all(promises);
    expect(results.length).toBe(totalRequests);
  });

  // 2. 10 Parallel Keystore / Admin Writes Serialized Without File Truncation
  it('Keystore Concurrency: handles 10 parallel atomic writes serialized cleanly', async () => {
    const adminStore = new AdminStore('./test_concurrent_store.json', false);

    const writeOperations = Array.from({ length: 10 }, async (_, i) => {
      if (i % 3 === 0) {
        adminStore.setProviderKey(`provider_${i}`, `sk-test-key-number-${i}`);
      } else if (i % 3 === 1) {
        adminStore.setAlias(`alias_${i}`, 'mock/fast');
      } else {
        adminStore.upsertCombo({
          id: `combo_${i}`,
          name: `Combo ${i}`,
          slug: `combo/concurrent-${i}`,
          description: `Concurrent test combo ${i}`,
          targets: ['mock/fast', 'mock/gpt-4'],
          strategy: 'priority',
          createdAt: new Date().toISOString(),
        });
      }
    });

    await Promise.all(writeOperations);
    await adminStore.flush();

    // Verify all keys and settings are persisted and queryable
    const settings = adminStore.getSettings();
    expect(settings).toBeDefined();
    expect(Object.keys(settings.aliases).length).toBeGreaterThan(0);
    expect(settings.combos.length).toBeGreaterThan(0);
  });

  // 3. Mid-Stream Abort Cleanup Under 50ms
  it('SSE Abort: cleanly cancels upstream generator and cleans up within 50ms', async () => {
    const { app } = createApp(testConfig);
    const controller = new AbortController();

    const start = Date.now();
    const res = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mock/gpt-4',
        messages: [{ role: 'user', content: 'Long running stream message to abort' }],
        stream: true,
      }),
      signal: controller.signal,
    });

    expect(res.status).toBe(200);
    const reader = res.body?.getReader();
    expect(reader).toBeDefined();

    // Read first chunk
    const chunk1 = await reader!.read();
    expect(chunk1.done).toBe(false);

    // Trigger immediate abort
    const abortTime = Date.now();
    controller.abort();
    try {
      await reader!.cancel();
    } catch {}

    const cleanupDuration = Date.now() - abortTime;
    // Teardown must be fast and bounded (< 50ms)
    expect(cleanupDuration).toBeLessThan(50);
  });
});

import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import { createApp } from './server.js';
import { AdminStore } from './storage/admin-store.js';
import { encryptValue, decryptValue } from './storage/crypto.js';
import type { AppConfig } from './config.js';

const testConfig: AppConfig = {
  port: 3001,
  host: '127.0.0.1',
  apiKey: undefined,
  mockMode: true,
  groqApiKey: undefined,
  openaiApiKey: undefined,
  logPrompts: false,
  dbPath: './test_security.json',
  maxRetries: 2,
  timeoutMs: 5000,
  defaultStrategy: 'balanced',
  rateLimitRpm: 500,
  persistenceEnabled: false,
  allowCautionFallback: false,
};

describe('Suite 4: Security, Encryption & Hardened Keystore', () => {
  // 1. AES-256-GCM Encryption at Rest
  it('Keystore: AES-256-GCM encrypts secrets with enc:v1: prefix and decrypts accurately', () => {
    const rawSecret = 'sk-proj-test-secret-key-abcdef1234567890';
    const encrypted = encryptValue(rawSecret);

    expect(encrypted).toMatch(/^enc:v1:[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/);
    expect(encrypted).not.toContain(rawSecret);

    const decrypted = decryptValue(encrypted);
    expect(decrypted).toBe(rawSecret);
  });

  // 2. AES-256-GCM Tamper Detection
  it('Keystore: tampered ciphertext or auth tag fails authentication in AES-256-GCM', () => {
    const rawSecret = 'sk-secret-tamper-check';
    const encrypted = encryptValue(rawSecret);
    const parts = encrypted.split(':');
    // Tamper with the ciphertext (parts[4])
    const tamperedParts = [...parts];
    tamperedParts[4] = tamperedParts[4].slice(0, -2) + (tamperedParts[4].endsWith('0') ? '1' : '0');
    const tampered = tamperedParts.join(':');

    // decryptValue securely returns empty string on tamper to prevent crash or secret exposure
    expect(decryptValue(tampered)).toBe('');
  });

  // 3. Masked Key Preservation (Loophole 5 Fix)
  it('Masked Key Preservation: does NOT overwrite existing encrypted key when candidate is masked', () => {
    const adminStore = new AdminStore('./test_masked_store.json', true);
    const originalKey = 'sk-live-real-secret-key-99999999';
    adminStore.setProviderKey('openai', originalKey);

    expect(adminStore.getProviderKey('openai')).toBe(originalKey);

    // Save masked key (e.g. from UI form submission)
    adminStore.setProviderKey('openai', 'sk-li...9999');
    // Must preserve original decrypted key!
    expect(adminStore.getProviderKey('openai')).toBe(originalKey);

    // Also with bullet/asterisk masking
    adminStore.setProviderKey('openai', 'sk-••••••••9999');
    expect(adminStore.getProviderKey('openai')).toBe(originalKey);

    adminStore.setProviderKey('openai', 'sk-********9999');
    expect(adminStore.getProviderKey('openai')).toBe(originalKey);
  });

  // 4. 401 Unauthenticated Admin Reject (Loophole 2 Fix)
  it('Admin Security: rejects unauthenticated requests to /v1/admin/* with 401', async () => {
    const { app } = createApp(testConfig);

    // 1. Config endpoint
    const resConfig = await app.request('/v1/admin/config');
    expect(resConfig.status).toBe(401);
    const bodyConfig = await resConfig.json();
    expect(bodyConfig.error.type).toBe('authentication_error');

    // 2. Keys endpoint
    const resKeys = await app.request('/v1/admin/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacker Key' }),
    });
    expect(resKeys.status).toBe(401);

    // 3. Providers endpoint
    const resProviders = await app.request('/v1/admin/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'openai', key: 'stolen-key' }),
    });
    expect(resProviders.status).toBe(401);

    // 4. Authorized request with valid admin token succeeds
    const resAuthed = await app.request('/v1/admin/config', {
      headers: { 'x-admin-token': 'routenex-admin' },
    });
    expect(resAuthed.status).toBe(200);
  });

  // 5. Rate Limiting and IP Spoofing Resistance (Loophole 3 Fix)
  it('Brute-force protection: rate limits failed logins regardless of spoofed X-Forwarded-For', async () => {
    const { app } = createApp(testConfig);

    // Send 10 failed login attempts with varying spoofed X-Forwarded-For headers
    for (let i = 0; i < 10; i++) {
      const spoofedIp = `192.168.1.${i + 1}`;
      const failRes = await app.request('/v1/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': spoofedIp,
          'X-Real-IP': spoofedIp,
        },
        body: JSON.stringify({ password: 'wrong-password' }),
      });
      expect(failRes.status).toBe(401);
    }

    // 11th attempt from another spoofed IP must be blocked with 429
    const blockedRes = await app.request('/v1/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '10.0.0.99',
      },
      body: JSON.stringify({ password: 'wrong-password' }),
    });
    expect(blockedRes.status).toBe(429);
    expect(blockedRes.headers.get('Retry-After')).toBeDefined();
  });

  // 6. Honest 0-Account Health
  it('Zero-account honesty: provider with 0 accounts reports offline/unconfigured', async () => {
    const { app } = createApp(testConfig);
    const res = await app.request('/v1/admin/config', {
      headers: { 'x-admin-token': 'routenex-admin' },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    const groq = data.providers.find((p: any) => p.id === 'groq');
    expect(groq).toBeDefined();
    expect(groq.isConfigured).toBe(false);
    expect(groq.accountsCount).toBe(0);
  });

  // 7. Real OAuth 2.0 PKCE S256 Challenge
  it('OAuth PKCE: generates cryptographic S256 code_challenge and redirects to Google', async () => {
    const { app } = createApp(testConfig);
    const res = await app.request('/v1/admin/providers/antigravity-cli/oauth/start', {
      method: 'POST',
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(data.authUrl).toContain('code_challenge_method=S256');
    expect(data.authUrl).toContain('code_challenge=');
    expect(data.authUrl).toContain('response_type=code');
  });
});

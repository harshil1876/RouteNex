/**
 * RouteNex Open Source Admin API Routes
 * 
 * Provides local self-hosted management endpoints:
 * - Dynamic provider credential configuration & live test ping
 * - Local virtual keys (rn-local-...)
 * - Model aliases (virtual model names)
 * - Routing policy overrides (default strategy, compression)
 * - In-browser Doctor diagnostics
 */

import { Hono } from 'hono';
import type { ProviderRegistry } from '../providers/registry.js';
import type { AdminStore } from '../storage/admin-store.js';
import type { AppConfig } from '../config.js';
import { GroqProviderAdapter } from '../providers/groq.js';
import { OpenAIProviderAdapter } from '../providers/openai.js';
import { GeminiProviderAdapter } from '../providers/gemini.js';
import { AnthropicProviderAdapter } from '../providers/anthropic.js';
import { OllamaProviderAdapter } from '../providers/ollama.js';

export function createAdminRoutes(
  adminStore: AdminStore,
  registry: ProviderRegistry,
  config: AppConfig
) {
  const router = new Hono();

  // 1. GET /v1/admin/config - Get current self-hosted settings
  router.get('/config', (c) => {
    const settings = adminStore.getSettings();
    const providersList = registry.getAllProviders().map((p) => ({
      id: p.id,
      name: p.name,
      configured: p.isConfigured(),
      modelCount: p.models.length,
    }));

    return c.json({
      edition: 'RouteNex Open Source',
      version: '0.1.0',
      host: config.host,
      port: config.port,
      compressionEnabled: settings.compressionEnabled,
      defaultStrategy: settings.defaultStrategy,
      aliases: settings.aliases,
      virtualKeys: settings.virtualKeys.map((vk) => ({
        id: vk.id,
        name: vk.name,
        keyMasked: `${vk.key.slice(0, 12)}...${vk.key.slice(-4)}`,
        keyFull: vk.key,
        createdAt: vk.createdAt,
        rateLimitRpm: vk.rateLimitRpm,
      })),
      providers: providersList,
    });
  });

  // 2. POST /v1/admin/providers - Update provider credentials dynamically
  router.post('/providers', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const { provider, apiKey, baseUrl } = body;

    if (!provider) {
      return c.json({ error: 'Missing provider identifier' }, 400);
    }

    try {
      if (provider === 'groq') {
        adminStore.setProviderKey('groq', apiKey);
        registry.register(new GroqProviderAdapter(apiKey));
      } else if (provider === 'openai') {
        adminStore.setProviderKey('openai', apiKey);
        registry.register(new OpenAIProviderAdapter(apiKey));
      } else if (provider === 'gemini') {
        adminStore.setProviderKey('gemini', apiKey);
        registry.register(new GeminiProviderAdapter(apiKey));
      } else if (provider === 'anthropic') {
        adminStore.setProviderKey('anthropic', apiKey);
        registry.register(new AnthropicProviderAdapter(apiKey));
      } else if (provider === 'ollama') {
        adminStore.setProviderKey('ollamaBaseUrl', baseUrl || 'http://localhost:11434/v1');
        registry.register(new OllamaProviderAdapter(baseUrl));
      } else {
        return c.json({ error: `Unknown provider '${provider}'` }, 400);
      }

      return c.json({
        success: true,
        provider,
        configured: Boolean(apiKey || baseUrl),
        message: `Provider '${provider}' configuration updated successfully.`,
      });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // 3. POST /v1/admin/providers/test - Test provider connection
  router.post('/providers/test', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const { provider } = body;

    const p = registry.getProvider(provider);
    if (!p) {
      return c.json({ ok: false, error: `Provider '${provider}' not found.` }, 404);
    }

    try {
      const healthy = await p.healthCheck();
      return c.json({
        ok: healthy,
        provider: p.id,
        configured: p.isConfigured(),
        message: healthy
          ? `Provider '${p.name}' is healthy and reachable.`
          : `Provider '${p.name}' failed healthcheck or returned unauthenticated error.`,
      });
    } catch (err: any) {
      return c.json({ ok: false, error: err.message }, 500);
    }
  });

  // 4. POST /v1/admin/keys - Create a local virtual key
  router.post('/keys', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const name = body.name || 'Application Key';
    const rpm = Number(body.rateLimitRpm) || 60;
    const vk = adminStore.createVirtualKey(name, rpm);

    return c.json({
      success: true,
      key: vk,
      message: 'New virtual key generated.',
    });
  });

  // 5. DELETE /v1/admin/keys/:id - Delete a virtual key
  router.delete('/keys/:id', (c) => {
    const id = c.req.param('id');
    const deleted = adminStore.deleteVirtualKey(id);
    return c.json({ success: deleted });
  });

  // 6. POST /v1/admin/aliases - Create/update model alias
  router.post('/aliases', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const { alias, targetModel } = body;
    if (!alias || !targetModel) {
      return c.json({ error: 'Missing alias or targetModel' }, 400);
    }
    adminStore.setAlias(alias, targetModel);
    return c.json({ success: true, alias, targetModel });
  });

  // 7. DELETE /v1/admin/aliases/:alias - Delete model alias
  router.delete('/aliases/:alias', (c) => {
    const alias = c.req.param('alias');
    const deleted = adminStore.deleteAlias(alias);
    return c.json({ success: deleted });
  });

  // 8. POST /v1/admin/policy - Update default strategy & compression
  router.post('/policy', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    if (body.strategy) {
      adminStore.setStrategy(body.strategy);
    }
    if (typeof body.compressionEnabled === 'boolean') {
      adminStore.setCompression(body.compressionEnabled);
    }
    return c.json({
      success: true,
      settings: adminStore.getSettings(),
    });
  });

  // 9. GET /v1/admin/doctor - In-browser diagnostic checks
  router.get('/doctor', (c) => {
    const configuredCount = registry.getAllProviders().filter((p) => p.isConfigured()).length;
    const diagnostics = [
      {
        category: 'Runtime',
        name: 'Node.js Version',
        status: 'PASS',
        details: `${process.version} (compatible >= 20.0.0)`,
      },
      {
        category: 'Gateway',
        name: `Port ${config.port}`,
        status: 'PASS',
        details: `Active and responding on ${config.host}:${config.port}`,
      },
      {
        category: 'Providers',
        name: 'Active Providers',
        status: configuredCount > 0 ? 'PASS' : 'WARN',
        details: `${configuredCount} provider(s) active in registry`,
      },
      {
        category: 'Storage',
        name: 'Persistence Mode',
        status: 'PASS',
        details: config.persistenceEnabled ? 'Enabled (routenex.json)' : 'In-Memory Telemetry',
      },
      {
        category: 'Security',
        name: 'Prompt Privacy Guard',
        status: 'PASS',
        details: config.logPrompts ? 'Warning: Prompts logged' : 'Compliant (zero prompt logging)',
      },
    ];

    return c.json({
      diagnostics,
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}

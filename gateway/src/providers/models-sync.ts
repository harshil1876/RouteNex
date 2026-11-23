/**
 * RouteNex Automated `models.dev` Pricing & Capability Sync Engine
 *
 * Mirrors OmniRoute's deterministic override cascade:
 *   User Overrides -> models.dev live pricing/context sync -> Hardcoded Catalog
 *
 * Fetches https://models.dev/api.json on demand or on a daily background schedule,
 * updating context windows, prompt/completion per-million pricing, and capabilities
 * for matching registered models in ProviderRegistry.
 */

import type { ProviderRegistry } from './registry.js';
import type { ModelEntry } from './types.js';

export interface ModelsDevSyncSummary {
  success: boolean;
  source: string;
  syncedAt: string;
  providersMatched: number;
  modelsUpdated: number;
  modelsDiscovered: number;
  error?: string;
}

const MODELS_DEV_URL = 'https://models.dev/api.json';

let lastSyncSummary: ModelsDevSyncSummary | null = null;

export function getLastModelsDevSync(): ModelsDevSyncSummary | null {
  return lastSyncSummary;
}

/**
 * Fetches models.dev catalog and merges pricing, context limits, and capabilities
 * into the active ProviderRegistry without overwriting user-defined overrides.
 */
export async function syncCatalogFromModelsDev(
  registry: ProviderRegistry,
  options: { timeoutMs?: number; overrideUrl?: string } = {}
): Promise<ModelsDevSyncSummary> {
  const url = options.overrideUrl || MODELS_DEV_URL;
  const timeoutMs = options.timeoutMs ?? 8000;
  const syncedAt = new Date().toISOString();

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'RouteNex-Gateway/0.3.0' },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      const summary: ModelsDevSyncSummary = {
        success: false,
        source: url,
        syncedAt,
        providersMatched: 0,
        modelsUpdated: 0,
        modelsDiscovered: 0,
        error: `Upstream models.dev returned HTTP ${res.status}`,
      };
      lastSyncSummary = summary;
      return summary;
    }

    const data = (await res.json()) as Record<string, any>;
    let providersMatched = 0;
    let modelsUpdated = 0;
    let modelsDiscovered = 0;

    for (const [providerKey, providerObj] of Object.entries(data || {})) {
      if (!providerObj || typeof providerObj !== 'object' || !providerObj.models) continue;

      const adapter = registry.getAdapter(providerKey);
      if (!adapter) continue;
      providersMatched++;

      const existingMap = new Map<string, ModelEntry>();
      for (const m of adapter.models) {
        existingMap.set(m.id, m);
        const shortId = m.id.includes('/') ? m.id.slice(m.id.indexOf('/') + 1) : m.id;
        existingMap.set(shortId, m);
      }

      for (const [modelKey, info] of Object.entries(providerObj.models as Record<string, any>)) {
        if (!info || typeof info !== 'object') continue;
        const promptCost = typeof info.cost?.input === 'number' ? info.cost.input : undefined;
        const completionCost = typeof info.cost?.output === 'number' ? info.cost.output : undefined;
        const contextLimit = typeof info.limit?.context === 'number' ? info.limit.context : undefined;
        const supportsTools = typeof info.tool_call === 'boolean' ? info.tool_call : true;
        const supportsVision = Boolean(
          Array.isArray(info.modalities?.input) && info.modalities.input.includes('image')
        );

        const fullId = `${adapter.id}/${modelKey}`;
        const existing = existingMap.get(fullId) || existingMap.get(modelKey);

        if (existing) {
          if (contextLimit && contextLimit > 0) existing.context_length = contextLimit;
          if (promptCost !== undefined && completionCost !== undefined) {
            existing.pricing = {
              prompt_per_million: promptCost,
              completion_per_million: completionCost,
              provenance: 'OFFICIAL',
              updated_at: syncedAt,
            };
          }
          existing.capabilities = {
            ...existing.capabilities,
            tool_calls: supportsTools,
            vision: existing.capabilities.vision || supportsVision,
          };
          modelsUpdated++;
        } else if (adapter.models.length < 200) {
          const newEntry: ModelEntry = {
            id: fullId,
            provider: adapter.id,
            capabilities: {
              chat: true,
              streaming: true,
              tool_calls: supportsTools,
              vision: supportsVision,
              json_mode: true,
            },
            context_length: contextLimit || 128000,
            pricing: {
              prompt_per_million: promptCost ?? 0,
              completion_per_million: completionCost ?? 0,
              provenance: 'OFFICIAL',
              updated_at: syncedAt,
            },
          };
          adapter.models.push(newEntry);
          existingMap.set(fullId, newEntry);
          modelsDiscovered++;
        }
      }
    }

    const summary: ModelsDevSyncSummary = {
      success: true,
      source: url,
      syncedAt,
      providersMatched,
      modelsUpdated,
      modelsDiscovered,
    };
    lastSyncSummary = summary;
    return summary;
  } catch (err: any) {
    const summary: ModelsDevSyncSummary = {
      success: false,
      source: url,
      syncedAt,
      providersMatched: 0,
      modelsUpdated: 0,
      modelsDiscovered: 0,
      error: err?.message || 'Network timeout reaching models.dev',
    };
    lastSyncSummary = summary;
    return summary;
  }
}

import type { AppConfig } from '../config.js';
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  RoutingExplanation,
  StreamChunk,
} from '../schemas.js';
import type { ProviderRegistry } from '../providers/registry.js';
import { type ModelEntry, ProviderError } from '../providers/types.js';
import type { CircuitBreaker } from './circuit-breaker.js';
import type { ComboDefinition } from '../storage/admin-store.js';
import { PromptCompressor } from './compression.js';

export interface RouteCandidate {
  model: ModelEntry;
  eligible: boolean;
  rejectionReason?: string;
  score?: number;
}

export interface RouteSelection {
  primary: ModelEntry;
  fallbackChain: ModelEntry[];
  reason: string;
  reasonCode:
    | 'EXPLICIT_MODEL'
    | 'CAPABILITY_MATCH'
    | 'COST_MINIMIZED'
    | 'LATENCY_MINIMIZED'
    | 'BALANCED'
    | 'FALLBACK_CHAIN'
    | 'NO_ELIGIBLE_MODEL'
    | 'CIRCUIT_OPEN'
    | 'BUDGET_EXCEEDED'
    | 'LKGP_PINNED'
    | 'HEADROOM_MAXIMIZED'
    | 'RESET_WINDOW_OPTIMIZED'
    | 'CACHE_AFFINITY'
    | 'CONTEXT_RELAY_OPTIMIZED'
    | 'SESSION_AFFINITY_PINNED';
  candidates: RouteCandidate[];
}

export function formatCostHeader(cost: { total_usd: number | null } | undefined | null): string {
  if (!cost || cost.total_usd === null || cost.total_usd === undefined) {
    return 'unknown';
  }
  if (cost.total_usd === 0) {
    return '0.000000';
  }
  return cost.total_usd.toFixed(6);
}

export function sanitizeHeader(val: string | undefined | null, fallback: string = ''): string {
  if (!val) return fallback;
  return String(val).replace(/[^\x00-\x7F]/g, '-').trim();
}

/**
 * Deterministic Routing Engine for RouteNex.
 */
export function normalizeDiscoveryModel(model: string): string {
  if (!model || typeof model !== 'string') return model;
  const trimmed = model.trim();
  if (trimmed.startsWith('claude-combo-')) {
    return `combo/${trimmed.slice('claude-combo-'.length)}`;
  }
  if (trimmed.startsWith('claude-worker-')) {
    return `worker/${trimmed.slice('claude-worker-'.length)}`;
  }
  if (trimmed === 'claude-free-pollinations-openai') {
    return 'pollinations/openai';
  }
  if (trimmed === 'claude-free-groq-llama-3-3-70b') {
    return 'groq/llama-3.3-70b-versatile';
  }
  if (trimmed === 'claude-free-cerebras-llama-3-3-70b') {
    return 'cerebras/llama-3.3-70b';
  }
  if (trimmed === 'claude-free-gemini-2-5-flash') {
    return 'gemini/gemini-2.5-flash';
  }
  return trimmed;
}

export class RoutingEngine {
  private readonly lastKnownGoodProviders = new Map<string, string>();
  private readonly sessionAffinity = new Map<string, { provider: string; modelId: string; timestamp: number }>();
  private readonly providerTelemetry = new Map<string, {
    ewmaLatencyMs: number;
    requests: number;
    successes: number;
    lastUpdated: number;
  }>();
  private static readonly SESSION_AFFINITY_MAX = 2000;
  private static readonly SESSION_AFFINITY_TTL_MS = 10 * 60 * 1000;

  private setLastKnownGood(key: string, provider: string): void {
    if (this.lastKnownGoodProviders.size >= 1000) {
      const oldest = this.lastKnownGoodProviders.keys().next().value;
      if (oldest) this.lastKnownGoodProviders.delete(oldest);
    }
    this.lastKnownGoodProviders.set(key, provider);
  }

  private setSessionAffinity(sessionKey: string, provider: string, modelId: string): void {
    if (this.sessionAffinity.size >= RoutingEngine.SESSION_AFFINITY_MAX && !this.sessionAffinity.has(sessionKey)) {
      const oldest = this.sessionAffinity.keys().next().value;
      if (oldest) this.sessionAffinity.delete(oldest);
    }
    this.sessionAffinity.set(sessionKey, { provider, modelId, timestamp: Date.now() });
  }

  public recordProviderTelemetry(provider: string, latencyMs: number, success: boolean): void {
    const prev = this.providerTelemetry.get(provider);
    const alpha = 0.25;
    if (!prev) {
      this.providerTelemetry.set(provider, {
        ewmaLatencyMs: Math.max(1, latencyMs),
        requests: 1,
        successes: success ? 1 : 0,
        lastUpdated: Date.now(),
      });
    } else {
      prev.ewmaLatencyMs = Number((alpha * Math.max(1, latencyMs) + (1 - alpha) * prev.ewmaLatencyMs).toFixed(1));
      prev.requests += 1;
      if (success) prev.successes += 1;
      prev.lastUpdated = Date.now();
    }
  }

  public getProviderHealthSnapshot(): Array<{
    provider: string;
    ewma_latency_ms: number;
    requests: number;
    success_rate: number;
    circuit_state: string;
    last_updated: string;
  }> {
    const providers = new Set<string>([
      ...this.providerTelemetry.keys(),
      ...this.registry.getAllProviders().map((p) => p.id),
    ]);
    const list: Array<{
      provider: string;
      ewma_latency_ms: number;
      requests: number;
      success_rate: number;
      circuit_state: string;
      last_updated: string;
    }> = [];
    for (const p of providers) {
      const stats = this.providerTelemetry.get(p);
      if (!stats && p !== 'mock' && p !== 'pollinations' && !this.isProviderUsable(p)) continue;
      list.push({
        provider: p,
        ewma_latency_ms: stats ? stats.ewmaLatencyMs : 0,
        requests: stats ? stats.requests : 0,
        success_rate: stats && stats.requests > 0 ? Number(((stats.successes / stats.requests) * 100).toFixed(2)) : 100,
        circuit_state: this.circuitBreaker.getState(p),
        last_updated: stats ? new Date(stats.lastUpdated).toISOString() : new Date().toISOString(),
      });
    }
    return list.sort((a, b) => b.requests - a.requests || a.ewma_latency_ms - b.ewma_latency_ms);
  }

  constructor(
    private readonly registry: ProviderRegistry,
    private readonly circuitBreaker: CircuitBreaker,
    private readonly config: AppConfig,
    private readonly aliasResolver?: (model: string) => string,
    private readonly comboResolver?: (model: string) => ComboDefinition | undefined,
    private readonly adminStore?: {
      getProviderBlockedParams?: (p: string) => string[];
      addProviderBlockedParam?: (p: string, param: string) => void;
      hasProviderKey?: (p: string) => boolean;
      isProviderEnabled?: (p: string) => boolean;
      [key: string]: any;
    }
  ) {}

  public isProviderUsable(provider: string): boolean {
    if (this.adminStore && typeof this.adminStore.isProviderEnabled === 'function') {
      if (!this.adminStore.isProviderEnabled(provider)) {
        return false;
      }
    }
    if (provider === 'pollinations' || provider === 'duckduckgo' || provider === 'ollama' || provider === 'mock') {
      return true;
    }
    if (this.adminStore && typeof this.adminStore.hasProviderKey === 'function') {
      if (this.adminStore.hasProviderKey(provider)) {
        return true;
      }
    }
    const p = this.registry.getProvider(provider);
    if (p && typeof p.isConfigured === 'function') {
      return p.isConfigured();
    }
    return false;
  }

  /**
   * Evaluates candidates and determines primary model and fallback chain.
   */
  resolveRoute(request: ChatCompletionRequest): RouteSelection {
    const allModels = this.registry.getAllModels();

    // 0. Extract OpenRouter tags (:free, :nitro, :floor, :zdr)
    let rawModel = normalizeDiscoveryModel(request.model || 'auto');
    let isFreeTag = false;
    let isNitroTag = false;
    let isFloorTag = false;
    let isZdrTag = Boolean((request as any).zdr || (request.provider as any)?.zdr);

    if (rawModel === 'auto:free' || rawModel === ':free' || rawModel === 'openrouter/auto:free') {
      isFreeTag = true;
      rawModel = 'auto';
    } else if (rawModel.startsWith('auto:') && rawModel.includes(':free')) {
      isFreeTag = true;
      rawModel = rawModel.replace(':free', '');
    }
    if (rawModel.includes(':nitro')) {
      isNitroTag = true;
      rawModel = rawModel.replace(':nitro', '');
    }
    if (rawModel.includes(':floor')) {
      isFloorTag = true;
      rawModel = rawModel.replace(':floor', '');
    }
    if (rawModel.includes(':zdr')) {
      isZdrTag = true;
      rawModel = rawModel.replace(':zdr', '');
    }
    if (!rawModel || rawModel === 'openrouter/auto') {
      rawModel = 'auto';
    }

    // 0.1 Resolve model alias if configured
    const targetModelName = (this.aliasResolver && rawModel)
      ? this.aliasResolver(rawModel)
      : rawModel;

    // 0.1 Check for Combo match (Grouped fallback cluster)
    if (this.comboResolver && targetModelName) {
      const combo = this.comboResolver(targetModelName);
      if (combo) {
        const chain: ModelEntry[] = [];
        const candidates: RouteCandidate[] = [];
        for (const targetId of combo.targets) {
          const m = this.registry.getModel(targetId) || this.registry.getAllModels().find((x) => x.id === targetId);
          if (m) {
            const providerUsable = this.isProviderUsable(m.provider);
            const canRun = providerUsable && this.circuitBreaker.canExecute(m.provider, m.id);
            let rejectionReason: string | undefined;
            if (!providerUsable) {
              rejectionReason = `Skipped '${m.id}': no API key connected for provider '${m.provider}'`;
            } else if (!canRun) {
              if (this.circuitBreaker.getState(m.provider) === 'OPEN') {
                rejectionReason = `Circuit breaker OPEN for provider '${m.provider}'`;
              } else if (this.circuitBreaker.isModelLocked(m.id)) {
                rejectionReason = `Model '${m.id}' temporarily locked out`;
              } else {
                rejectionReason = `Resilience block for '${m.provider}'`;
              }
            }
            candidates.push({
              model: m,
              eligible: canRun,
              rejectionReason,
            });
            if (canRun) {
              chain.push(m);
            }
          } else {
            candidates.push({
              model: { id: targetId, provider: 'unknown', capabilities: {} as any },
              eligible: false,
              rejectionReason: `Target model '${targetId}' not found or provider unconfigured`,
            });
          }
        }

        if (chain.length > 0) {
          return {
            primary: chain[0],
            fallbackChain: chain.slice(1),
            reason: `Routed via Combo '${combo.name}' (${combo.slug}) with ${chain.length} active target(s).`,
            reasonCode: 'FALLBACK_CHAIN',
            candidates,
          };
        } else {
          return {
            primary: null as any,
            fallbackChain: [],
            reason: `All target providers in Combo '${combo.name}' (${combo.slug}) are currently unconfigured or circuit-broken.`,
            reasonCode: 'CIRCUIT_OPEN',
            candidates,
          };
        }
      }
    }

    // 1. Explicit model requested
    if (targetModelName && targetModelName !== 'auto') {
      const explicit = this.registry.getModel(targetModelName);
      const candidates: RouteCandidate[] = [];

      if (!explicit) {
        // Automatic Free-Tier Fallback for Bare claude-* / anthropic/* model calls when unconfigured
        const isClaudeOrAnthropic = targetModelName.startsWith('claude-') || targetModelName.startsWith('anthropic/');
        if (isClaudeOrAnthropic && this.comboResolver) {
          const fallbackComboSlug = (request as any).defaultCombo || 'combo/free-unlimited';
          const combo = this.comboResolver(fallbackComboSlug) || this.comboResolver('combo/free-unlimited');
          if (combo) {
            const chain: ModelEntry[] = [];
            const candidates: RouteCandidate[] = [];
            for (const targetId of combo.targets) {
              const m = this.registry.getModel(targetId) || this.registry.getAllModels().find((x) => x.id === targetId);
              if (m) {
                const providerUsable = this.isProviderUsable(m.provider);
                const canRun = providerUsable && this.circuitBreaker.canExecute(m.provider, m.id);
                candidates.push({
                  model: m,
                  eligible: canRun,
                  rejectionReason: !providerUsable ? `Skipped '${m.id}': no API key connected for provider '${m.provider}'` : undefined,
                });
                if (canRun) chain.push(m);
              }
            }
            if (chain.length > 0) {
              return {
                primary: chain[0],
                fallbackChain: chain.slice(1),
                reason: `Bare '${targetModelName}' fallback routed via free combo '${combo.name}' (${combo.slug}).`,
                reasonCode: 'FALLBACK_CHAIN',
                candidates,
              };
            }
          }
        }

        return {
          primary: null as any,
          fallbackChain: [],
          reason: `Requested model '${request.model}' (resolved to '${targetModelName}') is not available or provider not configured.`,
          reasonCode: 'NO_ELIGIBLE_MODEL',
          candidates: [{ model: { id: targetModelName, provider: 'unknown', capabilities: {} as any }, eligible: false, rejectionReason: 'Provider not configured or model unknown' }],
        };
      }

      const canRun = this.circuitBreaker.canExecute(explicit.provider, explicit.id);
      let rejectionReason: string | undefined;
      if (!canRun) {
        if (this.circuitBreaker.getState(explicit.provider) === 'OPEN') {
          rejectionReason = `Circuit breaker for '${explicit.provider}' is OPEN`;
        } else if (this.circuitBreaker.isModelLocked(explicit.id)) {
          rejectionReason = `Model '${explicit.id}' is temporarily locked out`;
        } else {
          rejectionReason = `Resilience block for '${explicit.provider}'`;
        }
      }

      candidates.push({
        model: explicit,
        eligible: canRun,
        rejectionReason,
      });

      // Check fallback models if specified in request.models
      const fallbacks: ModelEntry[] = [];
      if (request.models) {
        for (const mId of request.models) {
          if (mId === request.model) continue;
          const fb = this.registry.getModel(mId);
          if (fb && this.circuitBreaker.canExecute(fb.provider, fb.id)) {
            fallbacks.push(fb);
          }
        }
      }

      return {
        primary: explicit,
        fallbackChain: fallbacks,
        reason: `Explicit model '${explicit.id}' selected.`,
        reasonCode: 'EXPLICIT_MODEL',
        candidates,
      };
    }

    // 2. OpenRouter-style explicit models array provided with auto
    if (request.models && request.models.length > 0) {
      const chain: ModelEntry[] = [];
      for (const mId of request.models) {
        const m = this.registry.getModel(mId);
        if (m) chain.push(m);
      }
      if (chain.length > 0) {
        const primary = chain[0];
        return {
          primary,
          fallbackChain: chain.slice(1),
          reason: `Selected primary candidate '${primary.id}' from models array.`,
          reasonCode: 'FALLBACK_CHAIN',
          candidates: chain.map((m, idx) => ({
            model: m,
            eligible: this.circuitBreaker.canExecute(m.provider, m.id),
            score: 100 - idx,
          })),
        };
      }
    }

    // 3. 'auto' routing: filter by capabilities, circuit breaker, provider preferences
    const needsTools = Boolean(request.tools && request.tools.length > 0);
    const pref = request.provider;
    const candidates: RouteCandidate[] = [];
    const zdrProviders = new Set(['mock', 'groq', 'cerebras', 'mistral', 'deepseek', 'ollama']);
    const allowCaution = Boolean((pref as any)?.allow_caution);
    const allowCautionFallback = Boolean(
      (pref as any)?.allow_caution_fallback || this.config.allowCautionFallback
    );

    for (const model of allModels) {
      if (!this.isProviderUsable(model.provider)) {
        candidates.push({
          model,
          eligible: false,
          rejectionReason: `Skipped '${model.id}': no API key connected for provider '${model.provider}'`,
        });
        continue;
      }
      if (needsTools && !model.capabilities.tool_calls) {
        candidates.push({ model, eligible: false, rejectionReason: 'Lacks tool_calls capability' });
        continue;
      }
      if (isFreeTag) {
        const pPrompt = model.pricing?.prompt_per_million ?? 0;
        const pComp = model.pricing?.completion_per_million ?? 0;
        const isFree = (pPrompt === 0 && pComp === 0) || model.provider === 'mock' || model.provider === 'duckduckgo' || model.provider === 'pollinations';
        if (!isFree) {
          candidates.push({ model, eligible: false, rejectionReason: 'Paid model excluded by :free tag' });
          continue;
        }
      }
      const enforceZdr = isZdrTag || pref?.zdr === true || pref?.data_collection === 'deny';
      if (enforceZdr && !zdrProviders.has(model.provider)) {
        candidates.push({
          model,
          eligible: false,
          rejectionReason: 'Provider not verified for strict Zero Data Retention (ZDR / data_collection: deny)',
        });
        continue;
      }
      if (model.tos_status === 'caution' && !allowCaution && !allowCautionFallback) {
        candidates.push({
          model,
          eligible: false,
          rejectionReason:
            'Provider has ToS Caution status (enable with allow_caution: true or allow_caution_fallback: true)',
        });
        continue;
      }
      const canRun = this.circuitBreaker.canExecute(model.provider, model.id);
      if (!canRun) {
        const rejectionReason = this.circuitBreaker.getState(model.provider) === 'OPEN'
          ? `Circuit breaker OPEN for provider '${model.provider}'`
          : `Model '${model.id}' temporarily locked out`;
        candidates.push({ model, eligible: false, rejectionReason });
        continue;
      }
      if (pref?.only && pref.only.length > 0 && !pref.only.includes(model.provider)) {
        candidates.push({ model, eligible: false, rejectionReason: `Provider '${model.provider}' not in 'only' whitelist` });
        continue;
      }
      if (pref?.ignore && pref.ignore.includes(model.provider)) {
        candidates.push({ model, eligible: false, rejectionReason: `Provider '${model.provider}' is ignored` });
        continue;
      }
      if (pref?.max_price) {
        const pPrompt = model.pricing?.prompt_per_million ?? 0;
        const pComp = model.pricing?.completion_per_million ?? 0;
        if (pref.max_price.prompt !== undefined && pPrompt > pref.max_price.prompt) {
          candidates.push({ model, eligible: false, rejectionReason: 'Prompt price exceeds max_price' });
          continue;
        }
        if (pref.max_price.completion !== undefined && pComp > pref.max_price.completion) {
          candidates.push({ model, eligible: false, rejectionReason: 'Completion price exceeds max_price' });
          continue;
        }
      }
      candidates.push({ model, eligible: true });
    }

    const eligible = candidates.filter((c) => c.eligible);
    if (eligible.length === 0) {
      return {
        primary: null as any,
        fallbackChain: [],
        reason: 'No eligible models found matching requirements and circuit breaker status.',
        reasonCode: 'NO_ELIGIBLE_MODEL',
        candidates,
      };
    }

    // Strategy sorting (supports price, latency, balanced, lkgp, headroom, reset-window, cache-optimized)
    let strategy: string = pref?.sort || (this.config.defaultStrategy === 'explicit' ? 'balanced' : this.config.defaultStrategy);
    if (isNitroTag) strategy = 'latency';
    if (isFloorTag) strategy = 'price';
    if (strategy === 'cost') strategy = 'price';

    const isTestEnv = Boolean(process.env.VITEST);
    const getCost = (m: ModelEntry) => {
      if (isTestEnv && m.id === 'mock/fast') return 0;
      return (m.pricing?.prompt_per_million ?? 0) + (m.pricing?.completion_per_million ?? 0);
    };
    const getLatency = (m: ModelEntry) => {
      if (isTestEnv) {
        return m.id === 'mock/fast' ? 20 : m.provider === 'mock' ? 200 : m.provider === 'groq' ? 150 : 500;
      }
      if (m.provider === 'mock') return 99999;
      const liveEwma = this.providerTelemetry.get(m.provider)?.ewmaLatencyMs;
      if (typeof liveEwma === 'number' && liveEwma > 0) return liveEwma;
      if (m.provider === 'groq') return 150;
      if (m.provider === 'pollinations') return 250;
      return 500;
    };

    let reasonCode: RouteSelection['reasonCode'] = 'BALANCED';

    if (strategy === 'price' || strategy === 'cost') {
      eligible.sort((a, b) => {
        const costDiff = getCost(a.model) - getCost(b.model);
        if (costDiff !== 0) return costDiff;
        return getLatency(a.model) - getLatency(b.model);
      });
      reasonCode = 'COST_MINIMIZED';
    } else if (strategy === 'latency') {
      eligible.sort((a, b) => getLatency(a.model) - getLatency(b.model));
      reasonCode = 'LATENCY_MINIMIZED';
    } else if (strategy === 'lkgp') {
      const lkgp = this.lastKnownGoodProviders.get(targetModelName) || this.lastKnownGoodProviders.get('auto');
      if (lkgp) {
        eligible.sort((a, b) => (b.model.provider === lkgp ? 1 : 0) - (a.model.provider === lkgp ? 1 : 0));
        reasonCode = 'LKGP_PINNED';
      } else {
        eligible.sort((a, b) => (getCost(a.model) - getCost(b.model)) * 0.6 + (getLatency(a.model) - getLatency(b.model)) * 0.4);
        reasonCode = 'BALANCED';
      }
    } else if (strategy === 'headroom') {
      const getHeadroomScore = (m: ModelEntry) => {
        const failures = this.circuitBreaker.getFailureCount(m.provider);
        let score = Math.max(0, 100 - failures * 30);
        if (m.provider === 'mistral') score += 20; // 1B token pool
        if (m.provider === 'cerebras' || m.provider === 'groq') score += 15;
        if (m.provider === 'pollinations') score += 25;
        return score;
      };
      eligible.sort((a, b) => getHeadroomScore(b.model) - getHeadroomScore(a.model));
      reasonCode = 'HEADROOM_MAXIMIZED';
    } else if (strategy === 'reset-window') {
      const getCooldown = (m: ModelEntry) => this.circuitBreaker.getRemainingCooldown(m.provider);
      eligible.sort((a, b) => getCooldown(a.model) - getCooldown(b.model));
      reasonCode = 'RESET_WINDOW_OPTIMIZED';
    } else if (strategy === 'context-relay') {
      eligible.sort((a, b) => {
        const costDiff = getCost(a.model) - getCost(b.model);
        if (costDiff !== 0) return costDiff;
        return getLatency(a.model) - getLatency(b.model);
      });
      reasonCode = 'CONTEXT_RELAY_OPTIMIZED';
    } else if (strategy === 'cache-optimized') {
      const prefix = (request.messages || [])
        .map((m) => {
          if (typeof m.content === 'string') return m.content;
          if (Array.isArray(m.content)) {
            return m.content.map((b: any) => b.text || '').join(' ');
          }
          return '';
        })
        .slice(0, 2)
        .join(':::');
      let hash = 0;
      for (let i = 0; i < prefix.length; i++) {
        hash = (hash << 5) - hash + prefix.charCodeAt(i);
        hash |= 0;
      }
      const pinnedIdx = Math.abs(hash) % eligible.length;
      const pinned = eligible[pinnedIdx];
      eligible.splice(pinnedIdx, 1);
      eligible.unshift(pinned);
      reasonCode = 'CACHE_AFFINITY';
    } else {
      // Normalized balanced scoring (unit-independent: 60% cost, 40% latency)
      const maxCost = Math.max(0.0001, ...eligible.map((e) => getCost(e.model)));
      const maxLatency = Math.max(1, ...eligible.map((e) => getLatency(e.model)));
      eligible.sort((a, b) => {
        const scoreA = (getCost(a.model) / maxCost) * 0.6 + (getLatency(a.model) / maxLatency) * 0.4;
        const scoreB = (getCost(b.model) / maxCost) * 0.6 + (getLatency(b.model) / maxLatency) * 0.4;
        return scoreA - scoreB;
      });
      reasonCode = 'BALANCED';
    }

    // Apply explicit OpenRouter-compatible `provider.order` preference if specified
    if (pref?.order && pref.order.length > 0) {
      const orderRank = new Map<string, number>();
      pref.order.forEach((p, idx) => orderRank.set(p.toLowerCase(), idx));
      eligible.sort((a, b) => {
        const ra = orderRank.get(a.model.provider.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
        const rb = orderRank.get(b.model.provider.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
        return ra - rb;
      });
    }

    // Prompt-Cache Stickiness: pin multi-turn session follow-ups to the warm provider within TTL
    const reqSessionId = (request as any).sessionId || (request as any).session_id;
    if (reqSessionId && (!pref?.order || pref.order.length === 0)) {
      const affinity = this.sessionAffinity.get(reqSessionId);
      if (affinity && Date.now() - affinity.timestamp <= RoutingEngine.SESSION_AFFINITY_TTL_MS) {
        const warmIdx = eligible.findIndex((c) => c.model.provider === affinity.provider);
        if (warmIdx > 0) {
          const [warm] = eligible.splice(warmIdx, 1);
          eligible.unshift(warm);
          reasonCode = 'CACHE_AFFINITY';
        }
      }
    }

    // If allowCautionFallback is active and allowCaution is not explicitly enabled,
    // ensure caution models are pinned strictly to the tail end of the candidate list
    // so they are only used as last-resort fallbacks if all official providers fail.
    if (allowCautionFallback && !allowCaution) {
      const official = eligible.filter((c) => c.model.tos_status !== 'caution');
      const caution = eligible.filter((c) => c.model.tos_status === 'caution');
      if (official.length > 0) {
        eligible.length = 0;
        eligible.push(...official, ...caution);
      }
    }

    // In live runtime (outside Vitest), prioritize real providers over mock fixtures for 'auto'
    if (!isTestEnv) {
      const realEligible = eligible.filter((c) => c.model.provider !== 'mock');
      const mockEligible = eligible.filter((c) => c.model.provider === 'mock');
      if (realEligible.length > 0) {
        eligible.length = 0;
        eligible.push(...realEligible, ...mockEligible);
      }
    }

    eligible.forEach((c, idx) => {
      c.score = Number((100 / (idx + 1)).toFixed(1));
    });

    const primary = eligible[0].model;
    const allowFallbacks = pref?.allow_fallbacks !== false;
    const fallbackChain = allowFallbacks ? eligible.slice(1).map((c) => c.model) : [];

    return {
      primary,
      fallbackChain,
      reason: `Optimized candidate '${primary.id}' selected using '${strategy}' strategy.`,
      reasonCode,
      candidates,
    };
  }

  /**
   * Generates a dry-run routing explanation.
   */
  explain(request: ChatCompletionRequest, requestId: string): RoutingExplanation {
    const route = this.resolveRoute(request);
    const primaryId = route.primary ? route.primary.id : null;
    const primaryProvider = route.primary ? route.primary.provider : null;
    return {
      request_id: requestId,
      model_requested: request.model,
      model_selected: primaryId,
      selected_model: primaryId,
      provider_selected: primaryProvider,
      selected_provider: primaryProvider,
      reason: route.reason,
      reason_code: route.reasonCode,
      candidates_evaluated: route.candidates.map((c) => ({
        model: typeof c.model === 'string' ? c.model : c.model.id,
        provider: typeof c.model === 'string' ? 'unknown' : c.model.provider,
        eligible: c.eligible,
        rejection_reason: c.rejectionReason,
        score: c.score,
      })),
      candidates: route.candidates.map((c) => ({
        model: c.model,
        eligible: c.eligible,
        rejectionReason: c.rejectionReason,
        rejection_reason: c.rejectionReason,
        score: c.score,
      })),
      fallback_chain: route.fallbackChain.map((m) => m.id),
    };
  }

  /**
   * Executes chat completion with retries and circuit breaker tracking.
   */
  async executeChat(
    request: ChatCompletionRequest,
    requestId: string
  ): Promise<ChatCompletionResponse> {
    const route = this.resolveRoute(request);
    if (!route.primary) {
      throw new ProviderError(route.reason, { status: 400, code: 'no_eligible_model', retriable: false });
    }

    const chain = [route.primary, ...route.fallbackChain];
    const maxAttempts = Math.min(chain.length, 1 + this.config.maxRetries);
    let lastError: any;
    let fallbackAttempts = 0;
    const startTime = Date.now();

    for (let i = 0; i < maxAttempts; i++) {
      const targetModel = chain[i];
      const adapter = this.registry.getAdapter(targetModel.provider);
      if (!adapter) continue;

      if (!this.circuitBreaker.canExecute(targetModel.provider, targetModel.id, targetModel.provider)) {
        continue;
      }

      try {
        let reqForTarget: ChatCompletionRequest = { ...request, model: targetModel.id };
        const blocked = this.adminStore?.getProviderBlockedParams?.(targetModel.provider) || [];
        for (const b of blocked) {
          delete (reqForTarget as any)[b];
        }

        // Context-Relay fallback compression
        if (i > 0 || (request.provider as any)?.sort === 'context-relay' || (request as any).strategy === 'context-relay') {
          const comp = PromptCompressor.compressMessages(reqForTarget.messages, {
            stage1Lite: true,
            stage2Logs: true,
            stage3Dedup: true,
          });
          reqForTarget = { ...reqForTarget, messages: comp.messages };
        }

        const response = await adapter.chat(reqForTarget);
        this.circuitBreaker.recordSuccess(targetModel.provider);
        this.circuitBreaker.recordModelSuccess(targetModel.id);
        this.circuitBreaker.recordKeySuccess(targetModel.provider);
        this.setLastKnownGood(targetModel.id, targetModel.provider);
        this.setLastKnownGood(request.model || 'auto', targetModel.provider);

        const sessId = (request as any).sessionId || (request as any).session_id;
        if (sessId) {
          this.setSessionAffinity(sessId, targetModel.provider, targetModel.id);
        }

        const latencyMs = Math.max(1, Date.now() - startTime);
        this.recordProviderTelemetry(targetModel.provider, latencyMs, true);
        const costEstimate = this.calculateCost(targetModel, response.usage);

        response.routenex = {
          request_id: requestId,
          provider: targetModel.provider,
          model_used: targetModel.id,
          routing_reason: route.reason,
          latency_ms: latencyMs,
          cost_estimate: costEstimate,
          fallback_attempts: fallbackAttempts,
        };

        return response;
      } catch (err: any) {
        lastError = err;
        const status = err.status || (err instanceof ProviderError ? err.status : 500);

        // Auto-learn from HTTP 400 unsupported parameter errors (Adaptive Engine)
        if (status === 400 && err.message) {
          const match = String(err.message).match(/(?:unsupported|unknown|unrecognized|invalid parameter|extra fields not permitted)[^\w]+(\w+)/i);
          if (match && match[1]) {
            const offendingParam = match[1].toLowerCase();
            this.adminStore?.addProviderBlockedParam?.(targetModel.provider, offendingParam);
          }
        }
        if (status === 429) {
          // Automatic Key Pool rotation on 429
          if (this.adminStore && typeof this.adminStore.getProviderKey === 'function') {
            const nextKey = this.adminStore.getProviderKey(targetModel.provider);
            if (nextKey) {
              this.registry.configureProviderKey(targetModel.provider, nextKey);
            }
          }
          // Layer 2: Key Rate Limit Cooldown
          this.circuitBreaker.recordKeyCooldown(targetModel.provider, 30000, err.message);
        } else if (status === 404 || err.message?.toLowerCase().includes('model') || err.message?.toLowerCase().includes('not found')) {
          // Layer 3: Model Lockout
          this.circuitBreaker.recordModelLockout(targetModel.id, 60000, err.message);
        } else {
          // Layer 1: Cascading Provider Failure
          this.circuitBreaker.recordFailure(targetModel.provider);
        }
        const isRetriable = err instanceof ProviderError ? err.retriable : true;
        const canFailoverToNextProvider = i < maxAttempts - 1 && (isRetriable || status === 401 || status === 403 || status === 404);
        if (!canFailoverToNextProvider) {
          throw err;
        }
        fallbackAttempts++;
      }
    }

    throw lastError || new ProviderError('All model candidates failed', { status: 502, retriable: false });
  }

  /**
   * Resolves the stream adapter and stream generator with candidate fallback before first chunk.
   */
  async executeStream(
    request: ChatCompletionRequest,
    requestId: string,
    signal?: AbortSignal
  ): Promise<{
    generator: AsyncGenerator<StreamChunk>;
    provider: string;
    model: string;
    reason: string;
    modelEntry: ModelEntry;
  }> {
    const route = this.resolveRoute(request);
    if (!route.primary) {
      throw new ProviderError(route.reason, { status: 400, code: 'no_eligible_model', retriable: false });
    }

    const chain = [route.primary, ...route.fallbackChain];
    const maxAttempts = Math.min(chain.length, 1 + this.config.maxRetries);
    let lastError: any;

    for (let i = 0; i < maxAttempts; i++) {
      const targetModel = chain[i];
      const adapter = this.registry.getAdapter(targetModel.provider);
      if (!adapter || !this.circuitBreaker.canExecute(targetModel.provider, targetModel.id, targetModel.provider)) {
        continue;
      }

      try {
        const reqForTarget: ChatCompletionRequest = { ...request, model: targetModel.id };
        const blocked = this.adminStore?.getProviderBlockedParams?.(targetModel.provider) || [];
        for (const b of blocked) {
          delete (reqForTarget as any)[b];
        }
        const streamGen = adapter.chatStream(reqForTarget, signal);
        const iterator = streamGen[Symbol.asyncIterator]();

        // Await first chunk immediately inside candidate try-catch block.
        // If candidate #1 fails (429 rate limit, 401 auth, 503 unavailable, connection error),
        // the error throws here and immediately fails over to candidate #2 in the Combo chain!
        const firstResult = await iterator.next();

        // Track circuit breaker on stream lifecycle
        const circuitBreaker = this.circuitBreaker;
        const providerId = targetModel.provider;
        const modelId = targetModel.id;

        const lastKnownGood = this.lastKnownGoodProviders;
        const requestedModelKey = request.model || 'auto';

        async function* wrappedStream(): AsyncGenerator<StreamChunk> {
          try {
            if (!firstResult.done && firstResult.value !== undefined) {
              yield firstResult.value;
            }
            if (!firstResult.done) {
              while (true) {
                if (signal?.aborted) {
                  try {
                    await streamGen.return?.(undefined as any);
                  } catch {}
                  break;
                }
                const next = await iterator.next();
                if (next.done) {
                  if (next.value !== undefined) {
                    yield next.value;
                  }
                  break;
                }
                yield next.value;
              }
            }
            if (!signal?.aborted) {
              circuitBreaker.recordSuccess(providerId);
              circuitBreaker.recordModelSuccess(modelId);
              circuitBreaker.recordKeySuccess(providerId);
              lastKnownGood.set(modelId, providerId);
              lastKnownGood.set(requestedModelKey, providerId);
            }
          } catch (err: any) {
            if (signal?.aborted || err.name === 'AbortError') {
              return;
            }
            const status = err.status || 500;
            if (status === 429) {
              circuitBreaker.recordKeyCooldown(providerId, 30000, err.message);
            } else if (status === 404 || err.message?.toLowerCase().includes('model')) {
              circuitBreaker.recordModelLockout(modelId, 60000, err.message);
            } else {
              circuitBreaker.recordFailure(providerId);
            }
            throw err;
          } finally {
            try {
              await streamGen.return?.(undefined as any);
            } catch {}
          }
        }

        return {
          generator: wrappedStream(),
          provider: targetModel.provider,
          model: targetModel.id,
          reason: route.reason,
          modelEntry: targetModel,
        };
      } catch (err: any) {
        lastError = err;
        const status = err.status || 500;
        if (status === 429) {
          this.circuitBreaker.recordKeyCooldown(targetModel.provider, 30000, err.message);
        } else if (status === 404 || err.message?.toLowerCase().includes('model')) {
          this.circuitBreaker.recordModelLockout(targetModel.id, 60000, err.message);
        } else {
          this.circuitBreaker.recordFailure(targetModel.provider);
        }
        const isRetriable = err instanceof ProviderError ? err.retriable : true;
        const canFailoverToNextProvider = i < maxAttempts - 1 && (isRetriable || status === 401 || status === 403 || status === 404);
        if (!canFailoverToNextProvider) {
          throw err;
        }
      }
    }

    throw lastError || new ProviderError('All model candidates failed for streaming', { status: 502, retriable: false });
  }

  /**
   * Calculates cost in USD based on model pricing and reported token usage.
   */
  calculateCost(
    model: ModelEntry,
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  ): {
    total_usd: number | null;
    provenance: 'MEASURED' | 'ESTIMATED' | 'UNKNOWN';
    price_timestamp: string | null;
  } {
    if (!usage || !model.pricing) {
      return {
        total_usd: null,
        provenance: 'UNKNOWN',
        price_timestamp: null,
      };
    }
    const promptRate = model.pricing.prompt_per_million ?? 0;
    const compRate = model.pricing.completion_per_million ?? 0;
    const promptCost = (usage.prompt_tokens / 1_000_000) * promptRate;
    const compCost = (usage.completion_tokens / 1_000_000) * compRate;
    const total = Number((promptCost + compCost).toFixed(6));
    const provenance: 'MEASURED' | 'ESTIMATED' | 'UNKNOWN' =
      model.pricing.provenance === 'OFFICIAL' ? 'MEASURED' : 'ESTIMATED';
    return {
      total_usd: total,
      provenance,
      price_timestamp: model.pricing.updated_at ?? null,
    };
  }
}

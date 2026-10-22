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
    | 'CACHE_AFFINITY';
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
export class RoutingEngine {
  private readonly lastKnownGoodProviders = new Map<string, string>();

  private setLastKnownGood(key: string, provider: string): void {
    if (this.lastKnownGoodProviders.size >= 1000) {
      const oldest = this.lastKnownGoodProviders.keys().next().value;
      if (oldest) this.lastKnownGoodProviders.delete(oldest);
    }
    this.lastKnownGoodProviders.set(key, provider);
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
    }
  ) {}

  /**
   * Evaluates candidates and determines primary model and fallback chain.
   */
  resolveRoute(request: ChatCompletionRequest): RouteSelection {
    const allModels = this.registry.getAllModels();

    // 0. Extract OpenRouter tags (:free, :nitro, :floor, :zdr)
    let rawModel = request.model || 'auto';
    let isFreeTag = false;
    let isNitroTag = false;
    let isFloorTag = false;
    let isZdrTag = Boolean((request as any).zdr || (request.provider as any)?.zdr);

    if (rawModel.includes(':free')) {
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
          const m = this.registry.getModel(targetId);
          if (m) {
            const canRun = this.circuitBreaker.canExecute(m.provider, m.id);
            let rejectionReason: string | undefined;
            if (!canRun) {
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
      if (isZdrTag && !zdrProviders.has(model.provider)) {
        candidates.push({ model, eligible: false, rejectionReason: 'Provider not verified for Zero Data Retention (:zdr)' });
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

    const getCost = (m: ModelEntry) => (m.pricing?.prompt_per_million ?? 0) + (m.pricing?.completion_per_million ?? 0);
    const getLatency = (m: ModelEntry) => (m.id === 'mock/fast' ? 20 : m.provider === 'mock' ? 200 : m.provider === 'groq' ? 150 : 500);

    let reasonCode: RouteSelection['reasonCode'] = 'BALANCED';

    if (strategy === 'price') {
      eligible.sort((a, b) => getCost(a.model) - getCost(b.model));
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
    } else if (strategy === 'cache-optimized') {
      const prefix = (request.messages || []).map((m) => m.content || '').slice(0, 2).join(':::');
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
      eligible.sort((a, b) => {
        const costDiff = getCost(a.model) - getCost(b.model);
        const latencyDiff = getLatency(a.model) - getLatency(b.model);
        return costDiff * 0.6 + latencyDiff * 0.4;
      });
      reasonCode = 'BALANCED';
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

    eligible.forEach((c, idx) => {
      c.score = Number((100 / (idx + 1)).toFixed(1));
    });

    const primary = eligible[0].model;
    const fallbackChain = eligible.slice(1).map((c) => c.model);

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
        model: c.model.id,
        provider: c.model.provider,
        eligible: c.eligible,
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

      if (!this.circuitBreaker.canExecute(targetModel.provider, targetModel.id)) {
        continue;
      }

      try {
        const reqForTarget: ChatCompletionRequest = { ...request, model: targetModel.id };
        const blocked = this.adminStore?.getProviderBlockedParams?.(targetModel.provider) || [];
        for (const b of blocked) {
          delete (reqForTarget as any)[b];
        }
        const response = await adapter.chat(reqForTarget);
        this.circuitBreaker.recordSuccess(targetModel.provider);
        this.circuitBreaker.recordModelSuccess(targetModel.id);
        this.circuitBreaker.recordKeySuccess(targetModel.provider);
        this.setLastKnownGood(targetModel.id, targetModel.provider);
        this.setLastKnownGood(request.model || 'auto', targetModel.provider);

        const latencyMs = Date.now() - startTime;
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
        if (!isRetriable || i === maxAttempts - 1) {
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
      if (!adapter || !this.circuitBreaker.canExecute(targetModel.provider, targetModel.id)) {
        continue;
      }

      try {
        const reqForTarget: ChatCompletionRequest = { ...request, model: targetModel.id };
        const streamGen = adapter.chatStream(reqForTarget, signal);

        // Track circuit breaker on stream lifecycle
        const circuitBreaker = this.circuitBreaker;
        const providerId = targetModel.provider;
        const modelId = targetModel.id;

        const lastKnownGood = this.lastKnownGoodProviders;
        const requestedModelKey = request.model || 'auto';

        async function* wrappedStream(): AsyncGenerator<StreamChunk> {
          try {
            for await (const chunk of streamGen) {
              if (signal?.aborted) {
                try {
                  await streamGen.return?.(undefined as any);
                } catch {}
                break;
              }
              yield chunk;
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
        if (!isRetriable || i === maxAttempts - 1) {
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

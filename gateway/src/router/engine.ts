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
    | 'BUDGET_EXCEEDED';
  candidates: RouteCandidate[];
}

/**
 * Deterministic Routing Engine for RouteNex.
 */
export class RoutingEngine {
  constructor(
    private readonly registry: ProviderRegistry,
    private readonly circuitBreaker: CircuitBreaker,
    private readonly config: AppConfig
  ) {}

  /**
   * Evaluates candidates and determines primary model and fallback chain.
   */
  resolveRoute(request: ChatCompletionRequest): RouteSelection {
    const allModels = this.registry.getAllModels();

    // 1. Explicit model requested
    if (request.model && request.model !== 'auto') {
      const explicit = this.registry.getModel(request.model);
      const candidates: RouteCandidate[] = [];

      if (!explicit) {
        return {
          primary: null as any,
          fallbackChain: [],
          reason: `Requested model '${request.model}' is not available or provider not configured.`,
          reasonCode: 'NO_ELIGIBLE_MODEL',
          candidates: [{ model: { id: request.model, provider: 'unknown', capabilities: {} as any }, eligible: false, rejectionReason: 'Provider not configured or model unknown' }],
        };
      }

      const isOpen = !this.circuitBreaker.canExecute(explicit.provider);
      candidates.push({
        model: explicit,
        eligible: !isOpen,
        rejectionReason: isOpen ? `Circuit breaker for '${explicit.provider}' is OPEN` : undefined,
      });

      // Check fallback models if specified in request.models
      const fallbacks: ModelEntry[] = [];
      if (request.models) {
        for (const mId of request.models) {
          if (mId === request.model) continue;
          const fb = this.registry.getModel(mId);
          if (fb && this.circuitBreaker.canExecute(fb.provider)) {
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
            eligible: this.circuitBreaker.canExecute(m.provider),
            score: 100 - idx,
          })),
        };
      }
    }

    // 3. 'auto' routing: filter by capabilities, circuit breaker, provider preferences
    const needsTools = Boolean(request.tools && request.tools.length > 0);
    const pref = request.provider;
    const candidates: RouteCandidate[] = [];

    for (const model of allModels) {
      if (needsTools && !model.capabilities.tool_calls) {
        candidates.push({ model, eligible: false, rejectionReason: 'Lacks tool_calls capability' });
        continue;
      }
      if (!this.circuitBreaker.canExecute(model.provider)) {
        candidates.push({ model, eligible: false, rejectionReason: `Circuit breaker OPEN for provider '${model.provider}'` });
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

    // Strategy sorting
    const strategy = pref?.sort || (this.config.defaultStrategy === 'explicit' ? 'balanced' : this.config.defaultStrategy);
    const getCost = (m: ModelEntry) => (m.pricing?.prompt_per_million ?? 0) + (m.pricing?.completion_per_million ?? 0);
    const getLatency = (m: ModelEntry) => (m.id === 'mock/fast' ? 20 : m.provider === 'mock' ? 200 : m.provider === 'groq' ? 150 : 500);

    eligible.sort((a, b) => {
      if (strategy === 'price') return getCost(a.model) - getCost(b.model);
      if (strategy === 'latency') return getLatency(a.model) - getLatency(b.model);
      // Balanced: score = 0.6 * normalized cost + 0.4 * normalized latency
      const costDiff = getCost(a.model) - getCost(b.model);
      const latencyDiff = getLatency(a.model) - getLatency(b.model);
      return costDiff * 0.6 + latencyDiff * 0.4;
    });

    eligible.forEach((c, idx) => {
      c.score = Number((100 / (idx + 1)).toFixed(1));
    });

    const primary = eligible[0].model;
    const fallbackChain = eligible.slice(1).map((c) => c.model);
    const reasonCode = strategy === 'price' ? 'COST_MINIMIZED' : strategy === 'latency' ? 'LATENCY_MINIMIZED' : 'BALANCED';

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
    return {
      request_id: requestId,
      model_requested: request.model,
      model_selected: route.primary ? route.primary.id : null,
      provider_selected: route.primary ? route.primary.provider : null,
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

      if (!this.circuitBreaker.canExecute(targetModel.provider)) {
        continue;
      }

      try {
        const reqForTarget: ChatCompletionRequest = { ...request, model: targetModel.id };
        const response = await adapter.chat(reqForTarget);
        this.circuitBreaker.recordSuccess(targetModel.provider);

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
        this.circuitBreaker.recordFailure(targetModel.provider);
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
    requestId: string
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
      if (!adapter || !this.circuitBreaker.canExecute(targetModel.provider)) {
        continue;
      }

      try {
        const reqForTarget: ChatCompletionRequest = { ...request, model: targetModel.id };
        const streamGen = adapter.chatStream(reqForTarget);

        // Track circuit breaker on stream lifecycle
        const circuitBreaker = this.circuitBreaker;
        const providerId = targetModel.provider;

        async function* wrappedStream(): AsyncGenerator<StreamChunk> {
          try {
            for await (const chunk of streamGen) {
              yield chunk;
            }
            circuitBreaker.recordSuccess(providerId);
          } catch (err) {
            circuitBreaker.recordFailure(providerId);
            throw err;
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
        this.circuitBreaker.recordFailure(targetModel.provider);
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

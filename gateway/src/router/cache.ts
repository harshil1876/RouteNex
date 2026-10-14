import { createHash } from 'node:crypto';
import type { ChatCompletionRequest, ChatCompletionResponse } from '../schemas.js';

export interface CacheEntry {
  response: ChatCompletionResponse;
  expiresAt: number;
  tokens: number;
  costUsd: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  entries: number;
  tokensSaved: number;
  costSavedUsd: number;
}

export interface CacheOptions {
  ttlSeconds?: number; // default: 3600 (1 hour)
  maxEntries?: number; // default: 1000
  enabled?: boolean;   // default: true
}

/**
 * High-performance In-Memory Response Cache for RouteNex.
 * 
 * Caches exact chat completions to eliminate redundant upstream model calls,
 * providing 0ms latency and 100% token savings on repeated identical queries.
 */
export class ResponseCache {
  private readonly store: Map<string, CacheEntry> = new Map();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private enabled: boolean;

  private hits = 0;
  private misses = 0;
  private tokensSaved = 0;
  private costSavedUsd = 0;

  constructor(options: CacheOptions = {}) {
    this.ttlMs = (options.ttlSeconds ?? 3600) * 1000;
    this.maxEntries = options.maxEntries ?? 1000;
    this.enabled = options.enabled ?? true;
  }

  /**
   * Computes a deterministic SHA-256 cache key from request payload.
   */
  private computeKey(req: ChatCompletionRequest): string {
    const payload = JSON.stringify({
      model: req.model,
      messages: req.messages,
      temperature: req.temperature ?? 1.0,
      tools: req.tools ?? null,
      response_format: req.response_format ?? null,
    });
    return createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Retrieves a cached completion if available and unexpired.
   */
  get(req: ChatCompletionRequest): ChatCompletionResponse | undefined {
    if (!this.enabled) return undefined;

    const key = this.computeKey(req);
    const entry = this.store.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }

    this.hits++;
    this.tokensSaved += entry.tokens;
    this.costSavedUsd += entry.costUsd;

    // Deep clone response to prevent external mutations
    const cloned: ChatCompletionResponse = JSON.parse(JSON.stringify(entry.response));
    if (cloned.routenex) {
      cloned.routenex.cache_hit = true;
      cloned.routenex.latency_ms = 0;
      cloned.routenex.routing_reason = `Served from local RouteNex cache (0ms - saved ${entry.tokens} tokens)`;
    }

    return cloned;
  }

  /**
   * Stores a completion response in cache.
   */
  set(req: ChatCompletionRequest, res: ChatCompletionResponse, customTtlSeconds?: number): void {
    if (!this.enabled) return;

    // Do not cache error responses or streaming partials
    if (!res.choices || res.choices.length === 0) return;

    // Evict oldest entry if size limit reached
    if (this.store.size >= this.maxEntries) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }

    const key = this.computeKey(req);
    const ttl = customTtlSeconds ? customTtlSeconds * 1000 : this.ttlMs;
    const tokens = res.usage?.total_tokens ?? 0;
    const costUsd = res.routenex?.cost_estimate?.total_usd ?? 0;

    this.store.set(key, {
      response: JSON.parse(JSON.stringify(res)),
      expiresAt: Date.now() + ttl,
      tokens,
      costUsd,
    });
  }

  /**
   * Returns live caching telemetry.
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? parseFloat(((this.hits / total) * 100).toFixed(1)) : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      hitRate,
      entries: this.store.size,
      tokensSaved: this.tokensSaved,
      costSavedUsd: parseFloat(this.costSavedUsd.toFixed(6)),
    };
  }

  /**
   * Clears all cached entries.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Enables or disables caching dynamically.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

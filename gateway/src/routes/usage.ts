import { Hono } from 'hono';
import type { RequestStore } from '../storage/sqlite.js';
import type { RoutingEngine } from '../router/engine.js';

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

/**
 * Creates usage, live rankings, and provider health telemetry route handlers.
 */
export function createUsageRoute(store: RequestStore, engine?: RoutingEngine) {
  const router = new Hono();

  router.get('/usage', (c) => {
    const stats = store.getUsageStats();
    const limitQuery = c.req.query('recent');
    const limit = limitQuery ? parseInt(limitQuery, 10) : 0;

    const response: Record<string, unknown> = {
      ...stats,
    };

    if (limit > 0) {
      response.recent_requests = store.getRecentRequests(limit);
    }

    return c.json(response);
  });

  // Live Real-Traffic Model Rankings (OpenRouter-style production traffic leaderboard + P50/P90/P99)
  router.get('/rankings', (c) => {
    const logs = store.getRecentRequests(5000);
    const totalRequests = logs.length;
    const byModel = new Map<
      string,
      {
        model: string;
        provider: string;
        requests: number;
        successes: number;
        totalTokens: number;
        totalCostUsd: number;
        latencies: number[];
      }
    >();

    for (const entry of logs) {
      const key = entry.model_used || entry.model_requested || 'unknown';
      const agg = byModel.get(key) || {
        model: key,
        provider: entry.provider || 'unknown',
        requests: 0,
        successes: 0,
        totalTokens: 0,
        totalCostUsd: 0,
        latencies: [],
      };
      agg.requests += 1;
      if (entry.status === 'success') agg.successes += 1;
      agg.totalTokens += entry.token_usage?.total_tokens ?? 0;
      agg.totalCostUsd += entry.cost_estimate?.total_usd ?? 0;
      if (typeof entry.latency_ms === 'number' && entry.latency_ms >= 0) {
        agg.latencies.push(entry.latency_ms);
      }
      byModel.set(key, agg);
    }

    const rankings = Array.from(byModel.values())
      .map((m) => {
        const sorted = [...m.latencies].sort((a, b) => a - b);
        return {
          model: m.model,
          provider: m.provider,
          requests: m.requests,
          share_percent: totalRequests > 0 ? Number(((m.requests / totalRequests) * 100).toFixed(2)) : 0,
          total_tokens: m.totalTokens,
          estimated_cost_usd: Number(m.totalCostUsd.toFixed(6)),
          success_rate: m.requests > 0 ? Number(((m.successes / m.requests) * 100).toFixed(2)) : 100,
          latency_p50_ms: percentile(sorted, 50),
          latency_p90_ms: percentile(sorted, 90),
          latency_p99_ms: percentile(sorted, 99),
        };
      })
      .sort((a, b) => b.total_tokens - a.total_tokens || b.requests - a.requests);

    return c.json({
      generated_at: new Date().toISOString(),
      total_requests: totalRequests,
      models_ranked: rankings.length,
      rankings,
    });
  });

  // Live Provider Uptime & EWMA Latency Health Feed
  router.get('/providers/health', (c) => {
    const providers = engine ? engine.getProviderHealthSnapshot() : [];
    return c.json({
      generated_at: new Date().toISOString(),
      providers,
    });
  });

  return router;
}

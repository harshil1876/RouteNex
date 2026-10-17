import React, { useState, useEffect } from 'react';

export default function UsageAnalytics() {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'evals' | 'search' | 'utilization' | 'combos' | 'cache' | 'trace'>('overview');
  const [timeRange, setTimeRange] = useState('30D');
  const [metrics, setMetrics] = useState({
    totalRequests: 0,
    successRate: 100,
    avgLatencyMs: 0,
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    cacheHitRate: 0,
  });

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'evals', label: 'Evals' },
    { id: 'search', label: 'Search' },
    { id: 'utilization', label: 'Utilization' },
    { id: 'combos', label: 'Combo Health' },
    { id: 'cache', label: 'Cache Health' },
    { id: 'trace', label: 'Route Trace' },
  ];

  const ranges = ['1D', '7D', '30D', '90D', 'YTD', 'All'];

  // Fetch live metrics
  useEffect(() => {
    async function loadStats() {
      try {
        const token = localStorage.getItem('routenex_admin_token') || 'rn-local-dev-default';
        const res = await fetch('http://127.0.0.1:3001/v1/usage', {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);

        if (res && res.ok) {
          const data = await res.json();
          if (data && data.total_requests) {
            setMetrics({
              totalRequests: data.total_requests || 0,
              successRate: data.success_rate_percent || 100,
              avgLatencyMs: data.avg_latency_ms || 0,
              totalTokens: data.total_tokens || 0,
              promptTokens: data.prompt_tokens || 0,
              completionTokens: data.completion_tokens || 0,
              cacheHitRate: data.cache_hit_rate_percent || 0,
            });
          }
        }
      } catch {
        // Gateway offline or fresh install
      }
    }

    loadStats();
  }, []);

  // 52 weeks x 7 days empty activity heatmap (clean 0s on fresh install)
  const heatmapData = Array.from({ length: 52 * 7 }, () => 0);

  const getHeatmapColor = (val: number) => {
    if (val === 0) return 'bg-zinc-900 border border-zinc-800/60';
    if (val === 1) return 'bg-emerald-950 border border-emerald-900';
    if (val === 2) return 'bg-emerald-800 border border-emerald-700';
    if (val === 3) return 'bg-emerald-600 border border-emerald-500';
    return 'bg-emerald-400 border border-emerald-300';
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Top Header & Range Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222226]">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 font-sans tracking-tight">
            Usage Analytics & Telemetry
          </h2>
          <p className="text-zinc-500 font-sans text-xs mt-0.5">
            Token accounting, latency distribution, and route execution trace.
          </p>
        </div>

        <div className="flex p-0.5 rounded bg-[#111113] border border-[#222226]">
          {ranges.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setTimeRange(r)}
              className={`px-2.5 py-1 rounded text-[11px] transition ${
                timeRange === r ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* 7 Sub Tabs */}
      <div className="flex border-b border-[#222226] overflow-x-auto gap-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveSubTab(t.id as any)}
            className={`pb-2.5 px-2 text-xs font-medium transition border-b-2 whitespace-nowrap ${
              activeSubTab === t.id
                ? 'border-zinc-100 text-zinc-100 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 3 Metric Summary Rows (Screenshot 595) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-[#111113] border border-[#222226] space-y-2">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-sans">Infrastructure</span>
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-400">Total Requests:</span>
            <span className="text-zinc-100 font-bold">{metrics.totalRequests.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-400">Success Rate:</span>
            <span className="text-emerald-400 font-bold">{metrics.successRate}%</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#111113] border border-[#222226] space-y-2">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-sans">Performance</span>
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-400">Avg Latency (TTFT):</span>
            <span className="text-zinc-100 font-bold">{metrics.avgLatencyMs}ms</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-400">Cache Hit Rate:</span>
            <span className="text-zinc-300 font-bold">{metrics.cacheHitRate}%</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#111113] border border-[#222226] space-y-2">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-sans">Token Accounting</span>
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-400">Total Tokens:</span>
            <span className="text-zinc-100 font-bold">{metrics.totalTokens.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-400">Prompt / Output:</span>
            <span className="text-zinc-300 font-bold">
              {metrics.promptTokens.toLocaleString()} / {metrics.completionTokens.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 365-Day Activity Heatmap (Screenshot 595) */}
      <div className="p-5 rounded-xl bg-[#111113] border border-[#222226] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-300 font-sans">
            365-Day Request Activity Heatmap
          </span>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
            <span>Less</span>
            <span className="w-2.5 h-2.5 rounded-xs bg-zinc-900 border border-zinc-800/60" />
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-950" />
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-800" />
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600" />
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-400" />
            <span>More</span>
          </div>
        </div>

        {metrics.totalRequests === 0 ? (
          <div className="py-6 text-center space-y-2 font-sans">
            <p className="text-xs text-zinc-500">No requests recorded this week.</p>
            <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto py-2 opacity-50">
              {heatmapData.map((val, idx) => (
                <div key={idx} className={`w-2.5 h-2.5 rounded-xs ${getHeatmapColor(val)}`} />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto py-2">
            {heatmapData.map((val, idx) => (
              <div key={idx} className={`w-2.5 h-2.5 rounded-xs ${getHeatmapColor(val)}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

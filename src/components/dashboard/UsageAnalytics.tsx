import React, { useState } from 'react';

export default function UsageAnalytics() {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'evals' | 'search' | 'utilization' | 'combos' | 'cache' | 'trace'>('overview');
  const [timeRange, setTimeRange] = useState('30D');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'evals', label: 'Evals' },
    { id: 'search', label: 'Search' },
    { id: 'utilization', label: 'Utilization' },
    { id: 'combos', label: 'Combo Health' },
    { id: 'cache', label: 'Cache Health' },
    { id: 'trace', label: 'Route Trace' },
  ];

  const ranges = ['1D', '7D', '30D', '90D', 'YTD', 'All', 'Custom'];

  // Generate 52 weeks x 7 days mock heatmap data
  const heatmapData = Array.from({ length: 52 * 7 }, (_, i) => {
    const val = Math.floor(Math.sin(i * 0.15) * 4) + Math.floor(Math.random() * 4);
    return Math.max(0, val);
  });

  const getHeatmapColor = (val: number) => {
    if (val === 0) return 'bg-[#181d2a]';
    if (val === 1) return 'bg-purple-900/60';
    if (val === 2) return 'bg-purple-700';
    if (val === 3) return 'bg-purple-500';
    return 'bg-purple-400';
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Range Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#222738]">
        <div>
          <h2 className="text-base font-semibold text-white font-mono tracking-tight">Usage Analytics & Telemetry</h2>
          <p className="text-xs text-[#8f96a3]">Deep token accounting, latency distribution, and route execution trace.</p>
        </div>

        <div className="flex p-0.5 rounded-lg bg-[#181d2c] border border-[#262f44] overflow-x-auto text-[11px] font-mono">
          {ranges.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setTimeRange(r)}
              className={`px-2.5 py-1 rounded transition-colors ${
                timeRange === r ? 'bg-purple-600 text-white font-semibold' : 'text-[#7d8597] hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* 7 Sub Tabs */}
      <div className="flex border-b border-[#222738] overflow-x-auto gap-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveSubTab(t.id as any)}
            className={`pb-2.5 px-2 text-xs font-mono font-medium transition-colors shrink-0 border-b-2 ${
              activeSubTab === t.id
                ? 'border-purple-500 text-white'
                : 'border-transparent text-[#7d8597] hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 4 Headline Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[#121622] border border-[#222738]">
          <span className="text-[11px] text-[#7d8597] font-mono block mb-1">TOTAL TOKENS</span>
          <span className="text-2xl font-bold text-white font-mono">1,842,500</span>
          <span className="text-[10px] text-emerald-400 font-mono block mt-1">↑ +14.2% vs prev window</span>
        </div>
        <div className="p-4 rounded-xl bg-[#121622] border border-[#222738]">
          <span className="text-[11px] text-sky-400 font-mono block mb-1">INPUT TOKENS</span>
          <span className="text-2xl font-bold text-sky-400 font-mono">418,200</span>
          <span className="text-[10px] text-[#7d8597] font-mono block mt-1">Caveman -38.4% pruned</span>
        </div>
        <div className="p-4 rounded-xl bg-[#121622] border border-[#222738]">
          <span className="text-[11px] text-purple-400 font-mono block mb-1">OUTPUT TOKENS</span>
          <span className="text-2xl font-bold text-purple-400 font-mono">1,424,300</span>
          <span className="text-[10px] text-[#7d8597] font-mono block mt-1">I/O Ratio: 1:3.4</span>
        </div>
        <div className="p-4 rounded-xl bg-[#121622] border border-[#222738]">
          <span className="text-[11px] text-emerald-400 font-mono block mb-1">EST. COST</span>
          <span className="text-2xl font-bold text-emerald-400 font-mono">$0.0428</span>
          <span className="text-[10px] text-emerald-400 font-mono block mt-1">98.2% via $0 Free Tiers</span>
        </div>
      </div>

      {/* 3 Metric Rows */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Row 1: Infrastructure */}
        <div className="p-4 rounded-xl bg-[#121622] border border-[#222738] space-y-3 font-mono">
          <h3 className="text-xs font-semibold text-[#8f96a3] uppercase tracking-wider">INFRASTRUCTURE</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-[#8f96a3]">
              <span>Accounts</span>
              <span className="text-white font-bold">4 connected</span>
            </div>
            <div className="flex justify-between text-[#8f96a3]">
              <span>Providers</span>
              <span className="text-white font-bold">12 active</span>
            </div>
            <div className="flex justify-between text-[#8f96a3]">
              <span>API Keys</span>
              <span className="text-white font-bold">5 virtual keys</span>
            </div>
            <div className="flex justify-between text-[#8f96a3]">
              <span>Models</span>
              <span className="text-white font-bold">347 available</span>
            </div>
          </div>
        </div>

        {/* Row 2: Performance */}
        <div className="p-4 rounded-xl bg-[#121622] border border-[#222738] space-y-3 font-mono">
          <h3 className="text-xs font-semibold text-[#8f96a3] uppercase tracking-wider">PERFORMANCE</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-[#8f96a3]">
              <span>Avg Tokens / Req</span>
              <span className="text-white font-bold">642 tokens</span>
            </div>
            <div className="flex justify-between text-[#8f96a3]">
              <span>Cost / Req</span>
              <span className="text-white font-bold">$0.000034</span>
            </div>
            <div className="flex justify-between text-[#8f96a3]">
              <span>Fast Requests (&lt;300ms)</span>
              <span className="text-emerald-400 font-bold">98.2%</span>
            </div>
            <div className="flex justify-between text-[#8f96a3]">
              <span>Zero-Cost Requests</span>
              <span className="text-purple-400 font-bold">99.1%</span>
            </div>
          </div>
        </div>

        {/* Row 3: Highlights */}
        <div className="p-4 rounded-xl bg-[#121622] border border-[#222738] space-y-3 font-mono">
          <h3 className="text-xs font-semibold text-[#8f96a3] uppercase tracking-wider">HIGHLIGHTS</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-[#8f96a3]">
              <span>Top Model</span>
              <span className="text-purple-300 font-bold truncate max-w-[140px]">groq/llama-3.3-70b</span>
            </div>
            <div className="flex justify-between text-[#8f96a3]">
              <span>Top Provider</span>
              <span className="text-white font-bold">Groq</span>
            </div>
            <div className="flex justify-between text-[#8f96a3]">
              <span>Fallback Trigger Rate</span>
              <span className="text-emerald-400 font-bold">0.8%</span>
            </div>
            <div className="flex justify-between text-[#8f96a3]">
              <span>Circuit Breaker State</span>
              <span className="text-emerald-400 font-bold">All CLOSED (Healthy)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 365-Day Activity Heatmap */}
      <div className="p-5 rounded-xl bg-[#121622] border border-[#222738] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-white font-mono uppercase tracking-wider">
            365-Day Activity Heatmap
          </h3>
          <div className="flex items-center gap-2 text-[10px] font-mono text-[#7d8597]">
            <span>Less</span>
            <div className="flex gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#181d2a]" />
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-900/60" />
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-700" />
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" />
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-400" />
            </div>
            <span>More</span>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="grid grid-rows-7 grid-flow-col gap-1 w-max">
            {heatmapData.map((val, idx) => (
              <div
                key={idx}
                className={`w-3 h-3 rounded-sm ${getHeatmapColor(val)} hover:ring-1 hover:ring-purple-400 transition-all`}
                title={`Day ${idx + 1}: ${val * 120} tokens`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

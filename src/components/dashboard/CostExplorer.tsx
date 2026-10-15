import React, { useState } from 'react';

interface CostRow {
  dimension: string;
  cost: number;
  requests: number;
  tokens: number;
  avgCostPerReq: number;
  sharePercent: number;
}

export default function CostExplorer() {
  const [activeDimension, setActiveDimension] = useState<'provider' | 'model' | 'key' | 'account' | 'tier'>('provider');
  const [filterQuery, setFilterQuery] = useState('');
  const [timeRange, setTimeRange] = useState('30 Days');

  const ranges = ['7 Days', '30 Days', '90 Days', '180 Days', '365 Days', 'All Time'];
  const dimensions = [
    { id: 'provider', label: 'Provider' },
    { id: 'model', label: 'Model' },
    { id: 'key', label: 'API Key' },
    { id: 'account', label: 'Account' },
    { id: 'tier', label: 'Service Tier' },
  ];

  const rows: Record<string, CostRow[]> = {
    provider: [
      { dimension: 'Groq Cloud', cost: 0.0000, requests: 842, tokens: 940000, avgCostPerReq: 0.0000, sharePercent: 68 },
      { dimension: 'Anthropic Claude', cost: 0.0412, requests: 64, tokens: 184000, avgCostPerReq: 0.00064, sharePercent: 22 },
      { dimension: 'Cerebras Free Tier', cost: 0.0000, requests: 240, tokens: 520000, avgCostPerReq: 0.0000, sharePercent: 8 },
      { dimension: 'Pollinations Zero-Key', cost: 0.0000, requests: 101, tokens: 198500, avgCostPerReq: 0.0000, sharePercent: 2 },
    ],
    model: [
      { dimension: 'groq/llama-3.3-70b-versatile', cost: 0.0000, requests: 620, tokens: 710000, avgCostPerReq: 0.0000, sharePercent: 54 },
      { dimension: 'anthropic/claude-3-7-sonnet', cost: 0.0384, requests: 48, tokens: 142000, avgCostPerReq: 0.00080, sharePercent: 28 },
      { dimension: 'cerebras/llama-3.3-70b', cost: 0.0000, requests: 240, tokens: 520000, avgCostPerReq: 0.0000, sharePercent: 12 },
      { dimension: 'groq/llama-3.1-8b-instant', cost: 0.0000, requests: 222, tokens: 230000, avgCostPerReq: 0.0000, sharePercent: 6 },
    ],
    key: [
      { dimension: 'rn-local-dev-default', cost: 0.0000, requests: 1020, tokens: 1480000, avgCostPerReq: 0.0000, sharePercent: 82 },
      { dimension: 'rn_live_prod_coding_agent', cost: 0.0412, requests: 227, tokens: 362500, avgCostPerReq: 0.00018, sharePercent: 18 },
    ],
    account: [
      { dimension: 'alex***@developer.io (Default)', cost: 0.0000, requests: 842, tokens: 940000, avgCostPerReq: 0.0000, sharePercent: 70 },
      { dimension: 'harshil***@gmail.com (Pro)', cost: 0.0412, requests: 405, tokens: 902500, avgCostPerReq: 0.00010, sharePercent: 30 },
    ],
    tier: [
      { dimension: 'Free Unlimited Tier ($0)', cost: 0.0000, requests: 1183, tokens: 1658500, avgCostPerReq: 0.0000, sharePercent: 95 },
      { dimension: 'Standard Pay-As-You-Go', cost: 0.0412, requests: 64, tokens: 184000, avgCostPerReq: 0.00064, sharePercent: 5 },
    ],
  };

  const currentRows = (rows[activeDimension] || rows.provider).filter((r) =>
    r.dimension.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#222738]">
        <div>
          <h2 className="text-base font-semibold text-white font-mono tracking-tight">Cost Explorer & Spend Accounting</h2>
          <p className="text-xs text-[#8f96a3]">Break down LLM inference expenditure across 5 configurable dimensions.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex p-0.5 rounded-lg bg-[#181d2c] border border-[#262f44] text-[11px] font-mono">
            {ranges.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setTimeRange(r)}
                className={`px-2 py-1 rounded transition-colors ${
                  timeRange === r ? 'bg-purple-600 text-white font-semibold' : 'text-[#7d8597] hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="px-2.5 py-1.5 rounded-lg bg-[#181d2c] hover:bg-[#20273c] border border-[#262f44] text-xs font-mono text-white"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* 4 Spend Headline Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[#121622] border border-[#222738]">
          <span className="text-[11px] text-[#7d8597] font-mono block mb-1">SPEND TODAY</span>
          <span className="text-2xl font-bold text-white font-mono">$0.0000</span>
          <span className="text-[10px] text-emerald-400 font-mono block mt-1">100% Free Tiers</span>
        </div>
        <div className="p-4 rounded-xl bg-[#121622] border border-[#222738]">
          <span className="text-[11px] text-[#7d8597] font-mono block mb-1">SPEND 7D</span>
          <span className="text-2xl font-bold text-white font-mono">$0.0124</span>
          <span className="text-[10px] text-purple-400 font-mono block mt-1">Avg $0.0017 / day</span>
        </div>
        <div className="p-4 rounded-xl bg-[#121622] border border-[#222738]">
          <span className="text-[11px] text-[#7d8597] font-mono block mb-1">SPEND 30D</span>
          <span className="text-2xl font-bold text-white font-mono">$0.0412</span>
          <span className="text-[10px] text-emerald-400 font-mono block mt-1">Within $10.00 cap</span>
        </div>
        <div className="p-4 rounded-xl bg-[#121622] border border-[#222738]">
          <span className="text-[11px] text-[#7d8597] font-mono block mb-1">SELECTED WINDOW</span>
          <span className="text-2xl font-bold text-emerald-400 font-mono">$0.0412</span>
          <span className="text-[10px] text-[#7d8597] font-mono block mt-1">1,247 requests</span>
        </div>
      </div>

      {/* Dimension Switcher & Search Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex border-b sm:border-b-0 border-[#222738] overflow-x-auto gap-2">
          {dimensions.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setActiveDimension(d.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                activeDimension === d.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-[#141824] text-[#8e97ae] hover:text-white border border-[#222738]'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder="Filter rows..."
          className="bg-[#141824] border border-[#222738] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#5a647d] font-mono focus:outline-none focus:border-purple-500 w-full sm:w-56"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#222738] overflow-hidden bg-[#121622]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#161b2a] border-b border-[#222738] text-[#8e97ae]">
              <tr>
                <th className="py-2.5 px-4 font-semibold uppercase">{activeDimension}</th>
                <th className="py-2.5 px-4 font-semibold uppercase text-right">Cost</th>
                <th className="py-2.5 px-4 font-semibold uppercase text-right">Requests</th>
                <th className="py-2.5 px-4 font-semibold uppercase text-right">Tokens</th>
                <th className="py-2.5 px-4 font-semibold uppercase text-right">Avg Cost/Req</th>
                <th className="py-2.5 px-4 font-semibold uppercase text-right w-44">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b2234]">
              {currentRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-[#181d2c] transition-colors">
                  <td className="py-3 px-4 font-semibold text-white">{row.dimension}</td>
                  <td className="py-3 px-4 text-right text-emerald-400 font-bold">
                    ${row.cost.toFixed(4)}
                  </td>
                  <td className="py-3 px-4 text-right text-[#a0a8be]">{row.requests.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-[#a0a8be]">{row.tokens.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-[#a0a8be]">
                    ${row.avgCostPerReq.toFixed(6)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-24 h-1.5 rounded-full bg-[#1b2131] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-purple-500"
                          style={{ width: `${row.sharePercent}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-[#7d8597] w-8">{row.sharePercent}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

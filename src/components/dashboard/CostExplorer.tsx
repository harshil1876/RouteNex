import React, { useState, useEffect } from 'react';

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
  const [rows, setRows] = useState<CostRow[]>([]);

  const ranges = ['7 Days', '30 Days', '90 Days', '180 Days', '365 Days', 'All Time'];
  const dimensions = [
    { id: 'provider', label: 'Provider' },
    { id: 'model', label: 'Model' },
    { id: 'key', label: 'API Key' },
    { id: 'account', label: 'Account' },
    { id: 'tier', label: 'Service Tier' },
  ];

  // Fetch live spend accounting from gateway
  useEffect(() => {
    async function fetchSpend() {
      try {
        const token = localStorage.getItem('routenex_admin_token') || 'rn-local-dev-default';
        const res = await fetch('http://127.0.0.1:3001/v1/usage', {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);

        if (res && res.ok) {
          const data = await res.json();
          if (data && data.total_requests > 0) {
            setRows([
              {
                dimension: 'Default Gateway Traffic',
                cost: data.estimated_cost_usd || 0,
                requests: data.total_requests || 0,
                tokens: data.total_tokens || 0,
                avgCostPerReq: data.total_requests ? (data.estimated_cost_usd || 0) / data.total_requests : 0,
                sharePercent: 100,
              },
            ]);
          } else {
            setRows([]);
          }
        }
      } catch {
        setRows([]);
      }
    }

    fetchSpend();
  }, [activeDimension]);

  const currentRows = rows.filter((r) =>
    r.dimension.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const totalCost = rows.reduce((acc, r) => acc + r.cost, 0);
  const totalTokens = rows.reduce((acc, r) => acc + r.tokens, 0);
  const totalRequests = rows.reduce((acc, r) => acc + r.requests, 0);

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222226]">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 font-sans tracking-tight">
            Cost Explorer & Spend Accounting
          </h2>
          <p className="text-zinc-500 font-sans text-xs mt-0.5">
            Token accounting, free-tier savings, and spend breakdown.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex p-0.5 rounded bg-[#111113] border border-[#222226]">
            {ranges.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 rounded text-[11px] transition ${
                  timeRange === r ? 'bg-zinc-800 text-zinc-100 font-medium' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              const csv = `Dimension,Cost,Requests,Tokens\n` + rows.map((r) => `${r.dimension},${r.cost},${r.requests},${r.tokens}`).join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `routenex-spend-${Date.now()}.csv`;
              a.click();
            }}
            className="px-3 py-1.5 rounded bg-[#111113] border border-[#222226] text-zinc-300 hover:text-white transition"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[#111113] border border-[#222226] space-y-1">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-sans">Total Spend</span>
          <div className="text-xl font-bold text-zinc-100">${totalCost.toFixed(4)}</div>
          <span className="text-[10px] text-emerald-400 font-sans">100% Free-Tier / BYOK</span>
        </div>

        <div className="p-4 rounded-xl bg-[#111113] border border-[#222226] space-y-1">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-sans">Total Requests</span>
          <div className="text-xl font-bold text-zinc-100">{totalRequests.toLocaleString()}</div>
          <span className="text-[10px] text-zinc-500 font-sans">Through Local Gateway</span>
        </div>

        <div className="p-4 rounded-xl bg-[#111113] border border-[#222226] space-y-1">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-sans">Total Tokens</span>
          <div className="text-xl font-bold text-zinc-100">{totalTokens.toLocaleString()}</div>
          <span className="text-[10px] text-zinc-500 font-sans">Input + Output</span>
        </div>

        <div className="p-4 rounded-xl bg-[#111113] border border-[#222226] space-y-1">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-sans">Free-Tier Savings</span>
          <div className="text-xl font-bold text-emerald-400">$0.00</div>
          <span className="text-[10px] text-zinc-500 font-sans">Saved vs Direct Paid APIs</span>
        </div>
      </div>

      {/* 5-Dimension Subtabs */}
      <div className="flex border-b border-[#222226] gap-2">
        {dimensions.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setActiveDimension(d.id as any)}
            className={`pb-2 px-3 text-xs font-medium transition border-b-2 ${
              activeDimension === d.id
                ? 'border-zinc-100 text-zinc-100 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Table / Empty State */}
      <div className="rounded-xl border border-[#222226] bg-[#111113] overflow-hidden">
        {currentRows.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-2 font-sans">
            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto text-zinc-400 text-sm">
              💰
            </div>
            <h3 className="text-sm font-semibold text-zinc-200">No spend this week</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              All completions routed through RouteNex have used $0 free-tier pools or your own zero-cost endpoints.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#222226] bg-[#09090b] text-[10px] text-zinc-500">
                <th className="py-2.5 px-4 uppercase font-semibold">Dimension</th>
                <th className="py-2.5 px-4 uppercase font-semibold text-right">Cost</th>
                <th className="py-2.5 px-4 uppercase font-semibold text-right">Requests</th>
                <th className="py-2.5 px-4 uppercase font-semibold text-right">Tokens</th>
                <th className="py-2.5 px-4 uppercase font-semibold text-right">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222226]">
              {currentRows.map((r, i) => (
                <tr key={i} className="hover:bg-zinc-800/40 transition">
                  <td className="py-3 px-4 text-zinc-200 font-medium">{r.dimension}</td>
                  <td className="py-3 px-4 text-right text-emerald-400 font-semibold">${r.cost.toFixed(4)}</td>
                  <td className="py-3 px-4 text-right text-zinc-400">{r.requests.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-zinc-400">{r.tokens.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-zinc-400">{r.sharePercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

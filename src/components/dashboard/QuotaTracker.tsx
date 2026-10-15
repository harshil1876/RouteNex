import React, { useState } from 'react';

interface ModelQuota {
  name: string;
  percentRemaining: number;
  resetIn: string;
  status: 'healthy' | 'alert' | 'critical';
}

interface AccountQuota {
  id: string;
  email: string;
  tier: 'Starter' | 'Pro' | 'Enterprise';
  provider: string;
  expiresIn: string;
  monthlyCostUsd: number;
  models: ModelQuota[];
}

export default function QuotaTracker() {
  const [filterType, setFilterType] = useState('ALL');
  const [filterTier, setFilterTier] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const [accounts, setAccounts] = useState<AccountQuota[]>([
    {
      id: 'acc-1',
      email: 'alex***@developer.io',
      tier: 'Pro',
      provider: 'google',
      expiresIn: '0h 54m',
      monthlyCostUsd: 0.00,
      models: [
        { name: 'Gemini 2.5 Flash Lite', percentRemaining: 100, resetIn: '6d 23h 54m', status: 'healthy' },
        { name: 'Gemini 2.5 Pro (Thinking)', percentRemaining: 84, resetIn: '6d 23h 54m', status: 'healthy' },
      ],
    },
    {
      id: 'acc-2',
      email: 'team***@routenex.org',
      tier: 'Starter',
      provider: 'groq',
      expiresIn: 'Never (API Key)',
      monthlyCostUsd: 0.00,
      models: [
        { name: 'Llama 3.3 70B Versatile', percentRemaining: 68, resetIn: '0h 14m', status: 'healthy' },
        { name: 'Llama 3.1 8B Instant', percentRemaining: 92, resetIn: '0h 14m', status: 'healthy' },
      ],
    },
    {
      id: 'acc-3',
      email: 'harshil***@gmail.com',
      tier: 'Pro',
      provider: 'anthropic',
      expiresIn: '23h 12m',
      monthlyCostUsd: 4.82,
      models: [
        { name: 'Claude 3.7 Sonnet (Thinking)', percentRemaining: 49, resetIn: '1d 04h', status: 'alert' },
        { name: 'Claude 3.5 Haiku', percentRemaining: 88, resetIn: '1d 04h', status: 'healthy' },
      ],
    },
    {
      id: 'acc-4',
      email: 'open***@free-pool.net',
      tier: 'Starter',
      provider: 'cerebras',
      expiresIn: 'Never (Free Tier)',
      monthlyCostUsd: 0.00,
      models: [
        { name: 'Llama 3.3 70B (1M tokens/day)', percentRemaining: 96, resetIn: '4h 12m', status: 'healthy' },
      ],
    },
  ]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const totalQuota = accounts.length;
  const criticalCount = accounts.flatMap((a) => a.models).filter((m) => m.percentRemaining < 20).length;
  const alertCount = accounts.flatMap((a) => a.models).filter((m) => m.percentRemaining >= 20 && m.percentRemaining < 50).length;
  const healthyCount = accounts.flatMap((a) => a.models).filter((m) => m.percentRemaining >= 50).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#222738]">
        <div>
          <h2 className="text-base font-semibold text-white font-mono tracking-tight">Provider Quotas & Quota Sharing</h2>
          <p className="text-xs text-[#8f96a3]">Realtime headroom, token exhaustion timers, and rate-limit reset windows.</p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="px-3.5 py-1.5 rounded-lg bg-[#181d2c] hover:bg-[#20273c] border border-[#262f44] text-xs font-mono text-white flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <span className={refreshing ? 'animate-spin' : ''}>↻</span>
          Refresh All
        </button>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[#121622] border border-[#222738]">
          <span className="text-[11px] text-[#7d8597] font-mono block mb-1">TOTAL ACCOUNTS</span>
          <span className="text-2xl font-bold text-white font-mono">{totalQuota}</span>
        </div>
        <div className="p-4 rounded-xl bg-[#121622] border border-[#222738]">
          <span className="text-[11px] text-rose-400 font-mono block mb-1">CRITICAL (&lt;20%)</span>
          <span className="text-2xl font-bold text-rose-400 font-mono">{criticalCount}</span>
        </div>
        <div className="p-4 rounded-xl bg-[#121622] border border-[#222738]">
          <span className="text-[11px] text-amber-400 font-mono block mb-1">ALERT (20-50%)</span>
          <span className="text-2xl font-bold text-amber-400 font-mono">{alertCount}</span>
        </div>
        <div className="p-4 rounded-xl bg-[#121622] border border-[#222738]">
          <span className="text-[11px] text-emerald-400 font-mono block mb-1">HEALTHY (&gt;50%)</span>
          <span className="text-2xl font-bold text-emerald-400 font-mono">{healthyCount}</span>
        </div>
      </div>

      {/* Account Cards */}
      <div className="space-y-4">
        {accounts.map((acc) => (
          <div key={acc.id} className="p-5 rounded-xl bg-[#121622] border border-[#222738] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1a2030]">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#181d2c] border border-[#262f44] flex items-center justify-center font-mono font-bold text-xs text-purple-400 uppercase">
                  {acc.provider.slice(0, 2)}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-white">{acc.email}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono">
                      {acc.tier}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#7d8597] font-mono">
                    OAuth token expires in <span className="text-amber-400">{acc.expiresIn}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-[#8f96a3]">Spend: <span className="text-white">${acc.monthlyCostUsd.toFixed(2)}</span></span>
                <button
                  type="button"
                  className="px-2.5 py-1 rounded bg-[#1a2030] hover:bg-[#222b40] border border-[#293248] text-purple-400 hover:text-purple-300"
                >
                  Edit cutoffs
                </button>
              </div>
            </div>

            {/* Model Progress Bars */}
            <div className="space-y-3">
              {acc.models.map((m, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-white font-medium">{m.name}</span>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-[#7d8597]">Resets in {m.resetIn}</span>
                      <span
                        className={`font-bold ${
                          m.percentRemaining < 20
                            ? 'text-rose-400'
                            : m.percentRemaining < 50
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {m.percentRemaining}% left
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#1b2131] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        m.percentRemaining < 20
                          ? 'bg-rose-500'
                          : m.percentRemaining < 50
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${m.percentRemaining}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

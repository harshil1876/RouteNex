import React, { useState, useEffect, useCallback } from 'react';

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

const BASE_POOLS: AccountQuota[] = [
  {
    id: 'prov-pollinations',
    email: 'pollinations.ai (Zero-Key)',
    tier: 'Starter',
    provider: 'pollinations',
    expiresIn: 'Never (Zero-Key Anonymous)',
    monthlyCostUsd: 0.00,
    models: [
      { name: 'OpenAI GPT-4o-mini', percentRemaining: 100, resetIn: 'Continuous', status: 'healthy' },
      { name: 'Qwen 2.5 Coder 32B', percentRemaining: 100, resetIn: 'Continuous', status: 'healthy' },
      { name: 'Mistral Small 24B', percentRemaining: 100, resetIn: 'Continuous', status: 'healthy' },
    ],
  },
  {
    id: 'prov-duckduckgo',
    email: 'duckduckgo.com (Zero-Key)',
    tier: 'Starter',
    provider: 'duckduckgo',
    expiresIn: 'Never (Zero-Key Anonymous)',
    monthlyCostUsd: 0.00,
    models: [
      { name: 'GPT-4o-mini', percentRemaining: 100, resetIn: 'Continuous', status: 'healthy' },
      { name: 'Claude 3 Haiku', percentRemaining: 100, resetIn: 'Continuous', status: 'healthy' },
    ],
  },
  {
    id: 'prov-groq',
    email: 'api.groq.com (LPU Pool)',
    tier: 'Pro',
    provider: 'groq',
    expiresIn: 'Active API Key',
    monthlyCostUsd: 0.00,
    models: [
      { name: 'Llama 3.3 70B Versatile', percentRemaining: 100, resetIn: '1m rolling window', status: 'healthy' },
      { name: 'Llama 3.1 8B Instant', percentRemaining: 100, resetIn: '1m rolling window', status: 'healthy' },
    ],
  },
  {
    id: 'prov-cerebras',
    email: 'api.cerebras.ai (WSE-3 Pool)',
    tier: 'Pro',
    provider: 'cerebras',
    expiresIn: 'Active API Key',
    monthlyCostUsd: 0.00,
    models: [
      { name: 'Llama 3.3 70B (1M tokens/day)', percentRemaining: 100, resetIn: 'Midnight UTC', status: 'healthy' },
    ],
  },
  {
    id: 'prov-gemini',
    email: 'ai.google.dev (Gemini Pool)',
    tier: 'Pro',
    provider: 'gemini',
    expiresIn: 'Active API Key',
    monthlyCostUsd: 0.00,
    models: [
      { name: 'Gemini 2.5 Flash Lite', percentRemaining: 100, resetIn: 'Midnight PST', status: 'healthy' },
      { name: 'Gemini 2.5 Pro (Thinking)', percentRemaining: 100, resetIn: 'Midnight PST', status: 'healthy' },
    ],
  },
  {
    id: 'prov-mistral',
    email: 'api.mistral.ai (1B Grant Pool)',
    tier: 'Pro',
    provider: 'mistral',
    expiresIn: 'Active API Key',
    monthlyCostUsd: 0.00,
    models: [
      { name: 'Codestral Latest', percentRemaining: 100, resetIn: 'Monthly cycle', status: 'healthy' },
      { name: 'Mistral Small', percentRemaining: 100, resetIn: 'Monthly cycle', status: 'healthy' },
    ],
  },
  {
    id: 'prov-deepseek',
    email: 'api.deepseek.com (V3/R1 Pool)',
    tier: 'Starter',
    provider: 'deepseek',
    expiresIn: 'Active API Key',
    monthlyCostUsd: 0.00,
    models: [
      { name: 'DeepSeek-V3 Chat', percentRemaining: 100, resetIn: 'Pay-as-you-go', status: 'healthy' },
      { name: 'DeepSeek-R1 Reasoner', percentRemaining: 100, resetIn: 'Pay-as-you-go', status: 'healthy' },
    ],
  },
  {
    id: 'prov-anthropic',
    email: 'api.anthropic.com (Direct)',
    tier: 'Enterprise',
    provider: 'anthropic',
    expiresIn: 'Active API Key',
    monthlyCostUsd: 0.00,
    models: [
      { name: 'Claude 3.7 Sonnet', percentRemaining: 100, resetIn: '1m rolling window', status: 'healthy' },
      { name: 'Claude 3.5 Haiku', percentRemaining: 100, resetIn: '1m rolling window', status: 'healthy' },
    ],
  },
];

export default function QuotaTracker() {
  const [filterType, setFilterType] = useState('ALL');
  const [filterTier, setFilterTier] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [accounts, setAccounts] = useState<AccountQuota[]>(BASE_POOLS);

  const fetchLiveQuotas = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('routenex_admin_token') || 'routenex-admin') : 'routenex-admin';
      const headers = {
        'Authorization': `Bearer ${token}`,
        'x-admin-token': token,
      };

      const [provRes, usageRes] = await Promise.all([
        fetch('http://127.0.0.1:3001/v1/admin/providers', { headers }).catch(() => null),
        fetch('http://127.0.0.1:3001/v1/usage?recent=100').catch(() => null),
      ]);

      let liveProviders: any[] = [];
      if (provRes && provRes.ok) {
        const pData = await provRes.json();
        liveProviders = pData.providers || [];
      }

      let recentLogs: any[] = [];
      let totalUsageCost = 0;
      if (usageRes && usageRes.ok) {
        const uData = await usageRes.json();
        recentLogs = uData.recent_requests || [];
        totalUsageCost = uData.estimated_cost_usd || 0;
      }

      setAccounts((prev) =>
        prev.map((acc) => {
          const matched = liveProviders.find((p: any) => p.id === acc.provider);
          const isConfigured = matched ? Boolean(matched.configured || matched.isConfigured) : acc.provider === 'pollinations' || acc.provider === 'duckduckgo';
          const masked = matched?.maskedKeys?.[0];

          // Compute usage & cost for this provider from real telemetry
          const providerLogs = recentLogs.filter((r: any) => r.provider === acc.provider);
          const errorCount = providerLogs.filter((r: any) => r.status === 'error').length;
          const providerSpend = providerLogs.reduce((sum: number, r: any) => sum + (r.cost_estimate?.total_usd || 0), 0);

          let providerStatus: 'healthy' | 'alert' | 'critical' = 'healthy';
          let percent = 100;

          if (!isConfigured && acc.provider !== 'pollinations' && acc.provider !== 'duckduckgo') {
            providerStatus = 'alert';
            percent = 0;
          } else if (errorCount > 2) {
            providerStatus = 'critical';
            percent = 15;
          } else if (errorCount > 0) {
            providerStatus = 'alert';
            percent = 45;
          }

          const updatedModels: ModelQuota[] = acc.models.map((m) => ({
            ...m,
            percentRemaining: percent,
            status: providerStatus,
            resetIn: !isConfigured && acc.provider !== 'pollinations' && acc.provider !== 'duckduckgo'
              ? 'Unconfigured'
              : m.resetIn,
          }));

          return {
            ...acc,
            email: masked ? `${masked} (${acc.provider})` : (isConfigured ? `${acc.provider}.gateway` : `${acc.provider} (Unconfigured)`),
            expiresIn: isConfigured
              ? (acc.provider === 'pollinations' || acc.provider === 'duckduckgo' ? 'Zero-Key (Active)' : 'Active API Key')
              : 'Add API Key in Providers',
            monthlyCostUsd: Number(providerSpend.toFixed(4)),
            models: updatedModels,
          };
        })
      );
    } catch {
      // Keep base definitions if offline
    }
  }, []);

  useEffect(() => {
    fetchLiveQuotas();
    const handleStateChange = () => {
      fetchLiveQuotas();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('routenex:state-changed', handleStateChange);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('routenex:state-changed', handleStateChange);
      }
    };
  }, [fetchLiveQuotas]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLiveQuotas();
    setTimeout(() => setRefreshing(false), 500);
  };

  const filteredAccounts = accounts.filter((acc) => {
    if (filterTier !== 'ALL' && acc.tier !== filterTier) return false;
    if (filterType !== 'ALL' && acc.provider !== filterType) return false;
    return true;
  });

  const totalQuota = filteredAccounts.length;
  const criticalCount = filteredAccounts.flatMap((a) => a.models).filter((m) => m.percentRemaining < 20).length;
  const alertCount = filteredAccounts.flatMap((a) => a.models).filter((m) => m.percentRemaining >= 20 && m.percentRemaining < 50).length;
  const healthyCount = filteredAccounts.flatMap((a) => a.models).filter((m) => m.percentRemaining >= 50).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#222738]">
        <div>
          <h2 className="text-base font-semibold text-white font-mono tracking-tight">Provider Quotas & Quota Sharing</h2>
          <p className="text-xs text-[#8f96a3]">Realtime headroom, token exhaustion timers, and rate-limit reset windows.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[#181d2c] border border-[#262f44] text-xs font-mono text-white focus:outline-none"
          >
            <option value="ALL">All Tiers</option>
            <option value="Starter">Starter</option>
            <option value="Pro">Pro</option>
            <option value="Enterprise">Enterprise</option>
          </select>
          <button
            type="button"
            onClick={handleRefresh}
            className="px-3.5 py-1.5 rounded-lg bg-[#181d2c] hover:bg-[#20273c] border border-[#262f44] text-xs font-mono text-white flex items-center gap-2 transition-colors"
          >
            <span className={refreshing ? 'animate-spin' : ''}>↻</span>
            Refresh All
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[#121622] border border-[#222738]">
          <span className="text-[11px] text-[#7d8597] font-mono block mb-1">TOTAL PROVIDERS</span>
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
        {filteredAccounts.map((acc) => (
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
                    Status: <span className={acc.expiresIn.includes('Active') ? 'text-emerald-400' : 'text-amber-400'}>{acc.expiresIn}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-[#8f96a3]">Spend: <span className="text-white">${acc.monthlyCostUsd.toFixed(2)}</span></span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#181d2c] border border-[#262f44] text-[#8e97ae] font-mono uppercase">
                  {acc.provider}
                </span>
              </div>
            </div>

            {/* Model Progress Bars */}
            <div className="space-y-3">
              {acc.models.map((m, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-white font-medium">{m.name}</span>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-[#7d8597]">Resets: {m.resetIn}</span>
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

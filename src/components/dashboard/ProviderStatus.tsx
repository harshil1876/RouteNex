import React, { useState } from 'react';

export interface ProviderItem {
  id: string;
  name: string;
  type: string;
  circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  configured: boolean;
  totalRequests: number;
  successRate: number;
  avgLatencyMs: number;
  lastChecked: string;
  statusMessage: string;
}

const initialProviders: ProviderItem[] = [
  {
    id: 'prov_mock',
    name: 'Local Mock Responder',
    type: 'Embedded Engine',
    circuitState: 'CLOSED',
    configured: true,
    totalRequests: 412,
    successRate: 100,
    avgLatencyMs: 12,
    lastChecked: 'Just now',
    statusMessage: 'Always healthy zero-cost test provider'
  },
  {
    id: 'prov_groq',
    name: 'Groq Cloud',
    type: 'LPU Inference',
    circuitState: 'CLOSED',
    configured: true,
    totalRequests: 620,
    successRate: 99.4,
    avgLatencyMs: 94,
    lastChecked: '12s ago',
    statusMessage: 'High-speed primary for versatile llama models'
  },
  {
    id: 'prov_openai',
    name: 'OpenAI API',
    type: 'Direct API',
    circuitState: 'CLOSED',
    configured: true,
    totalRequests: 185,
    successRate: 98.9,
    avgLatencyMs: 320,
    lastChecked: '45s ago',
    statusMessage: 'Standard fallback target for GPT-4o series'
  },
  {
    id: 'prov_gemini',
    name: 'Google Gemini',
    type: 'Google Vertex / AI Studio',
    circuitState: 'HALF_OPEN',
    configured: true,
    totalRequests: 30,
    successRate: 90.0,
    avgLatencyMs: 250,
    lastChecked: '2m ago',
    statusMessage: 'Recovering from rate limit cooldown window'
  },
  {
    id: 'prov_ollama',
    name: 'Ollama Local Daemon',
    type: 'Self-Hosted',
    circuitState: 'CLOSED',
    configured: true,
    totalRequests: 150,
    successRate: 100,
    avgLatencyMs: 185,
    lastChecked: '1m ago',
    statusMessage: 'Local execution on localhost:11434'
  },
  {
    id: 'prov_anthropic',
    name: 'Anthropic Claude',
    type: 'Direct API',
    circuitState: 'CLOSED',
    configured: false,
    totalRequests: 0,
    successRate: 0,
    avgLatencyMs: 0,
    lastChecked: 'Never',
    statusMessage: 'Key not set (ANTHROPIC_API_KEY omitted)'
  }
];

export default function ProviderStatus() {
  const [providers, setProviders] = useState<ProviderItem[]>(initialProviders);
  const [pingingId, setPingingId] = useState<string | null>(null);

  // Poll live gateway for active provider status
  React.useEffect(() => {
    async function checkLiveProviders() {
      try {
        const res = await fetch('http://127.0.0.1:3001/health/live');
        if (res.ok) {
          const data = await res.json();
          const configuredIds = new Set(data.providers?.configured || ['mock']);

          setProviders((prev) =>
            prev.map((item) => {
              const shortId = item.id.replace('prov_', '');
              const isConfigured = configuredIds.has(shortId);
              return {
                ...item,
                configured: isConfigured,
                lastChecked: 'Live Connected',
                statusMessage: isConfigured
                  ? `${item.name} active and registered in gateway`
                  : `API key not configured in environment`,
              };
            })
          );
        }
      } catch {
        // Fallback silently to preview items
      }
    }

    checkLiveProviders();
    const interval = setInterval(checkLiveProviders, 5000);
    return () => clearInterval(interval);
  }, []);

  const simulatePing = (id: string) => {
    setPingingId(id);
    setTimeout(() => {
      setProviders((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            return {
              ...item,
              lastChecked: 'Just now',
              circuitState: item.circuitState === 'OPEN' ? 'HALF_OPEN' : 'CLOSED'
            };
          }
          return item;
        })
      );
      setPingingId(null);
    }, 500);
  };

  const getCircuitBadge = (state: 'CLOSED' | 'OPEN' | 'HALF_OPEN', configured: boolean) => {
    if (!configured) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-canvas px-2.5 py-0.5 text-[11px] font-mono text-mute">
          <span className="h-1.5 w-1.5 rounded-full bg-neutral-400"></span>
          NOT CONFIGURED
        </span>
      );
    }

    switch (state) {
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-mono font-medium text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            CIRCUIT CLOSED (Normal)
          </span>
        );
      case 'HALF_OPEN':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-mono font-medium text-amber-800">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
            HALF-OPEN (Probing)
          </span>
        );
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[11px] font-mono font-medium text-red-800">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
            CIRCUIT OPEN (Tripped)
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-ink">Configured Upstream Providers</h3>
          <p className="text-xs text-mute mt-0.5">
            Real-time health status, circuit breakers, and bounded fallback order.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-mute">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span> 5 Active
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500"></span> 1 Probing
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map((p) => (
          <div
            key={p.id}
            className={`rounded-lg border p-5 bg-elevated shadow-xs flex flex-col justify-between transition ${
              p.configured ? 'border-hairline' : 'border-dashed border-hairline opacity-75'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="font-mono text-xs text-mute font-medium">{p.type}</span>
                {getCircuitBadge(p.circuitState, p.configured)}
              </div>

              <h4 className="text-base font-semibold text-ink tracking-tight">{p.name}</h4>
              <p className="mt-1 text-xs text-body leading-relaxed">{p.statusMessage}</p>

              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-hairline pt-3 font-mono text-xs tabular-nums">
                <div>
                  <span className="text-[10px] uppercase text-mute block">Requests</span>
                  <span className="font-semibold text-ink">{p.totalRequests}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-mute block">Success</span>
                  <span className={`font-semibold ${p.successRate >= 98 ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {p.configured ? `${p.successRate}%` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-mute block">Latency</span>
                  <span className="font-semibold text-ink">
                    {p.configured ? `${p.avgLatencyMs}ms` : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-hairline flex items-center justify-between">
              <span className="text-[11px] font-mono text-mute">
                Checked: {p.lastChecked}
              </span>
              {p.configured ? (
                <button
                  type="button"
                  disabled={pingingId === p.id}
                  onClick={() => simulatePing(p.id)}
                  className="rounded-md border border-hairline bg-canvas px-2.5 py-1 font-mono text-xs text-ink hover:bg-hairline transition focus:outline-none focus-visible:ring-1 focus-visible:ring-ink disabled:opacity-50"
                >
                  {pingingId === p.id ? 'Pinging…' : 'Ping Test'}
                </button>
              ) : (
                <span className="text-[11px] font-mono text-mute">Add key to .env</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

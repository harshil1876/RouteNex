import React, { useState, useEffect } from 'react';
import RequestLog from './RequestLog';
import ProviderStatus from './ProviderStatus';
import Playground from './Playground';

type ActiveTab = 'overview' | 'playground' | 'requests' | 'providers' | 'routing';

interface LiveTelemetry {
  isConnected: boolean;
  totalRequests: number;
  successRate: number;
  avgLatencyMs: number;
  activeProviders: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export default function DashboardOverview() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [routingStrategy, setRoutingStrategy] = useState<'latency' | 'cost' | 'balanced'>('balanced');
  const [telemetry, setTelemetry] = useState<LiveTelemetry>({
    isConnected: false,
    totalRequests: 1247,
    successRate: 99.2,
    avgLatencyMs: 142,
    activeProviders: 3,
    totalTokens: 184500,
    estimatedCostUsd: 0.042,
  });

  // Attempt live polling against the local gateway
  useEffect(() => {
    let isMounted = true;

    async function checkGateway() {
      try {
        const [healthRes, usageRes] = await Promise.all([
          fetch('http://127.0.0.1:3001/health/live').catch(() => null),
          fetch('http://127.0.0.1:3001/v1/usage').catch(() => null),
        ]);

        if (healthRes && healthRes.ok) {
          const healthData = await healthRes.json().catch(() => ({}));
          const usageData = usageRes && usageRes.ok ? await usageRes.json().catch(() => ({})) : {};

          if (isMounted) {
            const total = usageData.total_requests ?? 0;
            const successRate = total > 0 ? (usageData.success_rate * 100) : 100;
            const latency = usageData.avg_latency_ms ?? 0;
            const configuredCount = healthData.providers?.configured?.length ?? 1;

            setTelemetry({
              isConnected: true,
              totalRequests: total,
              successRate: parseFloat(successRate.toFixed(1)),
              avgLatencyMs: latency,
              activeProviders: configuredCount,
              totalTokens: usageData.tokens?.total_tokens ?? 0,
              estimatedCostUsd: usageData.estimated_cost_usd ?? 0,
            });
          }
        } else if (isMounted) {
          setTelemetry((prev) => ({ ...prev, isConnected: false }));
        }
      } catch {
        if (isMounted) {
          setTelemetry((prev) => ({ ...prev, isConnected: false }));
        }
      }
    }

    checkGateway();
    const interval = setInterval(checkGateway, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner: Connection Indicator & Gateway Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border border-hairline bg-elevated p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="flex h-3 w-3 relative">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                telemetry.isConnected ? 'bg-emerald-400' : 'bg-neutral-300'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${
                telemetry.isConnected ? 'bg-emerald-500' : 'bg-neutral-400'
              }`}
            />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-ink">
                {telemetry.isConnected ? 'RouteNex Gateway Connected' : 'Gateway Offline (Preview Mode)'}
              </h2>
              <span
                className={`rounded px-2 py-0.5 font-mono text-[10px] font-medium ${
                  telemetry.isConnected
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-neutral-100 text-mute border border-hairline'
                }`}
              >
                {telemetry.isConnected ? 'LIVE TELEMETRY' : 'OFFLINE PREVIEW'}
              </span>
            </div>
            <p className="text-xs text-mute mt-0.5">
              Target: <span className="font-mono text-ink">http://localhost:3001/v1</span> • Active fallback chain: Groq → OpenAI → Gemini → Ollama
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-mute">Default Strategy:</span>
          <select
            value={routingStrategy}
            onChange={(e) => setRoutingStrategy(e.target.value as any)}
            className="rounded border border-hairline bg-canvas px-2.5 py-1 font-mono text-xs text-ink focus:border-ink focus:outline-none"
            aria-label="Select routing strategy"
          >
            <option value="balanced">balanced (cost/latency weighted)</option>
            <option value="latency">lowest-latency</option>
            <option value="cost">lowest-cost</option>
          </select>
        </div>
      </div>

      {/* Primary KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Requests */}
        <div className="rounded-lg border border-hairline bg-elevated p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-mute font-mono">
            <span>Total Requests</span>
            <span className="text-emerald-700 font-medium">
              {telemetry.isConnected ? 'Live' : '+14.2%'}
            </span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-ink font-mono tabular-nums">
            {telemetry.totalRequests.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-mute flex items-center gap-1">
            <span>{telemetry.isConnected ? 'Logged to local store' : 'Simulated 24h interval'}</span>
          </div>
        </div>

        {/* Success Rate */}
        <div className="rounded-lg border border-hairline bg-elevated p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-mute font-mono">
            <span>Success Rate</span>
            <span className="text-emerald-700 font-medium">Target 99.0%</span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-ink font-mono tabular-nums">
            {telemetry.successRate}%
          </div>
          <div className="mt-2 text-[11px] text-mute">
            <span>Circuit-breaker protected</span>
          </div>
        </div>

        {/* Avg Latency */}
        <div className="rounded-lg border border-hairline bg-elevated p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-mute font-mono">
            <span>Avg Latency</span>
            <span className="text-emerald-700 font-medium">Median</span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-ink font-mono tabular-nums">
            {telemetry.avgLatencyMs}<span className="text-base text-mute font-normal">ms</span>
          </div>
          <div className="mt-2 text-[11px] text-mute">
            <span>Upstream + Gateway overhead</span>
          </div>
        </div>

        {/* Active Providers */}
        <div className="rounded-lg border border-hairline bg-elevated p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-mute font-mono">
            <span>Configured Providers</span>
            <span className="text-emerald-700 font-medium">Ready</span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-ink font-mono tabular-nums">
            {telemetry.activeProviders} <span className="text-base text-mute font-normal">Active</span>
          </div>
          <div className="mt-2 text-[11px] text-mute truncate">
            <span>Mock, Groq, OpenAI, Gemini, Ollama</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-hairline">
        <nav className="flex space-x-6 text-sm font-medium" aria-label="Dashboard views">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`pb-3 font-mono text-xs transition border-b-2 cursor-pointer ${
              activeTab === 'overview'
                ? 'border-ink text-ink font-semibold'
                : 'border-transparent text-mute hover:text-ink'
            }`}
          >
            Overview & Telemetry
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('playground')}
            className={`pb-3 font-mono text-xs transition border-b-2 cursor-pointer ${
              activeTab === 'playground'
                ? 'border-ink text-ink font-semibold'
                : 'border-transparent text-mute hover:text-ink'
            }`}
          >
            ⚡ Live Playground
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`pb-3 font-mono text-xs transition border-b-2 cursor-pointer ${
              activeTab === 'requests'
                ? 'border-ink text-ink font-semibold'
                : 'border-transparent text-mute hover:text-ink'
            }`}
          >
            Request Logs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('providers')}
            className={`pb-3 font-mono text-xs transition border-b-2 cursor-pointer ${
              activeTab === 'providers'
                ? 'border-ink text-ink font-semibold'
                : 'border-transparent text-mute hover:text-ink'
            }`}
          >
            Provider Status & Circuits
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('routing')}
            className={`pb-3 font-mono text-xs transition border-b-2 cursor-pointer ${
              activeTab === 'routing'
                ? 'border-ink text-ink font-semibold'
                : 'border-transparent text-mute hover:text-ink'
            }`}
          >
            Routing Engine Config
          </button>
        </nav>
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Latency profile visualizer */}
          <div className="rounded-lg border border-hairline bg-elevated p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-ink">Hourly Latency Profile</h3>
                <p className="text-xs text-mute">Response times across active upstream endpoints</p>
              </div>
              <span className="font-mono text-xs text-mute">Past 12 hours</span>
            </div>

            <div className="grid grid-cols-12 gap-2 pt-4 items-end h-32 border-b border-hairline pb-2 font-mono text-[10px] text-mute text-center">
              {[
                { hour: '02h', height: 'h-12', ms: '110ms' },
                { hour: '03h', height: 'h-10', ms: '98ms' },
                { hour: '04h', height: 'h-8', ms: '76ms' },
                { hour: '05h', height: 'h-14', ms: '135ms' },
                { hour: '06h', height: 'h-16', ms: '160ms' },
                { hour: '07h', height: 'h-24', ms: '240ms' },
                { hour: '08h', height: 'h-20', ms: '190ms' },
                { hour: '09h', height: 'h-28', ms: '280ms' },
                { hour: '10h', height: 'h-18', ms: '175ms' },
                { hour: '11h', height: 'h-14', ms: '142ms' },
                { hour: '12h', height: 'h-12', ms: '120ms' },
                { hour: 'Now', height: 'h-10', ms: '98ms' },
              ].map((bar, i) => (
                <div key={i} className="flex flex-col items-center gap-1 group">
                  <span className="opacity-0 group-hover:opacity-100 transition text-[9px] text-ink">{bar.ms}</span>
                  <div className={`w-full max-w-[28px] rounded-t ${bar.height} bg-neutral-800 transition hover:bg-neutral-600`}></div>
                  <span>{bar.hour}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-mute font-mono">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-neutral-800"></span> Groq LPU (Fastest median: 85ms)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-neutral-500"></span> OpenAI GPT-4o-mini (Fallback: 310ms)
              </span>
            </div>
          </div>

          {/* Quick Request Table Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Recent Requests</h3>
              <button
                type="button"
                onClick={() => setActiveTab('requests')}
                className="text-xs font-mono text-blue-600 hover:underline cursor-pointer"
              >
                View all logs →
              </button>
            </div>
            <RequestLog />
          </div>
        </div>
      )}

      {activeTab === 'playground' && <Playground />}

      {activeTab === 'requests' && <RequestLog />}

      {activeTab === 'providers' && <ProviderStatus />}

      {activeTab === 'routing' && (
        <div className="rounded-lg border border-hairline bg-elevated p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-semibold text-ink">Deterministic Routing Policies</h3>
            <p className="text-xs text-mute mt-1">Configure threshold limits and fallback chaining.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
            <div className="rounded border border-hairline bg-canvas p-4 space-y-2">
              <div className="font-semibold text-ink">Circuit Breaker Settings</div>
              <div className="flex justify-between text-body">
                <span>Failure Threshold:</span>
                <span className="text-ink">3 consecutive 5xx/429</span>
              </div>
              <div className="flex justify-between text-body">
                <span>Cooldown Window:</span>
                <span className="text-ink">30 seconds</span>
              </div>
              <div className="flex justify-between text-body">
                <span>Half-Open Probe Count:</span>
                <span className="text-ink">2 canary requests</span>
              </div>
            </div>

            <div className="rounded border border-hairline bg-canvas p-4 space-y-2">
              <div className="font-semibold text-ink">Bounded Retries</div>
              <div className="flex justify-between text-body">
                <span>Max Attempts:</span>
                <span className="text-ink">3 upstream attempts</span>
              </div>
              <div className="flex justify-between text-body">
                <span>Backoff Jitter:</span>
                <span className="text-ink">Full jitter [0ms, 150ms]</span>
              </div>
              <div className="flex justify-between text-body">
                <span>Header Override:</span>
                <span className="text-emerald-700">x-routenex-policy enabled</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

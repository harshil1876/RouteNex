import React, { useState, useEffect } from 'react';
import RequestLog from './RequestLog';
import ProviderStatus from './ProviderStatus';
import Playground from './Playground';
import ProviderCredentials from './ProviderCredentials';
import VirtualKeys from './VirtualKeys';
import ModelAliases from './ModelAliases';
import DoctorPanel from './DoctorPanel';
import CloudEditionShowcase from './CloudEditionShowcase';

type EditionMode = 'oss' | 'cloud';
type ActiveTab = 'overview' | 'playground' | 'requests' | 'providers' | 'keys' | 'aliases' | 'doctor';

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
  const [edition, setEdition] = useState<EditionMode>('oss');
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
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
            const successRate = total > 0 ? usageData.success_rate * 100 : 100;
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
      {/* Product Edition Switcher Pill Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-hairline bg-elevated p-3 shadow-xs">
        <div className="flex items-center gap-1.5 rounded-lg border border-hairline bg-canvas p-1 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setEdition('oss')}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium transition ${
              edition === 'oss'
                ? 'bg-elevated text-ink shadow-xs font-semibold'
                : 'text-mute hover:text-ink'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            RouteNex Open Source (Self-Hosted)
          </button>

          <button
            type="button"
            onClick={() => setEdition('cloud')}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium transition ${
              edition === 'cloud'
                ? 'bg-elevated text-ink shadow-xs font-semibold'
                : 'text-mute hover:text-ink'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-sky-500"></span>
            RouteNex Cloud (Managed Edge)
          </button>
        </div>

        {/* Edition Context Info */}
        <div className="flex items-center gap-2 text-xs font-mono text-mute">
          {edition === 'oss' ? (
            <span className="inline-flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${telemetry.isConnected ? 'bg-emerald-500' : 'bg-neutral-400'}`}></span>
              {telemetry.isConnected ? 'Connected to 127.0.0.1:3001' : 'Local Gateway Offline'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
              <span>☁️</span>
              Hosted Multi-Region Service
            </span>
          )}
        </div>
      </div>

      {/* If Cloud Edition selected, show dedicated Cloud showcase */}
      {edition === 'cloud' ? (
        <CloudEditionShowcase />
      ) : (
        /* Open Source Self-Hosted Admin Console */
        <div className="space-y-6">
          {/* Sub-Navigation Tabs */}
          <div className="border-b border-hairline">
            <nav className="flex space-x-6 overflow-x-auto text-xs font-medium" aria-label="Open Source Admin Tabs">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'playground', label: 'Playground' },
                { id: 'requests', label: 'Requests Log' },
                { id: 'providers', label: 'BYOK Credentials' },
                { id: 'keys', label: 'Virtual Keys' },
                { id: 'aliases', label: 'Model Aliases' },
                { id: 'doctor', label: 'Doctor Diagnostics' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={`pb-3 font-mono whitespace-nowrap transition border-b-2 ${
                    activeTab === tab.id
                      ? 'border-ink text-ink font-semibold'
                      : 'border-transparent text-mute hover:text-ink'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Telemetry Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-lg border border-hairline bg-elevated p-5 shadow-xs">
                  <span className="text-xs font-mono text-mute">Total Requests</span>
                  <div className="mt-2 text-2xl font-semibold text-ink tracking-tight">
                    {telemetry.totalRequests.toLocaleString()}
                  </div>
                  <span className="mt-1 block text-[11px] font-mono text-mute">All-time locally logged</span>
                </div>

                <div className="rounded-lg border border-hairline bg-elevated p-5 shadow-xs">
                  <span className="text-xs font-mono text-mute">Success Rate</span>
                  <div className="mt-2 text-2xl font-semibold text-ink tracking-tight">
                    {telemetry.successRate}%
                  </div>
                  <span className="mt-1 block text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                    High resilience
                  </span>
                </div>

                <div className="rounded-lg border border-hairline bg-elevated p-5 shadow-xs">
                  <span className="text-xs font-mono text-mute">Average Latency</span>
                  <div className="mt-2 text-2xl font-semibold text-ink tracking-tight">
                    {telemetry.avgLatencyMs} <span className="text-sm font-normal text-mute">ms</span>
                  </div>
                  <span className="mt-1 block text-[11px] font-mono text-mute">Sub-millisecond routing</span>
                </div>

                <div className="rounded-lg border border-hairline bg-elevated p-5 shadow-xs">
                  <span className="text-xs font-mono text-mute">Estimated Spend</span>
                  <div className="mt-2 text-2xl font-semibold text-ink tracking-tight">
                    ${telemetry.estimatedCostUsd.toFixed(4)}
                  </div>
                  <span className="mt-1 block text-[11px] font-mono text-mute">
                    {telemetry.totalTokens.toLocaleString()} tokens
                  </span>
                </div>
              </div>

              {/* Providers Status Summary */}
              <ProviderStatus />

              {/* Recent Requests Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-ink">Recent Requests</h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('requests')}
                    className="text-xs font-mono text-body hover:text-ink underline"
                  >
                    View All & Inspect →
                  </button>
                </div>
                <RequestLog />
              </div>
            </div>
          )}

          {/* Tab 2: Playground */}
          {activeTab === 'playground' && <Playground />}

          {/* Tab 3: Requests Log & Inspector */}
          {activeTab === 'requests' && <RequestLog />}

          {/* Tab 4: BYOK Provider Credentials */}
          {activeTab === 'providers' && <ProviderCredentials />}

          {/* Tab 5: Local Virtual Keys */}
          {activeTab === 'keys' && <VirtualKeys />}

          {/* Tab 6: Model Aliases & Routing Policy */}
          {activeTab === 'aliases' && <ModelAliases />}

          {/* Tab 7: Doctor Diagnostics */}
          {activeTab === 'doctor' && <DoctorPanel />}
        </div>
      )}
    </div>
  );
}

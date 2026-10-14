import React, { useState, useEffect } from 'react';
import Sidebar, { type ActiveTab, type EditionMode } from './Sidebar';
import RequestLog from './RequestLog';
import ProviderStatus from './ProviderStatus';
import Playground from './Playground';
import ProviderCredentials from './ProviderCredentials';
import VirtualKeys from './VirtualKeys';
import ModelAliases from './ModelAliases';
import DoctorPanel from './DoctorPanel';
import CloudEditionShowcase from './CloudEditionShowcase';
import Combos from './Combos';
import AgentSetupHub from './AgentSetupHub';
import FreeTierGauges from './FreeTierGauges';

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
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('routenex_sidebar_collapsed') === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsDark(document.documentElement.classList.contains('dark'));
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const [telemetry, setTelemetry] = useState<LiveTelemetry>({
    isConnected: false,
    totalRequests: 1247,
    successRate: 99.2,
    avgLatencyMs: 142,
    activeProviders: 3,
    totalTokens: 184500,
    estimatedCostUsd: 0.042,
  });

  // Persist sidebar collapsed state
  const handleSetCollapsed = (val: boolean) => {
    setCollapsed(val);
    try {
      localStorage.setItem('routenex_sidebar_collapsed', String(val));
    } catch {}
  };

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

  const getPageTitle = () => {
    if (edition === 'cloud') return 'RouteNex Cloud (Managed SaaS)';
    switch (activeTab) {
      case 'overview': return 'Gateway Overview & Telemetry';
      case 'playground': return 'Prompt Playground & Live Tester';
      case 'free-tiers': return 'Free Tier Pools & Quota Budget';
      case 'providers': return 'BYOK Provider Credentials';
      case 'combos': return 'Provider Combos & Model Clusters';
      case 'aliases': return 'Model Aliases & Policy Routing';
      case 'agents': return 'Coding Agent Setup Hub';
      case 'keys': return 'Virtual Access Keys';
      case 'requests': return 'Real-Time Request Inspector';
      case 'doctor': return 'Doctor System Diagnostics';
      default: return 'RouteNex Console';
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col md:flex-row font-sans">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        edition={edition}
        setEdition={setEdition}
        collapsed={collapsed}
        setCollapsed={handleSetCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        isGatewayConnected={telemetry.isConnected}
      />

      {/* 2. Main Application Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top App Bar */}
        <header className="h-14 border-b border-hairline bg-elevated/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="md:hidden flex h-8 w-8 items-center justify-center rounded-md border border-hairline text-body hover:text-ink"
              aria-label="Open sidebar"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>

            {/* Breadcrumb / Title */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-mute hidden sm:inline">
                {edition === 'oss' ? 'RouteNex OSS' : 'Cloud'} /
              </span>
              <h1 className="text-sm font-semibold text-ink tracking-tight truncate">
                {getPageTitle()}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Online Status Pill */}
            {edition === 'oss' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-canvas px-2.5 py-0.5 text-[11px] font-mono">
                <span className={`h-1.5 w-1.5 rounded-full ${telemetry.isConnected ? 'bg-emerald-500' : 'bg-neutral-400'}`}></span>
                <span className="text-mute hidden sm:inline">{telemetry.isConnected ? '127.0.0.1:3001' : 'Daemon Offline'}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/60 px-2.5 py-0.5 text-[11px] font-mono text-sky-700 dark:text-sky-300">
                <span>☁️</span>
                <span>Hosted Edge</span>
              </span>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-hairline bg-canvas text-body hover:text-ink hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              aria-label="Toggle theme"
              title={isDark ? "Switch to light theme" : "Switch to dark theme"}
            >
              {isDark ? (
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4"></circle>
                  <path d="M12 2v2"></path>
                  <path d="M12 20v2"></path>
                  <path d="m4.93 4.93 1.41 1.41"></path>
                  <path d="m17.66 17.66 1.41 1.41"></path>
                  <path d="M2 12h2"></path>
                  <path d="M20 12h2"></path>
                  <path d="m6.34 17.66-1.41 1.41"></path>
                  <path d="m19.07 4.93-1.41 1.41"></path>
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
                </svg>
              )}
            </button>

            <a
              href="/docs"
              className="text-xs font-mono text-mute hover:text-ink transition hidden sm:inline"
            >
              Docs ↗
            </a>

            <a
              href="https://github.com/harshil1876/RouteNex"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-hairline bg-canvas px-2.5 py-1 text-xs font-mono text-ink hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            >
              <span>GitHub</span>
            </a>
          </div>
        </header>

        {/* View Content Canvas */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Cloud Edition View */}
          {edition === 'cloud' && <CloudEditionShowcase />}

          {/* Open Source Edition Views */}
          {edition === 'oss' && (
            <>
              {/* Tab: Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Telemetry Stat Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="rounded-xl border border-hairline bg-elevated p-5 shadow-xs">
                      <span className="text-xs font-mono text-mute">Total Requests</span>
                      <div className="mt-2 text-2xl font-semibold text-ink tracking-tight font-sans">
                        {telemetry.totalRequests.toLocaleString()}
                      </div>
                      <span className="mt-1 block text-[11px] font-mono text-mute">All-time locally logged</span>
                    </div>

                    <div className="rounded-xl border border-hairline bg-elevated p-5 shadow-xs">
                      <span className="text-xs font-mono text-mute">Success Rate</span>
                      <div className="mt-2 text-2xl font-semibold text-ink tracking-tight font-sans">
                        {telemetry.successRate}%
                      </div>
                      <span className="mt-1 block text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                        High resilience
                      </span>
                    </div>

                    <div className="rounded-xl border border-hairline bg-elevated p-5 shadow-xs">
                      <span className="text-xs font-mono text-mute">Average Latency</span>
                      <div className="mt-2 text-2xl font-semibold text-ink tracking-tight font-sans">
                        {telemetry.avgLatencyMs} <span className="text-sm font-normal text-mute">ms</span>
                      </div>
                      <span className="mt-1 block text-[11px] font-mono text-mute">Sub-millisecond routing</span>
                    </div>

                    <div className="rounded-xl border border-hairline bg-elevated p-5 shadow-xs">
                      <span className="text-xs font-mono text-mute">Estimated Spend</span>
                      <div className="mt-2 text-2xl font-semibold text-ink tracking-tight font-sans">
                        ${telemetry.estimatedCostUsd.toFixed(4)}
                      </div>
                      <span className="mt-1 block text-[11px] font-mono text-mute">
                        {telemetry.totalTokens.toLocaleString()} tokens
                      </span>
                    </div>
                  </div>

                  {/* Free Tier Quick Highlight */}
                  <div className="rounded-xl border border-hairline bg-elevated p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🎁</span>
                        <h4 className="text-sm font-semibold text-ink">1.62B Free Tokens / Month Pool</h4>
                      </div>
                      <p className="mt-1 text-xs text-mute">
                        Aggregating Mistral 1B, Cerebras 30M, Groq 30M, and Pollinations unlimited anonymous tokens.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('free-tiers')}
                      className="rounded-full bg-ink text-white px-4 py-2 text-xs font-medium hover:opacity-90 transition whitespace-nowrap shrink-0"
                    >
                      View Free Pools →
                    </button>
                  </div>

                  {/* Provider Health Overview */}
                  <ProviderStatus />

                  {/* Recent Requests Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-ink">Recent Requests</h3>
                      <button
                        type="button"
                        onClick={() => setActiveTab('requests')}
                        className="text-xs font-mono text-body hover:text-ink underline"
                      >
                        Open Request Inspector →
                      </button>
                    </div>
                    <RequestLog />
                  </div>
                </div>
              )}

              {/* Tab: Playground */}
              {activeTab === 'playground' && <Playground />}

              {/* Tab: Free Tier Pools */}
              {activeTab === 'free-tiers' && <FreeTierGauges />}

              {/* Tab: Providers */}
              {activeTab === 'providers' && <ProviderCredentials />}

              {/* Tab: Combos */}
              {activeTab === 'combos' && <Combos />}

              {/* Tab: Aliases */}
              {activeTab === 'aliases' && <ModelAliases />}

              {/* Tab: Agent Setup Hub */}
              {activeTab === 'agents' && <AgentSetupHub />}

              {/* Tab: Virtual Keys */}
              {activeTab === 'keys' && <VirtualKeys />}

              {/* Tab: Request Inspector */}
              {activeTab === 'requests' && <RequestLog />}

              {/* Tab: Doctor */}
              {activeTab === 'doctor' && <DoctorPanel />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

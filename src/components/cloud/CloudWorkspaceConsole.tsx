import React, { useState } from 'react';
import ProviderBrandIcon from '../dashboard/ProviderBrandIcon';

type WorkspaceTab =
  | 'overview'
  | 'activity'
  | 'logs'
  | 'keys'
  | 'files'
  | 'guardrails'
  | 'byok'
  | 'routing'
  | 'presets'
  | 'tools'
  | 'observability'
  | 'classifiers'
  | 'settings';

export default function CloudWorkspaceConsole() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [activeWorkspace, setActiveWorkspace] = useState('Default Workspace');
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  // Clean empty state for new users (Screenshot 612)
  const thisWeekSpend = 0.00;
  const thisWeekRequests = 0;
  const thisWeekTokens = 0;

  const navItems: { id: WorkspaceTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '▦' },
    { id: 'activity', label: 'Activity', icon: '📈' },
    { id: 'logs', label: 'Logs', icon: '📋' },
    { id: 'keys', label: 'API Keys', icon: '🔑' },
    { id: 'files', label: 'Files', icon: '📁' },
    { id: 'guardrails', label: 'Guardrails', icon: '🛡️' },
    { id: 'byok', label: 'BYOK', icon: '🔐' },
    { id: 'routing', label: 'Routing', icon: '⚡' },
    { id: 'presets', label: 'Presets', icon: '🎛️' },
    { id: 'tools', label: 'Tools', icon: '🛠️' },
    { id: 'observability', label: 'Observability', icon: '👁️' },
    { id: 'classifiers', label: 'Classifiers', icon: '🏷️' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 font-sans flex flex-col">
      {/* Top Cloud Platform Navigation Bar (Screenshot 612) */}
      <header className="h-14 border-b border-[#222226] bg-[#09090b]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-zinc-100 text-zinc-950 flex items-center justify-center font-bold text-xs">
              RN
            </div>
            <span className="font-bold text-sm text-zinc-100 tracking-tight">RouteNex Cloud</span>
          </a>

          {/* Org & Workspace Switcher (Screenshot 612) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#111113] hover:bg-zinc-800 border border-[#222226] text-xs font-mono text-zinc-200 transition"
            >
              <span className="text-zinc-500">Personal /</span>
              <span className="font-semibold">{activeWorkspace}</span>
              <span className="text-[10px] text-zinc-500">▾</span>
            </button>

            {workspaceMenuOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-56 rounded-xl bg-[#111113] border border-[#222226] p-1.5 shadow-2xl z-50 text-xs font-mono">
                <div className="px-2 py-1 text-[10px] text-zinc-500 uppercase">Workspaces</div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveWorkspace('Default Workspace');
                    setWorkspaceMenuOpen(false);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-zinc-800 text-zinc-200 flex items-center justify-between"
                >
                  <span>Default Workspace</span>
                  {activeWorkspace === 'Default Workspace' && <span className="text-emerald-400">✓</span>}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveWorkspace('Production Edge');
                    setWorkspaceMenuOpen(false);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-zinc-800 text-zinc-200 flex items-center justify-between"
                >
                  <span>Production Edge</span>
                  {activeWorkspace === 'Production Edge' && <span className="text-emerald-400">✓</span>}
                </button>
                <div className="pt-1 mt-1 border-t border-[#222226]">
                  <button
                    type="button"
                    onClick={() => {
                      alert('Create Workspace modal');
                      setWorkspaceMenuOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white"
                  >
                    + Create Workspace
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center / Right Links */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <nav className="hidden md:flex items-center gap-4 text-zinc-400">
            <a href="/models" className="hover:text-zinc-100 transition">Models</a>
            <a href="/rankings" className="hover:text-zinc-100 transition">Rankings</a>
            <a href="/pricing" className="hover:text-zinc-100 transition">Pricing</a>
            <a href="/docs" className="hover:text-zinc-100 transition">Docs</a>
          </nav>

          {/* User Avatar Menu Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
              className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-zinc-200 font-bold hover:border-zinc-500 transition"
            >
              H
            </button>

            {avatarMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-[#111113] border border-[#222226] p-1.5 shadow-2xl z-50 text-xs font-mono">
                <div className="px-2.5 py-1.5 border-b border-[#222226] mb-1">
                  <span className="font-semibold text-zinc-100 block">Harshil Patel</span>
                  <span className="text-[10px] text-zinc-500">Credits: $0.00</span>
                </div>
                <a href="/settings/profile" className="block px-2.5 py-1.5 rounded hover:bg-zinc-800 text-zinc-300">
                  Profile
                </a>
                <a href="/settings/preferences" className="block px-2.5 py-1.5 rounded hover:bg-zinc-800 text-zinc-300">
                  Preferences
                </a>
                <a href="/settings/credits" className="block px-2.5 py-1.5 rounded hover:bg-zinc-800 text-zinc-300">
                  Credits & Billing
                </a>
                <a href="/settings/byok" className="block px-2.5 py-1.5 rounded hover:bg-zinc-800 text-zinc-300">
                  BYOK Keys
                </a>
                <a href="/settings/guardrails" className="block px-2.5 py-1.5 rounded hover:bg-zinc-800 text-zinc-300">
                  Guardrails
                </a>
                <div className="pt-1 mt-1 border-t border-[#222226]">
                  <a href="/login" className="block px-2.5 py-1.5 rounded hover:bg-zinc-800 text-red-400">
                    Sign Out
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex min-w-0">
        {/* Left Workspace Sidebar (Screenshot 612) */}
        <aside className="w-56 shrink-0 border-r border-[#222226] bg-[#09090b] p-3 space-y-1 font-mono text-xs">
          <div className="px-2 py-1.5 text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
            Workspace Nav
          </div>

          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition ${
                  isActive
                    ? 'bg-zinc-800 text-zinc-100 font-semibold border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Right Workspace Main View */}
        <main className="flex-1 p-6 max-w-6xl space-y-8 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* This Week's Usage Zero State (Screenshot 612) */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-zinc-100 font-sans tracking-tight">
                  This Week's Usage
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Spend Card */}
                  <div className="p-5 rounded-xl bg-[#111113] border border-[#222226] space-y-2">
                    <span className="text-xs text-zinc-500 font-mono block">Spend</span>
                    <div className="text-2xl font-bold text-zinc-100 font-mono">
                      ${thisWeekSpend.toFixed(2)}
                    </div>
                    <span className="text-[11px] text-zinc-500 font-sans block">
                      No spend this week
                    </span>
                  </div>

                  {/* Requests Card */}
                  <div className="p-5 rounded-xl bg-[#111113] border border-[#222226] space-y-2">
                    <span className="text-xs text-zinc-500 font-mono block">Requests</span>
                    <div className="text-2xl font-bold text-zinc-100 font-mono">
                      {thisWeekRequests}
                    </div>
                    <span className="text-[11px] text-zinc-500 font-sans block">
                      No requests this week
                    </span>
                  </div>

                  {/* Tokens Card */}
                  <div className="p-5 rounded-xl bg-[#111113] border border-[#222226] space-y-2">
                    <span className="text-xs text-zinc-500 font-mono block">Tokens</span>
                    <div className="text-2xl font-bold text-zinc-100 font-mono">
                      {thisWeekTokens}
                    </div>
                    <span className="text-[11px] text-zinc-500 font-sans block">
                      No tokens this week
                    </span>
                  </div>
                </div>
              </div>

              {/* 8 Interactive Configuration Cards (Screenshot 612) */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-zinc-100 font-sans tracking-tight">
                  Workspace Governance & Tools
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div
                    onClick={() => setActiveTab('keys')}
                    className="p-5 rounded-xl bg-[#111113] hover:bg-[#141417] border border-[#222226] hover:border-zinc-700 cursor-pointer transition space-y-2 group"
                  >
                    <div className="text-lg">🔑</div>
                    <h3 className="text-xs font-bold text-zinc-100 group-hover:text-white font-sans">
                      API Keys
                    </h3>
                    <p className="text-[11px] text-zinc-500 leading-snug">
                      Create scoped keys with rate limits and monthly spend quotas.
                    </p>
                  </div>

                  <div
                    onClick={() => setActiveTab('guardrails')}
                    className="p-5 rounded-xl bg-[#111113] hover:bg-[#141417] border border-[#222226] hover:border-zinc-700 cursor-pointer transition space-y-2 group"
                  >
                    <div className="text-lg">🛡️</div>
                    <h3 className="text-xs font-bold text-zinc-100 group-hover:text-white font-sans">
                      Guardrails
                    </h3>
                    <p className="text-[11px] text-zinc-500 leading-snug">
                      PII masking, toxic input prevention, and Zero Data Retention policies.
                    </p>
                  </div>

                  <div
                    onClick={() => setActiveTab('byok')}
                    className="p-5 rounded-xl bg-[#111113] hover:bg-[#141417] border border-[#222226] hover:border-zinc-700 cursor-pointer transition space-y-2 group"
                  >
                    <div className="text-lg">🔐</div>
                    <h3 className="text-xs font-bold text-zinc-100 group-hover:text-white font-sans">
                      BYOK Vault
                    </h3>
                    <p className="text-[11px] text-zinc-500 leading-snug">
                      Store your own upstream OpenAI, Anthropic, or Cerebras keys.
                    </p>
                  </div>

                  <div
                    onClick={() => setActiveTab('routing')}
                    className="p-5 rounded-xl bg-[#111113] hover:bg-[#141417] border border-[#222226] hover:border-zinc-700 cursor-pointer transition space-y-2 group"
                  >
                    <div className="text-lg">⚡</div>
                    <h3 className="text-xs font-bold text-zinc-100 group-hover:text-white font-sans">
                      Routing
                    </h3>
                    <p className="text-[11px] text-zinc-500 leading-snug">
                      Configure default strategies, fallback chains, and failover limits.
                    </p>
                  </div>

                  <div
                    onClick={() => setActiveTab('presets')}
                    className="p-5 rounded-xl bg-[#111113] hover:bg-[#141417] border border-[#222226] hover:border-zinc-700 cursor-pointer transition space-y-2 group"
                  >
                    <div className="text-lg">🎛️</div>
                    <h3 className="text-xs font-bold text-zinc-100 group-hover:text-white font-sans">
                      Presets
                    </h3>
                    <p className="text-[11px] text-zinc-500 leading-snug">
                      Token compression presets (Caveman, comment removal, whitespace trim).
                    </p>
                  </div>

                  <div
                    onClick={() => setActiveTab('tools')}
                    className="p-5 rounded-xl bg-[#111113] hover:bg-[#141417] border border-[#222226] hover:border-zinc-700 cursor-pointer transition space-y-2 group"
                  >
                    <div className="text-lg">🛠️</div>
                    <h3 className="text-xs font-bold text-zinc-100 group-hover:text-white font-sans">
                      Tools
                    </h3>
                    <p className="text-[11px] text-zinc-500 leading-snug">
                      Managed web search and page fetch proxies for coding agents.
                    </p>
                  </div>

                  <div
                    onClick={() => setActiveTab('observability')}
                    className="p-5 rounded-xl bg-[#111113] hover:bg-[#141417] border border-[#222226] hover:border-zinc-700 cursor-pointer transition space-y-2 group"
                  >
                    <div className="text-lg">👁️</div>
                    <h3 className="text-xs font-bold text-zinc-100 group-hover:text-white font-sans">
                      Observability
                    </h3>
                    <p className="text-[11px] text-zinc-500 leading-snug">
                      30-day request traces, Prometheus metrics, and alert webhooks.
                    </p>
                  </div>

                  <div
                    onClick={() => setActiveTab('settings')}
                    className="p-5 rounded-xl bg-[#111113] hover:bg-[#141417] border border-[#222226] hover:border-zinc-700 cursor-pointer transition space-y-2 group"
                  >
                    <div className="text-lg">⚙️</div>
                    <h3 className="text-xs font-bold text-zinc-100 group-hover:text-white font-sans">
                      Settings
                    </h3>
                    <p className="text-[11px] text-zinc-500 leading-snug">
                      Workspace name, member invitations, and monthly spending caps.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab !== 'overview' && (
            <div className="p-8 rounded-xl bg-[#111113] border border-[#222226] text-center space-y-3 font-mono">
              <span className="text-2xl block">⚙️</span>
              <h3 className="text-sm font-semibold text-zinc-100 font-sans capitalize">{activeTab} Section</h3>
              <p className="text-xs text-zinc-500 font-sans max-w-sm mx-auto">
                Configured and managed via RouteNex Cloud multi-tenant engine and Supabase Postgres RLS.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-white text-xs"
              >
                ← Back to Workspace Overview
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

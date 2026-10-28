import React, { useState, useEffect } from 'react';
import StudioNavRail, { type StudioNavItemId } from './StudioNavRail';
import NexFlowCanvas from './NexFlowCanvas';
import LexiPackStudio from './LexiPackStudio';
import RequestLog from '../dashboard/RequestLog';
import ProviderCredentials from '../dashboard/ProviderCredentials';
import VirtualKeys from '../dashboard/VirtualKeys';
import ModelAliases from '../dashboard/ModelAliases';
import DoctorPanel from '../dashboard/DoctorPanel';
import Combos from '../dashboard/Combos';
import AgentSetupHub from '../dashboard/AgentSetupHub';
import NexWorkersHub from './NexWorkersHub';
import FreeTierGauges from '../dashboard/FreeTierGauges';
import CompressionStudio from '../dashboard/CompressionStudio';
import Playground from '../dashboard/Playground';
import RadialTopology from '../dashboard/RadialTopology';
import EndpointsPanel from '../dashboard/EndpointsPanel';
import QuotaTracker from '../dashboard/QuotaTracker';
import UsageAnalytics from '../dashboard/UsageAnalytics';
import CostExplorer from '../dashboard/CostExplorer';
import MemoryPanel from '../dashboard/MemoryPanel';
import StorageSettings from '../dashboard/StorageSettings';
import ModelCatalogExplorer from '../models/ModelCatalogExplorer';
import RouteNexLogo from '../common/RouteNexLogo';
import { RouteNexClient } from '../../utils/gateway-client';

interface RouteNexStudioProps {
  mode?: 'oss' | 'cloud';
}

const TAB_TITLES: Record<StudioNavItemId, string> = {
  overview: 'Overview',
  providers: 'Providers & Models',
  routing: 'Routing & Combos',
  optimizer: 'Token Optimizer',
  logs: 'Logs & Activity',
  costs: 'Cost & Quotas',
  agents: 'NexWorkers & Agents',
  keys: 'Virtual API Keys',
  settings: 'Guardrails & Settings',
};

export default function RouteNexStudio({ mode = 'oss' }: RouteNexStudioProps) {
  // Navigation State
  const [activeItem, setActiveItem] = useState<StudioNavItemId>('overview');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Sub-tab selection state for multi-view tabs
  const [providersSubView, setProvidersSubView] = useState<'providers' | 'models' | 'playground'>('providers');
  const [routingSubView, setRoutingSubView] = useState<'combos' | 'policies' | 'simulator' | 'circuits'>('combos');
  const [optimizerSubView, setOptimizerSubView] = useState<'lexipack' | 'studio' | 'memory'>('lexipack');
  const [agentsSubView, setAgentsSubView] = useState<'workers' | 'connectors'>('workers');

  // Gateway Connection Status
  const [isGatewayConnected, setIsGatewayConnected] = useState(true);

  // OSS Password Lock Gate (Only enforced in OSS mode)
  const [isUnlocked, setIsUnlocked] = useState(mode === 'cloud');
  const [passwordInput, setPasswordInput] = useState('routenex-admin');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  // Cloud Mode Account States
  const [activeWorkspace, setActiveWorkspace] = useState('Default Workspace');
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  // Command Palette Search (Ctrl+K)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');

  // Live Recent Requests Feed (Starts empty on fresh state)
  const [recentRequests, setRecentRequests] = useState<any[]>([]);

  // Route Simulator State
  const [simModel, setSimModel] = useState('auto:nitro');
  const [simPrompt, setSimPrompt] = useState('Analyze system latency bottlenecks under 10k concurrent streams.');
  const [simResult, setSimResult] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);

  // Check auth session & gateway connectivity
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const client = RouteNexClient.getInstance();

      client.isGatewayOnline().then((online) => setIsGatewayConnected(online));

      if (mode === 'oss') {
        const isSessionUnlocked = sessionStorage.getItem('routenex_unlocked') === 'true';
        setIsUnlocked(isSessionUnlocked);
      } else {
        setIsUnlocked(true);
      }

      // Check URL query parameters
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as StudioNavItemId | null;
      if (tabParam) setActiveItem(tabParam);

      if (params.get('auto_token')) {
        params.delete('auto_token');
        const newQuery = params.toString() ? `?${params.toString()}` : '';
        window.history.replaceState({}, '', `${window.location.pathname}${newQuery}`);
      }

      // Global keyboard shortcut Ctrl+K / Cmd+K
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          setCommandPaletteOpen((prev) => !prev);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [mode]);

  // Sync tab with URL query parameter & browser document title
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const title = TAB_TITLES[activeItem] || 'Studio';
      document.title = `${title} — RouteNex Studio`;

      const url = new URL(window.location.href);
      if (activeItem === 'overview') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', activeItem);
      }
      if (window.location.search !== url.search) {
        window.history.pushState({ tab: activeItem }, '', url.toString());
      }
    }
  }, [activeItem]);

  // Handle browser Back / Forward buttons
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as StudioNavItemId | null;
      if (tabParam && TAB_TITLES[tabParam]) {
        setActiveItem(tabParam);
      } else {
        setActiveItem('overview');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const token = passwordInput.trim();
    if (!token) return;

    try {
      const res = await fetch('http://127.0.0.1:3001/v1/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        const sessionToken = data.token || token;
        sessionStorage.setItem('routenex_unlocked', 'true');
        localStorage.setItem('routenex_admin_token', sessionToken);
        document.cookie = `routenex_admin_session=${encodeURIComponent(sessionToken)}; path=/; SameSite=Lax`;
        setIsUnlocked(true);
        return;
      }

      if (token === 'routenex-admin' || token.startsWith('rn_local_') || token === 'rn-local-dev-default') {
        sessionStorage.setItem('routenex_unlocked', 'true');
        localStorage.setItem('routenex_admin_token', token);
        document.cookie = `routenex_admin_session=${encodeURIComponent(token)}; path=/; SameSite=Lax`;
        setIsUnlocked(true);
        return;
      }

      setAuthError('Invalid admin password. Default password is routenex-admin.');
    } catch {
      setAuthError('Failed to connect to gateway auth service.');
    }
  };

  const handleLock = async () => {
    try {
      await fetch('http://127.0.0.1:3001/v1/admin/auth/session', { method: 'DELETE' }).catch(() => null);
    } catch {}
    sessionStorage.removeItem('routenex_unlocked');
    localStorage.removeItem('routenex_admin_token');
    document.cookie = 'routenex_admin_session=; path=/; Max-Age=0';
    setPasswordInput('routenex-admin');
    setIsUnlocked(false);
  };

  const handleRunSimulator = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimLoading(true);
    const client = RouteNexClient.getInstance();
    const result = await client.explainRoute(simModel, simPrompt);
    setSimResult(result);
    setSimLoading(false);
  };

  const commands = [
    { label: 'Overview — Live Routing Pipeline', action: () => setActiveItem('overview') },
    { label: 'Providers & Models Hub', action: () => setActiveItem('providers') },
    { label: 'Routing & Combos', action: () => setActiveItem('routing') },
    { label: 'Token Optimizer & LexiPack', action: () => setActiveItem('optimizer') },
    { label: 'Logs & Request Stream', action: () => setActiveItem('logs') },
    { label: 'Cost & Quotas Ledger', action: () => setActiveItem('costs') },
    { label: 'NexWorkers & Coding Agents', action: () => setActiveItem('agents') },
    { label: 'Virtual API Keys', action: () => setActiveItem('keys') },
    { label: 'Guardrails & Settings', action: () => setActiveItem('settings') },
    { label: 'Documentation (/docs)', action: () => (window.location.href = '/docs') },
  ];

  const filteredCommands = commands.filter((c) =>
    c.label.toLowerCase().includes(commandSearch.toLowerCase())
  );

  // If OSS mode is locked, render the Local Password Gate
  if (mode === 'oss' && !isUnlocked) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-200 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md p-8 rounded-2xl bg-[#111113] border border-[#222226] shadow-xl space-y-6">
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <RouteNexLogo className="w-12 h-12" size={48} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-zinc-50 tracking-tight font-sans">
                RouteNex Studio
              </h1>
              <p className="text-sm text-zinc-400 mt-1 font-sans">
                Local gateway authentication. Enter your admin password to access the console.
              </p>
            </div>
          </div>

          {/* Default Password Callout Badge */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#09090b] border border-[#222226] text-xs">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-zinc-400 font-sans">Default Admin Password</span>
              <div className="text-sm font-mono font-semibold text-sky-400">routenex-admin</div>
            </div>
            <button
              type="button"
              onClick={() => setPasswordInput('routenex-admin')}
              className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 !text-zinc-950 font-semibold text-xs transition cursor-pointer shadow-xs font-sans"
            >
              Auto-Fill
            </button>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="text-zinc-300 font-medium font-sans">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-zinc-400 hover:text-white text-xs font-sans"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="routenex-admin"
                className="w-full bg-[#09090b] border border-[#222226] rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            {authError && (
              <div className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 p-2.5 rounded-lg font-sans">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 !text-zinc-950 font-semibold text-xs transition cursor-pointer shadow-sm font-sans"
            >
              Unlock RouteNex Studio →
            </button>
          </form>

          <div className="pt-2 border-t border-[#222226] text-center text-xs text-zinc-500 font-sans">
            Offline Standalone Mode • Zero Cloud Dependency
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 flex flex-col md:flex-row font-sans selection:bg-sky-500/20 selection:text-white">
      {/* 1. Left Navigation Rail (OpenRouter 36px Single-Line Style) */}
      <StudioNavRail
        activeItem={activeItem}
        setActiveItem={setActiveItem}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        mode={mode}
        isGatewayConnected={isGatewayConnected}
      />

      {/* 2. Main Studio Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-[#222226] bg-[#09090b]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="md:hidden text-zinc-400 hover:text-white p-1"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            </button>

            {/* Breadcrumb / Title */}
            <div className="flex items-center gap-2 text-sm font-sans">
              <span className="font-semibold text-zinc-100 tracking-tight">
                {TAB_TITLES[activeItem] || activeItem}
              </span>
              <span className="text-zinc-600 hidden sm:inline">•</span>
              <span className="text-xs text-zinc-400 hidden sm:inline">
                {mode === 'cloud' ? 'Cloud Multi-Tenant Workspace' : 'Local Daemon (127.0.0.1:3001)'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Cloud Workspace Switcher */}
            {mode === 'cloud' && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111113] hover:bg-zinc-800 border border-[#222226] text-xs font-sans text-zinc-200 transition"
                >
                  <span className="text-zinc-500">Personal /</span>
                  <span className="font-medium text-sky-400">{activeWorkspace}</span>
                  <svg className="w-3 h-3 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {workspaceMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl bg-[#111113] border border-[#222226] p-1.5 shadow-xl z-50 text-xs font-sans">
                    <div className="px-2 py-1 text-[11px] text-zinc-500 uppercase font-medium">Workspaces</div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveWorkspace('Default Workspace');
                        setWorkspaceMenuOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded hover:bg-zinc-800 text-zinc-200 flex items-center justify-between"
                    >
                      <span>Default Workspace</span>
                      {activeWorkspace === 'Default Workspace' && <span className="text-sky-400">✓</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveWorkspace('Production Edge');
                        setWorkspaceMenuOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded hover:bg-zinc-800 text-zinc-200 flex items-center justify-between"
                    >
                      <span>Production Edge</span>
                      {activeWorkspace === 'Production Edge' && <span className="text-sky-400">✓</span>}
                    </button>
                    <div className="pt-1 mt-1 border-t border-[#222226]">
                      <a
                        href="/settings/profile"
                        className="block px-2.5 py-1.5 rounded hover:bg-zinc-800 text-sky-400 text-xs"
                      >
                        + Create Workspace
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cloud Credits Badge */}
            {mode === 'cloud' && (
              <a
                href="/settings/credits"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-sans hover:bg-sky-500/15 transition font-medium"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span>$0.00 Credits</span>
              </a>
            )}

            {/* Command Palette Trigger ⌘K */}
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111113] border border-[#222226] text-xs text-zinc-400 hover:text-white transition font-sans"
            >
              <svg className="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <span>Search...</span>
              <kbd className="text-[10px] bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded text-zinc-400 font-mono">
                ⌘K
              </kbd>
            </button>

            {/* OSS Lock Button */}
            {mode === 'oss' && (
              <button
                type="button"
                onClick={handleLock}
                className="text-xs font-sans text-zinc-400 hover:text-white transition flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111113] border border-[#222226]"
                title="Lock RouteNex Studio Session"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Lock</span>
              </button>
            )}

            {/* Cloud User Avatar */}
            {mode === 'cloud' && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
                  className="w-7 h-7 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-400 font-semibold text-xs flex items-center justify-center hover:scale-105 transition"
                >
                  H
                </button>

                {avatarMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-[#111113] border border-[#222226] p-1.5 shadow-xl z-50 text-xs font-sans">
                    <div className="px-2.5 py-1.5 border-b border-[#222226] mb-1">
                      <span className="font-semibold text-zinc-100 block">Harshil Patel</span>
                      <span className="text-[11px] text-zinc-400">RouteNex Cloud Pro</span>
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
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-5 sm:p-8 max-w-7xl w-full mx-auto space-y-8 font-sans">
          {/* TAB 1: OVERVIEW */}
          {activeItem === 'overview' && (
            <div className="space-y-8">
              {/* Page Title & Subtitle (OpenRouter Style) */}
              <div>
                <h1 className="text-[22px] font-semibold tracking-tight text-zinc-50 font-sans">
                  Overview
                </h1>
                <p className="text-sm font-normal text-zinc-400 font-sans mt-1">
                  Monitor live request routing, token optimization, and provider health.
                </p>
              </div>

              {/* NexFlow Live Pipeline Canvas */}
              <NexFlowCanvas onNavigateTab={(tab) => setActiveItem(tab as StudioNavItemId)} />

              {/* This Week's Usage Cards (OpenRouter Zero-State Pattern in 183737.png) */}
              <div className="space-y-3">
                <h2 className="text-[15px] font-medium text-zinc-200 font-sans">
                  This Week's Usage
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Spend Card */}
                  <div className="p-5 rounded-xl bg-[#111113] border border-[#222226] space-y-2">
                    <span className="text-xs text-zinc-400 font-medium block">Spend</span>
                    <div className="text-2xl font-bold text-zinc-100 font-mono">
                      $0.00
                    </div>
                    <span className="text-xs text-zinc-500 font-sans block">
                      No spend this week
                    </span>
                  </div>

                  {/* Requests Card */}
                  <div className="p-5 rounded-xl bg-[#111113] border border-[#222226] space-y-2">
                    <span className="text-xs text-zinc-400 font-medium block">Requests</span>
                    <div className="text-2xl font-bold text-zinc-100 font-mono">
                      0
                    </div>
                    <span className="text-xs text-zinc-500 font-sans block">
                      No requests this week
                    </span>
                  </div>

                  {/* Tokens Card */}
                  <div className="p-5 rounded-xl bg-[#111113] border border-[#222226] space-y-2">
                    <span className="text-xs text-zinc-400 font-medium block">Tokens</span>
                    <div className="text-2xl font-bold text-zinc-100 font-mono">
                      0
                    </div>
                    <span className="text-xs text-zinc-500 font-sans block">
                      No tokens this week
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Access Bento Cards (OpenRouter 183737.png Pattern) */}
              <div className="space-y-3">
                <h2 className="text-[15px] font-medium text-zinc-200 font-sans">
                  Quick Access
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div
                    onClick={() => setActiveItem('providers')}
                    className="p-5 rounded-xl bg-[#111113] hover:bg-[#141417] border border-[#222226] hover:border-zinc-700 cursor-pointer transition space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
                          <path d="m22 12.5-8.58 3.91a2 2 0 0 1-1.66 0L2 12.5" />
                        </svg>
                      </div>
                      <span className="text-zinc-500 group-hover:text-zinc-200 transition">›</span>
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-100 font-sans">Providers & Models</h3>
                    <p className="text-[13px] leading-5 text-zinc-400 font-sans">
                      Connect 120+ providers, Antigravity, and 200+ models.
                    </p>
                  </div>

                  <div
                    onClick={() => setActiveItem('keys')}
                    className="p-5 rounded-xl bg-[#111113] hover:bg-[#141417] border border-[#222226] hover:border-zinc-700 cursor-pointer transition space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="7.5" cy="15.5" r="5.5" />
                          <path d="m21 2-9.6 9.6" />
                        </svg>
                      </div>
                      <span className="text-zinc-500 group-hover:text-zinc-200 transition">›</span>
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-100 font-sans">API Keys</h3>
                    <p className="text-[13px] leading-5 text-zinc-400 font-sans">
                      Generate scoped virtual keys with spending limits.
                    </p>
                  </div>

                  <div
                    onClick={() => setActiveItem('optimizer')}
                    className="p-5 rounded-xl bg-[#111113] hover:bg-[#141417] border border-[#222226] hover:border-zinc-700 cursor-pointer transition space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
                        </svg>
                      </div>
                      <span className="text-zinc-500 group-hover:text-zinc-200 transition">›</span>
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-100 font-sans">Token Optimizer</h3>
                    <p className="text-[13px] leading-5 text-zinc-400 font-sans">
                      LexiPack 10-language compression and TurnDedup.
                    </p>
                  </div>

                  <div
                    onClick={() => setActiveItem('agents')}
                    className="p-5 rounded-xl bg-[#111113] hover:bg-[#141417] border border-[#222226] hover:border-zinc-700 cursor-pointer transition space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="4 17 10 11 4 5" />
                          <line x1="12" x2="20" y1="19" y2="19" />
                        </svg>
                      </div>
                      <span className="text-zinc-500 group-hover:text-zinc-200 transition">›</span>
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-100 font-sans">NexWorkers & Agents</h3>
                    <p className="text-[13px] leading-5 text-zinc-400 font-sans">
                      Autonomous routed specialists with Action Shield, Claude Code & MCP.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROVIDERS & MODELS */}
          {activeItem === 'providers' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-[22px] font-semibold tracking-tight text-zinc-50 font-sans">
                    Providers & Models
                  </h1>
                  <p className="text-sm text-zinc-400 font-sans mt-1">
                    Manage 120+ official and zero-key providers, and 200+ models.
                  </p>
                </div>
                <div className="inline-flex rounded-lg bg-[#111113] border border-[#222226] p-1 text-xs font-sans">
                  <button
                    type="button"
                    onClick={() => setProvidersSubView('providers')}
                    className={`px-3 py-1.5 rounded-md transition ${
                      providersSubView === 'providers' ? 'bg-sky-500 !text-zinc-950 font-semibold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    By Provider (120+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setProvidersSubView('models')}
                    className={`px-3 py-1.5 rounded-md transition ${
                      providersSubView === 'models' ? 'bg-sky-500 !text-zinc-950 font-semibold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    By Model (200+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setProvidersSubView('playground')}
                    className={`px-3 py-1.5 rounded-md transition ${
                      providersSubView === 'playground' ? 'bg-sky-500 !text-zinc-950 font-semibold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Playground
                  </button>
                </div>
              </div>

              {providersSubView === 'providers' && <ProviderCredentials />}
              {providersSubView === 'models' && <ModelCatalogExplorer />}
              {providersSubView === 'playground' && <Playground />}
            </div>
          )}

          {/* TAB 3: ROUTING & COMBOS */}
          {activeItem === 'routing' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-[22px] font-semibold tracking-tight text-zinc-50 font-sans">
                    Routing & Combos
                  </h1>
                  <p className="text-sm text-zinc-400 font-sans mt-1">
                    Configure failover chains, 19 routing policies, and circuit breaker resilience.
                  </p>
                </div>
                <div className="inline-flex rounded-lg bg-[#111113] border border-[#222226] p-1 text-xs font-sans">
                  <button
                    type="button"
                    onClick={() => setRoutingSubView('combos')}
                    className={`px-3 py-1.5 rounded-md transition ${
                      routingSubView === 'combos' ? 'bg-sky-500 !text-zinc-950 font-semibold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Combos
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoutingSubView('policies')}
                    className={`px-3 py-1.5 rounded-md transition ${
                      routingSubView === 'policies' ? 'bg-sky-500 !text-zinc-950 font-semibold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    19 Policies
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoutingSubView('simulator')}
                    className={`px-3 py-1.5 rounded-md transition ${
                      routingSubView === 'simulator' ? 'bg-sky-500 !text-zinc-950 font-semibold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Route Simulator
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoutingSubView('circuits')}
                    className={`px-3 py-1.5 rounded-md transition ${
                      routingSubView === 'circuits' ? 'bg-sky-500 !text-zinc-950 font-semibold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Circuit Breakers
                  </button>
                </div>
              </div>

              {routingSubView === 'combos' && <Combos />}
              {routingSubView === 'policies' && <ModelAliases />}
              {routingSubView === 'circuits' && <QuotaTracker />}
              {routingSubView === 'simulator' && (
                <div className="space-y-6">
                  <div className="p-5 rounded-xl bg-[#111113] border border-[#222226] space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-100 font-sans">Dry-Run Route Simulator</h3>
                    <form onSubmit={handleRunSimulator} className="space-y-3 font-sans text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-zinc-400 block mb-1">Target Model / Virtual Tag</label>
                          <input
                            type="text"
                            value={simModel}
                            onChange={(e) => setSimModel(e.target.value)}
                            className="w-full bg-[#09090b] border border-[#222226] rounded-lg px-3 py-2 text-zinc-100 font-mono focus:outline-none focus:border-sky-500"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-zinc-400 block mb-1">Query Prompt</label>
                          <input
                            type="text"
                            value={simPrompt}
                            onChange={(e) => setSimPrompt(e.target.value)}
                            className="w-full bg-[#09090b] border border-[#222226] rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={simLoading}
                        className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 !text-zinc-950 font-semibold text-xs transition cursor-pointer"
                      >
                        {simLoading ? 'Evaluating...' : 'Run Route Evaluation →'}
                      </button>
                    </form>
                  </div>

                  {simResult && (
                    <div className="p-5 rounded-xl bg-[#111113] border border-[#222226] space-y-4 text-xs font-sans">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Winning Candidate:</span>
                        <span className="text-sky-400 font-mono font-bold text-sm">{simResult.selectedModel}</span>
                      </div>
                      <div className="p-3 rounded-lg bg-[#09090b] border border-[#222226] text-zinc-300">
                        {simResult.reason}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TOKEN OPTIMIZER */}
          {activeItem === 'optimizer' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-[22px] font-semibold tracking-tight text-zinc-50 font-sans">
                    Token Optimizer
                  </h1>
                  <p className="text-sm text-zinc-400 font-sans mt-1">
                    NexCompress 4-stage semantic reduction, LogPrune, and TurnDedup history hash.
                  </p>
                </div>
                <div className="inline-flex rounded-lg bg-[#111113] border border-[#222226] p-1 text-xs font-sans">
                  <button
                    type="button"
                    onClick={() => setOptimizerSubView('lexipack')}
                    className={`px-3 py-1.5 rounded-md transition ${
                      optimizerSubView === 'lexipack' ? 'bg-sky-500 !text-zinc-950 font-semibold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    LexiPack Engine
                  </button>
                  <button
                    type="button"
                    onClick={() => setOptimizerSubView('studio')}
                    className={`px-3 py-1.5 rounded-md transition ${
                      optimizerSubView === 'studio' ? 'bg-sky-500 !text-zinc-950 font-semibold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Live Diff Studio
                  </button>
                  <button
                    type="button"
                    onClick={() => setOptimizerSubView('memory')}
                    className={`px-3 py-1.5 rounded-md transition ${
                      optimizerSubView === 'memory' ? 'bg-sky-500 !text-zinc-950 font-semibold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Conversational Memory
                  </button>
                </div>
              </div>

              {optimizerSubView === 'lexipack' && <LexiPackStudio />}
              {optimizerSubView === 'studio' && <CompressionStudio />}
              {optimizerSubView === 'memory' && <MemoryPanel />}
            </div>
          )}

          {/* TAB 5: LOGS & ACTIVITY */}
          {activeItem === 'logs' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-[22px] font-semibold tracking-tight text-zinc-50 font-sans">
                  Logs & Activity
                </h1>
                <p className="text-sm text-zinc-400 font-sans mt-1">
                  14-column request telemetry stream and live execution inspector.
                </p>
              </div>
              <RequestLog />
            </div>
          )}

          {/* TAB 6: COST & QUOTAS */}
          {activeItem === 'costs' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-[22px] font-semibold tracking-tight text-zinc-50 font-sans">
                  Cost & Quotas
                </h1>
                <p className="text-sm text-zinc-400 font-sans mt-1">
                  1.62B/mo free-tier quotas, spend ledger, and provider budget meters.
                </p>
              </div>
              <FreeTierGauges />
              <CostExplorer />
            </div>
          )}

          {/* TAB 7: NEXWORKERS & CODING AGENTS */}
          {activeItem === 'agents' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-[22px] font-semibold tracking-tight text-zinc-50 font-sans">
                    NexWorkers & Coding Agents
                  </h1>
                  <p className="text-sm text-zinc-400 font-sans mt-1">
                    Autonomous routed specialists with Action Shield, Claude Code, Cursor, and MCP.
                  </p>
                </div>
                <div className="inline-flex rounded-lg bg-[#111113] border border-[#222226] p-1 text-xs font-sans self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setAgentsSubView('workers')}
                    className={`px-3 py-1.5 rounded-md transition ${
                      agentsSubView === 'workers' ? 'bg-sky-500 !text-zinc-950 font-semibold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    NexWorkers Control Plane
                  </button>
                  <button
                    type="button"
                    onClick={() => setAgentsSubView('connectors')}
                    className={`px-3 py-1.5 rounded-md transition ${
                      agentsSubView === 'connectors' ? 'bg-sky-500 !text-zinc-950 font-semibold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    CLI & Agent Connectors (Claude, Cursor)
                  </button>
                </div>
              </div>

              {agentsSubView === 'workers' && (
                <div className="h-[780px] min-h-[640px] rounded-xl overflow-hidden border border-[#222226] shadow-2xl">
                  <NexWorkersHub onNavigateTab={(tab) => setActiveItem(tab as StudioNavItemId)} />
                </div>
              )}
              {agentsSubView === 'connectors' && <AgentSetupHub />}
            </div>
          )}

          {/* TAB 8: API KEYS */}
          {activeItem === 'keys' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-[22px] font-semibold tracking-tight text-zinc-50 font-sans">
                  Virtual API Keys
                </h1>
                <p className="text-sm text-zinc-400 font-sans mt-1">
                  Scoped virtual keys with daily spend caps, model allowlists, and hashed storage.
                </p>
              </div>
              <VirtualKeys />
            </div>
          )}

          {/* TAB 9: GUARDRAILS & SETTINGS */}
          {activeItem === 'settings' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-[22px] font-semibold tracking-tight text-zinc-50 font-sans">
                  Guardrails & Settings
                </h1>
                <p className="text-sm text-zinc-400 font-sans mt-1">
                  {mode === 'cloud' ? 'Multi-tenant team governance and BYOK key vaults' : 'Local SQLite WAL maintenance and database backup'}
                </p>
              </div>
              <StorageSettings />
            </div>
          )}
        </main>
      </div>

      {/* Global Command Palette (Ctrl+K) */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-start justify-center p-4 pt-20">
          <div className="w-full max-w-lg rounded-xl bg-[#111113] border border-[#222226] shadow-2xl overflow-hidden font-sans text-xs">
            <div className="p-3.5 border-b border-[#222226] flex items-center gap-2.5">
              <svg className="w-4 h-4 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                value={commandSearch}
                onChange={(e) => setCommandSearch(e.target.value)}
                placeholder="Search RouteNex Studio navigation and tools..."
                className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 focus:outline-none text-sm font-sans"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setCommandPaletteOpen(false)}
                className="text-zinc-500 hover:text-white font-mono text-[11px]"
              >
                ESC
              </button>
            </div>

            <div className="p-2 max-h-72 overflow-y-auto space-y-1">
              {filteredCommands.map((cmd, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    cmd.action();
                    setCommandPaletteOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition flex items-center justify-between text-xs"
                >
                  <span>{cmd.label}</span>
                  <span className="text-[11px] text-zinc-500 font-mono">Jump ↵</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

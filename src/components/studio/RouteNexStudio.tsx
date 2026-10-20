import React, { useState, useEffect } from 'react';
import StudioNavRail, { type PillarId } from './StudioNavRail';
import NexFlowCanvas from './NexFlowCanvas';
import LexiPackStudio from './LexiPackStudio';
import RequestLog from '../dashboard/RequestLog';
import ProviderCredentials from '../dashboard/ProviderCredentials';
import VirtualKeys from '../dashboard/VirtualKeys';
import ModelAliases from '../dashboard/ModelAliases';
import DoctorPanel from '../dashboard/DoctorPanel';
import Combos from '../dashboard/Combos';
import AgentSetupHub from '../dashboard/AgentSetupHub';
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
import { RouteNexClient } from '../../utils/gateway-client';

interface RouteNexStudioProps {
  mode?: 'oss' | 'cloud';
}

export default function RouteNexStudio({ mode = 'oss' }: RouteNexStudioProps) {
  // Navigation State
  const [activePillar, setActivePillar] = useState<PillarId>('flight-deck');
  const [activeSubTab, setActiveSubTab] = useState<string>('live-pipeline');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  // Live Recent Requests Feed
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

      // Check gateway status
      client.isGatewayOnline().then((online) => setIsGatewayConnected(online));

      // In OSS mode, check sessionStorage unlock state
      if (mode === 'oss') {
        const isSessionUnlocked = sessionStorage.getItem('routenex_unlocked') === 'true';
        setIsUnlocked(isSessionUnlocked);
      } else {
        setIsUnlocked(true);
      }

      // Check URL query parameters
      const params = new URLSearchParams(window.location.search);
      const pillarParam = params.get('pillar') as PillarId | null;
      const subTabParam = params.get('tab');
      if (pillarParam) setActivePillar(pillarParam);
      if (subTabParam) setActiveSubTab(subTabParam);

      // Clean up auto_token if present
      if (params.get('auto_token')) {
        params.delete('auto_token');
        const newQuery = params.toString() ? `?${params.toString()}` : '';
        window.history.replaceState({}, '', `${window.location.pathname}${newQuery}`);
      }

      // Load recent requests from universal client
      client.getRecentRequests().then((reqs) => setRecentRequests(reqs));

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

  // Handle OSS Password Unlock
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const token = passwordInput.trim();
    if (!token) return;

    if (token === 'routenex-admin' || token.startsWith('rn_local_') || token === 'rn-local-dev-default') {
      sessionStorage.setItem('routenex_unlocked', 'true');
      localStorage.setItem('routenex_admin_token', token);
      setIsUnlocked(true);
    } else {
      setAuthError('Invalid password. Default password is routenex-admin.');
    }
  };

  const handleLock = () => {
    sessionStorage.removeItem('routenex_unlocked');
    localStorage.removeItem('routenex_admin_token');
    setPasswordInput('routenex-admin');
    setIsUnlocked(false);
  };

  // Run Route Simulator
  const handleRunSimulator = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimLoading(true);
    const client = RouteNexClient.getInstance();
    const result = await client.explainRoute(simModel, simPrompt);
    setSimResult(result);
    setSimLoading(false);
  };

  // Command palette navigation actions
  const commands = [
    { label: '01 / Flight Deck — NexFlow Pipeline', action: () => { setActivePillar('flight-deck'); setActiveSubTab('live-pipeline'); } },
    { label: '01 / Flight Deck — System Doctor', action: () => { setActivePillar('flight-deck'); setActiveSubTab('system-doctor'); } },
    { label: '02 / Providers & Models — By Provider (120+)', action: () => { setActivePillar('providers-models'); setActiveSubTab('by-provider'); } },
    { label: '02 / Providers & Models — By Model (200+)', action: () => { setActivePillar('providers-models'); setActiveSubTab('by-model'); } },
    { label: '03 / Smart Routing — 19 Policies & Combos', action: () => { setActivePillar('routing-combos'); setActiveSubTab('policies'); } },
    { label: '03 / Smart Routing — Route Simulator', action: () => { setActivePillar('routing-combos'); setActiveSubTab('simulator'); } },
    { label: '04 / NexCompress — LexiPack 10 Languages', action: () => { setActivePillar('nexcompress'); setActiveSubTab('lexipack'); } },
    { label: '04 / NexCompress — Compression Studio', action: () => { setActivePillar('nexcompress'); setActiveSubTab('studio'); } },
    { label: '05 / Telemetry — 14-Col Request Logs', action: () => { setActivePillar('telemetry-settings'); setActiveSubTab('logs'); } },
    { label: '05 / Telemetry — 36 Coding Agents & MCP', action: () => { setActivePillar('telemetry-settings'); setActiveSubTab('agents'); } },
    { label: '05 / Telemetry — 1.62B Free Token Ledger', action: () => { setActivePillar('telemetry-settings'); setActiveSubTab('ledger'); } },
    { label: 'Documentation (/docs)', action: () => (window.location.href = '/docs') },
  ];

  const filteredCommands = commands.filter((c) =>
    c.label.toLowerCase().includes(commandSearch.toLowerCase())
  );

  // If OSS is locked, render the Local Password Gate
  if (mode === 'oss' && !isUnlocked) {
    return (
      <div className="min-h-screen bg-[#090b10] text-zinc-200 flex items-center justify-center p-4 font-mono">
        <div className="w-full max-w-md p-8 rounded-2xl bg-[#0f121b] border border-[#1e2333] shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-400 text-zinc-950 font-bold flex items-center justify-center mx-auto text-sm shadow-[0_0_15px_rgba(0,242,254,0.3)]">
              RN
            </div>
            <h1 className="text-lg font-bold text-zinc-100 font-sans tracking-tight">
              RouteNex Studio — Local Core
            </h1>
            <p className="text-xs text-zinc-400 font-sans leading-relaxed">
              Open-source self-hosted AI routing gateway. Unlock with the default administrator credentials.
            </p>
          </div>

          {/* Default Password Callout Badge */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#141824] border border-[#232a3d] text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-mono text-zinc-400 tracking-wider font-semibold">
                Default Password
              </span>
              <div className="text-sm font-mono font-bold text-cyan-300">routenex-admin</div>
            </div>
            <button
              type="button"
              onClick={() => setPasswordInput('routenex-admin')}
              className="px-2.5 py-1 rounded bg-cyan-400 hover:bg-cyan-300 !text-zinc-950 font-bold text-[11px] transition cursor-pointer shadow-xs"
            >
              Auto-Fill
            </button>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="text-zinc-300 font-medium">Gateway Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-zinc-400 hover:text-white text-[11px]"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="routenex-admin"
                className="w-full bg-[#141824] border border-[#232a3d] rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            {authError && (
              <div className="text-[11px] text-red-400 bg-red-950/20 border border-red-900/30 p-2.5 rounded-lg">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 !text-zinc-950 font-bold text-xs transition cursor-pointer shadow-[0_0_15px_rgba(0,242,254,0.25)]"
            >
              Unlock RouteNex Studio →
            </button>
          </form>

          <div className="pt-2 border-t border-[#1e2333] text-center text-[11px] text-zinc-500 font-sans">
            Zero Cloud Account Required • 100% Offline Standalone
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090b10] text-zinc-300 flex flex-col md:flex-row font-sans selection:bg-cyan-900/50 selection:text-white">
      {/* 1. Left 5-Pillar Navigation Rail */}
      <StudioNavRail
        activePillar={activePillar}
        setActivePillar={(p) => {
          setActivePillar(p);
          // Set default sub-tab for selected pillar
          if (p === 'flight-deck') setActiveSubTab('live-pipeline');
          if (p === 'providers-models') setActiveSubTab('by-provider');
          if (p === 'routing-combos') setActiveSubTab('combos');
          if (p === 'nexcompress') setActiveSubTab('lexipack');
          if (p === 'telemetry-settings') setActiveSubTab('logs');
        }}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        mode={mode}
        isGatewayConnected={isGatewayConnected}
      />

      {/* 2. Main Studio Work Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Studio Header */}
        <header className="h-14 border-b border-[#1e2333] bg-[#090b10]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="md:hidden text-zinc-400 hover:text-white p-1"
            >
              ☰
            </button>

            {/* Pillar Badge */}
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="font-bold text-cyan-400">
                {activePillar.toUpperCase().replace('-', ' / ')}
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400 hidden sm:inline capitalize">
                {activeSubTab.replace('-', ' ')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Cloud Workspace Switcher (Only in Cloud mode) */}
            {mode === 'cloud' && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#121622] hover:bg-[#181d2c] border border-[#232838] text-xs font-mono text-zinc-200 transition"
                >
                  <span className="text-zinc-500">Personal /</span>
                  <span className="font-semibold text-cyan-300">{activeWorkspace}</span>
                  <span className="text-[10px] text-zinc-500">▾</span>
                </button>

                {workspaceMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl bg-[#0f121b] border border-[#1e2333] p-1.5 shadow-2xl z-50 text-xs font-mono">
                    <div className="px-2 py-1 text-[10px] text-zinc-500 uppercase">Workspaces</div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveWorkspace('Default Workspace');
                        setWorkspaceMenuOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded hover:bg-[#181d2c] text-zinc-200 flex items-center justify-between"
                    >
                      <span>Default Workspace</span>
                      {activeWorkspace === 'Default Workspace' && <span className="text-cyan-400">✓</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveWorkspace('Production Edge');
                        setWorkspaceMenuOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded hover:bg-[#181d2c] text-zinc-200 flex items-center justify-between"
                    >
                      <span>Production Edge</span>
                      {activeWorkspace === 'Production Edge' && <span className="text-cyan-400">✓</span>}
                    </button>
                    <div className="pt-1 mt-1 border-t border-[#1e2333]">
                      <a
                        href="/settings/profile"
                        className="block px-2.5 py-1.5 rounded hover:bg-[#181d2c] text-cyan-400 text-[11px]"
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
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs font-mono hover:bg-emerald-900/50 transition"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>$0.00 Credits</span>
              </a>
            )}

            {/* Command Palette Trigger ⌘K */}
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#121622] border border-[#232838] text-xs text-zinc-400 hover:text-white transition font-mono"
            >
              <span>Search Studio...</span>
              <kbd className="text-[10px] bg-zinc-800 border border-zinc-700 px-1 py-0.2 rounded text-zinc-400">
                ⌘K
              </kbd>
            </button>

            {/* OSS Session Lock Button */}
            {mode === 'oss' && (
              <button
                type="button"
                onClick={handleLock}
                className="text-xs font-mono text-zinc-400 hover:text-white transition flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#121622] border border-[#232838]"
                title="Lock RouteNex Studio Session"
              >
                🔒 Lock
              </button>
            )}

            {/* Cloud User Avatar Menu */}
            {mode === 'cloud' && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
                  className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center justify-center hover:scale-105 transition"
                >
                  H
                </button>

                {avatarMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-[#0f121b] border border-[#1e2333] p-1.5 shadow-2xl z-50 text-xs font-mono">
                    <div className="px-2.5 py-1.5 border-b border-[#1e2333] mb-1">
                      <span className="font-semibold text-zinc-100 block">Harshil Patel</span>
                      <span className="text-[10px] text-zinc-500">RouteNex Cloud Pro</span>
                    </div>
                    <a href="/settings/profile" className="block px-2.5 py-1.5 rounded hover:bg-[#181d2c] text-zinc-300">
                      Profile
                    </a>
                    <a href="/settings/preferences" className="block px-2.5 py-1.5 rounded hover:bg-[#181d2c] text-zinc-300">
                      Preferences
                    </a>
                    <a href="/settings/credits" className="block px-2.5 py-1.5 rounded hover:bg-[#181d2c] text-zinc-300">
                      Credits & Billing
                    </a>
                    <a href="/settings/byok" className="block px-2.5 py-1.5 rounded hover:bg-[#181d2c] text-zinc-300">
                      BYOK Keys
                    </a>
                    <a href="/settings/guardrails" className="block px-2.5 py-1.5 rounded hover:bg-[#181d2c] text-zinc-300">
                      Guardrails
                    </a>
                    <div className="pt-1 mt-1 border-t border-[#1e2333]">
                      <a href="/login" className="block px-2.5 py-1.5 rounded hover:bg-[#181d2c] text-red-400">
                        Sign Out
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Horizontal Sub-Navigation Tab Bar */}
        <div className="border-b border-[#1e2333] bg-[#0c0e15] px-4 sm:px-6 flex items-center gap-2 overflow-x-auto text-xs font-mono shrink-0">
          {/* Pillar 1 Sub-Tabs */}
          {activePillar === 'flight-deck' && (
            <>
              <button
                type="button"
                onClick={() => setActiveSubTab('live-pipeline')}
                className={`py-2.5 px-3 border-b-2 font-semibold transition ${
                  activeSubTab === 'live-pipeline' ? 'border-cyan-400 text-white' : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                ⚡ Live Pipeline & Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('constellation')}
                className={`py-2.5 px-3 border-b-2 font-semibold transition ${
                  activeSubTab === 'constellation' ? 'border-cyan-400 text-white' : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                🪐 Constellation Hub
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('system-doctor')}
                className={`py-2.5 px-3 border-b-2 font-semibold transition ${
                  activeSubTab === 'system-doctor' ? 'border-cyan-400 text-white' : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                🩺 System Doctor
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('endpoints')}
                className={`py-2.5 px-3 border-b-2 font-semibold transition ${
                  activeSubTab === 'endpoints' ? 'border-cyan-400 text-white' : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                🌐 Ingress Endpoints & LAN
              </button>
            </>
          )}

          {/* Pillar 2 Sub-Tabs */}
          {activePillar === 'providers-models' && (
            <>
              <button
                type="button"
                onClick={() => setActiveSubTab('by-provider')}
                className={`py-2.5 px-3 border-b-2 font-semibold transition ${
                  activeSubTab === 'by-provider' ? 'border-cyan-400 text-white' : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                ⊞ By Provider (120+)
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('by-model')}
                className={`py-2.5 px-3 border-b-2 font-semibold transition ${
                  activeSubTab === 'by-model' ? 'border-cyan-400 text-white' : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                🧠 By Model (200+)
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('playground')}
                className={`py-2.5 px-3 border-b-2 font-semibold transition ${
                  activeSubTab === 'playground' ? 'border-cyan-400 text-white' : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                💬 Prompt Playground
              </button>
            </>
          )}

          {/* Pillar 3 Sub-Tabs */}
          {activePillar === 'routing-combos' && (
            <>
              <button
                type="button"
                onClick={() => setActiveSubTab('combos')}
                className={`py-2.5 px-3 border-b-2 font-semibold transition ${
                  activeSubTab === 'combos' ? 'border-cyan-400 text-white' : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                🔀 Smart Combos & Chains
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('policies')}
                className={`py-2.5 px-3 border-b-2 font-semibold transition ${
                  activeSubTab === 'policies' ? 'border-cyan-400 text-white' : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                📋 19 Auto-Routing Policies
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('simulator')}
                className={`py-2.5 px-3 border-b-2 font-semibold transition ${
                  activeSubTab === 'simulator' ? 'border-cyan-400 text-white' : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                🧪 Dry-Run Route Simulator
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('circuit-breakers')}
                className={`py-2.5 px-3 border-b-2 font-semibold transition ${
                  activeSubTab === 'circuit-breakers' ? 'border-cyan-400 text-white' : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                🛡️ Circuit Breakers & Quota
              </button>
            </>
          )}

          {/* Pillar 4 Sub-Tabs */}
          {activePillar === 'nexcompress' && (
            <>
              <button
                type="button"
                onClick={() => setActiveSubTab('lexipack')}
                className={`py-2.5 px-3 border-b-2 font-semibold transition ${
                  activeSubTab === 'lexipack' ? 'border-cyan-400 text-white' : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                🗜️ LexiPack 10-Language Condenser
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('studio')}
                className={`py-2.5 px-3 border-b-2 font-semibold transition ${
                  activeSubTab === 'studio' ? 'border-cyan-400 text-white' : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                🔬 Live Compression Studio
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('memory')}
                className={`py-2.5 px-3 border-b-2 font-semibold transition ${
                  activeSubTab === 'memory' ? 'border-cyan-400 text-white' : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                💾 Conversational Memory (FTS5)
              </button>
            </>
          )}

          {/* Pillar 5 Sub-Tabs */}
          {activePillar === 'telemetry-settings' && (
            <>
              <button
                type="button"
                onClick={() => setActiveSubTab('logs')}
                className={`py-2.5 px-3 border-b-2 font-semibold transition ${
                  activeSubTab === 'logs' ? 'border-cyan-400 text-white' : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                📋 Request Stream (14 Cols)
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('analytics')}
                className={`py-2.5 px-3 border-b-2 font-semibold transition ${
                  activeSubTab === 'analytics' ? 'border-cyan-400 text-white' : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                📈 365-Day Activity Heatmap
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('ledger')}
                className={`py-2.5 px-3 border-b-2 font-semibold transition ${
                  activeSubTab === 'ledger' ? 'border-cyan-400 text-white' : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                💰 Cost & 1.62B Free Pool Ledger
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('agents')}
                className={`py-2.5 px-3 border-b-2 font-semibold transition ${
                  activeSubTab === 'agents' ? 'border-cyan-400 text-white' : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                🤖 36 Coding Agents & MCP Hub
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('keys')}
                className={`py-2.5 px-3 border-b-2 font-semibold transition ${
                  activeSubTab === 'keys' ? 'border-cyan-400 text-white' : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                🔑 Virtual API Keys
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('storage')}
                className={`py-2.5 px-3 border-b-2 font-semibold transition ${
                  activeSubTab === 'storage' ? 'border-cyan-400 text-white' : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                ⚙️ {mode === 'cloud' ? 'Cloud Workspace Governance' : 'Storage SQLite WAL'}
              </button>
            </>
          )}
        </div>

        {/* Main Pillar Viewport */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* PILLAR 1: FLIGHT DECK */}
          {activePillar === 'flight-deck' && (
            <div className="space-y-6">
              {activeSubTab === 'live-pipeline' && (
                <>
                  {/* Hero Canvas */}
                  <NexFlowCanvas />

                  {/* 4 Telemetry Metric Bento Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-4 rounded-xl bg-[#0e1017] border border-[#1e2333] space-y-1">
                      <span className="text-[10px] text-zinc-500 font-mono block">TOTAL PROCESSED REQUESTS</span>
                      <span className="text-2xl font-bold text-zinc-100 font-mono">1,247</span>
                    </div>
                    <div className="p-4 rounded-xl bg-[#0e1017] border border-[#1e2333] space-y-1">
                      <span className="text-[10px] text-emerald-400 font-mono block">NEXCOMPRESS TOKENS SAVED</span>
                      <span className="text-2xl font-bold text-emerald-400 font-mono">318,420</span>
                    </div>
                    <div className="p-4 rounded-xl bg-[#0e1017] border border-[#1e2333] space-y-1">
                      <span className="text-[10px] text-cyan-400 font-mono block">FREE POOL HEADROOM</span>
                      <span className="text-2xl font-bold text-cyan-400 font-mono">1.62B / mo</span>
                    </div>
                    <div className="p-4 rounded-xl bg-[#0e1017] border border-[#1e2333] space-y-1">
                      <span className="text-[10px] text-zinc-400 font-mono block">ESTIMATED SPEND SAVED</span>
                      <span className="text-2xl font-bold text-zinc-200 font-mono">$42.80</span>
                    </div>
                  </div>

                  {/* Recent Requests Stream Feed */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-zinc-400 font-mono uppercase tracking-wider">
                        Live Recent Requests Feed
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setActivePillar('telemetry-settings');
                          setActiveSubTab('logs');
                        }}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-mono font-semibold"
                      >
                        Open Full 14-Col Log Stream →
                      </button>
                    </div>

                    <div className="rounded-xl border border-[#1e2333] bg-[#0e1017] divide-y divide-[#1e2333] overflow-hidden font-mono text-xs">
                      {recentRequests.map((r, i) => (
                        <div key={i} className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 hover:bg-[#121622] transition">
                          <div className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-zinc-100 font-semibold">{r.model_used || r.model}</span>
                            <span className="text-zinc-500">via</span>
                            <span className="text-cyan-300">{r.provider}</span>
                          </div>
                          <div className="flex items-center gap-4 text-zinc-400">
                            <span>{r.latency_ms || 120}ms</span>
                            <span className="text-zinc-300">
                              {r.tokens?.total ? `${r.tokens.total} tok` : '280 tok'}
                            </span>
                            <span className="text-[10px] text-zinc-500">{r.time || 'recently'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeSubTab === 'constellation' && <RadialTopology />}
              {activeSubTab === 'system-doctor' && <DoctorPanel />}
              {activeSubTab === 'endpoints' && <EndpointsPanel />}
            </div>
          )}

          {/* PILLAR 2: PROVIDERS & MODELS */}
          {activePillar === 'providers-models' && (
            <div className="space-y-6">
              {activeSubTab === 'by-provider' && <ProviderCredentials />}
              {activeSubTab === 'by-model' && <ModelCatalogExplorer />}
              {activeSubTab === 'playground' && <Playground />}
            </div>
          )}

          {/* PILLAR 3: SMART ROUTING & COMBOS */}
          {activePillar === 'routing-combos' && (
            <div className="space-y-6">
              {activeSubTab === 'combos' && <Combos />}
              {activeSubTab === 'policies' && <ModelAliases />}
              {activeSubTab === 'circuit-breakers' && <QuotaTracker />}
              
              {/* Dry-Run Route Simulator */}
              {activeSubTab === 'simulator' && (
                <div className="space-y-6">
                  <div className="p-5 rounded-2xl bg-[#0e1017] border border-[#1e2333] space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-100 font-sans">Dry-Run Route Simulator (`/v1/router/explain`)</h3>
                      <p className="text-xs text-zinc-400 font-sans mt-0.5">
                        Test and explain RouteNex policy decisions without triggering actual model inference billing.
                      </p>
                    </div>

                    <form onSubmit={handleRunSimulator} className="space-y-3 font-mono text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-zinc-400 block mb-1">Target Model / Virtual Tag</label>
                          <input
                            type="text"
                            value={simModel}
                            onChange={(e) => setSimModel(e.target.value)}
                            className="w-full bg-[#141722] border border-[#232838] rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-zinc-400 block mb-1">Inspection Query</label>
                          <input
                            type="text"
                            value={simPrompt}
                            onChange={(e) => setSimPrompt(e.target.value)}
                            className="w-full bg-[#141722] border border-[#232838] rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={simLoading}
                        className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 !text-zinc-950 font-bold text-xs transition cursor-pointer"
                      >
                        {simLoading ? 'Evaluating Candidates...' : 'Run Route Evaluation →'}
                      </button>
                    </form>
                  </div>

                  {simResult && (
                    <div className="p-5 rounded-2xl bg-[#0e1017] border border-[#1e2333] space-y-4 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Winning Target:</span>
                        <span className="text-cyan-300 font-bold text-sm">{simResult.selectedModel}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#141722] border border-[#232838] text-zinc-300">
                        {simResult.reason}
                      </div>

                      <div className="space-y-2">
                        <span className="text-zinc-400 font-bold">Candidate Evaluation Matrix:</span>
                        <div className="rounded-xl border border-[#1e2333] overflow-hidden divide-y divide-[#1e2333]">
                          {simResult.candidates?.map((c: any, i: number) => (
                            <div key={i} className="p-3 flex items-center justify-between hover:bg-[#141722]">
                              <div>
                                <span className="font-bold text-zinc-200">{c.model}</span>
                                <span className="text-zinc-500 ml-2">({c.provider})</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-zinc-400">{c.latencyMs}ms</span>
                                <span className="text-emerald-400">Score: {c.score}</span>
                                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold text-[10px]">
                                  {c.circuitState}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PILLAR 4: NEXCOMPRESS & MEMORY */}
          {activePillar === 'nexcompress' && (
            <div className="space-y-6">
              {activeSubTab === 'lexipack' && <LexiPackStudio />}
              {activeSubTab === 'studio' && <CompressionStudio />}
              {activeSubTab === 'memory' && <MemoryPanel />}
            </div>
          )}

          {/* PILLAR 5: TELEMETRY & SETTINGS */}
          {activePillar === 'telemetry-settings' && (
            <div className="space-y-6">
              {activeSubTab === 'logs' && <RequestLog />}
              {activeSubTab === 'analytics' && <UsageAnalytics />}
              {activeSubTab === 'ledger' && (
                <div className="space-y-6">
                  <FreeTierGauges />
                  <CostExplorer />
                </div>
              )}
              {activeSubTab === 'agents' && <AgentSetupHub />}
              {activeSubTab === 'keys' && <VirtualKeys />}
              {activeSubTab === 'storage' && <StorageSettings />}
            </div>
          )}
        </main>
      </div>

      {/* Global Command Palette Modal (Ctrl+K / Cmd+K) */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-start justify-center p-4 pt-20">
          <div className="w-full max-w-lg rounded-2xl bg-[#0f121b] border border-[#1e2333] shadow-2xl overflow-hidden font-mono text-xs">
            <div className="p-3 border-b border-[#1e2333] flex items-center gap-2">
              <span className="text-cyan-400">🔍</span>
              <input
                type="text"
                value={commandSearch}
                onChange={(e) => setCommandSearch(e.target.value)}
                placeholder="Search RouteNex Studio pillars and commands..."
                className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setCommandPaletteOpen(false)}
                className="text-zinc-500 hover:text-white"
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
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#181d2c] text-zinc-300 hover:text-white transition flex items-center justify-between"
                >
                  <span>{cmd.label}</span>
                  <span className="text-[10px] text-zinc-500">Jump ↵</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

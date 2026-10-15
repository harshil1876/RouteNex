import React, { useState, useEffect } from 'react';
import Sidebar, { type ActiveTab, type EditionMode } from './Sidebar';
import RequestLog from './RequestLog';
import ProviderCredentials from './ProviderCredentials';
import VirtualKeys from './VirtualKeys';
import ModelAliases from './ModelAliases';
import DoctorPanel from './DoctorPanel';
import CloudEditionShowcase from './CloudEditionShowcase';
import Combos from './Combos';
import AgentSetupHub from './AgentSetupHub';
import FreeTierGauges from './FreeTierGauges';
import TopologyMap from './TopologyMap';
import CompressionStudio from './CompressionStudio';
import Playground from './Playground';
import RadialTopology from './RadialTopology';
import EndpointsPanel from './EndpointsPanel';
import EmbeddedServices from './EmbeddedServices';
import QuotaTracker from './QuotaTracker';
import CavemanStudio from './CavemanStudio';
import UsageAnalytics from './UsageAnalytics';
import CostExplorer from './CostExplorer';
import MemoryPanel from './MemoryPanel';
import GamificationProfile from './GamificationProfile';
import StorageSettings from './StorageSettings';
import AiAssistantDrawer from './AiAssistantDrawer';

interface RecentRequestRow {
  model: string;
  provider: string;
  inTokens: string;
  outTokens: string;
  when: string;
  status: 'ok' | 'failover' | 'error';
}

export default function DashboardOverview() {
  const [edition, setEdition] = useState<EditionMode>('oss');
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [language, setLanguage] = useState('EN');
  const [topologyView, setTopologyView] = useState<'radial' | 'pipeline'>('radial');

  // Dismissible Top Announcement Banners (Screenshot 587)
  const [showPartnerBanner, setShowPartnerBanner] = useState(true);
  const [showExtensionBanner, setShowExtensionBanner] = useState(true);
  const [showUpdateBanner, setShowUpdateBanner] = useState(true);

  // Command palette search modal state (Ctrl+K)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');

  // Live recent requests feed
  const [recentRequests, setRecentRequests] = useState<RecentRequestRow[]>([
    { model: 'llama-3.3-70b-versatile', provider: 'Groq', inTokens: '70.6K↑', outTokens: '67↓', when: '12s ago', status: 'ok' },
    { model: 'claude-3-7-sonnet', provider: 'Anthropic', inTokens: '14.2K↑', outTokens: '412↓', when: '1m ago', status: 'ok' },
    { model: 'cerebras/llama-3.3-70b', provider: 'Cerebras', inTokens: '8.4K↑', outTokens: '180↓', when: '3m ago', status: 'failover' },
    { model: 'gemini-2.5-flash', provider: 'Google', inTokens: '2.1K↑', outTokens: '95↓', when: '5m ago', status: 'ok' },
    { model: 'mistral-small', provider: 'Mistral', inTokens: '4.8K↑', outTokens: '210↓', when: '8m ago', status: 'ok' },
  ]);

  // Handle auto_token exchange and view routing from URL params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const autoToken = params.get('auto_token');
      const viewParam = params.get('view') as ActiveTab | null;

      if (viewParam) {
        setActiveTab(viewParam);
      }

      if (autoToken) {
        localStorage.setItem('routenex_admin_token', autoToken);
        // Clean URL cleanly
        params.delete('auto_token');
        const newQuery = params.toString() ? `?${params.toString()}` : '';
        window.history.replaceState({}, '', `${window.location.pathname}${newQuery}`);
      }

      // Keyboard shortcut Ctrl+K / Cmd+K for command palette
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          setCommandPaletteOpen((prev) => !prev);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, []);

  const commands = [
    { label: 'Home Overview', action: () => setActiveTab('overview') },
    { label: 'Endpoints & Tunnels', action: () => setActiveTab('endpoints') },
    { label: 'Providers Hub (347+)', action: () => setActiveTab('providers') },
    { label: 'API Keys Manager', action: () => setActiveTab('keys') },
    { label: 'Combos & Studio', action: () => setActiveTab('combos') },
    { label: 'Caveman 10 Language Packs', action: () => setActiveTab('caveman') },
    { label: 'Usage Analytics & Heatmap', action: () => setActiveTab('usage') },
    { label: 'Cost Explorer & Accounting', action: () => setActiveTab('costs') },
    { label: 'Conversational Memory (FTS5)', action: () => setActiveTab('memory') },
    { label: 'Gamification & 23 Badges', action: () => setActiveTab('gamification') },
    { label: 'Storage SQLite Maintenance', action: () => setActiveTab('storage') },
    { label: 'Full Documentation (/docs)', action: () => (window.location.href = '/docs') },
  ];

  const filteredCommands = commands.filter((c) =>
    c.label.toLowerCase().includes(commandSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0b0d13] text-[#e0e2ec] flex flex-col md:flex-row font-sans selection:bg-purple-600 selection:text-white">
      {/* 1. Left Accordion Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        edition={edition}
        setEdition={setEdition}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        isGatewayConnected={true}
      />

      {/* 2. Main Content Body */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-[#1f2433] bg-[#0c0f18]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg border border-[#222738] text-[#8e97ae] hover:text-white"
            >
              ☰
            </button>

            {/* Ctrl+K Quick Command Palette Trigger */}
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141824] border border-[#23293c] text-xs font-mono text-[#7d8597] hover:text-white hover:border-[#343e5c] transition-all"
            >
              <span>🔍 Quick nav</span>
              <kbd className="px-1.5 py-0.5 rounded bg-[#1c2234] border border-[#2a344d] text-[10px] text-[#a0a8be]">
                Ctrl K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            {/* Language Selector */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-[#141824] border border-[#23293c] rounded-lg px-2 py-1 text-xs text-[#a0a8be] focus:outline-none focus:border-purple-500"
            >
              <option value="EN">EN</option>
              <option value="ES">ES</option>
              <option value="PT-BR">PT-BR</option>
              <option value="HI">HI</option>
              <option value="ZH">ZH</option>
            </select>

            {/* Health Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#121622] border border-[#222738] text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 font-semibold">Healthy</span>
              <span className="text-[#636c80]">(127.0.0.1:3001)</span>
            </div>

            {/* Edition Switcher */}
            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/15 border border-purple-500/30 text-purple-300">
              {edition === 'oss' ? 'Local OSS' : 'Cloud'}
            </span>

            {/* Auth / Cloud Login Link */}
            {edition === 'oss' ? (
              <a
                href="/login"
                className="text-xs text-[#8e97ae] hover:text-white transition-colors"
                title="Switch to RouteNex Cloud SaaS"
              >
                Cloud Login →
              </a>
            ) : (
              <button
                type="button"
                onClick={() => setEdition('oss')}
                className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
              >
                Logout
              </button>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* HOME VIEW: Screenshots 586 & 587 */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Dismissible Top Partner / Extension Banners (Screenshot 587) */}
              {showPartnerBanner && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-950/60 via-[#161a29] to-[#121622] border border-purple-500/30 flex items-center justify-between text-xs font-mono shadow-md">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">🚀</span>
                    <div>
                      <span className="font-semibold text-white">Moonshot AI (Kimi) now supported</span>
                      <span className="text-[#8f96a3] ml-2 hidden sm:inline">— up to 256k context with ultra-fast latency.</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveTab('providers')}
                      className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-semibold transition-colors"
                    >
                      Connect Provider
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPartnerBanner(false)}
                      className="text-[#7d8597] hover:text-white p-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {showUpdateBanner && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-rose-950/40 via-[#1a1420] to-[#14121a] border border-rose-500/30 flex items-center justify-between text-xs font-mono shadow-md">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <div>
                      <span className="font-semibold text-rose-300">Update Available: v0.2.1</span>
                      <span className="text-[#8f96a3] ml-2 hidden sm:inline">New Caveman rules, 347 provider sync & faster failover.</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => alert('RouteNex is running the latest built version.')}
                      className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold transition-colors"
                    >
                      Manual Update
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowUpdateBanner(false)}
                      className="text-[#7d8597] hover:text-white p-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Start 4-Step Grid (Screenshots 586 & 587) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-semibold text-[#8f96a3] uppercase tracking-wider font-mono">
                    Quick Start Guide
                  </h2>
                  <a
                    href="/docs"
                    className="text-xs text-purple-400 hover:text-purple-300 font-mono flex items-center gap-1 font-semibold"
                  >
                    Full Docs (/docs) →
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Step 1 */}
                  <div
                    onClick={() => setActiveTab('keys')}
                    className="p-4 rounded-xl bg-[#121622] hover:bg-[#161c2c] border border-[#222738] hover:border-purple-500/40 cursor-pointer transition-all space-y-1.5 group"
                  >
                    <div className="text-xs font-mono font-bold text-purple-400 group-hover:text-purple-300">
                      1. Create API key
                    </div>
                    <p className="text-xs text-[#8f96a3] leading-snug">
                      Go to API Keys. Generate one key per environment or agent.
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div
                    onClick={() => setActiveTab('providers')}
                    className="p-4 rounded-xl bg-[#121622] hover:bg-[#161c2c] border border-[#222738] hover:border-purple-500/40 cursor-pointer transition-all space-y-1.5 group"
                  >
                    <div className="text-xs font-mono font-bold text-purple-400 group-hover:text-purple-300">
                      2. Connect providers
                    </div>
                    <p className="text-xs text-[#8f96a3] leading-snug">
                      Add accounts in Providers. Supports OAuth, API Key, and free tiers.
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div
                    onClick={() => setActiveTab('endpoints')}
                    className="p-4 rounded-xl bg-[#121622] hover:bg-[#161c2c] border border-[#222738] hover:border-purple-500/40 cursor-pointer transition-all space-y-1.5 group"
                  >
                    <div className="text-xs font-mono font-bold text-purple-400 group-hover:text-purple-300">
                      3. Point your client
                    </div>
                    <p className="text-xs text-[#8f96a3] leading-snug">
                      Set base URL to http://localhost:3001/v1 in your IDE or API client.
                    </p>
                  </div>

                  {/* Step 4 */}
                  <div
                    onClick={() => setActiveTab('usage')}
                    className="p-4 rounded-xl bg-[#121622] hover:bg-[#161c2c] border border-[#222738] hover:border-purple-500/40 cursor-pointer transition-all space-y-1.5 group"
                  >
                    <div className="text-xs font-mono font-bold text-purple-400 group-hover:text-purple-300">
                      4. Monitor & optimize
                    </div>
                    <p className="text-xs text-[#8f96a3] leading-snug">
                      Track tokens, cost and errors in Request Logs and Analytics.
                    </p>
                  </div>
                </div>
              </div>

              {/* Radial Topology (Left) + Recent Requests (Right) (Screenshot 586) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Radial Hub-and-Spoke Topology */}
                <div className="lg:col-span-7 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-[#8f96a3] uppercase tracking-wider">
                      Provider Topology
                    </span>
                    <div className="flex p-0.5 rounded-lg bg-[#141824] border border-[#222738] text-[10px] font-mono">
                      <button
                        type="button"
                        onClick={() => setTopologyView('radial')}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          topologyView === 'radial' ? 'bg-purple-600 text-white font-semibold' : 'text-[#7d8597]'
                        }`}
                      >
                        Radial Hub
                      </button>
                      <button
                        type="button"
                        onClick={() => setTopologyView('pipeline')}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          topologyView === 'pipeline' ? 'bg-purple-600 text-white font-semibold' : 'text-[#7d8597]'
                        }`}
                      >
                        4-Tier Trace
                      </button>
                    </div>
                  </div>

                  {topologyView === 'radial' ? (
                    <RadialTopology onSelectNode={(id) => setActiveTab('providers')} />
                  ) : (
                    <TopologyMap />
                  )}
                </div>

                {/* Right: RECENT REQUESTS Feed (Screenshot 586) */}
                <div className="lg:col-span-5 space-y-2 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-[#8f96a3] uppercase tracking-wider">
                      Recent Requests
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('usage')}
                      className="text-xs font-mono text-purple-400 hover:text-purple-300"
                    >
                      View all →
                    </button>
                  </div>

                  <div className="flex-1 p-4 rounded-xl bg-[#121622] border border-[#222738] overflow-hidden flex flex-col justify-between font-mono">
                    <div className="divide-y divide-[#1b2131]">
                      {recentRequests.map((req, idx) => (
                        <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                req.status === 'ok'
                                  ? 'bg-emerald-400'
                                  : req.status === 'failover'
                                  ? 'bg-amber-400'
                                  : 'bg-rose-400'
                              }`}
                            />
                            <div className="truncate">
                              <span className="text-white font-medium block truncate max-w-[140px]">
                                {req.model}
                              </span>
                              <span className="text-[10px] text-[#7d8597]">{req.provider}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-right shrink-0">
                            <div className="text-[11px]">
                              <span className="text-purple-400 font-bold">{req.inTokens}</span>{' '}
                              <span className="text-emerald-400 font-bold">{req.outTokens}</span>
                            </div>
                            <span className="text-[10px] text-[#636c80] w-14">{req.when}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-[#1b2131] flex justify-between items-center text-[11px] text-[#7d8597]">
                      <span>Realtime streaming throughput</span>
                      <span className="text-emerald-400">● 100% Delivery</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* OTHER DASHBOARD VIEWS */}
          {activeTab === 'endpoints' && <EndpointsPanel />}
          {activeTab === 'keys' && <VirtualKeys />}
          {activeTab === 'providers' && <ProviderCredentials />}
          {activeTab === 'services' && <EmbeddedServices />}
          {activeTab === 'combos' && <Combos />}
          {activeTab === 'quota' && <QuotaTracker />}
          {activeTab === 'caveman' && <CavemanStudio />}
          {activeTab === 'compression' && <CompressionStudio />}
          {activeTab === 'usage' && <UsageAnalytics />}
          {activeTab === 'costs' && <CostExplorer />}
          {activeTab === 'free-tiers' && <FreeTierGauges />}
          {activeTab === 'agents' && <AgentSetupHub />}
          {activeTab === 'memory' && <MemoryPanel />}
          {activeTab === 'topology' && <TopologyMap />}
          {activeTab === 'playground' && <Playground />}
          {activeTab === 'gamification' && <GamificationProfile />}
          {activeTab === 'storage' && <StorageSettings />}
          {activeTab === 'doctor' && <DoctorPanel />}
          {activeTab === 'aliases' && <ModelAliases />}

          {/* CLOUD SAAS VIEWS */}
          {(activeTab === 'cloud-team' || activeTab === 'cloud-budgets') && (
            <CloudEditionShowcase />
          )}
        </main>
      </div>

      {/* Floating Purple AI Assistant Drawer */}
      <AiAssistantDrawer />

      {/* Command Palette Modal (Ctrl+K) */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-start justify-center pt-24 p-4">
          <div className="w-full max-w-lg bg-[#121622] border border-[#222738] rounded-xl shadow-2xl overflow-hidden font-mono">
            <div className="p-3 border-b border-[#222738] flex items-center gap-2">
              <span className="text-sm text-[#7d8597]">🔍</span>
              <input
                type="text"
                autoFocus
                value={commandSearch}
                onChange={(e) => setCommandSearch(e.target.value)}
                placeholder="Jump to section or command..."
                className="w-full bg-transparent text-xs text-white placeholder-[#5a647d] focus:outline-none"
              />
              <kbd
                onClick={() => setCommandPaletteOpen(false)}
                className="px-1.5 py-0.5 rounded bg-[#181d2c] border border-[#262f44] text-[10px] text-[#7d8597] cursor-pointer"
              >
                ESC
              </kbd>
            </div>

            <div className="max-h-72 overflow-y-auto p-2 space-y-1 text-xs">
              {filteredCommands.map((cmd, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    cmd.action();
                    setCommandPaletteOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-white hover:bg-purple-600/20 hover:text-purple-300 transition-colors flex items-center justify-between"
                >
                  <span>{cmd.label}</span>
                  <span className="text-[10px] text-[#7d8597]">↵</span>
                </button>
              ))}
              {filteredCommands.length === 0 && (
                <div className="text-center py-4 text-[#7d8597]">No matching commands found</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

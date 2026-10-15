import React, { useState } from 'react';

export type ActiveTab =
  | 'overview'
  | 'endpoints'
  | 'keys'
  | 'providers'
  | 'services'
  | 'combos'
  | 'quota'
  | 'caveman'
  | 'compression'
  | 'usage'
  | 'costs'
  | 'free-tiers'
  | 'agents'
  | 'memory'
  | 'topology'
  | 'playground'
  | 'gamification'
  | 'storage'
  | 'doctor'
  | 'aliases'
  | 'cloud-team'
  | 'cloud-budgets';

export type EditionMode = 'oss' | 'cloud';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  edition: EditionMode;
  setEdition: (edition: EditionMode) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  isGatewayConnected: boolean;
}

interface NavItem {
  id: ActiveTab;
  label: string;
  tooltip: string;
  badge?: string;
  badgeColor?: string;
  externalUrl?: string;
}

interface AccordionCategory {
  id: string;
  title: string;
  icon: string;
  items: NavItem[];
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  edition,
  setEdition,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  isGatewayConnected,
}: SidebarProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    home: true,
    proxy: true,
    compression: true,
    analytics: true,
    costs: false,
    tools: true,
    other: false,
    config: false,
    help: false,
  });

  const [syncActive, setSyncActive] = useState(true);

  const toggleSection = (secId: string) => {
    setOpenSections((prev) => ({ ...prev, [secId]: !prev[secId] }));
  };

  const handleSelectTab = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    setMobileOpen(false);
  };

  const categories: AccordionCategory[] = [
    {
      id: 'home',
      title: 'HOME',
      icon: '🏠',
      items: [
        { id: 'overview', label: 'Home Overview', tooltip: 'Topology & Recent Requests' },
      ],
    },
    {
      id: 'proxy',
      title: 'ROUTENEX PROXY',
      icon: '⚡',
      items: [
        { id: 'endpoints', label: 'Endpoints & Tunnels', tooltip: 'HTTP /v1, MCP, A2A & LAN IP' },
        { id: 'keys', label: 'API Keys Manager', tooltip: 'Virtual hashed keys and spend limits' },
        { id: 'providers', label: 'Providers Hub', tooltip: '347+ Providers, 12 Categories', badge: '347' },
        { id: 'services', label: 'Embedded Services', tooltip: 'CLIProxyAPI, 9Router, Mux' },
        { id: 'combos', label: 'Combos & Studio', tooltip: 'Auto-Routing Templates & Cascades' },
        { id: 'quota', label: 'Provider Quota', tooltip: 'Quota Headroom & Reset Windows' },
      ],
    },
    {
      id: 'compression',
      title: 'COMPRESSION CONTEXT',
      icon: '🗜️',
      items: [
        { id: 'caveman', label: 'Caveman 10 Langs', tooltip: '10 Language Rule Packs', badge: '-38%' },
        { id: 'compression', label: 'Compression Studio', tooltip: 'Live Diff & Multi-Engine Cascade' },
      ],
    },
    {
      id: 'analytics',
      title: 'ANALYTICS & LOGS',
      icon: '📊',
      items: [
        { id: 'usage', label: 'Usage & Heatmap', tooltip: '365-Day Activity & Token Metrics' },
        { id: 'topology', label: 'Live Routing Trace', tooltip: 'Route Execution & Latency Graph' },
      ],
    },
    {
      id: 'costs',
      title: 'COSTS & BUDGETS',
      icon: '💰',
      items: [
        { id: 'costs', label: 'Cost Explorer', tooltip: '5-Dimension Spend Explorer' },
        { id: 'free-tiers', label: 'Free Tier Pools', tooltip: '1.62B Free Token Leaderboard', badge: '1.6B' },
      ],
    },
    {
      id: 'tools',
      title: 'TOOLS & AGENTIC',
      icon: '🤖',
      items: [
        { id: 'agents', label: 'Coding Agent Hub', tooltip: 'Claude, Cursor, Cline Presets' },
        { id: 'memory', label: 'Conversational Memory', tooltip: 'SQLite FTS5 Semantic Memory', badge: 'FTS5' },
        { id: 'playground', label: 'Prompt Playground', tooltip: 'Interactive Prompt Sandbox' },
      ],
    },
    {
      id: 'other',
      title: 'OTHER FEATURES',
      icon: '🏆',
      items: [
        { id: 'gamification', label: 'Gamification & Badges', tooltip: 'Level 2 & 23 Badges', badge: '23' },
      ],
    },
    {
      id: 'config',
      title: 'CONFIGURATION',
      icon: '⚙️',
      items: [
        { id: 'storage', label: 'Storage SQLite', tooltip: 'PRAGMA Stats, VACUUM, Exports' },
        { id: 'aliases', label: 'Model Aliases', tooltip: 'Virtual Model Map & Policy' },
        { id: 'doctor', label: 'System Doctor', tooltip: 'Runtime Diagnostics & Health' },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen shrink-0 border-r border-[#1f2433] bg-[#0c0f17] text-[#c3c8d4] transition-all duration-300 ease-in-out flex flex-col justify-between font-mono ${
          collapsed ? 'w-16' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Top Header / Branding */}
        <div className="p-3 border-b border-[#1b202e] flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform">
              ⚡
            </div>
            {!collapsed && (
              <div className="leading-tight">
                <span className="text-sm font-bold text-white tracking-tight">RouteNex</span>
                <span className="block text-[10px] text-[#7d8597]">
                  {edition === 'oss' ? 'OSS Local (0 Cloud Auth)' : 'Cloud Managed'}
                </span>
              </div>
            )}
          </a>

          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="text-[#6c7487] hover:text-white p-1 rounded hover:bg-[#181d2a]"
              title="Collapse Sidebar"
            >
              ◂
            </button>
          )}
        </div>

        {/* Edition Switcher Pill */}
        {!collapsed && (
          <div className="px-3 pt-2 pb-1">
            <div className="flex p-0.5 rounded-lg bg-[#141824] border border-[#222838] text-[10px]">
              <button
                type="button"
                onClick={() => setEdition('oss')}
                className={`flex-1 py-1 rounded transition-colors text-center font-semibold ${
                  edition === 'oss' ? 'bg-purple-600 text-white' : 'text-[#7d8597] hover:text-white'
                }`}
              >
                Local OSS
              </button>
              <button
                type="button"
                onClick={() => setEdition('cloud')}
                className={`flex-1 py-1 rounded transition-colors text-center font-semibold ${
                  edition === 'cloud' ? 'bg-sky-600 text-white' : 'text-[#7d8597] hover:text-white'
                }`}
              >
                Cloud SaaS
              </button>
            </div>
          </div>
        )}

        {/* Navigation Categories Scroll Area */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2 text-xs">
          {categories.map((cat) => {
            const isOpen = openSections[cat.id] ?? false;

            return (
              <div key={cat.id} className="space-y-0.5">
                {!collapsed ? (
                  <button
                    type="button"
                    onClick={() => toggleSection(cat.id)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded text-[11px] font-semibold text-[#6f788c] hover:text-white transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>{cat.icon}</span>
                      <span>{cat.title}</span>
                    </span>
                    <span className="text-[10px]">{isOpen ? '▾' : '▸'}</span>
                  </button>
                ) : (
                  <div className="text-center py-1 text-sm text-[#7d8597]">{cat.icon}</div>
                )}

                {(isOpen || collapsed) && (
                  <div className="space-y-0.5 pl-1">
                    {cat.items.map((item) => {
                      const isActive = activeTab === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectTab(item.id)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all ${
                            isActive
                              ? 'bg-purple-600/20 text-white font-semibold border border-purple-500/30'
                              : 'text-[#8e97ae] hover:text-white hover:bg-[#141926]'
                          } ${collapsed ? 'justify-center' : ''}`}
                          title={item.tooltip}
                        >
                          <span className="truncate">{!collapsed ? item.label : item.label.slice(0, 3)}</span>
                          {!collapsed && item.badge && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Docs Direct Jump Link */}
          {!collapsed && (
            <div className="pt-2 border-t border-[#1b202e]">
              <a
                href="/docs"
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[#8e97ae] hover:text-white hover:bg-[#141926] transition-colors text-xs"
              >
                <span className="flex items-center gap-1.5">
                  <span>📖</span>
                  <span>Full Docs (/docs)</span>
                </span>
                <span className="text-[10px] text-purple-400">→</span>
              </a>
            </div>
          )}
        </div>

        {/* Bottom Process Control Bar (OmniRoute Pattern) */}
        {!collapsed && (
          <div className="p-3 border-t border-[#1b202e] bg-[#0a0c13] space-y-2">
            <div className="flex items-center justify-between text-[11px] text-[#7d8597]">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isGatewayConnected ? 'bg-emerald-400' : 'bg-neutral-500'}`} />
                <span>Sync {syncActive ? 'On' : 'Off'}</span>
              </span>
              <button
                type="button"
                onClick={() => setSyncActive(!syncActive)}
                className="text-[10px] text-purple-400 hover:text-purple-300"
              >
                Toggle
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => alert('Restarting RouteNex local daemon...')}
                className="py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors"
              >
                Restart
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Shutdown RouteNex local gateway process?')) {
                    alert('Shutdown signal sent to gateway daemon.');
                  }
                }}
                className="py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors"
              >
                Shutdown
              </button>
            </div>
          </div>
        )}

        {/* Collapsed Expand Button */}
        {collapsed && (
          <div className="p-2 border-t border-[#1b202e] text-center">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="text-[#7d8597] hover:text-white p-1 rounded"
              title="Expand Sidebar"
            >
              ▸
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

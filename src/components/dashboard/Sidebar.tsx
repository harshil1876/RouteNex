import React, { useState } from 'react';

export type ActiveTab =
  | 'overview'
  | 'endpoints'
  | 'keys'
  | 'providers'
  | 'models'
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
  | 'aliases';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
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
      icon: '⚡',
      items: [
        { id: 'overview', label: 'Home Overview', tooltip: 'Topology & Live Requests' },
      ],
    },
    {
      id: 'proxy',
      title: 'ROUTENEX GATEWAY',
      icon: '🌐',
      items: [
        { id: 'endpoints', label: 'Endpoints & Tunnels', tooltip: 'HTTP /v1, MCP, A2A & LAN IP' },
        { id: 'keys', label: 'API Keys Manager', tooltip: 'Virtual hashed keys and spend limits' },
        { id: 'providers', label: 'Providers Hub', tooltip: '120+ Providers, 12 Categories', badge: '120+' },
        { id: 'models', label: 'Models Explorer', tooltip: '350+ Providers / 1,400+ Models Catalog', badge: '1,400+' },
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
      title: 'TOOLS & AGENTS',
      icon: '🤖',
      items: [
        { id: 'agents', label: 'Coding Agent Hub', tooltip: 'Claude, Cursor, Cline Presets' },
        { id: 'memory', label: 'Conversational Memory', tooltip: 'SQLite FTS5 Semantic Memory', badge: 'FTS5' },
        { id: 'playground', label: 'Prompt Playground', tooltip: 'Interactive Prompt Sandbox' },
      ],
    },
    {
      id: 'other',
      title: 'DEVELOPER PROFILE',
      icon: '🏆',
      items: [
        { id: 'gamification', label: 'Achievements & Badges', tooltip: 'Live Token Milestones & Badges', badge: '23' },
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
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen shrink-0 border-r border-[#222226] bg-[#09090b] text-zinc-300 transition-all duration-200 ease-in-out flex flex-col justify-between font-mono ${
          collapsed ? 'w-16' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Top Header / Branding */}
        <div className="p-3 border-b border-[#222226] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-zinc-100 text-zinc-950 flex items-center justify-center font-bold text-xs shadow-xs">
              RN
            </div>
            {!collapsed && (
              <div className="leading-tight">
                <span className="text-xs font-semibold text-zinc-100 tracking-tight">RouteNex</span>
                <span className="block text-[10px] text-zinc-500">
                  Local Gateway Daemon
                </span>
              </div>
            )}
          </div>

          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="text-zinc-500 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800 transition"
              title="Collapse Sidebar"
            >
              ◂
            </button>
          )}
        </div>

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
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded text-[11px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>{cat.icon}</span>
                      <span>{cat.title}</span>
                    </span>
                    <span className="text-[10px]">{isOpen ? '▾' : '▸'}</span>
                  </button>
                ) : (
                  <div className="text-center py-1 text-sm text-zinc-500">{cat.icon}</div>
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
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-all text-xs ${
                            isActive
                              ? 'bg-zinc-800 text-zinc-100 font-medium border border-zinc-700 shadow-xs'
                              : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                          } ${collapsed ? 'justify-center' : ''}`}
                          title={item.tooltip}
                        >
                          <span className="truncate">{!collapsed ? item.label : item.label.slice(0, 3)}</span>
                          {!collapsed && item.badge && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
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
            <div className="pt-2 border-t border-[#222226]">
              <a
                href="/docs"
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors text-xs"
              >
                <span className="flex items-center gap-1.5">
                  <span>📖</span>
                  <span>Documentation</span>
                </span>
                <span className="text-[10px] text-zinc-500">→</span>
              </a>
            </div>
          )}
        </div>

        {/* Bottom Process Control Bar (OmniRoute Pattern) */}
        {!collapsed && (
          <div className="p-3 border-t border-[#222226] bg-[#0c0c0e] space-y-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isGatewayConnected ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50' : 'bg-zinc-600'}`} />
                <span>Gateway {isGatewayConnected ? 'Online' : 'Offline'}</span>
              </span>
              <button
                type="button"
                onClick={() => setSyncActive(!syncActive)}
                className="text-[10px] text-zinc-400 hover:text-zinc-200"
              >
                Sync {syncActive ? 'On' : 'Off'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => alert('Restarting RouteNex local daemon...')}
                className="py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 transition"
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
                className="py-1 rounded bg-red-950/30 hover:bg-red-900/40 text-red-400 border border-red-900/40 transition"
              >
                Shutdown
              </button>
            </div>
          </div>
        )}

        {/* Collapsed Expand Button */}
        {collapsed && (
          <div className="p-2 border-t border-[#222226] text-center">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="text-zinc-500 hover:text-zinc-200 p-1 rounded"
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

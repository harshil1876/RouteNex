import React, { useState, useEffect } from 'react';

export type ActiveTab =
  | 'overview'
  | 'playground'
  | 'free-tiers'
  | 'providers'
  | 'combos'
  | 'aliases'
  | 'agents'
  | 'keys'
  | 'requests'
  | 'doctor'
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
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  tooltip: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
  cloudOnly?: boolean;
  ossOnly?: boolean;
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
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Close mobile sidebar on tab change
  const handleSelectTab = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    setMobileOpen(false);
  };

  const SECTIONS: NavSection[] = [
    {
      title: 'CORE',
      items: [
        {
          id: 'overview',
          label: 'Overview',
          tooltip: 'System Overview & Live Metrics',
          icon: (
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          ),
        },
        {
          id: 'playground',
          label: 'Playground',
          tooltip: 'Interactive Prompt Tester',
          badge: 'Test',
          badgeColor: 'bg-neutral-200 dark:bg-neutral-800 text-ink',
          icon: (
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
          ),
        },
      ],
    },
    {
      title: 'ROUTING ENGINE',
      items: [
        {
          id: 'free-tiers',
          label: 'Free Tier Pools',
          tooltip: '1.6B/mo Free Token Pools & Quotas',
          badge: '1.6B',
          badgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800',
          icon: (
            <svg className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"></path>
              <path d="M4 6v12c0 1.1.9 2 2 2h14v-4"></path>
              <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"></path>
            </svg>
          ),
        },
        {
          id: 'providers',
          label: 'BYOK Providers',
          tooltip: 'Manage Provider Keys (Groq, Cerebras, DeepSeek)',
          icon: (
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
              <line x1="6" y1="6" x2="6.01" y2="6"></line>
              <line x1="6" y1="18" x2="6.01" y2="18"></line>
            </svg>
          ),
        },
        {
          id: 'combos',
          label: 'Combos & Clusters',
          tooltip: 'Grouped Failover & Auto-Routing Pools',
          badge: 'Auto',
          badgeColor: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800',
          icon: (
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 3 21 3 21 8"></polyline>
              <line x1="4" y1="20" x2="21" y2="3"></line>
              <polyline points="21 16 21 21 16 21"></polyline>
              <line x1="15" y1="15" x2="21" y2="21"></line>
              <line x1="4" y1="4" x2="9" y2="9"></line>
            </svg>
          ),
        },
        {
          id: 'aliases',
          label: 'Model Aliases',
          tooltip: 'Virtual Model Mapping & Policy',
          icon: (
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
              <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
          ),
        },
      ],
    },
    {
      title: 'DEVELOPER TOOLS',
      items: [
        {
          id: 'agents',
          label: 'Agent Setup Hub',
          tooltip: 'Cursor, Claude Code, Cline, Aider Integrations',
          badge: 'Presets',
          badgeColor: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800',
          icon: (
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="4" width="16" height="16" rx="2"></rect>
              <rect x="9" y="9" width="6" height="6"></rect>
              <line x1="9" y1="1" x2="9" y2="4"></line>
              <line x1="15" y1="1" x2="15" y2="4"></line>
              <line x1="9" y1="20" x2="9" y2="23"></line>
              <line x1="15" y1="20" x2="15" y2="23"></line>
              <line x1="20" y1="9" x2="23" y2="9"></line>
              <line x1="20" y1="14" x2="23" y2="14"></line>
              <line x1="1" y1="9" x2="4" y2="9"></line>
              <line x1="1" y1="14" x2="4" y2="14"></line>
            </svg>
          ),
        },
        {
          id: 'keys',
          label: 'Virtual Keys',
          tooltip: 'Generate rn-local-... Gateway Keys',
          icon: (
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 2l-2 2m-1.5 1.5L14 9l-1.5-1.5L11 9l-1.5-1.5L8 9 3 14v7h7l5-5-1.5-1.5L15 13l1.5-1.5L18 10l1.5-1.5L21 7l-2-2z"></path>
            </svg>
          ),
        },
      ],
    },
    {
      title: 'OBSERVABILITY',
      items: [
        {
          id: 'requests',
          label: 'Request Inspector',
          tooltip: 'Inspect Real-time Requests & Payloads',
          icon: (
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          ),
        },
        {
          id: 'doctor',
          label: 'Doctor Diagnostics',
          tooltip: 'Self-Check Health, Circuits & Ports',
          icon: (
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
          ),
        },
      ],
    },
    {
      title: 'CLOUD SAAS',
      cloudOnly: true,
      items: [
        {
          id: 'cloud-team',
          label: 'Team & Workspaces',
          tooltip: 'Organization Members & RBAC Permissions',
          icon: (
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          ),
        },
        {
          id: 'cloud-budgets',
          label: 'Spend Budgets & Caps',
          tooltip: 'Team Spend Limits & Alerts',
          icon: (
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          ),
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen shrink-0 border-r border-hairline bg-elevated transition-all duration-300 ease-in-out flex flex-col justify-between ${
          collapsed ? 'w-16' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Top Header & Workspace Switcher */}
        <div className="flex flex-col border-b border-hairline">
          {/* Logo & Brand Header */}
          <div className="flex items-center justify-between p-3.5 h-14">
            <a href="/" className="flex items-center gap-2.5 overflow-hidden transition hover:opacity-90">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-ink text-white dark:bg-white dark:text-black">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 12l10 10 10-10L12 2z"></path>
                  <circle cx="12" cy="12" r="2.5" fill="currentColor"></circle>
                </svg>
              </span>
              {!collapsed && (
                <div className="flex flex-col">
                  <span className="text-sm font-semibold tracking-tight text-ink font-sans">RouteNex</span>
                </div>
              )}
            </a>

            {/* Desktop Collapse / Expand Toggle Button */}
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:flex h-7 w-7 items-center justify-center rounded-md border border-hairline text-mute hover:text-ink hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              title={collapsed ? 'Expand Sidebar (Ctrl+B)' : 'Collapse Sidebar (Ctrl+B)'}
            >
              {collapsed ? (
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              )}
            </button>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="md:hidden flex h-7 w-7 items-center justify-center rounded-md text-mute hover:text-ink"
            >
              ✕
            </button>
          </div>

          {/* Workspace / Edition Dropdown Switcher */}
          <div className="p-2 relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`w-full flex items-center justify-between rounded-lg border border-hairline bg-canvas p-2 text-xs font-mono transition hover:border-neutral-400 dark:hover:border-neutral-600 ${
                collapsed ? 'justify-center' : ''
              }`}
              title={edition === 'oss' ? 'Local Gateway (Open Source)' : 'RouteNex Cloud (Managed SaaS)'}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-base shrink-0">{edition === 'oss' ? '🖥️' : '☁️'}</span>
                {!collapsed && (
                  <div className="text-left leading-tight truncate">
                    <span className="font-semibold text-ink block truncate">
                      {edition === 'oss' ? 'Local Gateway' : 'RouteNex Cloud'}
                    </span>
                    <span className="text-[10px] text-mute block truncate">
                      {edition === 'oss' ? '127.0.0.1:3001' : 'api.routenex.com'}
                    </span>
                  </div>
                )}
              </div>
              {!collapsed && (
                <span className="text-mute text-[10px]">▼</span>
              )}
            </button>

            {/* Switcher Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute top-full left-2 right-2 mt-1 z-50 rounded-lg border border-hairline bg-elevated shadow-xl p-1 text-xs font-mono space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setEdition('oss');
                    setDropdownOpen(false);
                    if (activeTab === 'cloud-team' || activeTab === 'cloud-budgets') {
                      setActiveTab('overview');
                    }
                  }}
                  className={`w-full flex items-center gap-2 p-2 rounded text-left transition ${
                    edition === 'oss' ? 'bg-neutral-100 dark:bg-neutral-800 text-ink font-semibold' : 'text-body hover:bg-neutral-50 dark:hover:bg-neutral-900'
                  }`}
                >
                  <span className="text-sm">🖥️</span>
                  <div>
                    <div className="font-semibold text-ink">RouteNex Open Source</div>
                    <div className="text-[10px] text-mute">100% Free • Self-Hosted Gateway</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEdition('cloud');
                    setDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 p-2 rounded text-left transition ${
                    edition === 'cloud' ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-semibold' : 'text-body hover:bg-neutral-50 dark:hover:bg-neutral-900'
                  }`}
                >
                  <span className="text-sm">☁️</span>
                  <div>
                    <div className="font-semibold text-ink">RouteNex Cloud</div>
                    <div className="text-[10px] text-mute">Hosted Edge • Teams & Workspaces</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {SECTIONS.filter((s) => !s.cloudOnly || edition === 'cloud').map((section) => (
            <div key={section.title} className="space-y-1">
              {!collapsed && (
                <div className="px-2 pb-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-mute">
                  {section.title}
                </div>
              )}

              {section.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`group relative w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-mono transition ${
                      collapsed ? 'justify-center px-0' : 'justify-between'
                    } ${
                      isActive
                        ? 'bg-ink text-white font-semibold dark:bg-white dark:text-black shadow-xs'
                        : 'text-body hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-ink'
                    }`}
                    title={collapsed ? item.tooltip : undefined}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className={isActive ? 'text-white dark:text-black' : 'text-mute group-hover:text-ink'}>
                        {item.icon}
                      </span>
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {!collapsed && item.badge && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${item.badgeColor || 'bg-neutral-100 text-mute'}`}>
                        {item.badge}
                      </span>
                    )}

                    {/* Floating Tooltip in Collapsed Mode */}
                    {collapsed && (
                      <span className="pointer-events-none absolute left-full ml-2.5 z-50 hidden rounded-md bg-neutral-900 text-neutral-100 px-2 py-1 text-[11px] font-mono whitespace-nowrap shadow-md group-hover:block">
                        {item.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom Footer Status & Info */}
        <div className="border-t border-hairline p-3 flex flex-col gap-2 shrink-0">
          <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-1.5" title={isGatewayConnected ? 'Connected to 127.0.0.1:3001' : 'Gateway Offline'}>
              <span className={`h-2 w-2 rounded-full shrink-0 ${isGatewayConnected ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`}></span>
              {!collapsed && (
                <span className="text-[11px] font-mono text-mute truncate">
                  {isGatewayConnected ? '127.0.0.1:3001' : 'Offline'}
                </span>
              )}
            </div>

            {!collapsed && (
              <span className="text-[10px] font-mono text-mute">v0.1.0</span>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

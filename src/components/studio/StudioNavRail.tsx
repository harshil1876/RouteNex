import React from 'react';
import RouteNexLogo from '../common/RouteNexLogo';

export type StudioNavItemId =
  | 'overview'
  | 'providers'
  | 'routing'
  | 'optimizer'
  | 'logs'
  | 'costs'
  | 'agents'
  | 'keys'
  | 'settings';

interface StudioNavRailProps {
  activeItem: StudioNavItemId;
  setActiveItem: (item: StudioNavItemId) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  mode: 'oss' | 'cloud';
  isGatewayConnected: boolean;
}

interface NavItemConfig {
  id: StudioNavItemId;
  label: string;
  icon: (active: boolean) => React.ReactNode;
  badge?: string;
}

export default function StudioNavRail({
  activeItem,
  setActiveItem,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  mode,
  isGatewayConnected,
}: StudioNavRailProps) {
  const navItems: NavItemConfig[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: (active) => (
        <svg className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-sky-400' : 'text-zinc-400 group-hover:text-zinc-200'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect width="7" height="7" x="3" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="14" rx="1" />
          <rect width="7" height="7" x="3" y="14" rx="1" />
        </svg>
      ),
    },
    {
      id: 'providers',
      label: 'Providers & Models',
      icon: (active) => (
        <svg className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-sky-400' : 'text-zinc-400 group-hover:text-zinc-200'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
          <path d="m22 12.5-8.58 3.91a2 2 0 0 1-1.66 0L2 12.5" />
          <path d="m22 17.5-8.58 3.91a2 2 0 0 1-1.66 0L2 17.5" />
        </svg>
      ),
    },
    {
      id: 'routing',
      label: 'Routing & Combos',
      icon: (active) => (
        <svg className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-sky-400' : 'text-zinc-400 group-hover:text-zinc-200'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="18" r="3" />
          <circle cx="6" cy="6" r="3" />
          <circle cx="18" cy="6" r="3" />
          <path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9" />
          <path d="M12 12v3" />
        </svg>
      ),
    },
    {
      id: 'optimizer',
      label: 'Token Optimizer',
      icon: (active) => (
        <svg className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-sky-400' : 'text-zinc-400 group-hover:text-zinc-200'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
        </svg>
      ),
    },
    {
      id: 'logs',
      label: 'Logs & Activity',
      icon: (active) => (
        <svg className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-sky-400' : 'text-zinc-400 group-hover:text-zinc-200'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      ),
    },
    {
      id: 'costs',
      label: 'Cost & Quotas',
      icon: (active) => (
        <svg className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-sky-400' : 'text-zinc-400 group-hover:text-zinc-200'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
          <path d="M22 12A10 10 0 0 0 12 2v10z" />
        </svg>
      ),
    },
    {
      id: 'agents',
      label: 'Workers & Agents',
      icon: (active) => (
        <svg className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-sky-400' : 'text-zinc-400 group-hover:text-zinc-200'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" x2="20" y1="19" y2="19" />
        </svg>
      ),
    },
    {
      id: 'keys',
      label: 'API Keys',
      icon: (active) => (
        <svg className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-sky-400' : 'text-zinc-400 group-hover:text-zinc-200'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="7.5" cy="15.5" r="5.5" />
          <path d="m21 2-9.6 9.6" />
          <path d="m15.5 7.5 3 3L22 7l-3-3" />
        </svg>
      ),
    },
    {
      id: 'settings',
      label: 'Guardrails & Settings',
      icon: (active) => (
        <svg className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-sky-400' : 'text-zinc-400 group-hover:text-zinc-200'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Navigation Rail Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen shrink-0 border-r border-[#222226] bg-[#09090b] text-zinc-300 transition-all duration-200 ease-in-out flex flex-col justify-between font-sans ${
          collapsed ? 'w-16' : 'w-60'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-14 px-4 border-b border-[#222226] flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 group">
            <RouteNexLogo className="w-7 h-7" size={28} />
            {!collapsed && (
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-zinc-100 tracking-tight font-sans">RouteNex</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                    {mode === 'cloud' ? 'Cloud' : 'OSS'}
                  </span>
                </div>
              </div>
            )}
          </a>

          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="text-zinc-500 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800/60 transition"
              title="Collapse Sidebar"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          )}
        </div>

        {/* Navigation Rows (OpenRouter 36px Single-Line Style) */}
        <div className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeItem === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveItem(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 h-9 px-3 rounded-lg text-sm transition-all group ${
                  isActive
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 border border-transparent font-normal'
                } ${collapsed ? 'justify-center px-0' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                {item.icon(isActive)}
                {!collapsed && (
                  <span className="truncate tracking-tight">{item.label}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Status & Control Bar */}
        <div className="p-3 border-t border-[#222226] space-y-2 bg-[#09090b]">
          {!collapsed ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isGatewayConnected ? 'bg-sky-400' : 'bg-zinc-600'}`} />
                  <span className="text-zinc-300 font-medium">
                    {mode === 'cloud' ? 'Cloud Edge Active' : isGatewayConnected ? 'Gateway Online' : 'Gateway Standby'}
                  </span>
                </div>
                <span className="text-[11px] text-zinc-500 font-mono">v0.2.0</span>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs text-zinc-400">
                <a href="/docs" className="hover:text-sky-400 transition flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                  <span>Docs</span>
                </a>
                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  className="hover:text-zinc-200 transition text-[11px]"
                >
                  Collapse
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isGatewayConnected ? 'bg-sky-400' : 'bg-zinc-600'}`} />
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                className="text-zinc-500 hover:text-white text-xs p-1"
                title="Expand Rail"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

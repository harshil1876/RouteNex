import React from 'react';

export type PillarId = 'flight-deck' | 'providers-models' | 'routing-combos' | 'nexcompress' | 'telemetry-settings';

interface StudioNavRailProps {
  activePillar: PillarId;
  setActivePillar: (pillar: PillarId) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  mode: 'oss' | 'cloud';
  isGatewayConnected: boolean;
}

export interface PillarConfig {
  id: PillarId;
  number: string;
  label: string;
  tagline: string;
  icon: string;
  badge?: string;
}

export const PILLARS: PillarConfig[] = [
  {
    id: 'flight-deck',
    number: '01',
    label: 'Flight Deck',
    tagline: 'NexFlow Pipeline & Overview',
    icon: '⚡',
  },
  {
    id: 'providers-models',
    number: '02',
    label: 'Providers & Models',
    tagline: '120+ Providers & 204+ Models',
    icon: '🧠',
    badge: '120+',
  },
  {
    id: 'routing-combos',
    number: '03',
    label: 'Smart Routing & Combos',
    tagline: '19 Policies & Failover Chains',
    icon: '🔀',
  },
  {
    id: 'nexcompress',
    number: '04',
    label: 'NexCompress & Memory',
    tagline: 'LexiPack & Token Optimizer',
    icon: '🗜️',
    badge: '-38%',
  },
  {
    id: 'telemetry-settings',
    number: '05',
    label: 'Telemetry & Settings',
    tagline: 'Logs, 36 Agents & Controls',
    icon: '📊',
  },
];

export default function StudioNavRail({
  activePillar,
  setActivePillar,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  mode,
  isGatewayConnected,
}: StudioNavRailProps) {
  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Navigation Rail Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen shrink-0 border-r border-[#1e2333] bg-[#090b10] text-zinc-300 transition-all duration-200 ease-in-out flex flex-col justify-between font-mono ${
          collapsed ? 'w-16' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="p-3.5 border-b border-[#1e2333] flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-cyan-400 text-zinc-950 flex items-center justify-center font-bold text-xs shadow-[0_0_12px_rgba(0,242,254,0.3)]">
              RN
            </div>
            {!collapsed && (
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-zinc-100 tracking-tight font-sans">RouteNex Studio</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                    {mode === 'cloud' ? 'Cloud' : 'OSS'}
                  </span>
                </div>
                <span className="block text-[10px] text-zinc-500 font-mono">
                  {mode === 'cloud' ? 'Multi-Tenant Edge' : 'Local Gateway'}
                </span>
              </div>
            )}
          </a>

          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="text-zinc-500 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800/60 transition"
              title="Collapse Rail"
            >
              ◀
            </button>
          )}
        </div>

        {/* 5 Primary Pillars */}
        <div className="flex-1 p-2 space-y-1.5 overflow-y-auto">
          <div className={`px-2 py-1 text-[10px] text-zinc-500 uppercase tracking-wider font-semibold ${collapsed ? 'text-center' : ''}`}>
            {collapsed ? '•••' : 'Core Pillars'}
          </div>

          {PILLARS.map((p) => {
            const isActive = activePillar === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setActivePillar(p.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                  isActive
                    ? 'bg-[#151a28] border border-cyan-500/50 text-white shadow-[0_0_12px_rgba(0,242,254,0.12)]'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#111420] border border-transparent'
                }`}
                title={collapsed ? `${p.number} / ${p.label}` : undefined}
              >
                <span className="text-base shrink-0 group-hover:scale-110 transition-transform">
                  {p.icon}
                </span>

                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold tracking-tight truncate">
                        {p.number} / {p.label}
                      </span>
                      {p.badge && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/40">
                          {p.badge}
                        </span>
                      )}
                    </div>
                    <span className="block text-[10px] text-zinc-500 truncate mt-0.5">
                      {p.tagline}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Status & Tunnels Bar */}
        <div className="p-3 border-t border-[#1e2333] space-y-2 bg-[#0b0d14]">
          {!collapsed ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isGatewayConnected ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'}`} />
                  <span className="text-zinc-300 font-semibold">
                    {mode === 'cloud' ? 'Cloud Edge Active' : isGatewayConnected ? 'Daemon Online' : 'Core Standby'}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">v0.2.0</span>
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-500">
                <a href="/docs" className="hover:text-cyan-300 transition flex items-center gap-1">
                  <span>📖 Docs (/docs)</span>
                </a>
                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  className="hover:text-zinc-300 transition"
                >
                  ◀ Minimize
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isGatewayConnected ? 'bg-emerald-400' : 'bg-cyan-400'}`} />
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                className="text-zinc-500 hover:text-white text-xs p-1"
                title="Expand Rail"
              >
                ▶
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

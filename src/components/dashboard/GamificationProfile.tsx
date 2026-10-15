import React from 'react';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: string;
}

export default function GamificationProfile() {
  const currentXp = 120;
  const nextLevelXp = 519;
  const xpPercent = Math.round((currentXp / nextLevelXp) * 100);

  const badges: Badge[] = [
    { id: 'b1', name: 'First Token', description: 'Routed your first LLM token through RouteNex', icon: '🌱', unlocked: true },
    { id: 'b2', name: 'Token Consumer', description: 'Routed 100,000+ tokens through the gateway', icon: '⚡', unlocked: true, progress: '100%' },
    { id: 'b3', name: 'Token Machine', description: 'Routed 1,000,000+ tokens across all providers', icon: '🦾', unlocked: true, progress: '100%' },
    { id: 'b4', name: 'Token Whale', description: 'Routed 10,000,000+ tokens through RouteNex', icon: '🐋', unlocked: false, progress: '18%' },
    { id: 'b5', name: 'Generous', description: 'Shared API keys or quota headroom with team', icon: '🤝', unlocked: false, progress: '0%' },
    { id: 'b6', name: 'Philanthropist', description: 'Saved 500,000+ tokens using Caveman compression', icon: '🎁', unlocked: false, progress: '63%' },
    { id: 'b7', name: 'Token Santa', description: 'Distributed 100M free tokens in a single month', icon: '🎅', unlocked: false, progress: '2%' },
    { id: 'b8', name: 'Community Hero', description: 'Contributed an upstream adapter to RouteNex repo', icon: '🦸', unlocked: false, progress: '0%' },
    { id: 'b9', name: 'Explorer', description: 'Tested completions on 10+ distinct providers', icon: '🧭', unlocked: true, progress: '100%' },
    { id: 'b10', name: 'Polyglot', description: 'Enabled 5+ Caveman compression language packs', icon: '🗣️', unlocked: true, progress: '100%' },
    { id: 'b11', name: 'Architect', description: 'Created 3+ custom multi-model fallback combos', icon: '🏛️', unlocked: true, progress: '100%' },
    { id: 'b12', name: 'Speedster', description: 'Achieved sub-100ms time-to-first-token on Groq', icon: '🏎️', unlocked: true, progress: '100%' },
    { id: 'b13', name: 'Resilient', description: 'Survived 50 circuit-breaker provider failovers', icon: '🛡️', unlocked: false, progress: '40%' },
    { id: 'b14', name: 'Radar Supporter', description: 'Connected both OpenRouter and NVIDIA NIM', icon: '📡', unlocked: false, progress: '50%' },
    { id: 'b15', name: 'Daily User', description: 'Executed gateway completions 7 days in a row', icon: '📅', unlocked: false, progress: '4/7 days' },
    { id: 'b16', name: 'Compression Master', description: 'Pruned over 40% of prompt tokens in a session', icon: '🗜️', unlocked: true, progress: '100%' },
    { id: 'b17', name: 'MCP Autonomous', description: 'Used Claude Code with built-in routenex MCP', icon: '🤖', unlocked: true, progress: '100%' },
    { id: 'b18', name: 'Prompt Wizard', description: 'Tested 50+ playground prompt completions', icon: '🧙', unlocked: false, progress: '24/50' },
    { id: 'b19', name: 'Zero Cost Champion', description: 'Routed 1,000 requests without spending a cent', icon: '🏆', unlocked: true, progress: '100%' },
    { id: 'b20', name: 'Night Owl', description: 'Executed coding completions past 3:00 AM', icon: '🦉', unlocked: true, progress: '100%' },
    { id: 'b21', name: 'Streak Keeper', description: 'Maintained 30-day continuous gateway uptime', icon: '🔥', unlocked: false, progress: '12/30 days' },
    { id: 'b22', name: 'Bug Hunter', description: 'Verified ToS Caution guard block on DuckDuckGo', icon: '🔍', unlocked: true, progress: '100%' },
    { id: 'b23', name: 'RouteNex Pioneer', description: 'Ran RouteNex v0.2.0 Open Source release', icon: '🚀', unlocked: true, progress: '100%' },
  ];

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#222738]">
        <div>
          <h2 className="text-base font-semibold text-white font-mono tracking-tight">Gamification Profile & Badges</h2>
          <p className="text-xs text-[#8f96a3]">Track your developer level, token milestones, and unlockable achievements.</p>
        </div>
        <div className="text-xs font-mono text-purple-400 bg-purple-500/10 border border-purple-500/30 px-3 py-1 rounded-full">
          Tier: Bronze · Level 2
        </div>
      </div>

      {/* User Level Card */}
      <div className="p-6 rounded-xl bg-gradient-to-r from-purple-950/40 via-[#121622] to-[#121622] border border-purple-500/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-2xl shadow-xl shadow-purple-600/30 border border-purple-400/40">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-mono">Developer Level 2</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">
                  Beginner
                </span>
              </div>
              <p className="text-xs text-[#8f96a3] font-mono mt-0.5">
                Next rank: <span className="text-white font-semibold">Level 3 (Apprentice Router)</span>
              </p>
            </div>
          </div>

          <div className="text-right font-mono">
            <span className="text-xs text-[#7d8597]">Experience Points</span>
            <div className="text-lg font-bold text-white">
              {currentXp} <span className="text-xs font-normal text-[#7d8597]">/ {nextLevelXp} XP</span>
            </div>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-mono text-[#7d8597]">
            <span>Level 2</span>
            <span>{xpPercent}% to Level 3</span>
            <span>Level 3</span>
          </div>
          <div className="h-3 w-full rounded-full bg-[#1b2131] overflow-hidden p-0.5 border border-[#262f44]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all shadow-sm"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Badges Achievement Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-white font-mono uppercase tracking-wider">
            Badges ({unlockedCount} / {badges.length} Unlocked)
          </h3>
          <span className="text-xs text-[#7d8597] font-mono">
            {Math.round((unlockedCount / badges.length) * 100)}% Completed
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {badges.map((b) => (
            <div
              key={b.id}
              className={`p-4 rounded-xl border transition-all ${
                b.unlocked
                  ? 'bg-[#141825] border-purple-500/30 shadow-sm'
                  : 'bg-[#10131d]/60 border-[#1d2334] opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0 p-2 rounded-lg bg-[#181d2c] border border-[#262f44]">
                  {b.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-white font-mono truncate">{b.name}</h4>
                    {b.unlocked ? (
                      <span className="text-[10px] text-emerald-400 font-mono">✓</span>
                    ) : (
                      <span className="text-[10px] text-[#7d8597] font-mono">🔒</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#8f96a3] mt-1 leading-snug">{b.description}</p>
                  {b.progress && (
                    <span className="text-[10px] font-mono text-purple-400 block mt-2">
                      Progress: {b.progress}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

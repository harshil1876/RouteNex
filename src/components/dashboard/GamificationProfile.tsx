import React, { useState, useEffect } from 'react';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: string;
}

export default function GamificationProfile() {
  const [totalTokens, setTotalTokens] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);

  useEffect(() => {
    async function fetchStats() {
      try {
        const token = localStorage.getItem('routenex_admin_token') || 'rn-local-dev-default';
        const res = await fetch('http://127.0.0.1:3001/v1/usage', {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);

        if (res && res.ok) {
          const data = await res.json();
          if (data) {
            setTotalTokens(data.total_tokens || 0);
            setTotalRequests(data.total_requests || 0);
          }
        }
      } catch {
        // Gateway offline or fresh
      }
    }

    fetchStats();
  }, []);

  const currentXp = Math.floor(totalTokens / 100) + totalRequests * 10;
  const level = Math.floor(currentXp / 100) + 1;
  const nextLevelXp = level * 100;
  const xpInCurrentLevel = currentXp % 100;
  const xpPercent = Math.min(100, Math.round((xpInCurrentLevel / 100) * 100));

  const badges: Badge[] = [
    { id: 'b1', name: 'First Token', description: 'Routed your first LLM token through RouteNex', icon: '🌱', unlocked: totalTokens > 0, progress: totalTokens > 0 ? '100%' : '0%' },
    { id: 'b2', name: 'Token Consumer', description: 'Routed 100,000+ tokens through the gateway', icon: '⚡', unlocked: totalTokens >= 100000, progress: `${Math.min(100, Math.round((totalTokens / 100000) * 100))}%` },
    { id: 'b3', name: 'Token Machine', description: 'Routed 1,000,000+ tokens across all providers', icon: '🦾', unlocked: totalTokens >= 1000000, progress: `${Math.min(100, Math.round((totalTokens / 1000000) * 100))}%` },
    { id: 'b4', name: 'Token Whale', description: 'Routed 10,000,000+ tokens through RouteNex', icon: '🐋', unlocked: totalTokens >= 10000000, progress: `${Math.min(100, Math.round((totalTokens / 10000000) * 100))}%` },
    { id: 'b5', name: 'Generous', description: 'Shared API keys or quota headroom with team', icon: '🤝', unlocked: false, progress: '0%' },
    { id: 'b6', name: 'Philanthropist', description: 'Saved 500,000+ tokens using Caveman compression', icon: '🎁', unlocked: false, progress: '0%' },
    { id: 'b7', name: 'Token Santa', description: 'Distributed 100M free tokens in a single month', icon: '🎅', unlocked: false, progress: '0%' },
    { id: 'b8', name: 'Community Hero', description: 'Contributed an upstream adapter to RouteNex repo', icon: '🦸', unlocked: false, progress: '0%' },
    { id: 'b9', name: 'Explorer', description: 'Tested completions on 10+ distinct providers', icon: '🧭', unlocked: false, progress: '0%' },
    { id: 'b10', name: 'Polyglot', description: 'Enabled 5+ Caveman compression language packs', icon: '🗣️', unlocked: false, progress: '0%' },
    { id: 'b11', name: 'Architect', description: 'Created 3+ custom multi-model fallback combos', icon: '🏛️', unlocked: false, progress: '0%' },
    { id: 'b12', name: 'Speedster', description: 'Achieved sub-100ms time-to-first-token on Groq', icon: '🏎️', unlocked: false, progress: '0%' },
    { id: 'b13', name: 'Resilient', description: 'Survived 50 circuit-breaker provider failovers', icon: '🛡️', unlocked: false, progress: '0%' },
    { id: 'b14', name: 'Radar Supporter', description: 'Connected both OpenRouter and NVIDIA NIM', icon: '📡', unlocked: false, progress: '0%' },
    { id: 'b15', name: 'Daily User', description: 'Executed gateway completions 7 days in a row', icon: '📅', unlocked: false, progress: '0/7 days' },
    { id: 'b16', name: 'Compression Master', description: 'Pruned over 40% of prompt tokens in a session', icon: '🗜️', unlocked: false, progress: '0%' },
    { id: 'b17', name: 'MCP Autonomous', description: 'Used Claude Code with built-in routenex MCP', icon: '🤖', unlocked: false, progress: '0%' },
    { id: 'b18', name: 'Prompt Wizard', description: 'Tested 50+ playground prompt completions', icon: '🧙', unlocked: false, progress: '0/50' },
    { id: 'b19', name: 'Zero Cost Champion', description: 'Routed 1,000 requests without spending a cent', icon: '🏆', unlocked: totalRequests >= 1000, progress: `${Math.min(100, Math.round((totalRequests / 1000) * 100))}%` },
    { id: 'b20', name: 'Night Owl', description: 'Executed coding completions past 3:00 AM', icon: '🦉', unlocked: false, progress: '0%' },
    { id: 'b21', name: 'Streak Keeper', description: 'Maintained 30-day continuous gateway uptime', icon: '🔥', unlocked: false, progress: '0/30 days' },
    { id: 'b22', name: 'Bug Hunter', description: 'Verified ToS Caution guard block on DuckDuckGo', icon: '🔍', unlocked: false, progress: '0%' },
    { id: 'b23', name: 'RouteNex Pioneer', description: 'Ran RouteNex v0.2.0 Open Source release', icon: '🚀', unlocked: true, progress: '100%' },
  ];

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222226]">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 font-sans tracking-tight">
            Developer Profile & Achievements
          </h2>
          <p className="text-zinc-500 font-sans text-xs mt-0.5">
            Track your developer milestones, token metrics, and unlockable achievements.
          </p>
        </div>
        <div className="text-xs font-mono text-zinc-300 bg-zinc-800 border border-zinc-700 px-3 py-1 rounded-full">
          Tier: Bronze · Level {level}
        </div>
      </div>

      {/* User Level Card */}
      <div className="p-6 rounded-xl bg-[#111113] border border-[#222226] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xl">
              ⚡
            </div>
            <div>
              <div className="text-sm font-bold text-zinc-100">
                Level {level} Developer
              </div>
              <div className="text-xs text-zinc-500">
                {currentXp} XP Total · {unlockedCount} of 23 Badges Unlocked
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-zinc-400">
              {xpInCurrentLevel} / 100 XP to Level {level + 1}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#09090b] h-2 rounded-full overflow-hidden border border-[#222226]">
          <div
            className="bg-zinc-100 h-full rounded-full transition-all duration-500"
            style={{ width: `${xpPercent}%` }}
          />
        </div>
      </div>

      {/* 23 Badges Grid */}
      <div className="space-y-3">
        <span className="text-xs font-semibold text-zinc-400 font-sans uppercase tracking-wider block">
          Achievements ({unlockedCount}/23)
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {badges.map((b) => (
            <div
              key={b.id}
              className={`p-4 rounded-xl border transition-all space-y-2 ${
                b.unlocked
                  ? 'bg-[#111113] border-zinc-700 shadow-xs'
                  : 'bg-[#09090b] border-[#222226] opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{b.icon}</span>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded font-mono font-semibold ${
                    b.unlocked
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                  }`}
                >
                  {b.unlocked ? 'UNLOCKED' : b.progress || 'LOCKED'}
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-zinc-100 font-sans">{b.name}</h4>
                <p className="text-[11px] text-zinc-500 font-sans leading-snug mt-0.5">{b.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

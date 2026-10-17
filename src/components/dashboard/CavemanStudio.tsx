import React, { useState } from 'react';

interface LanguagePack {
  code: string;
  name: string;
  rulesCount: number;
  enabled: boolean;
}

export default function CavemanStudio() {
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const [autoClarity, setAutoClarity] = useState(true);
  const [activeEngine, setActiveEngine] = useState('caveman');

  const [languagePacks, setLanguagePacks] = useState<LanguagePack[]>([
    { code: 'en', name: 'English (General & Code)', rulesCount: 49, enabled: true },
    { code: 'pt-BR', name: 'Português (Brasil)', rulesCount: 49, enabled: true },
    { code: 'es', name: 'Español', rulesCount: 48, enabled: true },
    { code: 'it', name: 'Italiano', rulesCount: 47, enabled: true },
    { code: 'id', name: 'Bahasa Indonesia', rulesCount: 53, enabled: true },
    { code: 'de', name: 'Deutsch', rulesCount: 31, enabled: true },
    { code: 'fr', name: 'Français', rulesCount: 31, enabled: true },
    { code: 'ru', name: 'Русский', rulesCount: 32, enabled: true },
    { code: 'ja', name: '日本語 (Japanese)', rulesCount: 29, enabled: true },
    { code: 'zh', name: '中文 (Chinese)', rulesCount: 16, enabled: true },
  ]);

  const togglePack = (code: string) => {
    setLanguagePacks((prev) =>
      prev.map((p) => (p.code === code ? { ...p, enabled: !p.enabled } : p))
    );
  };

  const engines = [
    'caveman', 'rtk', 'headroom', 'session-dedup', 'ccr', 'llmlingua', 'lite', 'aggressive', 'ultra', 'omniglyph', 'studio', 'exclusions'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#222738]">
        <div>
          <h2 className="text-base font-semibold text-white font-mono tracking-tight">12-Engine Context Compression & Caveman</h2>
          <p className="text-xs text-[#8f96a3]">Multi-language rule packs, semantic pruning, and token minimization.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-0.5 rounded-lg bg-[#181d2c] border border-[#262f44] flex">
            <button
              type="button"
              onClick={() => setMode('simple')}
              className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                mode === 'simple' ? 'bg-purple-600 text-white font-semibold' : 'text-[#7d8597] hover:text-white'
              }`}
            >
              Simple
            </button>
            <button
              type="button"
              onClick={() => setMode('advanced')}
              className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                mode === 'advanced' ? 'bg-purple-600 text-white font-semibold' : 'text-[#7d8597] hover:text-white'
              }`}
            >
              Advanced
            </button>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[#121622] border border-[#222738]">
          <span className="text-[11px] text-[#7d8597] font-mono block mb-1">COMPRESSED REQUESTS</span>
          <span className="text-2xl font-bold text-white font-mono">1,048</span>
        </div>
        <div className="p-4 rounded-xl bg-[#121622] border border-[#222738]">
          <span className="text-[11px] text-emerald-400 font-mono block mb-1">TOKENS SAVED</span>
          <span className="text-2xl font-bold text-emerald-400 font-mono">318,420</span>
        </div>
        <div className="p-4 rounded-xl bg-[#121622] border border-[#222738]">
          <span className="text-[11px] text-purple-400 font-mono block mb-1">SAVINGS %</span>
          <span className="text-2xl font-bold text-purple-400 font-mono">38.4%</span>
        </div>
        <div className="p-4 rounded-xl bg-[#121622] border border-[#222738]">
          <span className="text-[11px] text-sky-400 font-mono block mb-1">AVG LATENCY OVERHEAD</span>
          <span className="text-2xl font-bold text-sky-400 font-mono">&lt; 2ms</span>
        </div>
      </div>

      {/* Engine Switcher */}
      <div className="flex border-b border-[#222738] overflow-x-auto gap-2">
        {engines.map((eng) => (
          <button
            key={eng}
            type="button"
            onClick={() => setActiveEngine(eng)}
            className={`pb-2.5 px-3 text-xs font-mono font-medium uppercase shrink-0 transition-colors border-b-2 ${
              activeEngine === eng ? 'border-purple-500 text-white' : 'border-transparent text-[#7d8597] hover:text-white'
            }`}
          >
            {eng}
          </button>
        ))}
      </div>

      {/* Auto-Clarity Bypass Banner */}
      <div className="p-4 rounded-xl bg-[#121622] border border-[#222738] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-white font-mono">Auto-Clarity Bypass</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
              High Accuracy Guard
            </span>
          </div>
          <p className="text-xs text-[#8f96a3]">
            Automatically disables aggressive pruning if the prompt contains math formulas, regex literals, or sensitive code syntax.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAutoClarity(!autoClarity)}
          className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
            autoClarity ? 'bg-purple-600' : 'bg-neutral-700'
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
              autoClarity ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* 10 Caveman Language Packs */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-[#8f96a3] uppercase tracking-wider font-mono">
          Caveman Language Rule Packs (10 Available)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {languagePacks.map((pack) => (
            <div
              key={pack.code}
              className="p-3.5 rounded-xl bg-[#121622] border border-[#222738] flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#181d2c] border border-[#262f44] flex items-center justify-center font-mono font-bold text-xs text-purple-400 uppercase">
                  {pack.code}
                </span>
                <div>
                  <div className="text-xs font-semibold text-white font-mono">{pack.name}</div>
                  <div className="text-[11px] text-[#7d8597] font-mono">{pack.rulesCount} optimization rules</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => togglePack(pack.code)}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  pack.enabled ? 'bg-white' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full absolute top-0.5 transition-transform ${
                    pack.enabled ? 'translate-x-5 bg-black' : 'translate-x-1 bg-white'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

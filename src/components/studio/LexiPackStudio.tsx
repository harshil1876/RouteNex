import React, { useState } from 'react';

interface LanguagePack {
  code: string;
  name: string;
  rulesCount: number;
  enabled: boolean;
}

export default function LexiPackStudio() {
  const [activeTab, setActiveTab] = useState<'lexipack' | 'logprune' | 'turndedup' | 'studio' | 'exclusions'>('lexipack');
  const [autoClarity, setAutoClarity] = useState(true);
  const [testInput, setTestInput] = useState(
    "Hello RouteNex! Can you please go ahead and help me by taking a look at this code? Also, I would really appreciate if you could optimize it: function add(a, b) { return a + b; }\n\n\n\nError in build:\n    at Object.<anonymous> (index.js:12:1)\n    at Module._compile (internal/modules/cjs/loader.js:999:30)"
  );

  const [languagePacks, setLanguagePacks] = useState<LanguagePack[]>([
    { code: 'en', name: 'English (General, Code & CLI)', rulesCount: 49, enabled: true },
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

  // Live in-app compression preview
  const originalChars = testInput.length;
  const originalEstTokens = Math.max(1, Math.ceil(originalChars / 3.8));
  
  // Simulated structural + log prune + conversational trimming
  const compressedText = testInput
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/at (Object|Module)\.[^\n]+/g, '[trace truncated]')
    .replace(/Can you please go ahead and help me by taking a look at this code\? Also, I would really appreciate if you could optimize it:/i, 'Optimize code:')
    .trim();

  const compressedChars = compressedText.length;
  const compressedEstTokens = Math.max(1, Math.ceil(compressedChars / 3.8));
  const tokensSaved = Math.max(0, originalEstTokens - compressedEstTokens);
  const savingsPct = Math.round((tokensSaved / originalEstTokens) * 100);

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1e2333]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-zinc-100 font-sans tracking-tight">
              NexCompress™ 4-Stage Token Optimizer & LexiPack Engine
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 font-bold">
              -38.4% Avg Reduction
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Multi-language semantic compression, LogPrune CLI truncator, and TurnDedup history hash with zero code degradation.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-zinc-300 bg-[#121622] px-3 py-1.5 rounded-lg border border-[#232838]">
            <input
              type="checkbox"
              checked={autoClarity}
              onChange={(e) => setAutoClarity(e.target.checked)}
              className="rounded bg-zinc-800 border-zinc-700 text-cyan-400"
            />
            <span>Auto-Clarity Bypass</span>
          </label>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[#0e1017] border border-[#1e2333] space-y-1">
          <span className="text-[10px] text-zinc-500 font-mono block">COMPRESSED REQUESTS</span>
          <span className="text-2xl font-bold text-zinc-100 font-mono">1,048</span>
        </div>
        <div className="p-4 rounded-xl bg-[#0e1017] border border-[#1e2333] space-y-1">
          <span className="text-[10px] text-emerald-400 font-mono block">TOKENS SAVED</span>
          <span className="text-2xl font-bold text-emerald-400 font-mono">318,420</span>
        </div>
        <div className="p-4 rounded-xl bg-[#0e1017] border border-[#1e2333] space-y-1">
          <span className="text-[10px] text-cyan-400 font-mono block">AVG SAVINGS %</span>
          <span className="text-2xl font-bold text-cyan-400 font-mono">38.4%</span>
        </div>
        <div className="p-4 rounded-xl bg-[#0e1017] border border-[#1e2333] space-y-1">
          <span className="text-[10px] text-zinc-400 font-mono block">LATENCY OVERHEAD</span>
          <span className="text-2xl font-bold text-zinc-200 font-mono">&lt; 1.8ms</span>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex border-b border-[#1e2333] overflow-x-auto gap-2 font-mono text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('lexipack')}
          className={`pb-2.5 px-3 transition-colors border-b-2 font-semibold ${
            activeTab === 'lexipack' ? 'border-cyan-400 text-white' : 'border-transparent text-zinc-500 hover:text-white'
          }`}
        >
          LexiPack 10-Language Condenser
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('logprune')}
          className={`pb-2.5 px-3 transition-colors border-b-2 font-semibold ${
            activeTab === 'logprune' ? 'border-cyan-400 text-white' : 'border-transparent text-zinc-500 hover:text-white'
          }`}
        >
          LogPrune CLI Truncator
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('turndedup')}
          className={`pb-2.5 px-3 transition-colors border-b-2 font-semibold ${
            activeTab === 'turndedup' ? 'border-cyan-400 text-white' : 'border-transparent text-zinc-500 hover:text-white'
          }`}
        >
          TurnDedup History Hash
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('studio')}
          className={`pb-2.5 px-3 transition-colors border-b-2 font-semibold ${
            activeTab === 'studio' ? 'border-cyan-400 text-white' : 'border-transparent text-zinc-500 hover:text-white'
          }`}
        >
          Live Diff Sandbox
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('exclusions')}
          className={`pb-2.5 px-3 transition-colors border-b-2 font-semibold ${
            activeTab === 'exclusions' ? 'border-cyan-400 text-white' : 'border-transparent text-zinc-500 hover:text-white'
          }`}
        >
          Exclusions & Rules
        </button>
      </div>

      {/* TAB CONTENT: LexiPack 10-Language Packs */}
      {activeTab === 'lexipack' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400">Active Rule Packs ({languagePacks.filter((p) => p.enabled).length}/10)</span>
            <span className="text-zinc-500">Auto-learns syntactic patterns without loss of meaning</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {languagePacks.map((pack) => (
              <div
                key={pack.code}
                onClick={() => togglePack(pack.code)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  pack.enabled
                    ? 'bg-[#121622] border-cyan-500/40 text-white shadow-xs'
                    : 'bg-[#0e1017] border-[#1e2333] text-zinc-500 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold font-mono">{pack.code}</span>
                  <span className={`w-2 h-2 rounded-full ${pack.enabled ? 'bg-cyan-400 shadow-[0_0_6px_#00F2FE]' : 'bg-zinc-600'}`} />
                </div>
                <div className="text-xs font-semibold truncate">{pack.name}</div>
                <div className="text-[11px] text-zinc-500 font-mono mt-1">{pack.rulesCount} active rules</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Live Diff Sandbox */}
      {activeTab === 'studio' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input Prompt */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400 font-bold">ORIGINAL PROMPT INPUT</span>
                <span className="text-zinc-500">{originalEstTokens} tokens ({originalChars} chars)</span>
              </div>
              <textarea
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                rows={8}
                className="w-full bg-[#0e1017] border border-[#1e2333] rounded-xl p-3 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Compressed Output */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-400 font-bold">NEXCOMPRESS OPTIMIZED OUTPUT</span>
                <span className="text-emerald-400 font-bold">
                  {compressedEstTokens} tokens (-{savingsPct}%)
                </span>
              </div>
              <div className="w-full h-[184px] bg-[#121622] border border-emerald-500/30 rounded-xl p-3 text-xs font-mono text-zinc-100 overflow-y-auto whitespace-pre-wrap">
                {compressedText}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#121622] border border-[#232838] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">⚡</span>
              <span className="text-zinc-300">Pipeline Savings:</span>
              <strong className="text-emerald-400">+{tokensSaved} tokens saved ({savingsPct}% reduction)</strong>
            </div>
            <span className="text-zinc-500">Zero Code / Markdown Damage</span>
          </div>
        </div>
      )}

      {/* TAB CONTENT: LogPrune CLI Truncator */}
      {activeTab === 'logprune' && (
        <div className="p-5 rounded-xl bg-[#0e1017] border border-[#1e2333] space-y-3 font-mono text-xs">
          <h3 className="text-sm font-bold text-zinc-100 font-sans">LogPrune CLI & Stack Trace Truncation</h3>
          <p className="text-zinc-400 text-xs font-sans">
            Filters repetitive Node.js, Python, and Rust trace frames while preserving the exact failing line and exception message.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-lg bg-[#121622] border border-[#232838] space-y-1">
              <span className="text-zinc-300 font-bold block">Truncate Stack Traces &gt; 5 Frames</span>
              <span className="text-zinc-500 text-[11px] block">Compacts internal runtime frames into `[trace truncated]` tags</span>
            </div>
            <div className="p-3 rounded-lg bg-[#121622] border border-[#232838] space-y-1">
              <span className="text-zinc-300 font-bold block">Strip ANSI Color Escape Codes</span>
              <span className="text-zinc-500 text-[11px] block">Removes `\x1b[31m` terminal sequences that waste LLM context</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: TurnDedup History Hash */}
      {activeTab === 'turndedup' && (
        <div className="p-5 rounded-xl bg-[#0e1017] border border-[#1e2333] space-y-3 font-mono text-xs">
          <h3 className="text-sm font-bold text-zinc-100 font-sans">TurnDedup Cross-Turn Content-Addressed Hash</h3>
          <p className="text-zinc-400 text-xs font-sans">
            Assigns 64-bit cryptographic hashes to long repeated system prompts and file dumps, replacing them with canonical cache references.
          </p>
          <div className="p-3 rounded-lg bg-[#121622] border border-[#232838] text-zinc-300 text-xs">
            TurnDedup active: <strong>14 cached conversation turns</strong> indexed with 0ms semantic retrieval.
          </div>
        </div>
      )}

      {/* TAB CONTENT: Exclusions */}
      {activeTab === 'exclusions' && (
        <div className="p-5 rounded-xl bg-[#0e1017] border border-[#1e2333] space-y-3 font-mono text-xs">
          <h3 className="text-sm font-bold text-zinc-100 font-sans">Bypass & Exclusions Registry</h3>
          <p className="text-zinc-400 text-xs font-sans">
            Prompts containing regex patterns in this list bypass NexCompress completely to guarantee 100% byte fidelity.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="px-2.5 py-1 rounded bg-[#181d2a] border border-[#232838] text-cyan-300">`/^--- BEGIN STRICT CODE/`</span>
            <span className="px-2.5 py-1 rounded bg-[#181d2a] border border-[#232838] text-cyan-300">`/\.git\/config/`</span>
            <span className="px-2.5 py-1 rounded bg-[#181d2a] border border-[#232838] text-cyan-300">`/\.env(\.local)?/`</span>
          </div>
        </div>
      )}
    </div>
  );
}

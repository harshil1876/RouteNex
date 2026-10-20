import React, { useState } from 'react';
import { RouteNexClient, type TestPulseResult } from '../../utils/gateway-client';

interface NexFlowCanvasProps {
  onNavigateTab?: (pillarId: string, subTabId?: string) => void;
}

export default function NexFlowCanvas({ onNavigateTab }: NexFlowCanvasProps) {
  const [viewMode, setViewMode] = useState<'pipeline' | 'constellation'>('pipeline');
  const [pulsePrompt, setPulsePrompt] = useState('Refactor TypeScript connection pool to handle 10,000 req/sec with exponential backoff.');
  const [selectedStrategy, setSelectedStrategy] = useState('auto:nitro');
  const [isPulsing, setIsPulsing] = useState(false);
  const [pulseStage, setPulseStage] = useState<number>(0);
  const [lastResult, setLastResult] = useState<TestPulseResult | null>(null);

  const presets = [
    { label: 'Code Refactor', prompt: 'Refactor TypeScript connection pool to handle 10,000 req/sec with exponential backoff.', model: 'auto:nitro' },
    { label: 'CLI Stack Trace', prompt: 'Error: Connection reset by peer at TCP.onStreamRead (node:internal/stream_base_commons:217:20) in worker thread #4.', model: 'auto:fast' },
    { label: 'Zero-Cost Free Tier', prompt: 'Summarize architectural trade-offs between centralized state versus actor model.', model: 'auto:free' },
  ];

  const handleSendPulse = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isPulsing) return;

    setIsPulsing(true);
    setPulseStage(1);

    // Animate stages smoothly
    setTimeout(() => setPulseStage(2), 250);
    setTimeout(() => setPulseStage(3), 500);
    setTimeout(() => setPulseStage(4), 750);

    const client = RouteNexClient.getInstance();
    const result = await client.sendTestPulse(pulsePrompt, selectedStrategy);

    setTimeout(() => {
      setLastResult(result);
      setPulseStage(5);
      setIsPulsing(false);
    }, 1000);
  };

  return (
    <div className="rounded-2xl bg-[#0e1017] border border-[#1e2333] p-5 sm:p-6 space-y-6 shadow-xl relative overflow-hidden font-sans">
      {/* Background technical dot matrix */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(0,242,254,0.04)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

      {/* Header bar with View Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00F2FE]" />
            <h2 className="text-sm sm:text-base font-bold text-zinc-100 font-sans tracking-tight">
              NexFlow™ Live Pipeline Canvas
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-cyan-300">
              4-Stage Telemetry
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-sans">
            Real-time signal ingress, 4-stage NexCompress token stripping, policy resolution, and provider failover.
          </p>
        </div>

        {/* View Toggle */}
        <div className="inline-flex rounded-lg bg-[#141722] border border-[#232838] p-1 text-xs font-mono">
          <button
            type="button"
            onClick={() => setViewMode('pipeline')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              viewMode === 'pipeline'
                ? 'bg-cyan-500 text-zinc-950 font-bold shadow-xs'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            ⚡ Signal Pipeline
          </button>
          <button
            type="button"
            onClick={() => setViewMode('constellation')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              viewMode === 'constellation'
                ? 'bg-cyan-500 text-zinc-950 font-bold shadow-xs'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            🪐 Constellation Hub
          </button>
        </div>
      </div>

      {/* Interactive Send Test Pulse Bar */}
      <form onSubmit={handleSendPulse} className="space-y-3 relative z-10">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Strategy Selector */}
          <select
            value={selectedStrategy}
            onChange={(e) => setSelectedStrategy(e.target.value)}
            className="bg-[#141722] border border-[#232838] rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 shrink-0"
          >
            <option value="auto:nitro">auto:nitro (Fastest 110ms)</option>
            <option value="auto:cheap">auto:cheap (Lowest Cost)</option>
            <option value="auto:free">auto:free (Zero-Cost $0)</option>
            <option value="auto:zdr">auto:zdr (Zero Data Retention)</option>
            <option value="antigravity/claude-sonnet-4-6-thinking">Antigravity Claude Sonnet 4.6</option>
          </select>

          {/* Prompt Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={pulsePrompt}
              onChange={(e) => setPulsePrompt(e.target.value)}
              placeholder="Type test prompt to simulate RouteNex signal..."
              className="w-full bg-[#141722] border border-[#232838] rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Pulse Button */}
          <button
            type="submit"
            disabled={isPulsing}
            className="px-5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 !text-zinc-950 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-[0_0_15px_rgba(0,242,254,0.3)] disabled:opacity-50"
          >
            {isPulsing ? (
              <>
                <span className="w-3 h-3 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                <span>Pulsing...</span>
              </>
            ) : (
              <>
                <span>⚡ Send Test Pulse</span>
              </>
            )}
          </button>
        </div>

        {/* Presets Pills */}
        <div className="flex items-center gap-2 overflow-x-auto text-[11px] font-mono text-zinc-500">
          <span className="shrink-0 text-zinc-400 font-semibold">Simulate Preset:</span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setPulsePrompt(p.prompt);
                setSelectedStrategy(p.model);
              }}
              className="px-2.5 py-0.5 rounded-full bg-[#141722] hover:bg-zinc-800 border border-[#232838] text-zinc-300 hover:text-white transition shrink-0"
            >
              {p.label}
            </button>
          ))}
        </div>
      </form>

      {/* PIPELINE VIEW */}
      {viewMode === 'pipeline' && (
        <div className="space-y-4 relative z-10">
          {/* 4-Stage Horizontal Pipeline Graph */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
            {/* Stage 1: Client Ingress */}
            <div
              className={`p-4 rounded-xl border transition-all duration-300 ${
                pulseStage >= 1
                  ? 'bg-[#141926] border-cyan-400/80 shadow-[0_0_12px_rgba(0,242,254,0.15)]'
                  : 'bg-[#12141c] border-[#1e2333]'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="text-zinc-400 font-bold">01 / INGRESS</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">HTTP/MCP</span>
              </div>
              <div className="text-xs font-semibold text-zinc-200">Client Ingress</div>
              <p className="text-[11px] text-zinc-400 mt-1">Cursor · Claude Code · Cline · SDK</p>
              <div className="mt-3 pt-2 border-t border-[#1e2333] flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-500">Tokens:</span>
                <span className="text-cyan-300 font-bold">{lastResult ? lastResult.originalTokens : 68} tok</span>
              </div>
            </div>

            {/* Stage 2: NexCompress (LexiPack) */}
            <div
              className={`p-4 rounded-xl border transition-all duration-300 ${
                pulseStage >= 2
                  ? 'bg-[#141926] border-emerald-400/80 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                  : 'bg-[#12141c] border-[#1e2333]'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="text-emerald-400 font-bold">02 / NEXCOMPRESS</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-300 font-bold">
                  {lastResult ? `-${lastResult.reductionPercent}%` : '-38%'}
                </span>
              </div>
              <div className="text-xs font-semibold text-zinc-200">LexiPack + LogPrune</div>
              <p className="text-[11px] text-zinc-400 mt-1">Structural & cross-turn deduplication</p>
              <div className="mt-3 pt-2 border-t border-[#1e2333] flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-500">Saved:</span>
                <span className="text-emerald-400 font-bold">{lastResult ? `+${lastResult.tokensSaved} tok` : '+26 tok'}</span>
              </div>
            </div>

            {/* Stage 3: NexRoute Policy Engine */}
            <div
              className={`p-4 rounded-xl border transition-all duration-300 ${
                pulseStage >= 3
                  ? 'bg-[#141926] border-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                  : 'bg-[#12141c] border-[#1e2333]'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="text-amber-400 font-bold">03 / NEXROUTE</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 font-bold">19 Policies</span>
              </div>
              <div className="text-xs font-semibold text-zinc-200">Policy Resolution</div>
              <p className="text-[11px] text-zinc-400 mt-1">Latency · Cost · Quota Headroom</p>
              <div className="mt-3 pt-2 border-t border-[#1e2333] flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-500">Selected:</span>
                <span className="text-amber-300 font-bold truncate max-w-[100px]">
                  {lastResult ? lastResult.selectedProvider : 'groq'}
                </span>
              </div>
            </div>

            {/* Stage 4: Target Model & Output */}
            <div
              className={`p-4 rounded-xl border transition-all duration-300 ${
                pulseStage >= 4
                  ? 'bg-[#141926] border-cyan-400/80 shadow-[0_0_12px_rgba(0,242,254,0.15)]'
                  : 'bg-[#12141c] border-[#1e2333]'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="text-cyan-400 font-bold">04 / DISPATCH</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950/60 text-cyan-300 font-bold">
                  {lastResult ? `${lastResult.latencyMs}ms` : '114ms'}
                </span>
              </div>
              <div className="text-xs font-semibold text-zinc-200 truncate">
                {lastResult ? lastResult.selectedModel.split('/').pop() : 'llama-3.3-70b'}
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">100% Circuit Health · 0 Retries</p>
              <div className="mt-3 pt-2 border-t border-[#1e2333] flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-500">Total Cost:</span>
                <span className="text-zinc-200 font-bold">{lastResult ? `$${lastResult.costUsd.toFixed(6)}` : '$0.000012'}</span>
              </div>
            </div>
          </div>

          {/* Pulse Telemetry Log Feed */}
          {lastResult && (
            <div className="p-3.5 rounded-xl bg-[#141722] border border-[#232838] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                <span className="text-zinc-200 font-semibold">Signal Pulse Completed:</span>
                <span className="text-cyan-300">{lastResult.ingressModel}</span>
                <span className="text-zinc-500">➔</span>
                <span className="text-white">{lastResult.selectedModel}</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-400">
                <span>Latency: <strong className="text-zinc-100">{lastResult.latencyMs}ms</strong></span>
                <span>Saved: <strong className="text-emerald-400">-{lastResult.reductionPercent}% tokens</strong></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONSTELLATION HUB VIEW */}
      {viewMode === 'constellation' && (
        <div className="p-6 rounded-xl bg-[#12141c] border border-[#1e2333] flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(0,242,254,0.2)]">
            🌐
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-zinc-100 font-sans">RouteNex Constellation Mesh</h3>
            <p className="text-xs text-zinc-400 max-w-md font-sans">
              347 connected AI endpoints, 120+ active providers, and real-time circuit-breaker rings clustered around the RouteNex core daemon.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-xs">
            <span className="px-2.5 py-1 rounded bg-[#181d2a] border border-[#232838] text-cyan-300">Antigravity (14 Models)</span>
            <span className="px-2.5 py-1 rounded bg-[#181d2a] border border-[#232838] text-zinc-300">Groq (Nitro 110ms)</span>
            <span className="px-2.5 py-1 rounded bg-[#181d2a] border border-[#232838] text-zinc-300">Anthropic Claude</span>
            <span className="px-2.5 py-1 rounded bg-[#181d2a] border border-[#232838] text-zinc-300">OpenAI GPT-4o</span>
            <span className="px-2.5 py-1 rounded bg-[#181d2a] border border-[#232838] text-emerald-400">Pollinations ($0 Free)</span>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';

export default function EndpointsPanel() {
  const [activeProtocol, setActiveProtocol] = useState<'apis' | 'mcp' | 'a2a' | 'context'>('apis');
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const protocols = [
    { id: 'apis', label: 'APIs', count: '14 endpoints' },
    { id: 'mcp', label: 'MCP', count: '5 tools' },
    { id: 'a2a', label: 'A2A', count: '1 protocol' },
    { id: 'context', label: 'Context Sources', count: '12 engines' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-purple-900/30 via-indigo-950/20 to-neutral-900/50 border border-purple-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-mono text-lg font-bold">
            /v1
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white font-mono tracking-tight">http://localhost:3001/v1</span>
              <button
                type="button"
                onClick={() => copyToClipboard('http://localhost:3001/v1', 'base-url')}
                className="text-xs text-purple-400 hover:text-purple-300 font-mono"
              >
                {copied === 'base-url' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-[#8f96a3]">Drop-in OpenAI & Anthropic compatible root proxy endpoint</p>
          </div>
        </div>

        <a
          href="/dashboard?view=playground"
          className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-medium shadow-md shadow-purple-600/20 transition-all shrink-0"
        >
          Test endpoint →
        </a>
      </div>

      {/* Protocol Tabs */}
      <div className="flex border-b border-[#222738] gap-4">
        {protocols.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActiveProtocol(p.id as any)}
            className={`pb-3 px-1 text-xs font-mono font-medium transition-colors flex items-center gap-2 border-b-2 ${
              activeProtocol === p.id
                ? 'border-purple-500 text-white'
                : 'border-transparent text-[#7d8597] hover:text-white'
            }`}
          >
            <span>{p.label}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#181d2c] text-[#8e97ae] border border-[#262f44]">
              {p.count}
            </span>
          </button>
        ))}
      </div>

      {/* Active Endpoints Grid */}
      {activeProtocol === 'apis' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#121622] border border-[#222738] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  POST
                </span>
                <span className="text-xs font-mono font-semibold text-white">/v1/chat/completions</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">● Active</span>
            </div>
            <p className="text-xs text-[#8f96a3]">OpenAI-compatible chat completions with streaming SSE and tool calling.</p>
            <div className="flex justify-between items-center pt-2 border-t border-[#1a2030] text-[11px] font-mono text-[#6c768e]">
              <span>Auth: Bearer rn_live_...</span>
              <button
                type="button"
                onClick={() => copyToClipboard('http://localhost:3001/v1/chat/completions', 'chat-endpoint')}
                className="text-purple-400 hover:text-purple-300"
              >
                {copied === 'chat-endpoint' ? '✓ Copied' : 'Copy URL'}
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#121622] border border-[#222738] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  POST
                </span>
                <span className="text-xs font-mono font-semibold text-white">/v1/messages</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">● Active</span>
            </div>
            <p className="text-xs text-[#8f96a3]">Anthropic Messages API proxy native translation for Claude Code CLI.</p>
            <div className="flex justify-between items-center pt-2 border-t border-[#1a2030] text-[11px] font-mono text-[#6c768e]">
              <span>Auth: x-api-key or Bearer</span>
              <button
                type="button"
                onClick={() => copyToClipboard('http://localhost:3001/v1/messages', 'msg-endpoint')}
                className="text-purple-400 hover:text-purple-300"
              >
                {copied === 'msg-endpoint' ? '✓ Copied' : 'Copy URL'}
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#121622] border border-[#222738] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/10 border border-sky-500/20 text-sky-400">
                  GET
                </span>
                <span className="text-xs font-mono font-semibold text-white">/v1/models</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">● Active</span>
            </div>
            <p className="text-xs text-[#8f96a3]">Dynamic catalog aggregating 347+ providers with pricing & capabilities.</p>
            <div className="flex justify-between items-center pt-2 border-t border-[#1a2030] text-[11px] font-mono text-[#6c768e]">
              <span>Auth: Optional</span>
              <button
                type="button"
                onClick={() => copyToClipboard('http://localhost:3001/v1/models', 'models-endpoint')}
                className="text-purple-400 hover:text-purple-300"
              >
                {copied === 'models-endpoint' ? '✓ Copied' : 'Copy URL'}
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#121622] border border-[#222738] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/10 border border-sky-500/20 text-sky-400">
                  GET
                </span>
                <span className="text-xs font-mono font-semibold text-white">/health/live</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">● Active</span>
            </div>
            <p className="text-xs text-[#8f96a3]">Health probe & provider connectivity status.</p>
            <div className="flex justify-between items-center pt-2 border-t border-[#1a2030] text-[11px] font-mono text-[#6c768e]">
              <span>Auth: Open</span>
              <button
                type="button"
                onClick={() => copyToClipboard('http://localhost:3001/health/live', 'health-endpoint')}
                className="text-purple-400 hover:text-purple-300"
              >
                {copied === 'health-endpoint' ? '✓ Copied' : 'Copy URL'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeProtocol === 'mcp' && (
        <div className="p-5 rounded-xl bg-[#121622] border border-[#222738] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white font-mono">Built-In Model Context Protocol (MCP) Server</h3>
            <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono">
              JSON-RPC 2.0 / SSE
            </span>
          </div>
          <p className="text-xs text-[#8f96a3]">
            Claude Code, Cursor, and Cline can inspect route candidates, query free tier quotas, test provider health, and upsert fallback combos autonomously.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-[#161b28] border border-[#242b3d]">
              <span className="text-[#6c768e] block mb-1">Local HTTP Endpoint</span>
              <span className="text-white select-all">POST http://127.0.0.1:3001/v1/mcp</span>
            </div>
            <div className="p-3 rounded-lg bg-[#161b28] border border-[#242b3d]">
              <span className="text-[#6c768e] block mb-1">CLI Stdio Command</span>
              <span className="text-white select-all">routenex --mcp</span>
            </div>
          </div>
        </div>
      )}

      {/* LAN Server & Tunnels Section */}
      <div className="space-y-4 pt-4 border-t border-[#1d2232]">
        <h3 className="text-xs font-semibold text-[#8f96a3] uppercase tracking-wider font-mono">
          Local Server & Tunnels (0 / 3 active)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Cloud RouteNex */}
          <div className="p-4 rounded-xl bg-[#121622] border border-[#222738] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white font-mono">Cloud RouteNex</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">Disabled</span>
              </div>
              <p className="text-[11px] text-[#8f96a3]">Connect to edge cloud gateway with zero local port forwarding.</p>
            </div>
            <button
              type="button"
              className="mt-4 w-full py-1.5 rounded-lg bg-[#1a2030] hover:bg-[#222b40] border border-[#2b354e] text-xs font-mono text-white transition-colors"
            >
              Enable Cloud Tunnel
            </button>
          </div>

          {/* Cloudflare Tunnel */}
          <div className="p-4 rounded-xl bg-[#121622] border border-[#222738] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white font-mono">Cloudflare Quick Tunnel</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">Not Installed</span>
              </div>
              <p className="text-[11px] text-[#8f96a3]">Instantly expose http://localhost:3001 via secure trycloudflare.com URL.</p>
            </div>
            <button
              type="button"
              className="mt-4 w-full py-1.5 rounded-lg bg-[#1a2030] hover:bg-[#222b40] border border-[#2b354e] text-xs font-mono text-white transition-colors"
            >
              Install & Enable
            </button>
          </div>

          {/* Tailscale Funnel */}
          <div className="p-4 rounded-xl bg-[#121622] border border-[#222738] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white font-mono">Tailscale Funnel</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">Not Installed</span>
              </div>
              <p className="text-[11px] text-[#8f96a3]">Share endpoint across private tailnet or public internet with HTTPS.</p>
            </div>
            <button
              type="button"
              className="mt-4 w-full py-1.5 rounded-lg bg-[#1a2030] hover:bg-[#222b40] border border-[#2b354e] text-xs font-mono text-white transition-colors"
            >
              Install & Enable
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

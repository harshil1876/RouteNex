import React, { useState, useEffect } from 'react';
import { RouteNexClient, type TestPulseResult } from '../../utils/gateway-client';

interface NexFlowCanvasProps {
  onNavigateTab?: (tabId: string) => void;
}

interface ConstellationNode {
  id: string;
  name: string;
  modelCount: number;
  models: Array<{
    id: string;
    name: string;
    status: 'working' | 'offline' | 'untested';
    latencyMs?: number;
    enabled?: boolean;
  }>;
  status: 'working' | 'offline' | 'ready';
  latencyMs?: number;
}

function getAdminHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('routenex_admin_token') || 'routenex-admin'
    : 'routenex-admin';
  return {
    'Authorization': `Bearer ${token}`,
    'x-admin-token': token,
    ...extra,
  };
}

export default function NexFlowCanvas({ onNavigateTab }: NexFlowCanvasProps) {
  const [viewMode, setViewMode] = useState<'pipeline' | 'constellation'>('pipeline');
  const [pulsePrompt, setPulsePrompt] = useState('Refactor TypeScript connection pool to handle 10,000 req/sec with exponential backoff.');
  const [selectedStrategy, setSelectedStrategy] = useState('auto:nitro');
  const [isPulsing, setIsPulsing] = useState(false);
  const [pulseStage, setPulseStage] = useState<number>(0);
  const [lastResult, setLastResult] = useState<TestPulseResult | null>(null);

  // Constellation Hub Dynamic State
  const [constellationNodes, setConstellationNodes] = useState<ConstellationNode[]>([]);
  const [isProbingAll, setIsProbingAll] = useState(false);

  const loadConstellationData = async () => {
    try {
      const res = await fetch('http://127.0.0.1:3001/v1/admin/providers', {
        headers: getAdminHeaders(),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        const providers: any[] = data.providers || [];
        const connected = providers.filter(
          (p) => p.hasKey || (p.keyCount && p.keyCount > 0) || (p.accountsCount && p.accountsCount > 0)
        );

        const nodes: ConstellationNode[] = connected.map((p) => {
          const modelsState = p.modelsState || {};
          const stateKeys = Object.keys(modelsState);
          const models = stateKeys.map((k) => ({
            id: k,
            name: k.includes('/') ? k.split('/')[1] : k,
            status: (modelsState[k]?.status || 'untested') as 'working' | 'offline' | 'untested',
            latencyMs: modelsState[k]?.latency,
            enabled: modelsState[k]?.enabled !== false,
          }));

          const hasWorking = models.some((m) => m.status === 'working');
          const hasOffline = models.some((m) => m.status === 'offline');
          const avgLatency =
            models.filter((m) => m.latencyMs).reduce((a, b) => a + (b.latencyMs || 0), 0) /
            (models.filter((m) => m.latencyMs).length || 1);

          return {
            id: p.id,
            name: p.name || p.id,
            modelCount: p.modelCount || models.length || 1,
            models: models.length > 0 ? models : [{ id: `${p.id}/default`, name: 'Default Model', status: 'untested' }],
            status: hasWorking ? 'working' : (hasOffline ? 'offline' : 'ready'),
            latencyMs: avgLatency ? Math.round(avgLatency) : undefined,
          };
        });

        setConstellationNodes(nodes);
      }
    } catch {
      // offline fallback
    }
  };

  useEffect(() => {
    if (viewMode === 'constellation') {
      loadConstellationData();
    }
  }, [viewMode]);

  const handleProbeAllNodes = async () => {
    if (isProbingAll || constellationNodes.length === 0) return;
    setIsProbingAll(true);

    try {
      const updatedNodes = [...constellationNodes];
      for (const node of updatedNodes) {
        const targetModel = node.models[0]?.id || `${node.id}/default`;
        const start = Date.now();
        const res = await fetch('http://127.0.0.1:3001/v1/chat/completions', {
          method: 'POST',
          headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            model: targetModel.startsWith(`${node.id}/`) ? targetModel : `${node.id}/${targetModel}`,
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 2,
          }),
        }).catch(() => null);

        const latency = Date.now() - start;
        const success = Boolean(res && res.ok);

        node.status = success ? 'working' : 'offline';
        node.latencyMs = success ? latency : undefined;
        if (node.models[0]) {
          node.models[0].status = success ? 'working' : 'offline';
          node.models[0].latencyMs = success ? latency : undefined;
        }

        fetch(`http://127.0.0.1:3001/v1/admin/providers/${encodeURIComponent(node.id)}/models-state`, {
          method: 'POST',
          headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            modelId: targetModel,
            status: success ? 'working' : 'offline',
            latency: success ? latency : undefined,
          }),
        }).catch(() => {});
      }
      setConstellationNodes([...updatedNodes]);
    } finally {
      setIsProbingAll(false);
    }
  };

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
    <div className="rounded-xl bg-[#111113] border border-[#222226] p-5 sm:p-6 space-y-6 shadow-sm font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[17px] font-semibold text-zinc-100 tracking-tight font-sans">
              Live Routing Pipeline
            </h2>
            <span className="text-xs font-sans px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 font-medium">
              4-Stage Engine
            </span>
          </div>
          <p className="text-sm text-zinc-400 font-sans">
            Real-time signal ingress, 4-stage token optimization, policy resolution, and provider failover.
          </p>
        </div>

        {/* View Toggle */}
        <div className="inline-flex rounded-lg bg-[#09090b] border border-[#222226] p-1 text-xs font-sans">
          <button
            type="button"
            onClick={() => setViewMode('pipeline')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
              viewMode === 'pipeline'
                ? 'bg-sky-500 !text-zinc-950 font-semibold shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            <span>Signal Pipeline</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('constellation')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
              viewMode === 'constellation'
                ? 'bg-sky-500 !text-zinc-950 font-semibold shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              <path d="M2 12h20" />
            </svg>
            <span>Constellation Hub</span>
          </button>
        </div>
      </div>

      {/* Send Test Pulse Form */}
      <form onSubmit={handleSendPulse} className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <select
            value={selectedStrategy}
            onChange={(e) => setSelectedStrategy(e.target.value)}
            className="bg-[#09090b] border border-[#222226] rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-sky-500 shrink-0"
          >
            <option value="auto:nitro">auto:nitro (Fastest 114ms)</option>
            <option value="auto:cheap">auto:cheap (Lowest Cost)</option>
            <option value="auto:free">auto:free (Zero-Cost $0)</option>
            <option value="auto:zdr">auto:zdr (Zero Data Retention)</option>
            <option value="antigravity/claude-sonnet-4-6-thinking">Antigravity Claude Sonnet 4.6</option>
          </select>

          <div className="flex-1 relative">
            <input
              type="text"
              value={pulsePrompt}
              onChange={(e) => setPulsePrompt(e.target.value)}
              placeholder="Enter prompt to simulate RouteNex signal..."
              className="w-full bg-[#09090b] border border-[#222226] rounded-lg px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 font-sans focus:outline-none focus:border-sky-500"
            />
          </div>

          <button
            type="submit"
            disabled={isPulsing}
            className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 !text-zinc-950 font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-sm disabled:opacity-50 font-sans"
          >
            {isPulsing ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                <span>Pulsing...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-zinc-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <span>Send Test Pulse</span>
              </>
            )}
          </button>
        </div>

        {/* Preset Chips */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-sans text-zinc-400">
          <span className="shrink-0 text-zinc-500 text-xs">Presets:</span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setPulsePrompt(p.prompt);
                setSelectedStrategy(p.model);
              }}
              className="px-2.5 py-1 rounded-md bg-[#09090b] hover:bg-zinc-800 border border-[#222226] text-zinc-300 hover:text-white transition shrink-0 text-xs font-sans"
            >
              {p.label}
            </button>
          ))}
        </div>
      </form>

      {/* PIPELINE STAGES */}
      {viewMode === 'pipeline' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Stage 1: Client Ingress */}
            <div
              className={`p-4 rounded-xl border transition-all duration-200 ${
                pulseStage >= 1
                  ? 'bg-sky-950/20 border-sky-500/40'
                  : 'bg-[#09090b] border-[#222226]'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 17 10 11 4 5" />
                    <line x1="12" x2="20" y1="19" y2="19" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-100 font-sans">Client Ingress</div>
                  <span className="text-xs text-zinc-400 font-sans">HTTP / MCP Gateway</span>
                </div>
              </div>
              <p className="text-[13px] text-zinc-400 leading-5 font-sans">
                Cursor, Claude Code, Cline, and OpenAI SDK endpoints.
              </p>
              <div className="mt-3 pt-2.5 border-t border-[#222226] flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500">Payload:</span>
                <span className="text-zinc-200 font-medium">{lastResult ? `${lastResult.originalTokens} tokens` : '—'}</span>
              </div>
            </div>

            {/* Stage 2: Token Optimizer */}
            <div
              className={`p-4 rounded-xl border transition-all duration-200 ${
                pulseStage >= 2
                  ? 'bg-sky-950/20 border-sky-500/40'
                  : 'bg-[#09090b] border-[#222226]'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-100 font-sans">Token Optimizer</div>
                  <span className="text-xs text-zinc-400 font-sans">NexCompress Pipeline</span>
                </div>
              </div>
              <p className="text-[13px] text-zinc-400 leading-5 font-sans">
                LexiPack semantic condensor, LogPrune, and TurnDedup.
              </p>
              <div className="mt-3 pt-2.5 border-t border-[#222226] flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500">Reduction:</span>
                <span className="text-sky-400 font-medium">{lastResult ? `-${lastResult.reductionPercent}% saved` : '—'}</span>
              </div>
            </div>

            {/* Stage 3: Route Policy */}
            <div
              className={`p-4 rounded-xl border transition-all duration-200 ${
                pulseStage >= 3
                  ? 'bg-sky-950/20 border-sky-500/40'
                  : 'bg-[#09090b] border-[#222226]'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="18" r="3" />
                    <circle cx="6" cy="6" r="3" />
                    <circle cx="18" cy="6" r="3" />
                    <path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9" />
                    <path d="M12 12v3" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-100 font-sans">Route Policy</div>
                  <span className="text-xs text-zinc-400 font-sans">Policy Resolution</span>
                </div>
              </div>
              <p className="text-[13px] text-zinc-400 leading-5 font-sans">
                Evaluates latency, cost, and active circuit breaker states.
              </p>
              <div className="mt-3 pt-2.5 border-t border-[#222226] flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500">Target Pool:</span>
                <span className="text-zinc-200 font-medium truncate max-w-[120px]">{lastResult ? lastResult.selectedProvider : 'pollinations'}</span>
              </div>
            </div>

            {/* Stage 4: Provider Dispatch */}
            <div
              className={`p-4 rounded-xl border transition-all duration-200 ${
                pulseStage >= 4
                  ? 'bg-sky-950/20 border-sky-500/40'
                  : 'bg-[#09090b] border-[#222226]'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-100 font-sans">Provider Dispatch</div>
                  <span className="text-xs text-zinc-400 font-sans">Execution & Logging</span>
                </div>
              </div>
              <p className="text-[13px] text-zinc-400 leading-5 font-sans truncate">
                {lastResult ? lastResult.selectedModel : 'pollinations/openai'}
              </p>
              <div className="mt-3 pt-2.5 border-t border-[#222226] flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500">Latency:</span>
                <span className="text-zinc-200 font-medium">{lastResult ? `${lastResult.latencyMs}ms` : '—'}</span>
              </div>
            </div>
          </div>

          {/* Pulse Telemetry Result Card */}
          {lastResult && (
            <div className="p-4 rounded-xl bg-[#09090b] border border-sky-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span className="font-semibold text-zinc-100 font-sans">Pulse Completed:</span>
                <span className="font-mono text-sky-400">{lastResult.ingressModel}</span>
                <span className="text-zinc-500 font-mono">→</span>
                <span className="font-mono text-zinc-200">{lastResult.selectedModel}</span>
              </div>
              <div className="flex items-center gap-4 text-zinc-400 font-mono">
                <span>Latency: <strong className="text-zinc-100">{lastResult.latencyMs}ms</strong></span>
                <span>Saved: <strong className="text-sky-400">-{lastResult.reductionPercent}% tokens</strong></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DYNAMIC CONSTELLATION HUB VIEW */}
      {viewMode === 'constellation' && (
        <div className="space-y-4">
          {constellationNodes.length === 0 ? (
            <div className="p-10 rounded-xl bg-[#09090b] border border-[#222226] flex flex-col items-center justify-center text-center space-y-5">
              <div className="relative flex items-center justify-center">
                <div className="w-24 h-24 rounded-full border border-[#222226] flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border border-sky-500/20 bg-sky-500/5 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-zinc-600"></span>
                  <h3 className="text-base font-semibold text-zinc-100 font-sans">0 Connected Providers • 0 Active Models</h3>
                </div>
                <p className="text-xs text-zinc-400 max-w-md font-sans leading-relaxed">
                  No upstream AI providers or local CLI credentials configured yet. Connect an API key (Groq, OpenAI, Anthropic) or link Antigravity CLI / Gemini CLI to dynamically activate the Constellation Mesh.
                </p>
              </div>

              <button
                type="button"
                onClick={() => (onNavigateTab ? onNavigateTab('providers') : null)}
                className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 !text-zinc-950 font-semibold text-xs transition inline-flex items-center gap-2 shadow-xs cursor-pointer font-sans"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Connect Providers →
              </button>
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-[#09090b] border border-[#222226] space-y-6">
              {/* Top Actions & Summary Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#222226]">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100 font-sans">
                      Active Constellation Mesh
                    </h3>
                    <p className="text-xs text-zinc-400 font-sans">
                      {constellationNodes.length} connected providers •{' '}
                      {constellationNodes.reduce((acc, n) => acc + (n.models.length || 1), 0)} active models
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleProbeAllNodes}
                    disabled={isProbingAll}
                    className="px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 !text-zinc-950 font-semibold text-xs transition inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50 font-sans cursor-pointer"
                  >
                    <svg className={`w-3.5 h-3.5 ${isProbingAll ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    {isProbingAll ? 'Probing All Nodes...' : 'Probe All Connected Nodes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => (onNavigateTab ? onNavigateTab('providers') : null)}
                    className="px-3.5 py-1.5 rounded-lg bg-[#111113] hover:bg-[#18181b] border border-[#222226] text-zinc-300 hover:text-white text-xs transition font-sans cursor-pointer"
                  >
                    Manage Providers →
                  </button>
                </div>
              </div>

              {/* Dynamic Visual Mesh Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {constellationNodes.map((node) => {
                  const isWorking = node.status === 'working';
                  const isOffline = node.status === 'offline';
                  return (
                    <div
                      key={node.id}
                      className={`p-4 rounded-xl bg-[#111113] border transition-all ${
                        isWorking
                          ? 'border-emerald-500/30 shadow-[0_0_15px_-3px_rgba(16,185,129,0.1)]'
                          : isOffline
                          ? 'border-rose-500/30'
                          : 'border-[#222226]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isWorking
                                ? 'bg-emerald-400'
                                : isOffline
                                ? 'bg-rose-400'
                                : 'bg-sky-400'
                            }`}
                          />
                          <span className="text-xs font-bold text-zinc-100 font-sans">{node.name}</span>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                            isWorking
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isOffline
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                          }`}
                        >
                          {isWorking ? `Healthy ${node.latencyMs ? `(${node.latencyMs}ms)` : ''}` : isOffline ? 'Offline' : 'Ready'}
                        </span>
                      </div>

                      <div className="space-y-1.5 mt-3 pt-2.5 border-t border-[#222226] text-[11px] font-mono">
                        <div className="flex items-center justify-between text-zinc-400">
                          <span>Endpoint:</span>
                          <span className="text-zinc-300">{node.id}</span>
                        </div>
                        <div className="flex items-center justify-between text-zinc-400">
                          <span>Models:</span>
                          <span className="text-sky-400 font-medium">{node.models.length} active</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

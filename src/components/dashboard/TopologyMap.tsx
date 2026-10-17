import React, { useState, useEffect } from 'react';

interface CandidateEvaluation {
  model: string;
  provider: string;
  eligible: boolean;
  rejection_reason?: string;
  score?: number;
}

interface RoutingExplanation {
  request_id: string;
  model_requested: string;
  model_selected: string | null;
  provider_selected: string | null;
  reason: string;
  reason_code: string;
  candidates_evaluated: CandidateEvaluation[];
  fallback_chain: string[];
}

export default function TopologyMap() {
  const [selectedModel, setSelectedModel] = useState('auto:nitro');
  const [simulating, setSimulating] = useState(false);
  const [explanation, setExplanation] = useState<RoutingExplanation | null>(null);
  const [activeTab, setActiveTab] = useState<'graph' | 'candidates'>('graph');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Default initial dry-run simulation
  useEffect(() => {
    runSimulation('auto:nitro');
  }, []);

  const runSimulation = async (modelToTest: string) => {
    setSimulating(true);
    try {
      const res = await fetch('http://127.0.0.1:3001/v1/router/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelToTest,
          messages: [{ role: 'user', content: 'Simulation dry-run ping' }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setExplanation(data);
      } else {
        // Fallback simulated explanation if offline
        setExplanation(getMockExplanation(modelToTest));
      }
    } catch {
      setExplanation(getMockExplanation(modelToTest));
    } finally {
      setSimulating(false);
    }
  };

  const getMockExplanation = (model: string): RoutingExplanation => {
    const isFree = model.includes(':free');
    const isNitro = model.includes(':nitro');
    const isFloor = model.includes(':floor');

    return {
      request_id: 'sim_dry_run_99',
      model_requested: model,
      model_selected: isNitro ? 'mock/fast' : isFree ? 'mock/fast' : 'mock/gpt-4',
      provider_selected: 'mock',
      reason: isNitro
        ? "Optimized candidate 'mock/fast' selected using 'latency' strategy."
        : isFree
        ? "Candidate 'mock/fast' selected ($0/M free endpoint)."
        : "Candidate 'mock/gpt-4' selected using 'balanced' score.",
      reason_code: isNitro ? 'LATENCY_MINIMIZED' : isFloor ? 'COST_MINIMIZED' : 'BALANCED',
      candidates_evaluated: [
        { model: 'mock/fast', provider: 'mock', eligible: true, score: 98.5 },
        { model: 'mock/gpt-4', provider: 'mock', eligible: true, score: 85.0 },
        { model: 'groq/llama-3.3-70b-versatile', provider: 'groq', eligible: false, rejection_reason: 'Circuit Breaker or Unconfigured Key' },
        { model: 'cerebras/llama-3.3-70b', provider: 'cerebras', eligible: false, rejection_reason: 'Unconfigured Key' },
      ],
      fallback_chain: ['mock/gpt-4'],
    };
  };

  const selectedProvider = explanation?.provider_selected || 'mock';
  const selectedModelId = explanation?.model_selected || 'mock/fast';

  // Providers list
  const providers = [
    { id: 'groq', name: 'Groq LPU', type: 'Ultra-Fast', color: 'border-orange-500/40 text-orange-600 dark:text-orange-400' },
    { id: 'cerebras', name: 'Cerebras CS-3', type: 'Wafer Scale', color: 'border-amber-500/40 text-amber-600 dark:text-amber-400' },
    { id: 'deepseek', name: 'DeepSeek', type: 'Reasoning V3', color: 'border-blue-500/40 text-blue-600 dark:text-blue-400' },
    { id: 'mistral', name: 'Mistral AI', type: 'Codestral', color: 'border-red-500/40 text-red-600 dark:text-red-400' },
    { id: 'mock', name: 'Mock / Local Core', type: 'Deterministic', color: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400' },
    { id: 'openai', name: 'OpenAI', type: 'GPT-4o', color: 'border-neutral-500/40 text-neutral-600 dark:text-neutral-400' },
    { id: 'anthropic', name: 'Anthropic', type: 'Claude 3.5', color: 'border-purple-500/40 text-purple-600 dark:text-purple-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Simulation Bar */}
      <div className="rounded-xl border border-hairline bg-elevated p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h3 className="text-base font-semibold text-ink">Live Routing Topology & Simulator</h3>
              <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[11px] font-mono text-mute">
                4-Tier Graph
              </span>
            </div>
            <p className="mt-1 text-xs text-mute">
              Interactive execution graph illustrating request flow from virtual keys through token compression, circuit breakers, and candidate evaluation.
            </p>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: '⚡ :nitro (Lowest Latency)', val: 'auto:nitro' },
              { label: '🎁 :free ($0 Endpoints)', val: 'auto:free' },
              { label: '📉 :floor (Cheapest)', val: 'auto:floor' },
              { label: '🛡️ :zdr (Zero Retention)', val: 'auto:zdr' },
              { label: '⚖️ auto (Balanced)', val: 'auto' },
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => {
                  setSelectedModel(p.val);
                  runSimulation(p.val);
                }}
                className={`rounded-full px-3 py-1 text-xs font-mono transition border ${
                  selectedModel === p.val
                    ? 'bg-zinc-100 dark:bg-white !text-zinc-950 font-semibold border-zinc-200 dark:border-white shadow-xs'
                    : 'bg-elevated text-body border-hairline hover:border-neutral-400'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input & Run bar */}
        <div className="mt-4 pt-4 border-t border-hairline flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              placeholder="e.g. auto:nitro, auto:free, groq/llama-3.3-70b-versatile, or combo/coding-heavy"
              className="w-full rounded-lg border border-hairline bg-canvas px-3.5 py-2 text-xs font-mono text-ink placeholder:text-mute focus:outline-hidden focus:ring-1 focus:ring-ink"
            />
          </div>
          <button
            type="button"
            disabled={simulating}
            onClick={() => runSimulation(selectedModel)}
            className="rounded-lg bg-zinc-100 hover:bg-white !text-zinc-950 font-semibold px-5 py-2 text-xs border border-zinc-200 shadow-xs hover:opacity-90 disabled:opacity-50 transition shrink-0 flex items-center justify-center gap-2"
          >
            {simulating ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Analyzing Route...</span>
              </>
            ) : (
              <>
                <span>Explain Route Path</span>
                <span>→</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Decision Summary Banner */}
      {explanation && (
        <div className="rounded-xl border border-hairline bg-canvas p-4 text-xs font-mono flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">ROUTE RESOLVED:</span>
              <span className="font-semibold text-ink">{explanation.model_selected}</span>
              <span className="text-mute">via</span>
              <span className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-ink">
                {explanation.provider_selected}
              </span>
              <span className="rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 text-[10px]">
                {explanation.reason_code}
              </span>
            </div>
            <p className="text-body text-[11px] font-sans">{explanation.reason}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('graph')}
              className={`px-3 py-1.5 rounded-lg text-xs font-sans transition ${
                activeTab === 'graph' ? 'bg-elevated text-ink font-semibold border border-hairline shadow-xs' : 'text-mute hover:text-ink'
              }`}
            >
              Interactive Graph
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('candidates')}
              className={`px-3 py-1.5 rounded-lg text-xs font-sans transition ${
                activeTab === 'candidates' ? 'bg-elevated text-ink font-semibold border border-hairline shadow-xs' : 'text-mute hover:text-ink'
              }`}
            >
              Candidates Table ({explanation.candidates_evaluated.length})
            </button>
          </div>
        </div>
      )}

      {/* Main View: Graph or Candidates */}
      {activeTab === 'graph' ? (
        <div className="rounded-xl border border-hairline bg-elevated p-6 shadow-xs overflow-x-auto">
          <div className="min-w-[760px] grid grid-cols-4 gap-6 relative">
            {/* TIER 1: Ingress */}
            <div className="space-y-3">
              <div className="text-[11px] font-mono text-mute uppercase tracking-wider font-semibold border-b border-hairline pb-2">
                Tier 1: Client Ingress
              </div>
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-emerald-500/50 bg-emerald-500/5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink">Virtual Key</span>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">ACTIVE</span>
                  </div>
                  <div className="mt-1 text-[11px] font-mono text-mute">rn_live_e891a...</div>
                  <div className="mt-2 text-[10px] text-mute flex items-center gap-1">
                    <span>Rate limit: 120 RPM</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-hairline bg-canvas opacity-75">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-ink">Localhost Direct</span>
                    <span className="text-[10px] font-mono text-mute">BYPASS</span>
                  </div>
                  <div className="mt-1 text-[11px] font-mono text-mute">127.0.0.1:3001</div>
                </div>

                <div className="p-3 rounded-lg border border-hairline bg-canvas opacity-75">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-ink">Remote CLI</span>
                    <span className="text-[10px] font-mono text-mute">STANDBY</span>
                  </div>
                  <div className="mt-1 text-[11px] font-mono text-mute">routenex connect</div>
                </div>
              </div>
            </div>

            {/* TIER 2: Pipeline Core */}
            <div className="space-y-3">
              <div className="text-[11px] font-mono text-mute uppercase tracking-wider font-semibold border-b border-hairline pb-2">
                Tier 2: Pipeline Core
              </div>
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-blue-500/50 bg-blue-500/5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink">4-Stage Compressor</span>
                    <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400">-24% Tok</span>
                  </div>
                  <div className="mt-1 text-[11px] text-mute">Guard + RTK + Dedup</div>
                </div>

                <div className="p-3 rounded-lg border border-emerald-500/60 bg-emerald-500/10 shadow-xs ring-1 ring-emerald-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">Deterministic Router</span>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">RESOLVING</span>
                  </div>
                  <div className="mt-1 text-[11px] font-mono text-ink">
                    Strategy: {explanation?.reason_code || 'BALANCED'}
                  </div>
                  <div className="mt-2 text-[10px] text-mute">
                    Latency/Price/Resilience Matrix
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-hairline bg-canvas">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-ink">Circuit Breaker</span>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">3-STATE</span>
                  </div>
                  <div className="mt-1 text-[11px] text-mute">Closed • Headroom Monitor</div>
                </div>
              </div>
            </div>

            {/* TIER 3: Active Providers */}
            <div className="space-y-3">
              <div className="text-[11px] font-mono text-mute uppercase tracking-wider font-semibold border-b border-hairline pb-2">
                Tier 3: Provider Pool
              </div>
              <div className="space-y-2">
                {providers.slice(0, 5).map((p) => {
                  const isSelected = selectedProvider === p.id;
                  return (
                    <div
                      key={p.id}
                      onMouseEnter={() => setHoveredNode(p.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      className={`p-2.5 rounded-lg border transition cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/10 shadow-xs ring-1 ring-emerald-500/40'
                          : 'border-hairline bg-canvas hover:border-neutral-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${isSelected ? 'text-ink' : 'text-body'}`}>
                          {p.name}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            PRIMARY
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[10px] font-mono text-mute">
                        <span>{p.type}</span>
                        <span>{isSelected ? '0.0ms delay' : 'Standby'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TIER 4: Model Endpoints */}
            <div className="space-y-3">
              <div className="text-[11px] font-mono text-mute uppercase tracking-wider font-semibold border-b border-hairline pb-2">
                Tier 4: Model Endpoint
              </div>
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-emerald-500 bg-emerald-500/10 shadow-xs ring-1 ring-emerald-500/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">{selectedModelId}</span>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      ACTIVE
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] font-mono text-mute">
                    Provider: {selectedProvider}
                  </div>
                  <div className="mt-2 pt-2 border-t border-emerald-500/20 flex items-center justify-between text-[10px] font-mono text-mute">
                    <span>Fallback Chain:</span>
                    <span>{explanation?.fallback_chain?.length || 0} reserve(s)</span>
                  </div>
                </div>

                {explanation?.fallback_chain?.map((fb) => (
                  <div key={fb} className="p-2.5 rounded-lg border border-hairline bg-canvas">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-body">{fb}</span>
                      <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400">FALLBACK</span>
                    </div>
                    <div className="mt-1 text-[10px] text-mute font-mono">Secondary Failover</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Candidates Table */
        <div className="rounded-xl border border-hairline bg-elevated overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-canvas border-b border-hairline text-mute font-mono text-[11px]">
                <tr>
                  <th className="py-2.5 px-4 font-normal">Candidate Model</th>
                  <th className="py-2.5 px-4 font-normal">Provider</th>
                  <th className="py-2.5 px-4 font-normal">Status</th>
                  <th className="py-2.5 px-4 font-normal">Score</th>
                  <th className="py-2.5 px-4 font-normal">Rejection Reason / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {explanation?.candidates_evaluated.map((c, idx) => (
                  <tr
                    key={c.model + idx}
                    className={c.model === explanation.model_selected ? 'bg-emerald-500/5' : ''}
                  >
                    <td className="py-2.5 px-4 font-mono font-medium text-ink">
                      {c.model}
                      {c.model === explanation.model_selected && (
                        <span className="ml-2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 text-[10px]">
                          Selected
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-mute">{c.provider}</td>
                    <td className="py-2.5 px-4">
                      {c.eligible ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                          Eligible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                          Ineligible
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-ink">
                      {c.score !== undefined ? c.score : '—'}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-mute">
                      {c.rejection_reason || 'Passed all capability and circuit checks'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

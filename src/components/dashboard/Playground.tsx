import React, { useState } from 'react';

interface CompletionResult {
  content: string;
  modelUsed: string;
  provider: string;
  latencyMs: number;
  tokens: { prompt: number; completion: number; total: number };
  routingReason: string;
  fallbackAttempts: number;
  cacheHit?: boolean;
  compression?: {
    original_chars: number;
    compressed_chars: number;
    saved_percent: number;
    estimated_tokens_saved: number;
  };
}

export default function Playground() {
  const [prompt, setPrompt] = useState('Why should AI developers use an intelligent router like RouteNex?');
  const [selectedModel, setSelectedModel] = useState('auto');
  const [strategy, setStrategy] = useState<'balanced' | 'cost' | 'latency'>('balanced');
  const [compress, setCompress] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<CompletionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    const startTime = performance.now();

    try {
      // Build request body according to RouteNex / OpenRouter specification
      let body: any;
      if (selectedModel === 'fallback-chain') {
        body = {
          models: ['mock/error', 'mock/fast', 'mock/gpt-4'],
          messages: [{ role: 'user', content: prompt }],
          compress,
        };
      } else {
        body = {
          model: selectedModel,
          messages: [{ role: 'user', content: prompt }],
          compress,
          provider: {
            sort: strategy,
            allow_fallbacks: true,
          },
        };
      }

      const res = await fetch('http://127.0.0.1:3001/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      setResult({
        content: data.choices?.[0]?.message?.content || '(Empty content)',
        modelUsed: data.routenex?.model_used || data.model || selectedModel,
        provider: data.routenex?.provider || 'Unknown',
        latencyMs: data.routenex?.latency_ms !== undefined ? data.routenex.latency_ms : latencyMs,
        tokens: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        routingReason: data.routenex?.routing_reason || 'Direct route',
        fallbackAttempts: data.routenex?.fallback_attempts || 0,
        cacheHit: Boolean(data.routenex?.cache_hit),
        compression: data.routenex?.compression,
      });
    } catch (err: any) {
      setError(
        err.message.includes('Failed to fetch')
          ? 'Gateway unreachable. Make sure the RouteNex Gateway is running (`npm run dev:api` on port 3001).'
          : err.message
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="rounded-lg border border-hairline bg-elevated p-5 shadow-xs">
        <h3 className="text-base font-semibold text-ink">Live Route Playground</h3>
        <p className="text-xs text-mute mt-1">
          Execute completions against the local gateway (`http://127.0.0.1:3001/v1/chat/completions`) and observe deterministic routing in real-time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Request Builder Form */}
        <div className="lg:col-span-6 space-y-4">
          <form onSubmit={handleSend} className="rounded-lg border border-hairline bg-elevated p-5 shadow-xs space-y-4">
            <div>
              <label className="block font-mono text-xs font-semibold text-ink mb-1.5">
                Model Target / Policy
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full rounded border border-hairline bg-canvas px-3 py-2 font-mono text-xs text-ink focus:border-ink focus:outline-none"
              >
                <option value="auto">auto (Deterministic Smart Routing)</option>
                <option value="fallback-chain">Cascade Chain: [mock/error → mock/fast → mock/gpt-4]</option>
                <option value="mock/fast">mock/fast (Low Latency Fixture)</option>
                <option value="mock/gpt-4">mock/gpt-4 (High Capability Fixture)</option>
                <option value="groq/llama-3.3-70b-versatile">groq/llama-3.3-70b-versatile (BYOK)</option>
                <option value="openai/gpt-4o-mini">openai/gpt-4o-mini (BYOK)</option>
                <option value="gemini/gemini-2.5-flash">gemini/gemini-2.5-flash (BYOK)</option>
                <option value="ollama/llama3.2">ollama/llama3.2 (Local)</option>
              </select>
            </div>

            {selectedModel === 'auto' && (
              <div>
                <label className="block font-mono text-xs font-semibold text-ink mb-1.5">
                  Optimization Strategy
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['balanced', 'cost', 'latency'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStrategy(s)}
                      className={`rounded border py-1.5 text-xs font-mono transition ${
                        strategy === s
                          ? 'border-zinc-300 dark:border-white bg-zinc-100 dark:bg-white !text-zinc-950 font-semibold shadow-xs'
                          : 'border-hairline bg-canvas text-body hover:border-neutral-400'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block font-mono text-xs font-semibold text-ink mb-1.5">
                User Prompt
              </label>
              <textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full rounded border border-hairline bg-canvas p-3 font-mono text-xs text-ink placeholder:text-mute focus:border-ink focus:outline-none resize-none"
                placeholder="Enter prompt..."
              />
            </div>

            {/* Context Token Compressor Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded border border-hairline bg-canvas">
              <div>
                <span className="block font-mono text-xs font-semibold text-ink">
                  🗜️ Context Compressor
                </span>
                <span className="text-[10px] text-mute">
                  Strip redundant whitespace & comments (-15% to -50% tokens)
                </span>
              </div>
              <input
                type="checkbox"
                checked={compress}
                onChange={(e) => setCompress(e.target.checked)}
                className="h-4 w-4 rounded border-hairline accent-ink cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !prompt.trim()}
              className="w-full rounded-full bg-ink px-4 py-2.5 font-mono text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Routing Request...
                </>
              ) : (
                'Send Through Gateway →'
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Real-Time Results Inspector */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-lg border border-hairline bg-elevated p-5 shadow-xs min-h-[340px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-hairline pb-3">
                <span className="font-mono text-xs font-semibold text-ink">Execution Telemetry</span>
                {result && (
                  <div className="flex items-center gap-2">
                    {result.cacheHit && (
                      <span className="rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 px-2 py-0.5 font-mono text-[10px] font-semibold border border-sky-300 dark:border-sky-800">
                        ⚡ 0ms Cache Hit
                      </span>
                    )}
                    <span className="rounded bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 font-mono text-[10px] text-emerald-800 dark:text-emerald-300 font-medium border border-emerald-300 dark:border-emerald-800">
                      200 OK • {result.latencyMs}ms
                    </span>
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-4 rounded border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 font-mono">
                  <div className="font-semibold mb-1">Execution Error</div>
                  <div>{error}</div>
                </div>
              )}

              {result && (
                <div className="mt-4 space-y-3 font-mono text-xs">
                  {/* Telemetry pill badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="rounded border border-hairline bg-canvas p-2">
                      <div className="text-[10px] text-mute">Selected Model</div>
                      <div className="font-semibold text-ink truncate">{result.modelUsed}</div>
                    </div>
                    <div className="rounded border border-hairline bg-canvas p-2">
                      <div className="text-[10px] text-mute">Provider Used</div>
                      <div className="font-semibold text-ink capitalize">{result.provider}</div>
                    </div>
                    <div className="rounded border border-hairline bg-canvas p-2">
                      <div className="text-[10px] text-mute">Tokens Total</div>
                      <div className="font-semibold text-ink">{result.tokens.total_tokens || result.tokens.prompt_tokens + result.tokens.completion_tokens}</div>
                    </div>
                  </div>

                  {result.compression && (
                    <div className="rounded border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/50 p-2.5 text-teal-900 dark:text-teal-200 text-[11px] flex items-center justify-between">
                      <span>🗜️ <strong>Context Token Compression:</strong> -{result.compression.saved_percent}% characters</span>
                      <span className="font-semibold text-teal-600 dark:text-teal-400">~{result.compression.estimated_tokens_saved} tokens saved</span>
                    </div>
                  )}

                  {result.fallbackAttempts > 0 && (
                    <div className="rounded border border-amber-200 bg-amber-50 p-2.5 text-amber-900 text-[11px]">
                      <span className="font-semibold">⚡ Cascade Failover Triggered:</span> Mitigated {result.fallbackAttempts} failing candidate before successful completion.
                    </div>
                  )}

                  <div className="rounded border border-hairline bg-canvas p-3">
                    <div className="text-[10px] text-mute mb-1">Routing Reason</div>
                    <div className="text-body text-[11px]">{result.routingReason}</div>
                  </div>

                  {/* Completion output preview */}
                  <div className="rounded border border-hairline bg-neutral-900 p-3 text-neutral-100 font-mono text-xs leading-relaxed max-h-48 overflow-y-auto">
                    <div className="text-[10px] text-neutral-400 mb-1 border-b border-neutral-700 pb-1">Response Content:</div>
                    {result.content}
                  </div>
                </div>
              )}

              {!result && !error && !isSubmitting && (
                <div className="py-20 text-center font-mono text-xs text-mute">
                  No request executed yet. Select a model target and submit to inspect gateway behavior.
                </div>
              )}
            </div>

            <div className="border-t border-hairline pt-3 mt-4 flex items-center justify-between text-[11px] font-mono text-mute">
              <span>Endpoint: /v1/chat/completions</span>
              <span>Zero-cost mockable</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

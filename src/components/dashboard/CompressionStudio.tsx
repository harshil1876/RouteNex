import React, { useState, useEffect } from 'react';

interface StageBreakdown {
  stage1Saved: number;
  stage2Saved: number;
  stage3Saved: number;
  stage4Saved: number;
}

export default function CompressionStudio() {
  const [inputText, setInputText] = useState(
    `Error: Connection failed to upstream database\n    at query (c:/app/node_modules/pg/client.js:10:5)\n    at pool (c:/app/node_modules/pg/pool.js:20:5)\n    at runQuery (c:/app/node_modules/orm/exec.js:30:5)\n    at fetchUser (c:/app/node_modules/services/user.js:40:5)\n    at handler (c:/app/node_modules/routes/api.js:50:5)\n    at Object.run (c:/app/node_modules/server.js:60:5)\n    at main (c:/app/src/index.ts:15:1)\n\nCould you please kindly analyze this issue? As an AI language model, thank you in advance!`
  );

  const [stage1Lite, setStage1Lite] = useState(true);
  const [stage2Logs, setStage2Logs] = useState(true);
  const [stage3Dedup, setStage3Dedup] = useState(true);
  const [stage4Caveman, setStage4Caveman] = useState(true);
  const [preserveGuards, setPreserveGuards] = useState(true);

  const [compressedText, setCompressedText] = useState('');
  const [stats, setStats] = useState({
    originalChars: 0,
    compressedChars: 0,
    savedPercent: 0,
    estimatedTokensSaved: 0,
  });
  const [breakdown, setBreakdown] = useState<StageBreakdown>({
    stage1Saved: 0,
    stage2Saved: 0,
    stage3Saved: 0,
    stage4Saved: 0,
  });
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Run compression when text or options change
  useEffect(() => {
    let active = true;

    async function runCompression() {
      setLoading(true);
      try {
        const res = await fetch('http://127.0.0.1:3001/v1/admin/compress/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: inputText,
            options: {
              stage1Lite,
              stage2Logs,
              stage3Dedup,
              stage4Caveman,
              preserveGuards,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (active) {
            setCompressedText(data.compressedText);
            setStats({
              originalChars: data.originalChars,
              compressedChars: data.compressedChars,
              savedPercent: data.savedPercent,
              estimatedTokensSaved: data.estimatedTokensSaved,
            });
            if (data.stageBreakdown) {
              setBreakdown(data.stageBreakdown);
            }
          }
          return;
        }
      } catch {
        // Fallback local execution if gateway is not currently reachable
      }

      if (active) {
        // Simple local fallback simulation
        const origLen = inputText.length;
        let comp = inputText
          .replace(/<!--[\s\S]*?-->/g, '')
          .replace(/\n{3,}/g, '\n\n')
          .replace(/[ \t]{2,}/g, ' ');
        if (stage4Caveman) {
          comp = comp.replace(/\b(?:Could you please kindly|Please kindly|As an AI language model, thank you in advance!)\b/gi, '');
        }
        const compLen = comp.length;
        const diff = Math.max(0, origLen - compLen);
        setCompressedText(comp.trim());
        setStats({
          originalChars: origLen,
          compressedChars: compLen,
          savedPercent: origLen > 0 ? parseFloat(((diff / origLen) * 100).toFixed(1)) : 0,
          estimatedTokensSaved: Math.round(diff / 4),
        });
        setLoading(false);
      }
    }

    const timer = setTimeout(runCompression, 150);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [inputText, stage1Lite, stage2Logs, stage3Dedup, stage4Caveman, preserveGuards]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(compressedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadPreset = (type: string) => {
    if (type === 'stack') {
      setInputText(
        `FATAL ERROR: Ingress connection timeout at pool worker 4\n    at query (c:/app/node_modules/pg/client.js:10:5)\n    at pool (c:/app/node_modules/pg/pool.js:20:5)\n    at runQuery (c:/app/node_modules/orm/exec.js:30:5)\n    at fetchUser (c:/app/node_modules/services/user.js:40:5)\n    at handler (c:/app/node_modules/routes/api.js:50:5)\n    at Object.run (c:/app/node_modules/server.js:60:5)\n    at main (c:/app/src/index.ts:15:1)\n\nPlease explain why this happened and how to increase the pool limit.`
      );
    } else if (type === 'fluff') {
      setInputText(
        `Could you please kindly write a clean TypeScript function to format timestamps? As an AI language model, I would like you to make sure it handles timezones properly. Thank you very much in advance for your assistance!`
      );
    } else if (type === 'table') {
      setInputText(
        `Here is the route schema table and sample payload:\n\n<!-- route table definition -->\n| Endpoint | Method | Scope |\n|---|---|---|\n| /v1/chat/completions | POST | chat.write |\n| /v1/models | GET | models.read |\n\n\`\`\`typescript\ninterface GatewayConfig {\n  port: number;\n  host: string;\n}\n\`\`\`\n\nDocs available at https://routenex.dev/docs`
      );
    } else if (type === 'dedup') {
      const repeated =
        'You are an expert full-stack software engineer. Output strictly high-performance TypeScript code adhering to enterprise standards without conversational preamble or markdown chat. Ensure every method is fully typed with JSDoc comments.\n\n';
      setInputText(
        `System Prompt:\n${repeated}User Query:\n${repeated}Now please write a debounce utility function.`
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-xl border border-hairline bg-elevated p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              <h3 className="text-base font-semibold text-ink">Prompt Compression Studio</h3>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 text-[11px] font-mono">
                4-Stage Pipeline
              </span>
            </div>
            <p className="mt-1 text-xs text-mute">
              Live token compression preview. Safely strips redundant whitespace, repetitive stack traces, duplicate cross-turn context, and conversational filler while guarding code blocks verbatim.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-mute">Presets:</span>
            <button
              type="button"
              onClick={() => loadPreset('stack')}
              className="rounded-full border border-hairline bg-canvas hover:border-neutral-400 px-3 py-1 text-xs font-mono text-body transition"
            >
              Verbose Stack Trace
            </button>
            <button
              type="button"
              onClick={() => loadPreset('fluff')}
              className="rounded-full border border-hairline bg-canvas hover:border-neutral-400 px-3 py-1 text-xs font-mono text-body transition"
            >
              Filler Courtesies
            </button>
            <button
              type="button"
              onClick={() => loadPreset('table')}
              className="rounded-full border border-hairline bg-canvas hover:border-neutral-400 px-3 py-1 text-xs font-mono text-body transition"
            >
              Code & Tables
            </button>
            <button
              type="button"
              onClick={() => loadPreset('dedup')}
              className="rounded-full border border-hairline bg-canvas hover:border-neutral-400 px-3 py-1 text-xs font-mono text-body transition"
            >
              Repeated Context
            </button>
          </div>
        </div>

        {/* Stage Toggle Toggles */}
        <div className="mt-4 pt-4 border-t border-hairline grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <label className="flex items-center gap-2 text-xs font-sans text-body cursor-pointer select-none">
            <input
              type="checkbox"
              checked={stage1Lite}
              onChange={(e) => setStage1Lite(e.target.checked)}
              className="rounded border-hairline text-ink focus:ring-ink"
            />
            <span>Stage 1: Lite (Spaces)</span>
          </label>

          <label className="flex items-center gap-2 text-xs font-sans text-body cursor-pointer select-none">
            <input
              type="checkbox"
              checked={stage2Logs}
              onChange={(e) => setStage2Logs(e.target.checked)}
              className="rounded border-hairline text-ink focus:ring-ink"
            />
            <span>Stage 2: RTK Logs</span>
          </label>

          <label className="flex items-center gap-2 text-xs font-sans text-body cursor-pointer select-none">
            <input
              type="checkbox"
              checked={stage3Dedup}
              onChange={(e) => setStage3Dedup(e.target.checked)}
              className="rounded border-hairline text-ink focus:ring-ink"
            />
            <span>Stage 3: Session Dedup</span>
          </label>

          <label className="flex items-center gap-2 text-xs font-sans text-body cursor-pointer select-none">
            <input
              type="checkbox"
              checked={stage4Caveman}
              onChange={(e) => setStage4Caveman(e.target.checked)}
              className="rounded border-hairline text-ink focus:ring-ink"
            />
            <span className="font-semibold text-ink">Stage 4: Caveman</span>
          </label>

          <label className="flex items-center gap-2 text-xs font-sans text-body cursor-pointer select-none">
            <input
              type="checkbox"
              checked={preserveGuards}
              onChange={(e) => setPreserveGuards(e.target.checked)}
              className="rounded border-hairline text-ink focus:ring-ink"
            />
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Guard Preservation</span>
          </label>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-hairline bg-elevated p-4 shadow-xs">
          <span className="text-[11px] font-mono text-mute">Original Prompt</span>
          <div className="mt-1 text-xl font-semibold text-ink font-sans">
            {stats.originalChars.toLocaleString()} <span className="text-xs font-normal text-mute">chars</span>
          </div>
          <span className="text-[10px] font-mono text-mute">
            ~{Math.round(stats.originalChars / 4)} tokens
          </span>
        </div>

        <div className="rounded-xl border border-hairline bg-elevated p-4 shadow-xs">
          <span className="text-[11px] font-mono text-mute">Optimized Result</span>
          <div className="mt-1 text-xl font-semibold text-ink font-sans">
            {stats.compressedChars.toLocaleString()} <span className="text-xs font-normal text-mute">chars</span>
          </div>
          <span className="text-[10px] font-mono text-mute">
            ~{Math.round(stats.compressedChars / 4)} tokens
          </span>
        </div>

        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4 shadow-xs">
          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
            Token Savings
          </span>
          <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-sans">
            -{stats.savedPercent}%
          </div>
          <span className="text-[10px] font-mono text-mute">
            ~{stats.estimatedTokensSaved} tokens saved
          </span>
        </div>

        <div className="rounded-xl border border-hairline bg-elevated p-4 shadow-xs">
          <span className="text-[11px] font-mono text-mute">Stage Breakdown</span>
          <div className="mt-1 text-xs font-mono space-y-0.5 text-mute">
            <div>S1 Lite: {breakdown.stage1Saved} chars</div>
            <div>S2 Logs: {breakdown.stage2Saved} chars</div>
            <div>S3 Dedup: {breakdown.stage3Saved} chars</div>
            <div>S4 Caveman: {breakdown.stage4Saved} chars</div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Editor Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Textarea */}
        <div className="rounded-xl border border-hairline bg-elevated overflow-hidden shadow-xs flex flex-col">
          <div className="px-4 py-3 bg-canvas border-b border-hairline flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-ink">RAW INPUT PROMPT</span>
            <span className="text-[11px] font-mono text-mute">
              {stats.originalChars} characters
            </span>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={14}
            placeholder="Type or paste your prompt, stack trace, or instructions here..."
            className="w-full flex-1 p-4 font-mono text-xs text-ink bg-elevated resize-none focus:outline-hidden"
          />
        </div>

        {/* Compressed Output */}
        <div className="rounded-xl border border-hairline bg-elevated overflow-hidden shadow-xs flex flex-col">
          <div className="px-4 py-3 bg-canvas border-b border-hairline flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-ink">OPTIMIZED RESULT</span>
              {stats.savedPercent > 0 && (
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-mono font-bold">
                  -{stats.savedPercent}%
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={copyToClipboard}
              className="rounded-md border border-hairline bg-elevated px-2.5 py-1 text-[11px] font-mono text-body hover:text-ink transition flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <textarea
            readOnly
            value={compressedText}
            rows={14}
            className="w-full flex-1 p-4 font-mono text-xs text-ink bg-canvas/40 resize-none focus:outline-hidden"
          />
        </div>
      </div>
    </div>
  );
}

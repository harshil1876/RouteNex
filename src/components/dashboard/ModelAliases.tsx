import React, { useState, useEffect } from 'react';

export default function ModelAliases() {
  const [aliases, setAliases] = useState<Record<string, string>>({
    fast: 'groq/llama-3.1-8b-instant',
    smart: 'openai/gpt-4o-mini',
    reason: 'gemini/gemini-2.5-flash',
  });

  const [newAlias, setNewAlias] = useState('');
  const [newTarget, setNewTarget] = useState('groq/llama-3.3-70b-versatile');
  const [strategy, setStrategy] = useState<'cost' | 'latency' | 'balanced'>('balanced');
  const [compression, setCompression] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    async function loadPolicy() {
      try {
        const res = await fetch('http://127.0.0.1:3001/v1/admin/config');
        if (res.ok) {
          const data = await res.json();
          if (data.aliases) setAliases(data.aliases);
          if (data.defaultStrategy) setStrategy(data.defaultStrategy);
          if (typeof data.compressionEnabled === 'boolean') setCompression(data.compressionEnabled);
        }
      } catch {}
    }
    loadPolicy();
  }, []);

  const handleAddAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlias.trim()) return;

    const trimmed = newAlias.trim().toLowerCase();
    try {
      await fetch('http://127.0.0.1:3001/v1/admin/aliases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias: trimmed, targetModel: newTarget }),
      });
    } catch {}

    setAliases((prev) => ({ ...prev, [trimmed]: newTarget }));
    setNewAlias('');
  };

  const handleDeleteAlias = async (key: string) => {
    try {
      await fetch(`http://127.0.0.1:3001/v1/admin/aliases/${key}`, { method: 'DELETE' });
    } catch {}
    setAliases((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const handleSavePolicy = async () => {
    try {
      const res = await fetch('http://127.0.0.1:3001/v1/admin/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy, compressionEnabled: compression }),
      });
      if (res.ok) {
        setSaveStatus('Policy saved to gateway.');
      }
    } catch {
      setSaveStatus('Saved in local memory.');
    }
    setTimeout(() => setSaveStatus(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-ink tracking-tight">Model Aliases & Routing Policy</h2>
        <p className="mt-1 text-sm text-mute">
          Map custom virtual model names (e.g. <code className="font-mono text-xs">fast</code>) to specific upstream models, and tune gateway optimization rules.
        </p>
      </div>

      {/* Global Routing Strategy & Compression Card */}
      <div className="rounded-lg border border-hairline bg-elevated p-5 shadow-xs space-y-5">
        <h3 className="text-sm font-semibold text-ink">Optimization & Routing Settings</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono text-mute mb-1.5">Default Auto-Routing Strategy</label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as any)}
              className="w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-xs font-mono text-ink focus:outline-none focus:ring-1 focus:ring-ink"
            >
              <option value="balanced">Balanced (Optimal latency & cost tradeoff)</option>
              <option value="cost">Lowest Cost (Cheapest eligible model)</option>
              <option value="latency">Lowest Latency (Fastest responsive model)</option>
            </select>
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-4 sm:pt-6">
            <div>
              <span className="block text-xs font-mono font-medium text-ink">Prompt Token Compressor</span>
              <span className="block text-[11px] text-mute">Strip redundant whitespace & markdown comments</span>
            </div>
            <button
              type="button"
              onClick={() => setCompression(!compression)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                compression ? 'bg-ink dark:bg-white' : 'bg-hairline'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-canvas shadow ring-0 transition duration-200 ease-in-out ${
                  compression ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={handleSavePolicy}
            className="inline-flex items-center rounded-full bg-ink px-4 py-1.5 text-xs font-medium text-white dark:bg-white dark:text-black hover:opacity-90 transition"
          >
            Apply Policy
          </button>
          {saveStatus && <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">{saveStatus}</span>}
        </div>
      </div>

      {/* Aliases Form & Table */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-ink">Virtual Model Aliases</h3>

        <form onSubmit={handleAddAlias} className="flex flex-col sm:flex-row items-end gap-3">
          <div className="w-full sm:w-1/3">
            <label className="block text-xs font-mono text-mute mb-1">Alias Name</label>
            <input
              type="text"
              value={newAlias}
              onChange={(e) => setNewAlias(e.target.value)}
              placeholder="e.g. fast, smart, coder"
              required
              className="w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-xs font-mono text-ink placeholder:text-mute focus:outline-none focus:ring-1 focus:ring-ink"
            />
          </div>

          <div className="w-full sm:flex-1">
            <label className="block text-xs font-mono text-mute mb-1">Target Model ID</label>
            <select
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              className="w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-xs font-mono text-ink focus:outline-none focus:ring-1 focus:ring-ink"
            >
              <option value="groq/llama-3.3-70b-versatile">groq/llama-3.3-70b-versatile</option>
              <option value="groq/llama-3.1-8b-instant">groq/llama-3.1-8b-instant</option>
              <option value="openai/gpt-4o-mini">openai/gpt-4o-mini</option>
              <option value="openai/gpt-4o">openai/gpt-4o</option>
              <option value="gemini/gemini-2.5-flash">gemini/gemini-2.5-flash</option>
              <option value="anthropic/claude-3-5-sonnet">anthropic/claude-3-5-sonnet</option>
              <option value="anthropic/claude-3-5-haiku-20241022">anthropic/claude-3-5-haiku-20241022</option>
              <option value="ollama/llama3.2">ollama/llama3.2</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-ink px-5 py-2 text-xs font-medium text-white dark:bg-white dark:text-black hover:opacity-90 transition shrink-0"
          >
            + Add Alias
          </button>
        </form>

        <div className="overflow-x-auto rounded-lg border border-hairline bg-elevated">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-hairline bg-canvas text-xs uppercase font-mono text-mute">
              <tr>
                <th className="py-3 px-5 font-semibold">Virtual Alias</th>
                <th className="py-3 px-5 font-semibold">Target Route</th>
                <th className="py-3 px-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline font-mono text-xs">
              {Object.entries(aliases).map(([alias, target]) => (
                <tr key={alias} className="hover:bg-canvas/50 transition-colors">
                  <td className="py-3 px-5 font-semibold text-ink">
                    <span className="bg-canvas px-2.5 py-1 rounded border border-hairline">{alias}</span>
                  </td>
                  <td className="py-3 px-5 text-body">{target}</td>
                  <td className="py-3 px-5 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteAlias(alias)}
                      className="inline-flex items-center rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-[11px] text-red-600 dark:text-red-400 hover:bg-red-500/20 transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

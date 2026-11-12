import React, { useState, useEffect } from 'react';

interface VirtualKeyItem {
  id: string;
  name: string;
  keyMasked: string;
  keyFull: string;
  createdAt: string;
  rateLimitRpm: number;
  defaultCombo?: string;
  rolling5hBudgetUsd?: number;
  dailyBudgetUsd?: number;
}

export default function VirtualKeys() {
  const [keys, setKeys] = useState<VirtualKeyItem[]>([
    {
      id: 'vk_default',
      name: 'Default Local Dev',
      keyMasked: 'rn-local-dev...ault',
      keyFull: 'rn-local-dev-default',
      createdAt: new Date().toISOString(),
      rateLimitRpm: 120,
      defaultCombo: 'combo/free-unlimited',
      rolling5hBudgetUsd: 1.0,
      dailyBudgetUsd: 5.0,
    },
  ]);

  const [availableCombos, setAvailableCombos] = useState<string[]>([
    'combo/free-unlimited',
    'combo/coding-power',
    'combo/reasoning-tier',
  ]);

  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyRpm, setNewKeyRpm] = useState(60);
  const [newDefaultCombo, setNewDefaultCombo] = useState('combo/free-unlimited');
  const [newRolling5hBudget, setNewRolling5hBudget] = useState<string>('');
  const [newDailyBudget, setNewDailyBudget] = useState<string>('');

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Poll current keys and combos from gateway
  useEffect(() => {
    async function loadData() {
      try {
        const configRes = await fetch('http://127.0.0.1:3001/v1/admin/config');
        if (configRes.ok) {
          const data = await configRes.json();
          if (data.virtualKeys) {
            setKeys(data.virtualKeys);
          }
          if (data.combos && Array.isArray(data.combos)) {
            const slugs = data.combos.map((c: any) => c.slug);
            setAvailableCombos((prev) => Array.from(new Set([...slugs, ...prev])));
          }
        }
      } catch {
        // Gateway offline, preview mode
      }
    }
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setIsGenerating(true);

    const payload = {
      name: newKeyName.trim(),
      rateLimitRpm: newKeyRpm,
      defaultCombo: newDefaultCombo || undefined,
      rolling5hBudgetUsd: newRolling5hBudget ? Number(newRolling5hBudget) : undefined,
      dailyBudgetUsd: newDailyBudget ? Number(newDailyBudget) : undefined,
    };

    try {
      const res = await fetch('http://127.0.0.1:3001/v1/admin/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        const vk: VirtualKeyItem = {
          id: data.key.id,
          name: data.key.name,
          keyMasked: `${data.key.key.slice(0, 12)}...${data.key.key.slice(-4)}`,
          keyFull: data.key.key,
          createdAt: data.key.createdAt,
          rateLimitRpm: data.key.rateLimitRpm,
          defaultCombo: data.key.defaultCombo,
          rolling5hBudgetUsd: data.key.rolling5hBudgetUsd,
          dailyBudgetUsd: data.key.dailyBudgetUsd,
        };
        setKeys((prev) => [vk, ...prev]);
        setNewKeyName('');
        setNewRolling5hBudget('');
        setNewDailyBudget('');
      }
    } catch {
      // Offline fallback simulation
      const mockKey = `rn-local-${Math.random().toString(36).slice(2, 10)}${Date.now()}`;
      setKeys((prev) => [
        {
          id: `vk_${Date.now()}`,
          name: newKeyName.trim(),
          keyMasked: `${mockKey.slice(0, 12)}...${mockKey.slice(-4)}`,
          keyFull: mockKey,
          createdAt: new Date().toISOString(),
          rateLimitRpm: newKeyRpm,
          defaultCombo: newDefaultCombo || undefined,
          rolling5hBudgetUsd: newRolling5hBudget ? Number(newRolling5hBudget) : undefined,
          dailyBudgetUsd: newDailyBudget ? Number(newDailyBudget) : undefined,
        },
        ...prev,
      ]);
      setNewKeyName('');
      setNewRolling5hBudget('');
      setNewDailyBudget('');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('routenex:state-changed'));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`http://127.0.0.1:3001/v1/admin/keys/${id}`, { method: 'DELETE' });
    } catch {}
    setKeys((prev) => prev.filter((k) => k.id !== id));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('routenex:state-changed'));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-ink tracking-tight">Local Virtual Access Keys</h2>
        <p className="mt-1 text-sm text-mute">
          Generate scoped proxy tokens (<code className="font-mono text-xs">rn-local-...</code>) with optional Combo routing defaults and 5-hour rolling / daily budget circuit breakers.
        </p>
      </div>

      {/* Create Form */}
      <form
        onSubmit={handleCreate}
        className="rounded-lg border border-hairline bg-elevated p-5 shadow-xs space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-xs font-mono text-mute mb-1">Application Name / Label</label>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g. Cursor IDE, Claude Code CLI, Research Agent"
              required
              className="w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-xs font-mono text-ink placeholder:text-mute focus:outline-none focus:ring-1 focus:ring-ink"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-mute mb-1">Default Combo Scoping</label>
            <select
              value={newDefaultCombo}
              onChange={(e) => setNewDefaultCombo(e.target.value)}
              className="w-full rounded-md border border-hairline bg-canvas px-2.5 py-2 text-xs font-mono text-ink focus:outline-none focus:ring-1 focus:ring-ink"
            >
              <option value="">(None - use global)</option>
              {availableCombos.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-mute mb-1">Rolling 5h Cap ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 1.00"
              value={newRolling5hBudget}
              onChange={(e) => setNewRolling5hBudget(e.target.value)}
              className="w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-xs font-mono text-ink placeholder:text-mute focus:outline-none focus:ring-1 focus:ring-ink"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-mute mb-1">Daily Cap ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 5.00"
              value={newDailyBudget}
              onChange={(e) => setNewDailyBudget(e.target.value)}
              className="w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-xs font-mono text-ink placeholder:text-mute focus:outline-none focus:ring-1 focus:ring-ink"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-mute">Rate Limit:</span>
            <input
              type="number"
              value={newKeyRpm}
              onChange={(e) => setNewKeyRpm(Number(e.target.value))}
              min="1"
              max="1000"
              className="w-20 rounded-md border border-hairline bg-canvas px-2 py-1 text-xs font-mono text-ink focus:outline-none focus:ring-1 focus:ring-ink"
            />
            <span className="text-xs font-mono text-mute">RPM</span>
          </div>

          <button
            type="submit"
            disabled={isGenerating}
            className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-2 text-xs font-medium text-white dark:bg-white dark:text-black hover:opacity-90 transition shrink-0"
          >
            {isGenerating ? 'Generating...' : '+ Generate Scoped Key'}
          </button>
        </div>
      </form>

      {/* Keys Table */}
      <div className="overflow-x-auto rounded-lg border border-hairline bg-elevated">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-hairline bg-canvas text-xs uppercase font-mono text-mute">
            <tr>
              <th className="py-3 px-5 font-semibold">Name</th>
              <th className="py-3 px-5 font-semibold">Key</th>
              <th className="py-3 px-5 font-semibold">Scoped Combo</th>
              <th className="py-3 px-5 font-semibold">Budget Guard (5h / Day)</th>
              <th className="py-3 px-5 font-semibold">Rate Limit</th>
              <th className="py-3 px-5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline font-mono text-xs">
            {keys.map((k) => (
              <tr key={k.id} className="hover:bg-canvas/50 transition-colors">
                <td className="py-3 px-5 font-medium text-ink font-sans">{k.name}</td>
                <td className="py-3 px-5 text-body">
                  <span className="bg-canvas px-2 py-0.5 rounded border border-hairline">{k.keyMasked}</span>
                </td>
                <td className="py-3 px-5 text-mute">
                  {k.defaultCombo ? (
                    <span className="px-2 py-0.5 rounded bg-sky-950/40 text-sky-400 border border-sky-800 text-[11px]">
                      {k.defaultCombo}
                    </span>
                  ) : (
                    <span className="text-zinc-600 dark:text-zinc-500">—</span>
                  )}
                </td>
                <td className="py-3 px-5 text-mute">
                  {k.rolling5hBudgetUsd || k.dailyBudgetUsd ? (
                    <span>
                      {k.rolling5hBudgetUsd ? `$${k.rolling5hBudgetUsd.toFixed(2)} (5h)` : '∞'}{' / '}
                      {k.dailyBudgetUsd ? `$${k.dailyBudgetUsd.toFixed(2)} (Day)` : '∞'}
                    </span>
                  ) : (
                    <span className="text-zinc-600 dark:text-zinc-500">Uncapped</span>
                  )}
                </td>
                <td className="py-3 px-5 text-mute">{k.rateLimitRpm} req/min</td>
                <td className="py-3 px-5 text-right space-x-2">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(k.keyFull)}
                    className="inline-flex items-center rounded-full border border-hairline bg-canvas px-2.5 py-0.5 text-[11px] text-body hover:bg-hairline hover:text-ink transition"
                  >
                    {copiedKey === k.keyFull ? '✓ Copied' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(k.id)}
                    className="inline-flex items-center rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-[11px] text-red-600 dark:text-red-400 hover:bg-red-500/20 transition"
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Integration Snippet */}
      <div className="rounded-lg border border-hairline bg-canvas p-4">
        <h4 className="text-xs font-semibold text-ink font-mono mb-2">Usage in Claude Code or Cursor:</h4>
        <pre className="text-xs font-mono text-body overflow-x-auto leading-relaxed">
          <code>{`export ANTHROPIC_BASE_URL="http://127.0.0.1:3001"
export ANTHROPIC_AUTH_TOKEN="${keys[0]?.keyFull || 'rn-local-...'}"
claude --model ${keys[0]?.defaultCombo || 'combo/free-unlimited'}`}</code>
        </pre>
      </div>
    </div>
  );
}

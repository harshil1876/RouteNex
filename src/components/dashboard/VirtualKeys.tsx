import React, { useState, useEffect } from 'react';

interface VirtualKeyItem {
  id: string;
  name: string;
  keyMasked: string;
  keyFull: string;
  createdAt: string;
  rateLimitRpm: number;
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
    },
  ]);

  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyRpm, setNewKeyRpm] = useState(60);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Poll current keys from gateway
  useEffect(() => {
    async function loadKeys() {
      try {
        const res = await fetch('http://127.0.0.1:3001/v1/admin/config');
        if (res.ok) {
          const data = await res.json();
          if (data.virtualKeys) {
            setKeys(data.virtualKeys);
          }
        }
      } catch {
        // Gateway offline, preview mode
      }
    }
    loadKeys();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setIsGenerating(true);

    try {
      const res = await fetch('http://127.0.0.1:3001/v1/admin/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim(), rateLimitRpm: newKeyRpm }),
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
        };
        setKeys((prev) => [vk, ...prev]);
        setNewKeyName('');
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
        },
        ...prev,
      ]);
      setNewKeyName('');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`http://127.0.0.1:3001/v1/admin/keys/${id}`, { method: 'DELETE' });
    } catch {}
    setKeys((prev) => prev.filter((k) => k.id !== id));
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
          Generate local proxy tokens (<code className="font-mono text-xs">rn-local-...</code>) to configure your IDE (Cursor, Cline), LangChain, or client applications without exposing real upstream provider keys.
        </p>
      </div>

      {/* Create Form */}
      <form
        onSubmit={handleCreate}
        className="rounded-lg border border-hairline bg-elevated p-5 shadow-xs flex flex-col sm:flex-row items-end gap-3"
      >
        <div className="flex-1 w-full">
          <label className="block text-xs font-mono text-mute mb-1">Application Name / Label</label>
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="e.g. Cursor IDE, Research Agent, Slack Bot"
            required
            className="w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-xs font-mono text-ink placeholder:text-mute focus:outline-none focus:ring-1 focus:ring-ink"
          />
        </div>

        <div className="w-full sm:w-36">
          <label className="block text-xs font-mono text-mute mb-1">Rate Limit (RPM)</label>
          <input
            type="number"
            value={newKeyRpm}
            onChange={(e) => setNewKeyRpm(Number(e.target.value))}
            min="1"
            max="1000"
            className="w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-xs font-mono text-ink focus:outline-none focus:ring-1 focus:ring-ink"
          />
        </div>

        <button
          type="submit"
          disabled={isGenerating}
          className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-ink px-5 py-2 text-xs font-medium text-white dark:bg-white dark:text-black hover:opacity-90 transition shrink-0"
        >
          {isGenerating ? 'Generating...' : '+ Generate Key'}
        </button>
      </form>

      {/* Keys Table */}
      <div className="overflow-x-auto rounded-lg border border-hairline bg-elevated">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-hairline bg-canvas text-xs uppercase font-mono text-mute">
            <tr>
              <th className="py-3 px-5 font-semibold">Name</th>
              <th className="py-3 px-5 font-semibold">Key</th>
              <th className="py-3 px-5 font-semibold">Rate Limit</th>
              <th className="py-3 px-5 font-semibold">Created</th>
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
                <td className="py-3 px-5 text-mute">{k.rateLimitRpm} req/min</td>
                <td className="py-3 px-5 text-mute font-sans text-xs">
                  {new Date(k.createdAt).toLocaleDateString()}
                </td>
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
        <h4 className="text-xs font-semibold text-ink font-mono mb-2">Usage in OpenAI SDK or Cursor:</h4>
        <pre className="text-xs font-mono text-body overflow-x-auto leading-relaxed">
          <code>{`const client = new OpenAI({
  baseURL: 'http://localhost:3001/v1',
  apiKey: '${keys[0]?.keyFull || 'rn-local-...'}'
});`}</code>
        </pre>
      </div>
    </div>
  );
}

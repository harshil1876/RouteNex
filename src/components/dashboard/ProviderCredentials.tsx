import React, { useState, useEffect } from 'react';

interface ProviderCardState {
  id: 'groq' | 'openai' | 'gemini' | 'anthropic' | 'ollama';
  name: string;
  key: string;
  baseUrl?: string;
  isConfigured: boolean;
  status: 'idle' | 'testing' | 'success' | 'error';
  statusMessage?: string;
}

export default function ProviderCredentials() {
  const [providers, setProviders] = useState<ProviderCardState[]>([
    { id: 'groq', name: 'Groq Cloud LPU', key: '', isConfigured: false, status: 'idle' },
    { id: 'openai', name: 'OpenAI API', key: '', isConfigured: false, status: 'idle' },
    { id: 'gemini', name: 'Google Gemini', key: '', isConfigured: false, status: 'idle' },
    { id: 'anthropic', name: 'Anthropic Claude', key: '', isConfigured: false, status: 'idle' },
    { id: 'ollama', name: 'Ollama Local Daemon', key: '', baseUrl: 'http://localhost:11434/v1', isConfigured: true, status: 'idle' },
  ]);

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Poll current config from gateway
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch('http://127.0.0.1:3001/v1/admin/config');
        if (res.ok) {
          const data = await res.json();
          if (data.providers) {
            setProviders((prev) =>
              prev.map((p) => {
                const found = data.providers.find((item: any) => item.id === p.id);
                return found ? { ...p, isConfigured: found.configured } : p;
              })
            );
          }
        }
      } catch {
        // Gateway offline, preview mode
      }
    }
    loadConfig();
  }, []);

  const handleTest = async (providerId: string) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === providerId ? { ...p, status: 'testing', statusMessage: 'Pinging...' } : p))
    );

    try {
      const res = await fetch('http://127.0.0.1:3001/v1/admin/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId }),
      });
      const data = await res.json();
      setProviders((prev) =>
        prev.map((p) =>
          p.id === providerId
            ? {
                ...p,
                status: data.ok ? 'success' : 'error',
                statusMessage: data.message || (data.ok ? 'Reachable' : 'Connection failed'),
              }
            : p
        )
      );
    } catch {
      setProviders((prev) =>
        prev.map((p) =>
          p.id === providerId
            ? { ...p, status: 'error', statusMessage: 'Gateway not reachable on 127.0.0.1:3001' }
            : p
        )
      );
    }
  };

  const handleSave = async (provider: ProviderCardState) => {
    try {
      const res = await fetch('http://127.0.0.1:3001/v1/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: provider.id,
          apiKey: provider.key.trim() || undefined,
          baseUrl: provider.baseUrl?.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProviders((prev) =>
          prev.map((p) => (p.id === provider.id ? { ...p, isConfigured: Boolean(provider.key || provider.baseUrl) } : p))
        );
        setNotification({ message: `Successfully updated ${provider.name} credentials.`, type: 'success' });
      } else {
        setNotification({ message: data.error || 'Failed to update credentials.', type: 'error' });
      }
    } catch {
      setNotification({ message: 'Gateway offline. Start gateway on port 3001 to persist keys.', type: 'error' });
    }
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink tracking-tight">Provider Credentials (BYOK)</h2>
          <p className="mt-1 text-sm text-mute">
            Configure upstream AI provider keys directly in your local gateway without restarting the server.
          </p>
        </div>
        <span className="self-start sm:self-auto rounded-full border border-hairline bg-elevated px-3 py-1 font-mono text-xs text-mute">
          100% Local & Encrypted in Memory
        </span>
      </div>

      {notification && (
        <div
          className={`rounded-md border p-3.5 text-xs font-mono transition ${
            notification.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((p) => (
          <div
            key={p.id}
            className="flex flex-col justify-between rounded-lg border border-hairline bg-elevated p-5 shadow-xs transition-colors"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-ink text-sm">{p.name}</h3>
                  <span
                    className={`rounded px-2 py-0.5 font-mono text-[10px] font-medium ${
                      p.isConfigured
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-hairline text-mute'
                    }`}
                  >
                    {p.isConfigured ? 'Configured' : 'Not Set'}
                  </span>
                </div>

                {p.status !== 'idle' && (
                  <span
                    className={`font-mono text-[11px] ${
                      p.status === 'testing'
                        ? 'text-amber-500 animate-pulse'
                        : p.status === 'success'
                        ? 'text-emerald-500'
                        : 'text-red-500'
                    }`}
                  >
                    {p.statusMessage}
                  </span>
                )}
              </div>

              {p.id === 'ollama' ? (
                <div>
                  <label className="block text-xs font-mono text-mute mb-1">Daemon Base URL</label>
                  <input
                    type="text"
                    value={p.baseUrl || ''}
                    onChange={(e) =>
                      setProviders((prev) =>
                        prev.map((item) => (item.id === p.id ? { ...item, baseUrl: e.target.value } : item))
                      )
                    }
                    placeholder="http://localhost:11434/v1"
                    className="w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-xs font-mono text-ink placeholder:text-mute focus:outline-none focus:ring-1 focus:ring-ink"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-mono text-mute mb-1">API Key</label>
                  <input
                    type="password"
                    value={p.key}
                    onChange={(e) =>
                      setProviders((prev) =>
                        prev.map((item) => (item.id === p.id ? { ...item, key: e.target.value } : item))
                      )
                    }
                    placeholder={`Enter ${p.name} Key (e.g. gsk_..., sk-...)`}
                    className="w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-xs font-mono text-ink placeholder:text-mute focus:outline-none focus:ring-1 focus:ring-ink"
                  />
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-hairline flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleTest(p.id)}
                disabled={p.status === 'testing'}
                className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-canvas px-3 py-1 text-xs font-medium text-body hover:bg-hairline hover:text-ink transition disabled:opacity-50"
              >
                Test Connection
              </button>

              <button
                type="button"
                onClick={() => handleSave(p)}
                className="inline-flex items-center rounded-full bg-ink px-4 py-1 text-xs font-medium text-white dark:bg-white dark:text-black hover:opacity-90 transition"
              >
                Save Key
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

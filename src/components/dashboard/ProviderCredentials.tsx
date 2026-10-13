import React, { useState, useEffect } from 'react';

type CategoryFilter = 'ALL' | 'FREE' | 'API_KEY' | 'LOCAL';

interface ProviderCardState {
  id: string;
  name: string;
  category: 'FREE' | 'API_KEY' | 'LOCAL';
  key: string;
  baseUrl?: string;
  isConfigured: boolean;
  isEnabled: boolean;
  status: 'idle' | 'testing' | 'success' | 'error';
  statusMessage?: string;
  badge: string;
  freeLimit?: string;
}

export default function ProviderCredentials() {
  const [filter, setFilter] = useState<CategoryFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTestingAll, setIsTestingAll] = useState(false);

  const [providers, setProviders] = useState<ProviderCardState[]>([
    {
      id: 'pollinations',
      name: 'Pollinations AI',
      category: 'FREE',
      key: '',
      isConfigured: true,
      isEnabled: true,
      status: 'idle',
      badge: 'Zero-Key Free Tier',
      freeLimit: 'Unlimited / Anonymous (100% Free)',
    },
    {
      id: 'groq',
      name: 'Groq Cloud LPU',
      category: 'FREE',
      key: '',
      isConfigured: false,
      isEnabled: true,
      status: 'idle',
      badge: 'Free Tier (30 RPM)',
      freeLimit: '14,400 req/day free',
    },
    {
      id: 'cerebras',
      name: 'Cerebras Cloud',
      category: 'FREE',
      key: '',
      isConfigured: false,
      isEnabled: true,
      status: 'idle',
      badge: 'Fast Free Tier (2,000 tok/s)',
      freeLimit: '1,000,000 tokens/day free',
    },
    {
      id: 'gemini',
      name: 'Google AI Studio (Gemini)',
      category: 'FREE',
      key: '',
      isConfigured: false,
      isEnabled: true,
      status: 'idle',
      badge: 'Free Tier (15 RPM)',
      freeLimit: '1,500 req/day free',
    },
    {
      id: 'deepseek',
      name: 'DeepSeek (V3 & R1)',
      category: 'API_KEY',
      key: '',
      isConfigured: false,
      isEnabled: true,
      status: 'idle',
      badge: 'Ultra-low Cost / Starter Bonus',
      freeLimit: 'Free balance on signup',
    },
    {
      id: 'openai',
      name: 'OpenAI API',
      category: 'API_KEY',
      key: '',
      isConfigured: false,
      isEnabled: true,
      status: 'idle',
      badge: 'API Key Compatible',
    },
    {
      id: 'anthropic',
      name: 'Anthropic Claude',
      category: 'API_KEY',
      key: '',
      isConfigured: false,
      isEnabled: true,
      status: 'idle',
      badge: 'API Key Compatible',
    },
    {
      id: 'ollama',
      name: 'Ollama Local Daemon',
      category: 'LOCAL',
      key: '',
      baseUrl: 'http://localhost:11434/v1',
      isConfigured: true,
      isEnabled: true,
      status: 'idle',
      badge: '100% Private Offline',
    },
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
      } catch {}
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
                statusMessage: data.ok ? 'Reachable' : (data.error || 'Connection failed'),
              }
            : p
        )
      );
    } catch {
      setProviders((prev) =>
        prev.map((p) =>
          p.id === providerId
            ? { ...p, status: 'error', statusMessage: 'Gateway offline' }
            : p
        )
      );
    }
  };

  const handleTestAll = async () => {
    setIsTestingAll(true);
    const promises = providers.filter((p) => p.isEnabled).map((p) => handleTest(p.id));
    await Promise.all(promises);
    setIsTestingAll(false);
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
          prev.map((p) => (p.id === provider.id ? { ...p, isConfigured: Boolean(provider.key || provider.baseUrl || p.id === 'pollinations') } : p))
        );
        setNotification({ message: `Saved credentials for ${provider.name}.`, type: 'success' });
      } else {
        setNotification({ message: data.error || 'Failed to update credentials.', type: 'error' });
      }
    } catch {
      setNotification({ message: 'Gateway offline. Start gateway to persist keys.', type: 'error' });
    }
    setTimeout(() => setNotification(null), 4000);
  };

  const filteredProviders = providers.filter((p) => {
    const matchesCategory = filter === 'ALL' || p.category === filter;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const configuredCount = providers.filter((p) => p.isConfigured).length;
  const freeCount = providers.filter((p) => p.category === 'FREE').length;

  return (
    <div className="space-y-6">
      {/* Top Header & OmniRoute-style Search/Toolbar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink tracking-tight">AI Providers Catalog</h2>
            <p className="mt-1 text-sm text-mute">
              Manage free tiers, API keys, and local LLM runtimes. Toggle providers and test endpoints in real time.
            </p>
          </div>

          <button
            type="button"
            onClick={handleTestAll}
            disabled={isTestingAll}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-ink px-5 py-2 text-xs font-medium text-white dark:bg-white dark:text-black hover:opacity-90 transition disabled:opacity-50 shrink-0"
          >
            {isTestingAll ? 'Testing All...' : '▶ Test All Active'}
          </button>
        </div>

        {/* Filter Pills Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`rounded-full px-3 py-1 font-mono text-xs transition ${
                filter === 'ALL'
                  ? 'bg-ink text-white dark:bg-white dark:text-black font-semibold'
                  : 'bg-canvas text-mute border border-hairline hover:text-ink'
              }`}
            >
              All Providers ({providers.length})
            </button>

            <button
              type="button"
              onClick={() => setFilter('FREE')}
              className={`rounded-full px-3 py-1 font-mono text-xs transition flex items-center gap-1.5 ${
                filter === 'FREE'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-canvas text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              Free Tier Pools ({freeCount})
            </button>

            <button
              type="button"
              onClick={() => setFilter('API_KEY')}
              className={`rounded-full px-3 py-1 font-mono text-xs transition ${
                filter === 'API_KEY'
                  ? 'bg-ink text-white dark:bg-white dark:text-black font-semibold'
                  : 'bg-canvas text-mute border border-hairline hover:text-ink'
              }`}
            >
              API Key Compatible
            </button>

            <button
              type="button"
              onClick={() => setFilter('LOCAL')}
              className={`rounded-full px-3 py-1 font-mono text-xs transition ${
                filter === 'LOCAL'
                  ? 'bg-ink text-white dark:bg-white dark:text-black font-semibold'
                  : 'bg-canvas text-mute border border-hairline hover:text-ink'
              }`}
            >
              Local Daemons
            </button>
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter providers..."
            className="w-full sm:w-48 rounded-md border border-hairline bg-canvas px-3 py-1.5 text-xs font-mono text-ink placeholder:text-mute focus:outline-none focus:ring-1 focus:ring-ink"
          />
        </div>
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
        {filteredProviders.map((p) => (
          <div
            key={p.id}
            className={`flex flex-col justify-between rounded-lg border p-5 shadow-xs transition-colors ${
              p.isEnabled ? 'border-hairline bg-elevated' : 'border-hairline/60 bg-canvas opacity-75'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-ink text-sm">{p.name}</h3>
                  <span
                    className={`rounded px-2 py-0.5 font-mono text-[10px] font-medium ${
                      p.category === 'FREE'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : p.isConfigured
                        ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20'
                        : 'bg-hairline text-mute'
                    }`}
                  >
                    {p.badge}
                  </span>
                </div>

                {/* On/Off Active Toggle Switch */}
                <button
                  type="button"
                  onClick={() =>
                    setProviders((prev) =>
                      prev.map((item) => (item.id === p.id ? { ...item, isEnabled: !item.isEnabled } : item))
                    )
                  }
                  title={p.isEnabled ? 'Disable Provider' : 'Enable Provider'}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    p.isEnabled ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      p.isEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {p.freeLimit && (
                <div className="mb-3 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                  🎁 {p.freeLimit}
                </div>
              )}

              {p.id === 'pollinations' ? (
                <div className="rounded-md border border-hairline bg-canvas p-2.5 text-xs text-mute font-mono">
                  Ready out of the box. Zero API key or configuration required.
                </div>
              ) : p.id === 'ollama' ? (
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
                    placeholder={`Enter ${p.name} Key`}
                    className="w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-xs font-mono text-ink placeholder:text-mute focus:outline-none focus:ring-1 focus:ring-ink"
                  />
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-hairline flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTest(p.id)}
                  disabled={p.status === 'testing'}
                  className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-canvas px-3 py-1 text-xs font-medium text-body hover:bg-hairline hover:text-ink transition disabled:opacity-50"
                >
                  Test Connection
                </button>

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

              {p.id !== 'pollinations' && (
                <button
                  type="button"
                  onClick={() => handleSave(p)}
                  className="inline-flex items-center rounded-full bg-ink px-4 py-1 text-xs font-medium text-white dark:bg-white dark:text-black hover:opacity-90 transition"
                >
                  Save Key
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

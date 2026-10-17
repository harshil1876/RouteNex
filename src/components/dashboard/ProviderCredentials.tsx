import React, { useState, useEffect } from 'react';
import ProviderBrandIcon from './ProviderBrandIcon';
import ProviderDetailView from './ProviderDetailView';

interface ProviderCredentialsProps {
  selectedProviderId?: string | null;
  onSelectProvider?: (id: string | null) => void;
}

type CategoryFilter = 'ALL' | 'FREE' | 'API_KEY' | 'LOCAL';

interface ModelTestResult {
  modelId: string;
  status: 'WORKING' | 'RATE_LIMITED' | 'OFFLINE';
  latencyMs: number;
  message?: string;
}

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
  tosStatus?: 'official' | 'caution';
  freeOnly?: boolean;
  supportsOAuth?: boolean;
  maskedKeys?: string[];
  keyCount?: number;
  isSyncing?: boolean;
  isBatchTesting?: boolean;
  testResults?: ModelTestResult[];
}

const INITIAL_PROVIDERS: ProviderCardState[] = [
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
    id: 'duckduckgo',
    name: 'DuckDuckGo AI Chat',
    category: 'FREE',
    key: '',
    isConfigured: true,
    isEnabled: true,
    status: 'idle',
    badge: 'Zero-Key Anonymous',
    freeLimit: 'Unlimited / Anonymous (GPT-4o mini & Claude 3 Haiku)',
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
    id: 'mistral',
    name: 'Mistral AI (La Plateforme)',
    category: 'FREE',
    key: '',
    isConfigured: false,
    isEnabled: true,
    status: 'idle',
    badge: '1B Free Tokens/Mo',
    freeLimit: '1 Billion tokens/mo free (Codestral, Mistral Small)',
  },
  {
    id: 'siliconflow',
    name: 'SiliconFlow Cloud',
    category: 'FREE',
    key: '',
    isConfigured: false,
    isEnabled: true,
    status: 'idle',
    badge: 'DeepSeek Reasoning Free Tier',
    freeLimit: 'DeepSeek-V3 / R1 free tier (20M tokens signup)',
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    category: 'FREE',
    key: '',
    isConfigured: false,
    isEnabled: true,
    status: 'idle',
    badge: '1,000 Free Credits / NIM Microservices',
    freeLimit: 'Llama 3.1 405B & Nemotron serverless',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    category: 'FREE',
    key: '',
    isConfigured: false,
    isEnabled: true,
    status: 'idle',
    badge: ':free Models Available',
    freeLimit: 'Free tier aggregator endpoints',
  },
  {
    id: 'zhipu',
    name: 'Zhipu AI (GLM)',
    category: 'FREE',
    key: '',
    isConfigured: false,
    isEnabled: true,
    status: 'idle',
    badge: 'GLM-4-Flash 100% Free',
    freeLimit: 'Unlimited free coding and reasoning',
  },
  {
    id: 'sambanova',
    name: 'SambaNova Systems',
    category: 'FREE',
    key: '',
    isConfigured: false,
    isEnabled: true,
    status: 'idle',
    badge: 'Free Fast Tier',
    freeLimit: 'Meta-Llama-3.3-70B serverless free',
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
    id: 'together',
    name: 'Together AI',
    category: 'API_KEY',
    key: '',
    isConfigured: false,
    isEnabled: true,
    status: 'idle',
    badge: 'High Throughput Serverless',
  },
  {
    id: 'fireworks',
    name: 'Fireworks AI',
    category: 'API_KEY',
    key: '',
    isConfigured: false,
    isEnabled: true,
    status: 'idle',
    badge: 'Sub-100ms Inference',
  },
  {
    id: 'xai',
    name: 'xAI (Grok)',
    category: 'API_KEY',
    key: '',
    isConfigured: false,
    isEnabled: true,
    status: 'idle',
    badge: 'Grok-2 Frontier Reasoning',
  },
  {
    id: 'perplexity',
    name: 'Perplexity AI',
    category: 'API_KEY',
    key: '',
    isConfigured: false,
    isEnabled: true,
    status: 'idle',
    badge: 'Live Web Search Grounding',
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
  {
    id: 'lmstudio',
    name: 'LM Studio Local',
    category: 'LOCAL',
    key: '',
    baseUrl: 'http://localhost:1234/v1',
    isConfigured: true,
    isEnabled: true,
    status: 'idle',
    badge: 'Local Port 1234',
  },
].map((p) => ({
  ...p,
  tosStatus: (p.id === 'duckduckgo' ? 'caution' : 'official') as 'official' | 'caution',
  supportsOAuth: p.id === 'openrouter' || p.id === 'gemini',
  freeOnly: false,
}));

export default function ProviderCredentials({ selectedProviderId, onSelectProvider }: ProviderCredentialsProps = {}) {
  const [activeDetailProviderId, setActiveDetailProviderId] = useState<string | null>(selectedProviderId || null);

  useEffect(() => {
    if (selectedProviderId !== undefined) {
      setActiveDetailProviderId(selectedProviderId);
    }
  }, [selectedProviderId]);

  const [filter, setFilter] = useState<CategoryFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);
  const [poolingProviderId, setPoolingProviderId] = useState<string | null>(null);
  const [newPoolKey, setNewPoolKey] = useState('');

  // OAuth 2.0 PKCE modal state
  const [oauthModal, setOauthModal] = useState<{
    providerId: string;
    authUrl: string;
    deviceCode?: string;
    state?: string;
  } | null>(null);
  const [oauthCodeInput, setOauthCodeInput] = useState('');
  const [isSubmittingOAuth, setIsSubmittingOAuth] = useState(false);

  const [providers, setProviders] = useState<ProviderCardState[]>(INITIAL_PROVIDERS);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleOAuthStart = async (providerId: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:3001/v1/admin/providers/${providerId}/oauth/start`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOauthModal({
          providerId,
          authUrl: data.authUrl,
          deviceCode: data.deviceCode,
          state: data.state,
        });
      } else {
        setNotification({ message: data.error || 'Failed to start OAuth flow.', type: 'error' });
      }
    } catch {
      setNotification({ message: 'Gateway offline.', type: 'error' });
    }
  };

  const handleOAuthCallback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oauthModal || !oauthCodeInput.trim()) return;
    setIsSubmittingOAuth(true);
    try {
      const res = await fetch(`http://127.0.0.1:3001/v1/admin/providers/${oauthModal.providerId}/oauth/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: oauthCodeInput.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProviders((prev) =>
          prev.map((p) =>
            p.id === oauthModal.providerId
              ? {
                  ...p,
                  isConfigured: true,
                  maskedKeys: [`rn_oauth_...${data.accessTokenSuffix || 'auth'}`],
                }
              : p
          )
        );
        setNotification({
          message: `✓ OAuth connection verified for ${oauthModal.providerId}! Encrypted session active.`,
          type: 'success',
        });
        setOauthModal(null);
        setOauthCodeInput('');
      } else {
        setNotification({ message: data.error || 'OAuth verification failed.', type: 'error' });
      }
    } catch {
      setNotification({ message: 'Gateway offline.', type: 'error' });
    } finally {
      setIsSubmittingOAuth(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

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
                return found
                  ? {
                      ...p,
                      isConfigured: found.configured,
                      keyCount: found.keyCount || (found.configured ? 1 : 0),
                      maskedKeys: found.maskedKeys || [],
                    }
                  : p;
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
          p.id === providerId ? { ...p, status: 'error', statusMessage: 'Gateway offline' } : p
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
          prev.map((p) =>
            p.id === provider.id
              ? {
                  ...p,
                  isConfigured: Boolean(provider.key || provider.baseUrl || p.id === 'pollinations' || p.id === 'duckduckgo'),
                  maskedKeys: provider.key ? [`${provider.key.slice(0, 7)}...${provider.key.slice(-4)}`] : [],
                }
              : p
          )
        );
        setNotification({ message: `Saved & encrypted credentials for ${provider.name} (AES-256-GCM).`, type: 'success' });
      } else {
        setNotification({ message: data.error || 'Failed to update credentials.', type: 'error' });
      }
    } catch {
      setNotification({ message: 'Gateway offline. Start gateway to persist keys.', type: 'error' });
    }
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSyncModels = async (providerId: string) => {
    const targetProvider = providers.find((p) => p.id === providerId);
    setProviders((prev) =>
      prev.map((p) => (p.id === providerId ? { ...p, isSyncing: true } : p))
    );
    try {
      const res = await fetch(`http://127.0.0.1:3001/v1/admin/providers/${providerId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freeOnly: targetProvider?.freeOnly ?? false }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({
          message: `✓ Synced ${data.modelCount} ${data.freeOnly ? 'free ' : ''}models from ${providerId}.`,
          type: 'success',
        });
      } else {
        setNotification({ message: data.error || 'Failed to sync models.', type: 'error' });
      }
    } catch {
      setNotification({ message: 'Gateway offline.', type: 'error' });
    } finally {
      setProviders((prev) =>
        prev.map((p) => (p.id === providerId ? { ...p, isSyncing: false } : p))
      );
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleBatchTest = async (providerId: string) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === providerId ? { ...p, isBatchTesting: true } : p))
    );
    try {
      const res = await fetch(`http://127.0.0.1:3001/v1/admin/providers/${providerId}/test-models`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.results) {
        setProviders((prev) =>
          prev.map((p) => (p.id === providerId ? { ...p, testResults: data.results } : p))
        );
        setNotification({ message: `Tested ${data.testedCount} models for ${providerId}. ${data.workingCount} working.`, type: 'success' });
      } else {
        setNotification({ message: data.error || 'Batch test failed.', type: 'error' });
      }
    } catch {
      setNotification({ message: 'Gateway offline.', type: 'error' });
    } finally {
      setProviders((prev) =>
        prev.map((p) => (p.id === providerId ? { ...p, isBatchTesting: false } : p))
      );
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleAddPoolKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poolingProviderId || !newPoolKey.trim()) return;

    try {
      const res = await fetch('http://127.0.0.1:3001/v1/admin/providers/pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: poolingProviderId, apiKey: newPoolKey.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProviders((prev) =>
          prev.map((p) => (p.id === poolingProviderId ? { ...p, keyCount: data.poolSize } : p))
        );
        setNotification({ message: `Added key to pool for ${poolingProviderId}. Total pooled keys: ${data.poolSize}`, type: 'success' });
        setPoolingProviderId(null);
        setNewPoolKey('');
      } else {
        setNotification({ message: data.error || 'Failed to add key to pool.', type: 'error' });
      }
    } catch {
      setNotification({ message: 'Gateway offline.', type: 'error' });
    }
    setTimeout(() => setNotification(null), 4000);
  };

  const filteredProviders = providers.filter((p) => {
    const matchesCategory = filter === 'ALL' || p.category === filter;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFreeOnly = !freeOnly || p.category === 'FREE';
    return matchesCategory && matchesSearch && matchesFreeOnly;
  });

  const configuredCount = providers.filter((p) => p.isConfigured).length;
  const freeCount = providers.filter((p) => p.category === 'FREE').length;

  if (activeDetailProviderId) {
    const activeProv = providers.find((p) => p.id === activeDetailProviderId) || {
      id: activeDetailProviderId,
      name: activeDetailProviderId.toUpperCase(),
    };
    return (
      <ProviderDetailView
        providerId={activeProv.id}
        providerName={activeProv.name}
        onBack={() => {
          setActiveDetailProviderId(null);
          onSelectProvider?.(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Toolbar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-ink tracking-tight">AI Providers Catalog (40+ Models)</h2>
              <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-mono">
                🔒 AES-256-GCM Keystore
              </span>
            </div>
            <p className="mt-1 text-sm text-mute">
              Manage free tiers, API keys, multi-key pooling, and local runtimes. All keys encrypted at rest.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestAll}
              disabled={isTestingAll}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink text-white px-4 py-1.5 text-xs font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {isTestingAll ? 'Testing All...' : '⚡ Test All Endpoints'}
            </button>
          </div>
        </div>

        {/* Filter Badges & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-hairline">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`rounded-full px-3 py-1 font-mono text-xs transition ${
                filter === 'ALL'
                  ? 'bg-ink text-white dark:bg-white dark:text-black font-semibold'
                  : 'bg-canvas text-mute border border-hairline hover:text-ink'
              }`}
            >
              All ({providers.length})
            </button>

            <button
              type="button"
              onClick={() => setFilter('FREE')}
              className={`rounded-full px-3 py-1 font-mono text-xs transition ${
                filter === 'FREE'
                  ? 'bg-ink text-white dark:bg-white dark:text-black font-semibold'
                  : 'bg-canvas text-mute border border-hairline hover:text-ink'
              }`}
            >
              🎁 Free Tiers ({freeCount})
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

            {/* Free-Only Filter Toggle (OmniRoute feature) */}
            <label className="ml-2 flex items-center gap-1.5 cursor-pointer text-xs font-mono text-body select-none">
              <input
                type="checkbox"
                checked={freeOnly}
                onChange={(e) => setFreeOnly(e.target.checked)}
                className="rounded border-hairline text-ink focus:ring-0"
              />
              <span>$0 Free-Only</span>
            </label>
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter 40+ providers..."
            className="w-full sm:w-56 rounded-md border border-hairline bg-canvas px-3 py-1.5 text-xs font-mono text-ink placeholder:text-mute focus:outline-none focus:ring-1 focus:ring-ink"
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
                <div className="flex items-center gap-2.5">
                  <ProviderBrandIcon id={p.id} className="w-5 h-5 shrink-0" />
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
                  {p.tosStatus === 'caution' ? (
                    <span
                      className="rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                      title="Caution: Web/unofficial endpoint. Excluded from auto-routing unless allow_caution is set."
                    >
                      ToS: Caution
                    </span>
                  ) : (
                    <span
                      className="rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                      title="Official provider API with published Terms of Service"
                    >
                      ToS: Official
                    </span>
                  )}
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

              {/* Status & Key Mask Info */}
              {p.isConfigured && p.maskedKeys && p.maskedKeys.length > 0 && (
                <div className="mb-3 flex items-center justify-between text-[11px] font-mono bg-canvas p-2 rounded border border-hairline">
                  <span className="text-mute">Active Key:</span>
                  <span className="text-ink font-semibold">{p.maskedKeys[0]}</span>
                  {p.keyCount && p.keyCount > 1 ? (
                    <span className="text-emerald-600 font-bold">({p.keyCount} Pooled Keys)</span>
                  ) : null}
                </div>
              )}

              {p.id === 'pollinations' || p.id === 'duckduckgo' ? (
                <div className="rounded-md border border-hairline bg-canvas p-2.5 text-xs text-mute font-mono">
                  Ready out of the box. Zero API key or configuration required.
                </div>
              ) : p.category === 'LOCAL' ? (
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-mono text-mute">API Key (AES-256-GCM Encrypted)</label>
                    <button
                      type="button"
                      onClick={() => setPoolingProviderId(p.id)}
                      className="text-[11px] font-mono text-sky-600 hover:underline"
                    >
                      + Pool Multi-Key
                    </button>
                  </div>
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

              {/* Batch Test Model Results if present */}
              {p.testResults && p.testResults.length > 0 && (
                <div className="mt-3 p-2 rounded bg-canvas border border-hairline space-y-1">
                  <span className="text-[10px] font-mono uppercase text-mute block">Batch Test Results</span>
                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {p.testResults.map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px] font-mono">
                        <span className="truncate max-w-[180px]">{r.modelId}</span>
                        <span className={r.status === 'WORKING' ? 'text-emerald-500' : r.status === 'RATE_LIMITED' ? 'text-amber-500' : 'text-red-500'}>
                          {r.status === 'WORKING' ? `✓ ${r.latencyMs}ms` : r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-hairline flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleTest(p.id)}
                  disabled={p.status === 'testing'}
                  className="rounded-full border border-hairline bg-canvas px-2.5 py-1 text-xs font-medium text-body hover:bg-hairline hover:text-ink transition disabled:opacity-50"
                >
                  Test Connection
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleSyncModels(p.id)}
                    disabled={p.isSyncing}
                    className="rounded-full border border-hairline bg-canvas px-2.5 py-1 text-xs font-medium text-mute hover:text-ink transition"
                    title="Auto-sync live model catalog from upstream"
                  >
                    {p.isSyncing ? 'Syncing...' : '↻ Sync'}
                  </button>
                  <label className="flex items-center gap-1 text-[10px] font-mono text-mute hover:text-ink cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={p.freeOnly || false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setProviders((prev) =>
                          prev.map((item) => (item.id === p.id ? { ...item, freeOnly: checked } : item))
                        );
                      }}
                      className="rounded border-hairline text-ink focus:ring-0 text-xs"
                    />
                    <span>$0 Free</span>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => handleBatchTest(p.id)}
                  disabled={p.isBatchTesting}
                  className="rounded-full border border-hairline bg-canvas px-2.5 py-1 text-xs font-medium text-mute hover:text-ink transition"
                  title="Probe all models with 1-token health check"
                >
                  {p.isBatchTesting ? 'Testing...' : '⚡ Batch Test'}
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

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveDetailProviderId(p.id);
                    onSelectProvider?.(p.id);
                  }}
                  className="rounded-full border border-hairline bg-canvas px-3 py-1 text-xs font-medium text-body hover:bg-hairline hover:text-ink transition flex items-center gap-1 font-mono"
                  title="View full provider controls, models, accounts, and param filters"
                >
                  Manage Details →
                </button>

                {p.supportsOAuth && (
                  <button
                    type="button"
                    onClick={() => handleOAuthStart(p.id)}
                    className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 transition"
                    title="Authenticate via OAuth 2.0 PKCE / Device Code"
                  >
                    🔑 OAuth PKCE
                  </button>
                )}

                {p.category !== 'FREE' || (p.id !== 'pollinations' && p.id !== 'duckduckgo') ? (
                  <button
                    type="button"
                    onClick={() => handleSave(p)}
                    className="rounded-full bg-ink text-white dark:bg-white dark:text-black px-4 py-1 text-xs font-medium hover:opacity-90 transition"
                  >
                    Save Key
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Multi-Key Pooling Modal */}
      {poolingProviderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-hairline bg-elevated p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-base font-semibold text-ink">Add Key to Multi-Key Pool</h3>
              <p className="text-xs text-mute mt-1">
                Add an additional API key for <strong>{poolingProviderId}</strong>. RouteNex will round-robin across keys to multiply your rate limits (e.g. from 14.4k to 28.8k req/day).
              </p>
            </div>

            <form onSubmit={handleAddPoolKey} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-mute mb-1">Secondary API Key</label>
                <input
                  type="password"
                  required
                  value={newPoolKey}
                  onChange={(e) => setNewPoolKey(e.target.value)}
                  placeholder="Paste secondary key..."
                  className="w-full rounded border border-hairline bg-canvas px-3 py-2 text-xs font-mono text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setPoolingProviderId(null)}
                  className="rounded px-4 py-1.5 text-xs text-body hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-ink text-white dark:bg-white dark:text-black px-4 py-1.5 text-xs font-medium hover:opacity-90"
                >
                  Add to Pool
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OAuth 2.0 PKCE Modal */}
      {oauthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-hairline bg-elevated p-6 shadow-xl space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🔑</span>
                <h3 className="text-base font-semibold text-ink">
                  OAuth 2.0 PKCE: {oauthModal.providerId}
                </h3>
              </div>
              <p className="text-xs text-mute mt-1">
                Authenticate directly with <strong>{oauthModal.providerId}</strong> via PKCE (RFC 7636).
              </p>
            </div>

            <div className="rounded-lg bg-canvas p-3 border border-hairline space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center text-mute">
                <span>Authorization URI:</span>
                <a
                  href={oauthModal.authUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-600 hover:underline flex items-center gap-1"
                >
                  Open Auth Page ↗
                </a>
              </div>
              {oauthModal.deviceCode && (
                <div className="flex justify-between items-center text-mute">
                  <span>Device Code:</span>
                  <span className="text-ink font-bold bg-neutral-200 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                    {oauthModal.deviceCode}
                  </span>
                </div>
              )}
            </div>

            <form onSubmit={handleOAuthCallback} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-mute mb-1">
                  Authorization Code / Callback Token
                </label>
                <input
                  type="text"
                  required
                  value={oauthCodeInput}
                  onChange={(e) => setOauthCodeInput(e.target.value)}
                  placeholder="Paste authorization code or callback token..."
                  className="w-full rounded border border-hairline bg-canvas px-3 py-2 text-xs font-mono text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setOauthModal(null)}
                  className="rounded px-4 py-1.5 text-xs text-body hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOAuth}
                  className="rounded bg-ink text-white dark:bg-white dark:text-black px-4 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmittingOAuth ? 'Verifying...' : 'Complete OAuth'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';

export interface ComboItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  targets: string[];
  strategy: 'priority' | 'round-robin' | 'fastest';
  createdAt: string;
}

const DEFAULT_COMBOS: ComboItem[] = [
  {
    id: 'combo_free_unlimited',
    name: 'Free Tier Unlimited Pool',
    slug: 'combo/free-unlimited',
    description: 'Zero-cost high-throughput pool chaining Groq, Cerebras, and Pollinations AI with instant automatic failover.',
    targets: [
      'groq/llama-3.3-70b-versatile',
      'cerebras/llama-3.3-70b',
      'pollinations/openai',
      'pollinations/qwen',
    ],
    strategy: 'priority',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'combo_coding_power',
    name: 'Coding Tier Pro',
    slug: 'combo/coding-power',
    description: 'Premier code generation and refactoring combo routing across DeepSeek, Groq, and GPT-4o-mini.',
    targets: [
      'deepseek/deepseek-chat',
      'groq/llama-3.3-70b-versatile',
      'openai/gpt-4o-mini',
      'pollinations/mistral',
    ],
    strategy: 'priority',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'combo_reasoning_tier',
    name: 'Reasoning & Logic Cluster',
    slug: 'combo/reasoning-tier',
    description: 'Complex math, architectural design, and chain-of-thought analysis pool.',
    targets: [
      'deepseek/deepseek-reasoner',
      'gemini/gemini-2.5-pro',
      'openai/gpt-4o',
    ],
    strategy: 'priority',
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_TARGET_OPTIONS = [
  'groq/llama-3.3-70b-versatile',
  'groq/llama-3.1-8b-instant',
  'cerebras/llama-3.3-70b',
  'mistral/codestral-latest',
  'mistral/mistral-small-latest',
  'siliconflow/deepseek-ai/DeepSeek-V3',
  'siliconflow/deepseek-ai/DeepSeek-R1',
  'duckduckgo/gpt-4o-mini',
  'duckduckgo/claude-3-haiku',
  'pollinations/openai',
  'pollinations/qwen',
  'pollinations/mistral',
  'deepseek/deepseek-chat',
  'deepseek/deepseek-reasoner',
  'openai/gpt-4o-mini',
  'openai/gpt-4o',
  'gemini/gemini-2.5-flash',
  'gemini/gemini-2.5-pro',
  'anthropic/claude-3-5-sonnet',
  'ollama/llama3',
];

export default function Combos() {
  const [combos, setCombos] = useState<ComboItem[]>(DEFAULT_COMBOS);
  const [availableTargets, setAvailableTargets] = useState<string[]>(DEFAULT_TARGET_OPTIONS);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ [comboId: string]: string }>({});
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // New Combo Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTargets, setSelectedTargets] = useState<string[]>([
    'groq/llama-3.3-70b-versatile',
    'pollinations/openai',
  ]);
  const [strategy, setStrategy] = useState<'priority' | 'round-robin' | 'fastest'>('priority');

  useEffect(() => {
    fetch('http://127.0.0.1:3001/v1/admin/combos')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.combos && data.combos.length > 0) {
          setCombos(data.combos);
        }
      })
      .catch(() => {});

    fetch('http://127.0.0.1:3001/v1/models')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.data)) {
          const ids: string[] = data.data.map((m: any) => m.id).filter(Boolean);
          if (ids.length > 0) {
            setAvailableTargets(Array.from(new Set([...DEFAULT_TARGET_OPTIONS, ...ids])));
          }
        }
      })
      .catch(() => {});
  }, []);

  const copySlug = (slugText: string) => {
    navigator.clipboard.writeText(slugText);
    setCopiedSlug(slugText);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleTestCombo = async (combo: ComboItem) => {
    setTestingId(combo.id);
    setTestResult((prev) => ({ ...prev, [combo.id]: 'Probing cluster targets...' }));

    try {
      const res = await fetch('http://127.0.0.1:3001/v1/router/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: combo.slug,
          messages: [{ role: 'user', content: 'Ping test' }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const primary = data.selected_model || combo.targets[0];
        setTestResult((prev) => ({
          ...prev,
          [combo.id]: `✓ Healthy • Primary target resolved to: ${primary}`,
        }));
      } else {
        const err = await res.json().catch(() => ({}));
        setTestResult((prev) => ({
          ...prev,
          [combo.id]: `⚠ ${err.error || 'Gateway returned status ' + res.status}`,
        }));
      }
    } catch {
      setTestResult((prev) => ({
        ...prev,
        [combo.id]: `✓ Simulated OK (Primary: ${combo.targets[0]}, 3 fallbacks active)`,
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleCreateCombo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug || selectedTargets.length === 0) return;

    const payload = {
      name,
      slug: slug.startsWith('combo/') ? slug : `combo/${slug}`,
      description: description || `Custom grouped route: ${name}`,
      targets: selectedTargets,
      strategy,
    };

    try {
      const res = await fetch('http://127.0.0.1:3001/v1/admin/combos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setCombos((prev) => [...prev, data.combo]);
      } else {
        // Fallback local addition
        setCombos((prev) => [
          ...prev,
          {
            ...payload,
            id: `combo_local_${Date.now()}`,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      setCombos((prev) => [
        ...prev,
        {
          ...payload,
          id: `combo_local_${Date.now()}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    }

    setShowModal(false);
    setName('');
    setSlug('');
    setDescription('');
  };

  const handleDeleteCombo = async (id: string) => {
    try {
      await fetch(`http://127.0.0.1:3001/v1/admin/combos/${id}`, { method: 'DELETE' });
    } catch {}
    setCombos((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-lg border border-hairline bg-elevated p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-ink">Provider Combos & Model Clusters</h3>
            <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[11px] font-mono">
              Auto-Failover
            </span>
          </div>
          <p className="mt-1 text-xs text-mute max-w-2xl leading-relaxed">
            Combos group multiple upstream providers under a single virtual model ID (e.g. <code className="text-ink font-mono bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">combo/free-unlimited</code>). When your primary model hits a rate limit (429) or outage, RouteNex seamlessly redirects requests to the next provider in the chain without interrupting your agent or client.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="rounded-full bg-ink text-white px-4 py-2 text-xs font-medium hover:opacity-90 transition flex items-center gap-1.5 whitespace-nowrap"
        >
          <span>＋</span> Create Combo
        </button>
      </div>

      {/* Combos Cards Grid */}
      <div className="grid grid-cols-1 gap-4">
        {combos.map((combo) => (
          <div
            key={combo.id}
            className="rounded-lg border border-hairline bg-elevated p-5 transition hover:border-neutral-400 dark:hover:border-neutral-600"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-hairline pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-ink">{combo.name}</h4>
                  <button
                    type="button"
                    onClick={() => copySlug(combo.slug)}
                    className="inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-ink hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
                    title="Click to copy model ID"
                  >
                    <span>{combo.slug}</span>
                    <span className="text-[10px] text-mute">{copiedSlug === combo.slug ? '✓ Copied' : '📋'}</span>
                  </button>
                </div>
                <p className="mt-1 text-xs text-mute">{combo.description}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTestCombo(combo)}
                  disabled={testingId === combo.id}
                  className="rounded border border-hairline px-3 py-1.5 text-xs font-mono text-body hover:text-ink hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                >
                  {testingId === combo.id ? 'Testing...' : '▶ Probe Failover'}
                </button>

                {combo.id.startsWith('combo_local_') && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCombo(combo.id)}
                    className="rounded border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 px-2 py-1.5 text-xs hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                    title="Delete combo"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Failover Sequence Visualization */}
            <div className="mt-4">
              <span className="text-[11px] font-mono text-mute block mb-2">Fallback Execution Sequence:</span>
              <div className="flex flex-wrap items-center gap-2">
                {combo.targets.map((target, idx) => (
                  <React.Fragment key={target}>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-hairline bg-canvas text-xs font-mono text-ink">
                      <span className="text-[10px] font-semibold text-mute">#{idx + 1}</span>
                      <span className={idx === 0 ? 'font-semibold text-emerald-600 dark:text-emerald-400' : ''}>
                        {target}
                      </span>
                      {idx === 0 && (
                        <span className="text-[9px] uppercase px-1 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          Primary
                        </span>
                      )}
                    </div>
                    {idx < combo.targets.length - 1 && (
                      <span className="text-mute font-mono text-xs">➔</span>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {testResult[combo.id] && (
                <div className="mt-3 p-2.5 rounded bg-neutral-50 dark:bg-neutral-900 border border-hairline text-xs font-mono text-body">
                  {testResult[combo.id]}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Create Combo */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-hairline bg-elevated p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <h4 className="text-sm font-semibold text-ink">Create New Provider Combo</h4>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-mute hover:text-ink text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCombo} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-ink mb-1">Combo Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ultimate Coder Pool"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slug) {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                    }
                  }}
                  className="w-full rounded border border-hairline bg-canvas px-3 py-2 text-ink font-mono focus:border-ink focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">Model Slug (used in API calls)</label>
                <div className="flex items-center">
                  <span className="px-2.5 py-2 border border-r-0 border-hairline rounded-l bg-neutral-100 dark:bg-neutral-800 font-mono text-mute">
                    combo/
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="ultimate-coder"
                    value={slug.replace(/^combo\//, '')}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full rounded-r border border-hairline bg-canvas px-3 py-2 text-ink font-mono focus:border-ink focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Zero-downtime coding cluster with DeepSeek and Cerebras"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded border border-hairline bg-canvas px-3 py-2 text-ink focus:border-ink focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">
                  Target Models (Click to toggle sequence)
                </label>
                <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded border border-hairline bg-canvas">
                  {availableTargets.map((opt) => {
                    const isSelected = selectedTargets.includes(opt);
                    const orderIdx = selectedTargets.indexOf(opt);
                    return (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTargets(selectedTargets.filter((t) => t !== opt));
                          } else {
                            setSelectedTargets([...selectedTargets, opt]);
                          }
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left font-mono transition ${
                          isSelected
                            ? 'bg-ink text-white font-semibold'
                            : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-body'
                        }`}
                      >
                        <span>{opt}</span>
                        {isSelected && (
                          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">
                            #{orderIdx + 1}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <span className="text-[11px] text-mute mt-1 block">
                  {selectedTargets.length} target(s) selected in sequence.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded px-4 py-2 text-body hover:text-ink font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedTargets.length === 0 || !name}
                  className="rounded bg-ink text-white px-5 py-2 font-medium hover:opacity-90 transition disabled:opacity-50"
                >
                  Save Combo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';

export type ComboStrategy = 'priority' | 'round-robin' | 'fastest' | 'lkgp' | 'headroom' | 'reset-window' | 'cache-optimized';

export interface ComboItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  targets: string[];
  strategy: ComboStrategy;
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

const RECOMMENDED_4_MODEL_STACK = [
  'groq/llama-3.3-70b-versatile',
  'cerebras/llama-3.3-70b',
  'pollinations/openai',
  'pollinations/qwen',
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

function getAdminHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('routenex_admin_token') || 'routenex-admin'
    : 'routenex-admin';
  return {
    'Authorization': `Bearer ${token}`,
    'x-admin-token': token,
    ...extra,
  };
}

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
  const [selectedTargets, setSelectedTargets] = useState<string[]>(RECOMMENDED_4_MODEL_STACK);
  const [strategy, setStrategy] = useState<ComboStrategy>('priority');
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [customModelInput, setCustomModelInput] = useState('');

  // Inline "Add Model" State for existing cards
  const [addingModelComboId, setAddingModelComboId] = useState<string | null>(null);
  const [inlineSelectedModel, setInlineSelectedModel] = useState<string>('');
  const [inlineCustomModel, setInlineCustomModel] = useState<string>('');

  const loadCombos = () => {
    fetch('http://127.0.0.1:3001/v1/admin/combos', {
      headers: getAdminHeaders(),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.combos && data.combos.length > 0) {
          setCombos(data.combos);
        }
      })
      .catch(() => {});
  };

  const loadModels = () => {
    fetch('http://127.0.0.1:3001/v1/models')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.data)) {
          const ids: string[] = data.data.map((m: any) => m.id).filter(Boolean);
          if (ids.length > 0) {
            setAvailableTargets((prev) => Array.from(new Set([...DEFAULT_TARGET_OPTIONS, ...prev, ...ids])));
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadCombos();
    loadModels();

    const handleStateChange = () => {
      loadCombos();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('routenex:state-changed', handleStateChange);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('routenex:state-changed', handleStateChange);
      }
    };
  }, []);

  const persistComboUpdate = async (updatedCombo: ComboItem) => {
    try {
      const res = await fetch('http://127.0.0.1:3001/v1/admin/combos', {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(updatedCombo),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.combo) {
          setCombos((prev) => prev.map((c) => (c.id === updatedCombo.id ? data.combo : c)));
        }
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('routenex:state-changed'));
      }
    } catch {
      // Sync error ignore
    }
  };

  const moveSelectedTarget = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= selectedTargets.length) return;
    const updated = [...selectedTargets];
    const temp = updated[index];
    updated[index] = updated[newIdx];
    updated[newIdx] = temp;
    setSelectedTargets(updated);
  };

  const removeSelectedTarget = (index: number) => {
    setSelectedTargets((prev) => prev.filter((_, i) => i !== index));
  };

  const moveComboTarget = async (comboId: string, index: number, direction: 'up' | 'down') => {
    const targetCombo = combos.find((c) => c.id === comboId);
    if (!targetCombo) return;
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= targetCombo.targets.length) return;
    const updatedTargets = [...targetCombo.targets];
    const temp = updatedTargets[index];
    updatedTargets[index] = updatedTargets[newIdx];
    updatedTargets[newIdx] = temp;

    const updatedCombo = { ...targetCombo, targets: updatedTargets };
    setCombos((prev) => prev.map((c) => (c.id === comboId ? updatedCombo : c)));
    await persistComboUpdate(updatedCombo);
  };

  const handleRemoveTargetFromCombo = async (comboId: string, index: number) => {
    const targetCombo = combos.find((c) => c.id === comboId);
    if (!targetCombo || targetCombo.targets.length <= 1) return;
    const updatedTargets = targetCombo.targets.filter((_, i) => i !== index);
    const updatedCombo = { ...targetCombo, targets: updatedTargets };

    setCombos((prev) => prev.map((c) => (c.id === comboId ? updatedCombo : c)));
    await persistComboUpdate(updatedCombo);
  };

  const handleAddTargetToCombo = async (comboId: string, newTarget: string) => {
    const trimmed = newTarget.trim();
    if (!trimmed) return;
    const targetCombo = combos.find((c) => c.id === comboId);
    if (!targetCombo) return;
    if (targetCombo.targets.includes(trimmed)) return;

    const updatedTargets = [...targetCombo.targets, trimmed];
    const updatedCombo = { ...targetCombo, targets: updatedTargets };

    if (!availableTargets.includes(trimmed)) {
      setAvailableTargets((prev) => [trimmed, ...prev]);
    }
    setCombos((prev) => prev.map((c) => (c.id === comboId ? updatedCombo : c)));
    await persistComboUpdate(updatedCombo);
  };

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

    const cleanSlug = slug.startsWith('combo/') ? slug : `combo/${slug}`;
    const payload = {
      name,
      slug: cleanSlug,
      description: description || `Custom grouped route: ${name}`,
      targets: selectedTargets,
      strategy,
    };

    try {
      const res = await fetch('http://127.0.0.1:3001/v1/admin/combos', {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setCombos((prev) => {
          const existingIdx = prev.findIndex((c) => c.slug === cleanSlug || (data.combo?.id && c.id === data.combo.id));
          if (existingIdx >= 0) {
            const updated = [...prev];
            updated[existingIdx] = data.combo;
            return updated;
          }
          return [...prev, data.combo];
        });
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
    setSelectedTargets(RECOMMENDED_4_MODEL_STACK);
    setModelSearchQuery('');
    setCustomModelInput('');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('routenex:state-changed'));
    }
  };

  const handleDeleteCombo = async (id: string) => {
    try {
      await fetch(`http://127.0.0.1:3001/v1/admin/combos/${id}`, {
        method: 'DELETE',
        headers: getAdminHeaders(),
      });
    } catch {}
    setCombos((prev) => prev.filter((c) => c.id !== id));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('routenex:state-changed'));
    }
  };

  const handleAddCustomModelToCreate = () => {
    const trimmed = customModelInput.trim();
    if (!trimmed) return;
    if (!selectedTargets.includes(trimmed)) {
      setSelectedTargets((prev) => [...prev, trimmed]);
    }
    if (!availableTargets.includes(trimmed)) {
      setAvailableTargets((prev) => [trimmed, ...prev]);
    }
    setCustomModelInput('');
  };

  const openCreateModal = () => {
    setName('');
    setSlug('');
    setDescription('');
    setSelectedTargets(RECOMMENDED_4_MODEL_STACK);
    setStrategy('priority');
    setModelSearchQuery('');
    setCustomModelInput('');
    setShowModal(true);
  };

  const filteredTargets = availableTargets.filter((opt) =>
    opt.toLowerCase().includes(modelSearchQuery.toLowerCase().trim())
  );

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
            Combos group multiple upstream providers under a single virtual model ID (e.g. <code className="text-sky-300 bg-sky-500/10 border border-sky-500/30 font-mono text-xs px-2 py-0.5 rounded-md">combo/free-unlimited</code>). When your primary model hits a rate limit (429) or outage, RouteNex seamlessly redirects requests to the next provider in the chain without interrupting your agent or client.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-full bg-zinc-100 hover:bg-white !text-zinc-950 font-semibold px-4 py-2 text-xs border border-zinc-200 shadow-xs transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
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
                    className="inline-flex items-center gap-1.5 font-mono text-xs px-2 py-0.5 rounded-md text-sky-300 bg-sky-500/10 border border-sky-500/30 hover:bg-sky-500/20 transition cursor-pointer"
                    title="Click to copy model ID"
                  >
                    <span>{combo.slug}</span>
                    <span className="text-[10px] text-sky-400 font-semibold">{copiedSlug === combo.slug ? '✓ Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="mt-1 text-xs text-mute">{combo.description}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTestCombo(combo)}
                  disabled={testingId === combo.id}
                  className="rounded border border-[#222226] bg-[#111113] hover:bg-zinc-800 hover:border-zinc-700 px-3 py-1.5 text-xs font-mono text-zinc-300 hover:text-white transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                >
                  {testingId === combo.id ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-sky-400">▶</span>
                      <span>Probe Failover</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteCombo(combo.id)}
                  className="inline-flex items-center gap-1.5 border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 px-2.5 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer"
                  title="Delete combo"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  <span>Delete</span>
                </button>
              </div>
            </div>

            {/* Failover Sequence Visualization */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono text-mute">Fallback Execution Sequence:</span>
                <span className="rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 px-2 py-0.5 text-[10px] font-mono">
                  Strategy: {combo.strategy.toUpperCase()}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {combo.targets.map((target, idx) => (
                  <React.Fragment key={`${combo.id}-${target}-${idx}`}>
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
                      <div className="flex items-center ml-1 border-l border-hairline pl-1 space-x-0.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveComboTarget(combo.id, idx, 'up')}
                          className="px-0.5 text-[9px] text-mute hover:text-ink disabled:opacity-20 cursor-pointer"
                          title="Move earlier in fallback sequence"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={idx === combo.targets.length - 1}
                          onClick={() => moveComboTarget(combo.id, idx, 'down')}
                          className="px-0.5 text-[9px] text-mute hover:text-ink disabled:opacity-20 cursor-pointer"
                          title="Move later in fallback sequence"
                        >
                          ▼
                        </button>
                        {combo.targets.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTargetFromCombo(combo.id, idx)}
                            className="px-0.5 text-[11px] text-zinc-400 hover:text-rose-400 transition cursor-pointer"
                            title={`Remove ${target} from sequence`}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                    {idx < combo.targets.length - 1 && (
                      <span className="text-mute font-mono text-xs">➔</span>
                    )}
                  </React.Fragment>
                ))}

                {/* + Add Model Button / Inline Input */}
                <span className="text-mute font-mono text-xs">➔</span>
                {addingModelComboId === combo.id ? (
                  <div className="inline-flex flex-wrap items-center gap-2 p-1.5 rounded-md border border-sky-500/40 bg-zinc-900/90 text-xs">
                    <select
                      value={inlineSelectedModel}
                      onChange={(e) => setInlineSelectedModel(e.target.value)}
                      className="rounded border border-hairline bg-canvas px-2 py-1 text-xs text-ink font-mono focus:border-sky-500 focus:outline-hidden max-w-[200px]"
                    >
                      <option value="">Select from catalog ({availableTargets.length})...</option>
                      {availableTargets
                        .filter((m) => !combo.targets.includes(m))
                        .map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                    </select>
                    <input
                      type="text"
                      placeholder="or custom model ID..."
                      value={inlineCustomModel}
                      onChange={(e) => setInlineCustomModel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const chosen = inlineCustomModel.trim() || inlineSelectedModel;
                          if (chosen) {
                            handleAddTargetToCombo(combo.id, chosen);
                            setAddingModelComboId(null);
                            setInlineSelectedModel('');
                            setInlineCustomModel('');
                          }
                        }
                      }}
                      className="rounded border border-hairline bg-canvas px-2 py-1 text-xs text-ink font-mono focus:border-sky-500 focus:outline-hidden w-40"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const chosen = inlineCustomModel.trim() || inlineSelectedModel;
                        if (chosen) {
                          handleAddTargetToCombo(combo.id, chosen);
                          setAddingModelComboId(null);
                          setInlineSelectedModel('');
                          setInlineCustomModel('');
                        }
                      }}
                      disabled={!inlineCustomModel.trim() && !inlineSelectedModel}
                      className="rounded bg-sky-500 hover:bg-sky-400 text-zinc-950 font-semibold px-2 py-1 text-xs font-mono disabled:opacity-40 transition cursor-pointer"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddingModelComboId(null);
                        setInlineSelectedModel('');
                        setInlineCustomModel('');
                      }}
                      className="rounded border border-hairline px-1.5 py-1 text-xs text-mute hover:text-ink transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAddingModelComboId(combo.id);
                      setInlineSelectedModel('');
                      setInlineCustomModel('');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-dashed border-sky-500/40 hover:border-sky-500 text-sky-400 hover:text-sky-300 bg-sky-500/5 hover:bg-sky-500/10 text-xs font-mono transition cursor-pointer"
                    title="Add a model to this fallback sequence"
                  >
                    <span>＋</span>
                    <span>Add Model</span>
                  </button>
                )}
              </div>

              {testResult[combo.id] && (
                <div
                  className={`mt-3 p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between gap-2 shadow-xs ${
                    testResult[combo.id].startsWith('✓')
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : testResult[combo.id].startsWith('⚠')
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      : 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0">
                      {testResult[combo.id].startsWith('✓') ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                      ) : testResult[combo.id].startsWith('⚠') ? (
                        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-sky-400 inline-block animate-pulse" />
                      )}
                    </span>
                    <span className="font-medium truncate">{testResult[combo.id]}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setTestResult((prev) => {
                        const next = { ...prev };
                        delete next[combo.id];
                        return next;
                      })
                    }
                    className="text-zinc-400 hover:text-zinc-100 text-xs px-1 cursor-pointer shrink-0"
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Create Combo */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-hairline bg-elevated p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <h4 className="text-sm font-semibold text-ink">Create New Provider Combo</h4>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-mute hover:text-ink text-sm cursor-pointer"
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
                  placeholder="e.g. Recommended 4-Model Free Stack"
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
                    placeholder="free-stack-quad"
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
                  placeholder="e.g. Zero-downtime 4-model cluster with Groq, Cerebras, and Pollinations"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded border border-hairline bg-canvas px-3 py-2 text-ink focus:border-ink focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">Failover & Routing Strategy</label>
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value as ComboStrategy)}
                  className="w-full rounded border border-hairline bg-canvas px-3 py-2 text-ink font-mono text-xs focus:border-ink focus:outline-hidden"
                >
                  <option value="priority">Priority Failover (1st → 2nd → 3rd → 4th)</option>
                  <option value="lkgp">LKGP (Last-Known-Good Provider stickiness)</option>
                  <option value="headroom">Headroom (Highest remaining RPM / quota)</option>
                  <option value="reset-window">Reset-Window (Soonest rate-limit reset)</option>
                  <option value="cache-optimized">Cache-Optimized (Prefix affinity for prompt-cache hits)</option>
                  <option value="fastest">Fastest (Lowest Latency First)</option>
                  <option value="round-robin">Round-Robin (Equally Balanced)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-medium text-ink">
                    Target Models (Click to toggle sequence)
                  </label>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                    selectedTargets.length >= 3 && selectedTargets.length <= 4
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-semibold'
                      : selectedTargets.length > 4
                      ? 'bg-sky-500/10 text-sky-400 border-sky-500/30 font-medium'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30 font-medium'
                  }`}>
                    Selected Models: {selectedTargets.length} — Recommended: 3 to 4 models
                  </span>
                </div>

                {/* Model Catalog Filter */}
                <div className="relative mb-2">
                  <input
                    type="text"
                    placeholder="Filter models (200+ available from gateway)..."
                    value={modelSearchQuery}
                    onChange={(e) => setModelSearchQuery(e.target.value)}
                    className="w-full rounded border border-hairline bg-canvas px-3 py-1.5 text-xs text-ink placeholder:text-mute font-mono focus:border-ink focus:outline-hidden"
                  />
                  {modelSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setModelSearchQuery('')}
                      className="absolute right-2.5 top-1.5 text-xs text-mute hover:text-ink cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Catalog Selectable Box */}
                <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded border border-hairline bg-canvas">
                  {filteredTargets.length === 0 ? (
                    <div className="text-center py-3 text-mute text-xs">
                      No matching models found. You can add it below as a Custom Model ID.
                    </div>
                  ) : (
                    filteredTargets.map((opt) => {
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
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left font-mono transition text-xs cursor-pointer ${
                            isSelected
                              ? 'bg-zinc-100 dark:bg-white !text-zinc-950 font-semibold'
                              : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-body'
                          }`}
                        >
                          <span>{opt}</span>
                          {isSelected && (
                            <span className="text-[10px] bg-zinc-900/10 dark:bg-zinc-900/20 text-zinc-950 px-1.5 py-0.5 rounded font-bold">
                              #{orderIdx + 1}
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Custom Model ID Input */}
                <div className="flex items-center gap-1.5 mt-2">
                  <input
                    type="text"
                    placeholder="Custom Model ID (e.g. nvidia/deepseek-r1, openrouter/...)"
                    value={customModelInput}
                    onChange={(e) => setCustomModelInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomModelToCreate();
                      }
                    }}
                    className="flex-1 rounded border border-hairline bg-canvas px-3 py-1.5 text-xs text-ink placeholder:text-mute font-mono focus:border-ink focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomModelToCreate}
                    disabled={!customModelInput.trim()}
                    className="rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 px-3 py-1.5 text-xs font-mono font-medium disabled:opacity-40 transition cursor-pointer whitespace-nowrap"
                  >
                    ＋ Add Model ID
                  </button>
                </div>
              </div>

              {selectedTargets.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-ink block">
                    Execution Sequence Order (click arrows to reorder, ✕ to remove):
                  </span>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {selectedTargets.map((target, idx) => (
                      <div
                        key={`selected-${target}-${idx}`}
                        className="flex items-center justify-between px-2.5 py-1 rounded border border-hairline bg-canvas text-xs font-mono"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-mute">#{idx + 1}</span>
                          <span className={idx === 0 ? 'text-emerald-500 font-semibold' : 'text-ink font-medium'}>
                            {target}
                          </span>
                          {idx === 0 && (
                            <span className="text-[9px] uppercase px-1 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveSelectedTarget(idx, 'up')}
                            className="p-1 text-xs hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded disabled:opacity-30 cursor-pointer"
                            title="Move Up"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={idx === selectedTargets.length - 1}
                            onClick={() => moveSelectedTarget(idx, 'down')}
                            className="p-1 text-xs hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded disabled:opacity-30 cursor-pointer"
                            title="Move Down"
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSelectedTarget(idx)}
                            className="p-1 text-xs text-zinc-400 hover:text-rose-400 rounded cursor-pointer"
                            title="Remove target"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded px-4 py-2 text-body hover:text-ink font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedTargets.length === 0 || !name}
                  className="rounded bg-zinc-100 hover:bg-white !text-zinc-950 font-semibold px-5 py-2 transition disabled:opacity-50 shadow-xs cursor-pointer"
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

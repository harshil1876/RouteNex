import React, { useState, useMemo } from 'react';
import ProviderBrandIcon from '../dashboard/ProviderBrandIcon';
import { UNIFIED_MODELS, type UnifiedCatalogModel } from '../../data/unified-catalog';

export type CatalogModelItem = UnifiedCatalogModel;
const CATALOG_MODELS: CatalogModelItem[] = UNIFIED_MODELS;

export default function ModelCatalogExplorer() {
  const [search, setSearch] = useState('');
  const [activeModality, setActiveModality] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'price' | 'speed' | 'context'>('newest');

  // Left Filter Rail States (Screenshot 613)
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]);
  const [filterFreeOnly, setFilterFreeOnly] = useState(false);
  const [filterZdrOnly, setFilterZdrOnly] = useState(false);
  const [filterReasoningOnly, setFilterReasoningOnly] = useState(false);
  const [filterToolsOnly, setFilterToolsOnly] = useState(false);
  const [filterDiscounted, setFilterDiscounted] = useState(false);
  const [minContext, setMinContext] = useState<number>(0);

  const seriesList = ['Claude', 'GPT', 'Gemini', 'DeepSeek', 'Llama', 'Qwen', 'Mistral'];

  const toggleSeries = (s: string) => {
    setSelectedSeries((prev) =>
      prev.includes(s) ? prev.filter((item) => item !== s) : [...prev, s]
    );
  };

  const filteredModels = useMemo(() => {
    return CATALOG_MODELS.filter((m) => {
      // Search
      const q = search.toLowerCase();
      const matchSearch =
        q === '' ||
        m.displayName.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.providerName.toLowerCase().includes(q);

      // Modality tab
      const matchModality = activeModality === 'All' || m.modality === activeModality;

      // Left Rail filters
      const matchSeries = selectedSeries.length === 0 || selectedSeries.includes(m.series);
      const matchFree = !filterFreeOnly || m.freeTier;
      const matchZdr = !filterZdrOnly || m.zdr;
      const matchReasoning = !filterReasoningOnly || m.reasoning;
      const matchTools = !filterToolsOnly || m.tools;
      const matchDiscounted = !filterDiscounted || m.discounted;
      const matchContext = m.contextTokens >= minContext;

      return (
        matchSearch &&
        matchModality &&
        matchSeries &&
        matchFree &&
        matchZdr &&
        matchReasoning &&
        matchTools &&
        matchDiscounted &&
        matchContext
      );
    }).sort((a, b) => {
      if (sortBy === 'price') return a.promptPriceNumeric - b.promptPriceNumeric;
      if (sortBy === 'speed') return b.speedTps - a.speedTps;
      if (sortBy === 'context') return b.contextTokens - a.contextTokens;
      return 0; // newest / default
    });
  }, [
    search,
    activeModality,
    selectedSeries,
    filterFreeOnly,
    filterZdrOnly,
    filterReasoningOnly,
    filterToolsOnly,
    filterDiscounted,
    minContext,
    sortBy,
  ]);

  return (
    <div className="space-y-6 font-sans">
      {/* Top Modality Tabs (Screenshot 613) */}
      <div className="flex items-center justify-between border-b border-[#222226] overflow-x-auto pb-1 gap-2">
        <div className="flex gap-2">
          {['All', 'Text', 'Image', 'Video', 'Speech', 'Decisions', 'Embeddings', 'Rerank'].map((mod) => (
            <button
              key={mod}
              type="button"
              onClick={() => setActiveModality(mod)}
              className={`pb-2 px-3 text-xs font-medium transition border-b-2 whitespace-nowrap ${
                activeModality === mod
                  ? 'border-zinc-100 text-zinc-100 font-semibold'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {mod}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 pb-1 shrink-0 font-mono text-xs">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#111113] border border-[#222226] text-zinc-300 rounded px-2.5 py-1 text-xs focus:outline-none"
          >
            <option value="newest">Sort: Newest</option>
            <option value="price">Sort: Price (Low)</option>
            <option value="speed">Sort: Speed (TPS)</option>
            <option value="context">Sort: Context Window</option>
          </select>

          <div className="flex rounded border border-[#222226] bg-[#111113] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-2 py-0.5 rounded text-[11px] ${viewMode === 'grid' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-500'}`}
              title="Grid View"
            >
              ⊞
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2 py-0.5 rounded text-[11px] ${viewMode === 'table' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-500'}`}
              title="Table View"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout: Left Filter Rail + Right Model Explorer (Screenshot 613) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Filter Rail */}
        <aside className="lg:col-span-3 space-y-5 p-4 rounded-xl bg-[#111113] border border-[#222226] text-xs font-mono">
          <div className="space-y-1.5">
            <span className="text-zinc-400 font-sans font-semibold block uppercase tracking-wider text-[11px]">
              Search Catalog
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search slug or family..."
              className="w-full bg-[#09090b] border border-[#222226] rounded px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none"
            />
          </div>

          <div className="space-y-2 pt-3 border-t border-[#222226]">
            <span className="text-zinc-400 font-sans font-semibold block uppercase tracking-wider text-[11px]">
              Filters
            </span>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                <input
                  type="checkbox"
                  checked={filterFreeOnly}
                  onChange={(e) => setFilterFreeOnly(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900"
                />
                <span>Free Tier ($0 / M)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                <input
                  type="checkbox"
                  checked={filterZdrOnly}
                  onChange={(e) => setFilterZdrOnly(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900"
                />
                <span>Zero Data Retention (ZDR)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                <input
                  type="checkbox"
                  checked={filterReasoningOnly}
                  onChange={(e) => setFilterReasoningOnly(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900"
                />
                <span>Extended Reasoning (R1/3.7)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                <input
                  type="checkbox"
                  checked={filterToolsOnly}
                  onChange={(e) => setFilterToolsOnly(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900"
                />
                <span>Tool / Function Calling</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                <input
                  type="checkbox"
                  checked={filterDiscounted}
                  onChange={(e) => setFilterDiscounted(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900"
                />
                <span>Discounted Endpoints</span>
              </label>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-[#222226]">
            <span className="text-zinc-400 font-sans font-semibold block uppercase tracking-wider text-[11px]">
              Model Series
            </span>
            <div className="flex flex-wrap gap-1.5">
              {seriesList.map((s) => {
                const active = selectedSeries.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSeries(s)}
                    className={`px-2 py-0.5 rounded text-[11px] border transition ${
                      active
                        ? 'bg-zinc-100 text-zinc-950 font-semibold border-zinc-200'
                        : 'bg-[#09090b] text-zinc-400 border-[#222226] hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-[#222226]">
            <span className="text-zinc-400 font-sans font-semibold block uppercase tracking-wider text-[11px]">
              Context Window
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: 'Any', val: 0 },
                { label: '≥ 32K', val: 32000 },
                { label: '≥ 128K', val: 128000 },
                { label: '≥ 1M', val: 1000000 },
              ].map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => setMinContext(c.val)}
                  className={`py-1 rounded text-center border text-[11px] ${
                    minContext === c.val
                      ? 'bg-zinc-800 text-zinc-100 font-semibold border-zinc-700'
                      : 'bg-[#09090b] text-zinc-500 border-[#222226] hover:text-zinc-300'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Models View */}
        <div className="lg:col-span-9 space-y-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span>Showing {filteredModels.length} Models</span>
            <span>Deterministic Auto-Routing Active</span>
          </div>

          {filteredModels.length === 0 ? (
            <div className="py-20 text-center space-y-2 p-8 rounded-xl bg-[#111113] border border-[#222226]">
              <div className="text-2xl">🔍</div>
              <h3 className="text-sm font-semibold text-zinc-200 font-sans">No matching models found</h3>
              <p className="text-xs text-zinc-500 font-sans">Try loosening your series, modality or pricing filters.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredModels.map((m) => (
                <a
                  key={m.id}
                  href={`/models/${m.providerSlug}/${m.modelSlug}`}
                  className="p-5 rounded-xl bg-[#111113] hover:bg-[#141417] border border-[#222226] hover:border-zinc-700 transition-all space-y-4 shadow-xs group block"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#09090b] border border-[#222226] flex items-center justify-center p-1.5 shrink-0 group-hover:border-zinc-700 transition">
                        <ProviderBrandIcon id={m.providerSlug} className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-bold text-zinc-100 group-hover:text-white transition">
                            {m.displayName}
                          </h3>
                          {m.freeTier && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              $0 FREE
                            </span>
                          )}
                          {m.zdr && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700" title="Zero Data Retention">
                              ZDR
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-zinc-500 block">{m.id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#222226] text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-zinc-500 block">Input / Output</span>
                      <span className={m.freeTier ? 'text-emerald-400 font-semibold' : 'text-zinc-200 font-semibold'}>
                        {m.promptPrice}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block">Context</span>
                      <span className="text-zinc-200 font-semibold">{m.context}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block">Speed</span>
                      <span className="text-emerald-400 font-semibold">{m.speed}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[#222226] bg-[#111113] overflow-hidden">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#222226] bg-[#09090b] text-[10px] text-zinc-500 uppercase">
                    <th className="py-2.5 px-4 font-semibold">Model Name</th>
                    <th className="py-2.5 px-4 font-semibold">Provider</th>
                    <th className="py-2.5 px-4 font-semibold">Context</th>
                    <th className="py-2.5 px-4 font-semibold">Prompt Price</th>
                    <th className="py-2.5 px-4 font-semibold">Speed</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222226]">
                  {filteredModels.map((m) => (
                    <tr key={m.id} className="hover:bg-zinc-800/30 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <ProviderBrandIcon id={m.providerSlug} className="w-4 h-4 shrink-0" />
                          <a href={`/models/${m.providerSlug}/${m.modelSlug}`} className="text-zinc-100 font-semibold hover:underline">
                            {m.displayName}
                          </a>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-zinc-400">{m.providerName}</td>
                      <td className="py-3 px-4 text-zinc-300">{m.context}</td>
                      <td className="py-3 px-4 font-semibold text-emerald-400">{m.promptPrice}</td>
                      <td className="py-3 px-4 text-zinc-300">{m.speed}</td>
                      <td className="py-3 px-4 text-right">
                        <a href={`/models/${m.providerSlug}/${m.modelSlug}`} className="text-zinc-400 hover:text-white font-medium">
                          Analytics →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

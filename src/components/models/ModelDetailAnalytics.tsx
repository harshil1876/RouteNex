import React, { useState } from 'react';
import ProviderBrandIcon from '../dashboard/ProviderBrandIcon';

interface ModelDetailAnalyticsProps {
  provider: string;
  model: string;
  displayName: string;
  contextLength: string;
  inputPrice: string;
  outputPrice: string;
  speed: string;
  modality: string;
  zdr: boolean;
}

export default function ModelDetailAnalytics({
  provider,
  model,
  displayName,
  contextLength,
  inputPrice,
  outputPrice,
  speed,
  modality,
  zdr,
}: ModelDetailAnalyticsProps) {
  const [activeTab, setActiveTab] = useState<
    'providers' | 'pricing' | 'performance' | 'uptime' | 'apps' | 'activity' | 'docs' | 'faq'
  >('providers');

  const [activeSdk, setActiveSdk] = useState<'python' | 'ts' | 'curl'>('python');
  const [copied, setCopied] = useState(false);

  const modelSlug = `${provider}/${model}`;

  const tabs = [
    { id: 'providers', label: 'Providers' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'performance', label: 'Performance (6 Charts)' },
    { id: 'uptime', label: 'Uptime & Availability' },
    { id: 'apps', label: 'Apps & Agents' },
    { id: 'activity', label: 'Activity Breakdown' },
    { id: 'docs', label: 'Documentation' },
    { id: 'faq', label: 'FAQ' },
  ];

  // Upstream providers hosting this model (Screenshot 614)
  const providerHosts = [
    {
      name: provider.toUpperCase(),
      slug: provider,
      tag: 'Primary Upstream',
      inputPrice: inputPrice,
      outputPrice: outputPrice,
      cachePrice: '$0.00 / M',
      latency: '0.12s',
      tps: speed,
      uptime: '99.98%',
      zdr: zdr,
      discount: '0%',
      quant: 'FP16',
    },
    {
      name: 'OpenRouter (Edge Router)',
      slug: 'openrouter',
      tag: 'Multi-Region Backup',
      inputPrice: inputPrice,
      outputPrice: outputPrice,
      cachePrice: '$0.00 / M',
      latency: '0.24s',
      tps: '110 tps',
      uptime: '99.92%',
      zdr: true,
      discount: '-10%',
      quant: 'FP8',
    },
    {
      name: 'Cerebras Cloud LPU',
      slug: 'cerebras',
      tag: 'Inference Accelerator',
      inputPrice: '$0.00 / M',
      outputPrice: '$0.00 / M',
      cachePrice: '$0.00 / M',
      latency: '0.04s',
      tps: '2,100 tps',
      uptime: '99.85%',
      zdr: false,
      discount: 'Free Tier',
      quant: 'INT8',
    },
  ];

  const codeSnippets = {
    python: `from openai import OpenAI

client = OpenAI(
    base_url="https://api.routenex.com/v1",  # Or http://127.0.0.1:3001/v1 locally
    api_key="rn_live_your_key_here"
)

response = client.chat.completions.create(
    model="${modelSlug}",
    messages=[
        {"role": "system", "content": "You are a helpful coding assistant."},
        {"role": "user", "content": "Write a high-performance LRU cache in Rust."}
    ],
    temperature=0.7
)

print(response.choices[0].message.content)`,
    ts: `import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://api.routenex.com/v1',
  apiKey: process.env.ROUTENEX_API_KEY,
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: '${modelSlug}',
    messages: [{ role: 'user', content: 'Explain zero data retention.' }],
  });

  console.log(completion.choices[0].message.content);
}

main();`,
    curl: `curl https://api.routenex.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer rn_live_your_key_here" \\
  -d '{
    "model": "${modelSlug}",
    "messages": [
      { "role": "user", "content": "Explain quantum teleportation in 2 sentences" }
    ]
  }'`,
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Breadcrumb & Hero Header (Screenshot 614) */}
      <div className="space-y-4 pb-6 border-b border-[#222226]">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
          <a href="/models" className="hover:text-zinc-300">Models</a>
          <span>/</span>
          <span className="text-zinc-400 capitalize">{provider}</span>
          <span>/</span>
          <span className="text-zinc-200">{model}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#111113] border border-[#222226] flex items-center justify-center p-2.5 shrink-0">
              <ProviderBrandIcon id={provider} className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight font-sans">
                  {displayName}
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Active
                </span>
                {zdr && (
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                    ZDR Certified
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
                <code>{modelSlug}</code>
                <button
                  type="button"
                  onClick={() => handleCopy(modelSlug)}
                  className="hover:text-white p-0.5"
                  title="Copy Model ID"
                >
                  {copied ? (
                    <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/dashboard?view=playground&model=${encodeURIComponent(modelSlug)}`}
              className="px-4 py-2 rounded-lg bg-zinc-100 text-zinc-950 font-semibold text-xs hover:bg-white transition"
            >
              Test in Playground →
            </a>
          </div>
        </div>

        {/* 4 Key Spec Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 font-mono text-xs">
          <div className="p-3 rounded-lg bg-[#111113] border border-[#222226]">
            <span className="text-[10px] text-zinc-500 block">Input / Prompt</span>
            <span className="text-zinc-100 font-bold text-sm">{inputPrice}</span>
          </div>
          <div className="p-3 rounded-lg bg-[#111113] border border-[#222226]">
            <span className="text-[10px] text-zinc-500 block">Output / Completion</span>
            <span className="text-zinc-100 font-bold text-sm">{outputPrice}</span>
          </div>
          <div className="p-3 rounded-lg bg-[#111113] border border-[#222226]">
            <span className="text-[10px] text-zinc-500 block">Context Window</span>
            <span className="text-zinc-100 font-bold text-sm">{contextLength}</span>
          </div>
          <div className="p-3 rounded-lg bg-[#111113] border border-[#222226]">
            <span className="text-[10px] text-zinc-500 block">Throughput Speed</span>
            <span className="text-emerald-400 font-bold text-sm">{speed}</span>
          </div>
        </div>
      </div>

      {/* 8-Tab Navigation Bar */}
      <div className="flex border-b border-[#222226] overflow-x-auto gap-2 font-mono text-xs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as any)}
            className={`pb-2.5 px-3 font-medium transition border-b-2 whitespace-nowrap ${
              activeTab === t.id
                ? 'border-zinc-100 text-zinc-100 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: PROVIDERS TABLE (Screenshot 614) */}
      {activeTab === 'providers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>{providerHosts.length} Providers Serving This Model</span>
            <span>Deterministic Failover Active</span>
          </div>

          <div className="rounded-xl border border-[#222226] bg-[#111113] overflow-hidden">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-[#222226] bg-[#09090b] text-[10px] text-zinc-500 uppercase">
                  <th className="py-2.5 px-4 font-semibold">Provider</th>
                  <th className="py-2.5 px-4 font-semibold">Input /M</th>
                  <th className="py-2.5 px-4 font-semibold">Output /M</th>
                  <th className="py-2.5 px-4 font-semibold">Latency (TTFT)</th>
                  <th className="py-2.5 px-4 font-semibold">Speed (TPS)</th>
                  <th className="py-2.5 px-4 font-semibold">Uptime</th>
                  <th className="py-2.5 px-4 font-semibold">Quantization</th>
                  <th className="py-2.5 px-4 font-semibold">ZDR</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222226]">
                {providerHosts.map((h, i) => (
                  <tr key={i} className="hover:bg-zinc-800/30 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <ProviderBrandIcon id={h.slug} className="w-4 h-4 shrink-0" />
                        <div>
                          <span className="text-zinc-100 font-semibold block">{h.name}</span>
                          <span className="text-[10px] text-zinc-500">{h.tag}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-zinc-300 font-medium">{h.inputPrice}</td>
                    <td className="py-3 px-4 text-zinc-300 font-medium">{h.outputPrice}</td>
                    <td className="py-3 px-4 text-emerald-400 font-bold">{h.latency}</td>
                    <td className="py-3 px-4 text-zinc-200">{h.tps}</td>
                    <td className="py-3 px-4 text-emerald-400">{h.uptime}</td>
                    <td className="py-3 px-4 text-zinc-400">{h.quant}</td>
                    <td className="py-3 px-4">
                      {h.zdr ? (
                        <span className="text-zinc-200 font-medium" title="Zero Data Retention Verified">Yes</span>
                      ) : (
                        <span className="text-zinc-600">No</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <a
                        href={`/dashboard?view=providers&provider=${encodeURIComponent(h.slug)}`}
                        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 text-[11px] font-sans inline-block whitespace-nowrap transition"
                      >
                        Connect / Configure Provider →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PRICING (Screenshots 615–616) */}
      {activeTab === 'pricing' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-[#111113] border border-[#222226] space-y-1">
              <span className="text-xs text-zinc-500 font-mono block">Weighted Avg Input Price</span>
              <div className="text-2xl font-bold text-zinc-100 font-mono">{inputPrice}</div>
              <span className="text-xs text-emerald-400 font-mono">Dynamic fallback discounts available</span>
            </div>
            <div className="p-5 rounded-xl bg-[#111113] border border-[#222226] space-y-1">
              <span className="text-xs text-zinc-500 font-mono block">Weighted Avg Output Price</span>
              <div className="text-2xl font-bold text-zinc-100 font-mono">{outputPrice}</div>
              <span className="text-xs text-zinc-500 font-mono">Normalized token accounting</span>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-[#111113] border border-[#222226] space-y-3 font-mono text-xs">
            <h3 className="font-semibold text-zinc-200 font-sans text-sm">30-Day Effective Price History</h3>
            <div className="h-40 rounded-lg bg-[#09090b] border border-[#222226] p-4 flex items-end gap-2">
              {[40, 42, 41, 45, 43, 38, 35, 36, 34, 32, 30, 28, 28, 25, 25, 24, 22, 20, 20, 18, 18].map((h, i) => (
                <div key={i} className="flex-1 bg-zinc-800 hover:bg-emerald-500 transition-colors rounded-t-xs" style={{ height: `${h * 2}%` }} title={`Day ${i + 1}: Effective price trend`} />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>30 Days Ago</span>
              <span>15 Days Ago</span>
              <span>Today</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PERFORMANCE (6 CHARTS) (Screenshots 617–619) */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
            {/* Chart 1 */}
            <div className="p-4 rounded-xl bg-[#111113] border border-[#222226] space-y-2">
              <span className="text-[11px] text-zinc-400 block font-semibold font-sans">1. Throughput (tok/s)</span>
              <div className="text-lg font-bold text-emerald-400">{speed}</div>
              <div className="h-20 bg-[#09090b] border border-[#222226] rounded flex items-end p-2 gap-1.5">
                {[60, 75, 80, 85, 95, 90, 100].map((v, i) => (
                  <div key={i} className="flex-1 bg-emerald-500/80 rounded-t-xs" style={{ height: `${v}%` }} />
                ))}
              </div>
            </div>

            {/* Chart 2 */}
            <div className="p-4 rounded-xl bg-[#111113] border border-[#222226] space-y-2">
              <span className="text-[11px] text-zinc-400 block font-semibold font-sans">2. Time to First Token (TTFT)</span>
              <div className="text-lg font-bold text-zinc-100">0.12s P50</div>
              <div className="h-20 bg-[#09090b] border border-[#222226] rounded flex items-end p-2 gap-1.5">
                {[30, 25, 28, 22, 18, 15, 12].map((v, i) => (
                  <div key={i} className="flex-1 bg-zinc-700 rounded-t-xs" style={{ height: `${v * 2}%` }} />
                ))}
              </div>
            </div>

            {/* Chart 3 */}
            <div className="p-4 rounded-xl bg-[#111113] border border-[#222226] space-y-2">
              <span className="text-[11px] text-zinc-400 block font-semibold font-sans">3. End-to-End Latency</span>
              <div className="text-lg font-bold text-zinc-100">0.68s Total</div>
              <div className="h-20 bg-[#09090b] border border-[#222226] rounded flex items-end p-2 gap-1.5">
                {[45, 50, 48, 42, 40, 38, 35].map((v, i) => (
                  <div key={i} className="flex-1 bg-zinc-600 rounded-t-xs" style={{ height: `${v * 1.5}%` }} />
                ))}
              </div>
            </div>

            {/* Chart 4 */}
            <div className="p-4 rounded-xl bg-[#111113] border border-[#222226] space-y-2">
              <span className="text-[11px] text-zinc-400 block font-semibold font-sans">4. Tool Call Error Rate</span>
              <div className="text-lg font-bold text-emerald-400">0.02%</div>
              <div className="h-20 bg-[#09090b] border border-[#222226] rounded flex items-end p-2 gap-1.5">
                {[10, 8, 5, 4, 3, 2, 1].map((v, i) => (
                  <div key={i} className="flex-1 bg-emerald-700 rounded-t-xs" style={{ height: `${v * 8}%` }} />
                ))}
              </div>
            </div>

            {/* Chart 5 */}
            <div className="p-4 rounded-xl bg-[#111113] border border-[#222226] space-y-2">
              <span className="text-[11px] text-zinc-400 block font-semibold font-sans">5. Structured Output Reliability</span>
              <div className="text-lg font-bold text-emerald-400">99.98%</div>
              <div className="h-20 bg-[#09090b] border border-[#222226] rounded flex items-end p-2 gap-1.5">
                {[92, 94, 96, 98, 99, 100, 100].map((v, i) => (
                  <div key={i} className="flex-1 bg-emerald-500 rounded-t-xs" style={{ height: `${v}%` }} />
                ))}
              </div>
            </div>

            {/* Chart 6 */}
            <div className="p-4 rounded-xl bg-[#111113] border border-[#222226] space-y-2">
              <span className="text-[11px] text-zinc-400 block font-semibold font-sans">6. Prompt Cache Hit Rate</span>
              <div className="text-lg font-bold text-zinc-200">68.4%</div>
              <div className="h-20 bg-[#09090b] border border-[#222226] rounded flex items-end p-2 gap-1.5">
                {[30, 40, 52, 58, 62, 65, 68].map((v, i) => (
                  <div key={i} className="flex-1 bg-zinc-500 rounded-t-xs" style={{ height: `${v}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: UPTIME & AVAILABILITY (Screenshots 620–621) */}
      {activeTab === 'uptime' && (
        <div className="p-5 rounded-xl bg-[#111113] border border-[#222226] space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-zinc-200 font-sans text-sm">3-Day Continuous Status Strip</h3>
            <span className="text-emerald-400 font-bold">99.99% RouteNex Multi-Provider Uptime</span>
          </div>

          <div className="grid grid-cols-30 gap-1 py-2">
            {Array.from({ length: 60 }).map((_, i) => (
              <div key={i} className="h-8 rounded-xs bg-emerald-500" title="100% operational window" />
            ))}
          </div>

          <div className="p-4 rounded-lg bg-[#09090b] border border-[#222226] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-zinc-200 font-bold block font-sans">RouteNex Multi-Provider Routed Availability</span>
              <span className="text-zinc-500 text-[11px] font-sans">When a primary upstream fails, RouteNex failover routes to backup in &lt;15ms.</span>
            </div>
            <div className="text-emerald-400 font-bold text-lg">99.99%</div>
          </div>
        </div>
      )}

      {/* TAB 5 & 6: APPS & ACTIVITY BREAKDOWN (Screenshots 622–623) */}
      {(activeTab === 'apps' || activeTab === 'activity') && (
        <div className="space-y-6 font-mono text-xs">
          <div className="p-5 rounded-xl bg-[#111113] border border-[#222226] space-y-4">
            <h3 className="font-semibold text-zinc-200 font-sans text-sm">Top Coding Agents Calling This Model</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-[#09090b] border border-[#222226] space-y-1">
                <span className="text-zinc-400 block font-semibold font-sans">1. Claude Code CLI</span>
                <span className="text-zinc-100 font-bold text-sm">48.2% Share</span>
              </div>
              <div className="p-3 rounded-lg bg-[#09090b] border border-[#222226] space-y-1">
                <span className="text-zinc-400 block font-semibold font-sans">2. Cursor IDE</span>
                <span className="text-zinc-100 font-bold text-sm">31.4% Share</span>
              </div>
              <div className="p-3 rounded-lg bg-[#09090b] border border-[#222226] space-y-1">
                <span className="text-zinc-400 block font-semibold font-sans">3. Cline VSCode</span>
                <span className="text-zinc-100 font-bold text-sm">20.4% Share</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-[#111113] border border-[#222226] space-y-3">
            <h3 className="font-semibold text-zinc-200 font-sans text-sm">Stacked Token Breakdown</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-zinc-400">
                <span>Prompt Tokens (Input): 62%</span>
                <span>Reasoning Tokens: 18%</span>
                <span>Completion Tokens: 20%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-[#09090b] overflow-hidden flex border border-[#222226]">
                <div className="bg-zinc-400 h-full" style={{ width: '62%' }} />
                <div className="bg-purple-400 h-full" style={{ width: '18%' }} />
                <div className="bg-emerald-400 h-full" style={{ width: '20%' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: DOCUMENTATION & SDK EXAMPLES (Screenshot 624) */}
      {activeTab === 'docs' && (
        <div className="p-5 rounded-xl bg-[#111113] border border-[#222226] space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#222226]">
            <h3 className="font-semibold text-zinc-200 font-sans text-sm">Integration Snippets</h3>
            <div className="flex p-0.5 rounded bg-[#09090b] border border-[#222226]">
              {(['python', 'ts', 'curl'] as const).map((sdk) => (
                <button
                  key={sdk}
                  type="button"
                  onClick={() => setActiveSdk(sdk)}
                  className={`px-3 py-1 rounded capitalize ${
                    activeSdk === sdk ? 'bg-zinc-800 text-zinc-100 font-bold' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {sdk === 'ts' ? 'TypeScript' : sdk}
                </button>
              ))}
            </div>
          </div>

          <div className="relative rounded-lg bg-[#09090b] border border-[#222226] p-4 overflow-x-auto">
            <button
              type="button"
              onClick={() => handleCopy(codeSnippets[activeSdk])}
              className="absolute top-3 right-3 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white"
            >
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
            <pre className="text-zinc-300 whitespace-pre leading-relaxed">
              <code>{codeSnippets[activeSdk]}</code>
            </pre>
          </div>
        </div>
      )}

      {/* TAB 8: FAQ (Screenshot 625) */}
      {activeTab === 'faq' && (
        <div className="p-5 rounded-xl bg-[#111113] border border-[#222226] space-y-4 font-sans text-xs">
          <h3 className="font-semibold text-zinc-200 text-sm">Frequently Asked Questions</h3>
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-[#09090b] border border-[#222226] space-y-1">
              <h4 className="font-bold text-zinc-100">Can I call this model with an OpenAI SDK?</h4>
              <p className="text-zinc-400 leading-relaxed">
                Yes. RouteNex exposes a 100% OpenAI-compatible endpoint. Set <code className="text-zinc-300 font-mono">baseURL="https://api.routenex.com/v1"</code> and pass <code className="text-zinc-300 font-mono">{modelSlug}</code> as the model parameter.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-[#09090b] border border-[#222226] space-y-1">
              <h4 className="font-bold text-zinc-100">What happens if the primary provider experiences a rate limit (429)?</h4>
              <p className="text-zinc-400 leading-relaxed">
                RouteNex’s 3-state circuit breaker immediately trips for that provider and seamlessly failovers to the next healthy candidate in &lt;15ms with zero dropped connections.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

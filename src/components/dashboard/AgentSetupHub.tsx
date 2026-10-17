import React, { useState } from 'react';

type AgentType = 'cursor' | 'claudecode' | 'cline' | 'aider' | 'python' | 'node';

export default function AgentSetupHub() {
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('cursor');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="rounded-lg border border-hairline bg-elevated p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-ink">Coding Agent & Tool Integration Hub</h3>
            <span className="rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-2 py-0.5 text-[11px] font-mono">
              OpenAI Compatible
            </span>
          </div>
          <p className="mt-1 text-xs text-mute max-w-2xl leading-relaxed">
            RouteNex functions as a 100% drop-in proxy for all modern developer coding agents. Configure your agent’s Base URL to <code className="text-ink font-mono bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">http://localhost:3001/v1</code> to unlock zero-cost free-tier token pools, multi-provider failover, and local telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-mute">Port: 3001</span>
          <span className="px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            CORS Allowed
          </span>
        </div>
      </div>

      {/* Agent Selector Pills */}
      <div className="flex space-x-2 overflow-x-auto pb-1 text-xs font-mono">
        {[
          { id: 'cursor', label: 'Cursor IDE', icon: '⚡' },
          { id: 'claudecode', label: 'Claude Code CLI', icon: '🤖' },
          { id: 'cline', label: 'Cline (VS Code)', icon: '🧩' },
          { id: 'aider', label: 'Aider CLI', icon: '🚀' },
          { id: 'python', label: 'Python (openai)', icon: '🐍' },
          { id: 'node', label: 'Node.js / TS', icon: '📦' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedAgent(tab.id as AgentType)}
            className={`px-3 py-1.5 rounded-full border transition flex items-center gap-1.5 whitespace-nowrap ${
              selectedAgent === tab.id
                ? 'bg-zinc-100 dark:bg-white !text-zinc-950 font-semibold border-zinc-200 dark:border-white shadow-xs'
                : 'bg-elevated text-mute border-hairline hover:text-ink hover:border-neutral-400'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Guide Content Card */}
      <div className="rounded-lg border border-hairline bg-elevated p-6 space-y-6">
        {/* 1. Cursor IDE */}
        {selectedAgent === 'cursor' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-ink">Connect Cursor to RouteNex</h4>
              <p className="mt-1 text-xs text-mute">
                Route Cursor to your local gateway to route prompts through free-tier pools or custom failover combos.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-lg bg-canvas border border-hairline space-y-2">
                <span className="font-semibold text-ink block">Step 1: Configure Custom OpenAI Key in Cursor</span>
                <ol className="list-decimal list-inside space-y-1 text-body">
                  <li>Open Cursor Settings <kbd className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 font-mono text-[10px]">Ctrl+,</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 font-mono text-[10px]">Cmd+,</kbd></li>
                  <li>Navigate to <strong>Cursor Settings ➔ Models</strong></li>
                  <li>Enable <strong>OpenAI API Key</strong></li>
                  <li>Click <strong>Override OpenAI Base URL</strong> and enter:</li>
                </ol>
                <div className="flex items-center justify-between p-2.5 rounded bg-neutral-900 text-neutral-100 font-mono text-xs">
                  <span>http://localhost:3001/v1</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('http://localhost:3001/v1', 'cursor_base')}
                    className="text-mute hover:text-white"
                  >
                    {copiedKey === 'cursor_base' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-canvas border border-hairline space-y-2">
                <span className="font-semibold text-ink block">Step 2: Add RouteNex Models</span>
                <p className="text-body">
                  In Cursor Models list, click <strong>+ Add Model</strong> and input any RouteNex model or combo:
                </p>
                <div className="flex flex-wrap gap-2 pt-1 font-mono">
                  {['combo/free-unlimited', 'combo/coding-power', 'groq/llama-3.3-70b-versatile', 'deepseek/deepseek-chat'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => copyToClipboard(m, m)}
                      className="px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-ink border border-hairline hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
                      title="Click to copy model name"
                    >
                      {m} {copiedKey === m && '✓'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Claude Code CLI */}
        {selectedAgent === 'claudecode' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-ink">Connect Claude Code CLI</h4>
              <p className="mt-1 text-xs text-mute">
                Run Anthropic's official Claude Code CLI terminal assistant through RouteNex.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-body">
                Export RouteNex as your Anthropic base endpoint before launching <code className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">claude</code>:
              </p>

              <div className="relative rounded-lg bg-neutral-900 p-4 font-mono text-xs text-neutral-200 overflow-x-auto space-y-1">
                <div>export ANTHROPIC_BASE_URL="http://localhost:3001/v1"</div>
                <div>export ANTHROPIC_API_KEY="rn-local-dev-default"</div>
                <div className="text-emerald-400">claude --model combo/coding-power</div>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      'export ANTHROPIC_BASE_URL="http://localhost:3001/v1"\nexport ANTHROPIC_API_KEY="rn-local-dev-default"\nclaude --model combo/coding-power',
                      'claude_code'
                    )
                  }
                  className="absolute top-3 right-3 rounded bg-neutral-800 px-2 py-1 text-[11px] text-mute hover:text-white transition"
                >
                  {copiedKey === 'claude_code' ? '✓ Copied' : 'Copy'}
                </button>
              </div>

              <div className="p-3 rounded bg-neutral-50 dark:bg-neutral-900 border border-hairline text-mute">
                💡 <strong>Tip:</strong> You can add these two exports to your <code className="font-mono text-ink">~/.bashrc</code> or <code className="font-mono text-ink">~/.zshrc</code> for persistent routing.
              </div>
            </div>
          </div>
        )}

        {/* 3. Cline (VS Code Extension) */}
        {selectedAgent === 'cline' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-ink">Connect Cline (VS Code)</h4>
              <p className="mt-1 text-xs text-mute">
                Autonomous coding agent with shell execution and file editing.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-canvas border border-hairline">
                  <span className="text-mute block font-mono">API Provider:</span>
                  <span className="font-semibold text-ink">OpenAI Compatible</span>
                </div>

                <div className="p-3 rounded-lg bg-canvas border border-hairline">
                  <span className="text-mute block font-mono">Base URL:</span>
                  <span className="font-semibold text-ink font-mono">http://localhost:3001/v1</span>
                </div>

                <div className="p-3 rounded-lg bg-canvas border border-hairline">
                  <span className="text-mute block font-mono">API Key:</span>
                  <span className="font-semibold text-ink font-mono">rn-local-dev-default</span>
                </div>

                <div className="p-3 rounded-lg bg-canvas border border-hairline">
                  <span className="text-mute block font-mono">Model ID:</span>
                  <span className="font-semibold text-ink font-mono">combo/free-unlimited</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Aider CLI */}
        {selectedAgent === 'aider' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-ink">Connect Aider Terminal Agent</h4>
              <p className="mt-1 text-xs text-mute">
                Aider pairs with you in your terminal to write and git-commit code.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-body">Run Aider with the RouteNex base URL flag:</p>
              <div className="relative rounded-lg bg-neutral-900 p-4 font-mono text-xs text-neutral-200 overflow-x-auto">
                <div>aider --openai-api-base http://localhost:3001/v1 --openai-api-key rn-local-dev-default --model combo/coding-power</div>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      'aider --openai-api-base http://localhost:3001/v1 --openai-api-key rn-local-dev-default --model combo/coding-power',
                      'aider_cmd'
                    )
                  }
                  className="absolute top-3 right-3 rounded bg-neutral-800 px-2 py-1 text-[11px] text-mute hover:text-white transition"
                >
                  {copiedKey === 'aider_cmd' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. Python SDK */}
        {selectedAgent === 'python' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-ink">Python SDK Integration (openai-python)</h4>
              <p className="mt-1 text-xs text-mute">
                Native OpenAI Python SDK compatible. No proprietary client library required.
              </p>
            </div>

            <div className="relative rounded-lg bg-neutral-900 p-4 font-mono text-xs text-neutral-200 overflow-x-auto space-y-1">
              <div><span className="text-pink-400">from</span> openai <span className="text-pink-400">import</span> OpenAI</div>
              <div className="mt-2">client = OpenAI(</div>
              <div className="pl-4">base_url=<span className="text-emerald-400">"http://localhost:3001/v1"</span>,</div>
              <div className="pl-4">api_key=<span className="text-emerald-400">"rn-local-dev-default"</span></div>
              <div>)</div>
              <div className="mt-2">response = client.chat.completions.create(</div>
              <div className="pl-4">model=<span className="text-emerald-400">"combo/free-unlimited"</span>,</div>
              <div className="pl-4">messages=[{'{'}<span className="text-amber-300">"role"</span>: <span className="text-emerald-400">"user"</span>, <span className="text-amber-300">"content"</span>: <span className="text-emerald-400">"Hello RouteNex!"</span>{'}'}]</div>
              <div>)</div>
              <div className="mt-2"><span className="text-sky-400">print</span>(response.choices[0].message.content)</div>

              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    `from openai import OpenAI\n\nclient = OpenAI(\n    base_url="http://localhost:3001/v1",\n    api_key="rn-local-dev-default"\n)\n\nresponse = client.chat.completions.create(\n    model="combo/free-unlimited",\n    messages=[{"role": "user", "content": "Hello RouteNex!"}]\n)\nprint(response.choices[0].message.content)`,
                    'python_sdk'
                  )
                }
                className="absolute top-3 right-3 rounded bg-neutral-800 px-2 py-1 text-[11px] text-mute hover:text-white transition"
              >
                {copiedKey === 'python_sdk' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {/* 6. Node.js / TS */}
        {selectedAgent === 'node' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-ink">Node.js / TypeScript SDK</h4>
              <p className="mt-1 text-xs text-mute">
                Use official <code className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">openai</code> package or standard fetch.
              </p>
            </div>

            <div className="relative rounded-lg bg-neutral-900 p-4 font-mono text-xs text-neutral-200 overflow-x-auto space-y-1">
              <div><span className="text-pink-400">import</span> OpenAI <span className="text-pink-400">from</span> <span className="text-emerald-400">'openai'</span>;</div>
              <div className="mt-2"><span className="text-pink-400">const</span> openai = <span className="text-pink-400">new</span> OpenAI({'{'}</div>
              <div className="pl-4">baseURL: <span className="text-emerald-400">'http://localhost:3001/v1'</span>,</div>
              <div className="pl-4">apiKey: <span className="text-emerald-400">'rn-local-dev-default'</span>,</div>
              <div>{'}'});</div>
              <div className="mt-2"><span className="text-pink-400">const</span> completion = <span className="text-pink-400">await</span> openai.chat.completions.create({'{'}</div>
              <div className="pl-4">model: <span className="text-emerald-400">'combo/free-unlimited'</span>,</div>
              <div className="pl-4">messages: [{'{'} role: <span className="text-emerald-400">'user'</span>, content: <span className="text-emerald-400">'Hello from TS'</span> {'}'}],</div>
              <div>{'}'});</div>
              <div className="mt-2">console.log(completion.choices[0].message.content);</div>

              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    `import OpenAI from 'openai';\n\nconst openai = new OpenAI({\n  baseURL: 'http://localhost:3001/v1',\n  apiKey: 'rn-local-dev-default',\n});\n\nconst completion = await openai.chat.completions.create({\n  model: 'combo/free-unlimited',\n  messages: [{ role: 'user', content: 'Hello from TS' }],\n});\nconsole.log(completion.choices[0].message.content);`,
                    'node_sdk'
                  )
                }
                className="absolute top-3 right-3 rounded bg-neutral-800 px-2 py-1 text-[11px] text-mute hover:text-white transition"
              >
                {copiedKey === 'node_sdk' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

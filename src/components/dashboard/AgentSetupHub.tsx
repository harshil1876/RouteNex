import React, { useState, useEffect } from 'react';

type AgentType = 'cursor' | 'claudecode' | 'cline' | 'aider' | 'python' | 'node';

export default function AgentSetupHub() {
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('cursor');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Dynamic Combo & Model options for Claude Code settings.json builder
  const [availableCombos, setAvailableCombos] = useState<string[]>([
    'combo/free-unlimited',
    'combo/coding-power',
    'combo/reasoning-tier',
    'worker/pr-guardian',
    'pollinations/openai',
    'groq/llama-3.3-70b-versatile',
  ]);
  const [availableKeys, setAvailableKeys] = useState<{ id: string; name: string; key: string }[]>([
    { id: 'vk_default', name: 'Default Local Dev', key: 'rn-local-dev-default' },
  ]);

  // Claude Code interactive settings state
  const [claudeAuthToken, setClaudeAuthToken] = useState('rn-local-dev-default');
  const [claudePrimaryModel, setClaudePrimaryModel] = useState('combo/free-unlimited');
  const [claudeSonnetModel, setClaudeSonnetModel] = useState('combo/free-unlimited');
  const [claudeOpusModel, setClaudeOpusModel] = useState('combo/coding-power');
  const [claudeHaikuModel, setClaudeHaikuModel] = useState('pollinations/openai');

  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    // 1. Fetch live combos
    fetch('http://127.0.0.1:3001/v1/admin/combos')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.combos) && data.combos.length > 0) {
          const slugs = data.combos.map((c: any) => c.slug);
          setAvailableCombos((prev) => Array.from(new Set([...slugs, ...prev])));
        }
      })
      .catch(() => {});

    // 2. Fetch live virtual keys
    fetch('http://127.0.0.1:3001/v1/admin/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.virtualKeys) && data.virtualKeys.length > 0) {
          const mapped = data.virtualKeys.map((vk: any) => ({
            id: vk.id,
            name: vk.name,
            key: vk.keyFull || vk.keyMasked || vk.id,
          }));
          setAvailableKeys(mapped);
          if (mapped[0]?.key) {
            setClaudeAuthToken(mapped[0].key);
          }
        }
      })
      .catch(() => {});

    // 3. Fetch models catalog
    fetch('http://127.0.0.1:3001/v1/models')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.data)) {
          const ids = data.data.map((m: any) => m.id);
          setAvailableCombos((prev) => Array.from(new Set([...prev, ...ids])));
        }
      })
      .catch(() => {});
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handle1ClickSyncClaude = async () => {
    setSyncStatus('syncing');
    setSyncMessage('');

    const payload = {
      model: claudePrimaryModel,
      env: {
        ANTHROPIC_BASE_URL: 'http://127.0.0.1:3001',
        ANTHROPIC_AUTH_TOKEN: claudeAuthToken,
        ANTHROPIC_MODEL: claudePrimaryModel,
        ANTHROPIC_DEFAULT_SONNET_MODEL: claudeSonnetModel,
        ANTHROPIC_DEFAULT_OPUS_MODEL: claudeOpusModel,
        ANTHROPIC_DEFAULT_HAIKU_MODEL: claudeHaikuModel,
        CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY: '1',
      },
    };

    try {
      const res = await fetch('http://127.0.0.1:3001/v1/admin/cli-sync/claude-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': 'routenex-admin' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setSyncStatus('success');
        setSyncMessage(data.message || 'Successfully synced to ~/.claude/settings.json (backed up original)');
      } else {
        const err = await res.json().catch(() => ({}));
        setSyncStatus('error');
        setSyncMessage(err.error || 'Failed to sync settings. Ensure RouteNex gateway is running.');
      }
    } catch {
      setSyncStatus('error');
      setSyncMessage('Gateway unreachable on http://127.0.0.1:3001. Start RouteNex first.');
    }

    setTimeout(() => {
      setSyncStatus('idle');
    }, 4000);
  };

  const claudeSettingsPreview = JSON.stringify(
    {
      $schema: 'https://json.schemastore.org/claude-code-settings.json',
      model: claudePrimaryModel,
      env: {
        ANTHROPIC_BASE_URL: 'http://127.0.0.1:3001',
        ANTHROPIC_AUTH_TOKEN: claudeAuthToken,
        ANTHROPIC_MODEL: claudePrimaryModel,
        ANTHROPIC_DEFAULT_SONNET_MODEL: claudeSonnetModel,
        ANTHROPIC_DEFAULT_OPUS_MODEL: claudeOpusModel,
        ANTHROPIC_DEFAULT_HAIKU_MODEL: claudeHaikuModel,
        CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY: '1',
      },
    },
    null,
    2
  );

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="rounded-lg border border-hairline bg-elevated p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-ink">Coding Agent & Tool Integration Hub</h3>
            <span className="rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-2 py-0.5 text-[11px] font-mono">
              Anthropic & OpenAI Compatible
            </span>
          </div>
          <p className="mt-1 text-xs text-mute max-w-2xl leading-relaxed">
            RouteNex functions as a 100% drop-in proxy for all modern developer coding agents. Configure your agent’s Base URL to <code className="text-ink font-mono bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">http://127.0.0.1:3001</code> to unlock zero-cost free-tier token pools, multi-provider failover, and local telemetry.
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
      <div className="flex space-x-2 overflow-x-auto pb-1 text-xs font-sans">
        {[
          { id: 'claudecode', label: 'Claude Code CLI' },
          { id: 'cursor', label: 'Cursor IDE' },
          { id: 'cline', label: 'Cline (VS Code)' },
          { id: 'aider', label: 'Aider CLI' },
          { id: 'python', label: 'Python SDK' },
          { id: 'node', label: 'Node.js / TS' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedAgent(tab.id as AgentType)}
            className={`px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 whitespace-nowrap ${
              selectedAgent === tab.id
                ? 'bg-zinc-100 dark:bg-white !text-zinc-950 font-semibold border-zinc-200 dark:border-white shadow-xs'
                : 'bg-elevated text-mute border-hairline hover:text-ink hover:border-neutral-400'
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Guide Content Card */}
      <div className="rounded-lg border border-hairline bg-elevated p-6 space-y-6">
        {/* 1. Claude Code CLI */}
        {selectedAgent === 'claudecode' && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-ink">Connect Claude Code CLI</h4>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono px-2 py-0.5">
                  100% Native Tool Calling & Streaming
                </span>
              </div>
              <p className="mt-1 text-xs text-mute">
                Run Anthropic's official Claude Code CLI terminal assistant through RouteNex free-tier pools, custom Combos, or autonomous NexWorkers.
              </p>
            </div>

            {/* Interactive Claude Code Configuration Controls */}
            <div className="rounded-lg border border-hairline bg-canvas p-5 space-y-4">
              <h5 className="text-xs font-semibold text-ink font-mono uppercase tracking-wider">
                Interactive ~/.claude/settings.json Builder
              </h5>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {/* Virtual Key */}
                <div>
                  <label className="block text-mute font-mono text-[11px] mb-1">Virtual API Key (ANTHROPIC_AUTH_TOKEN)</label>
                  <select
                    value={claudeAuthToken}
                    onChange={(e) => setClaudeAuthToken(e.target.value)}
                    className="w-full rounded border border-hairline bg-elevated px-2.5 py-1.5 font-mono text-ink text-xs focus:outline-none"
                  >
                    {availableKeys.map((k) => (
                      <option key={k.id} value={k.key}>
                        {k.name} ({k.key.slice(0, 12)}...)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Primary Model */}
                <div>
                  <label className="block text-mute font-mono text-[11px] mb-1">Primary Model / Combo (ANTHROPIC_MODEL)</label>
                  <select
                    value={claudePrimaryModel}
                    onChange={(e) => setClaudePrimaryModel(e.target.value)}
                    className="w-full rounded border border-hairline bg-elevated px-2.5 py-1.5 font-mono text-ink text-xs focus:outline-none"
                  >
                    {availableCombos.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sonnet Tier Mapping */}
                <div>
                  <label className="block text-mute font-mono text-[11px] mb-1">Sonnet Tier (Coding / Agent Workflows)</label>
                  <select
                    value={claudeSonnetModel}
                    onChange={(e) => setClaudeSonnetModel(e.target.value)}
                    className="w-full rounded border border-hairline bg-elevated px-2.5 py-1.5 font-mono text-ink text-xs focus:outline-none"
                  >
                    {availableCombos.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Opus Tier Mapping */}
                <div>
                  <label className="block text-mute font-mono text-[11px] mb-1">Opus Tier (Deep Reasoning / Architecture)</label>
                  <select
                    value={claudeOpusModel}
                    onChange={(e) => setClaudeOpusModel(e.target.value)}
                    className="w-full rounded border border-hairline bg-elevated px-2.5 py-1.5 font-mono text-ink text-xs focus:outline-none"
                  >
                    {availableCombos.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Haiku Tier Mapping */}
                <div>
                  <label className="block text-mute font-mono text-[11px] mb-1">Haiku Tier (Fast Summaries & Diagnostics)</label>
                  <select
                    value={claudeHaikuModel}
                    onChange={(e) => setClaudeHaikuModel(e.target.value)}
                    className="w-full rounded border border-hairline bg-elevated px-2.5 py-1.5 font-mono text-ink text-xs focus:outline-none"
                  >
                    {availableCombos.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 1-Click Sync CTA */}
                <div className="flex flex-col justify-end">
                  <button
                    type="button"
                    onClick={handle1ClickSyncClaude}
                    disabled={syncStatus === 'syncing'}
                    className="w-full rounded bg-sky-500 hover:bg-sky-400 text-zinc-950 font-semibold text-xs py-2 px-3 transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {syncStatus === 'syncing' ? (
                      'Syncing...'
                    ) : syncStatus === 'success' ? (
                      '✓ Synced to ~/.claude/settings.json'
                    ) : (
                      '⚡ 1-Click Sync to ~/.claude/settings.json'
                    )}
                  </button>
                </div>
              </div>

              {syncMessage && (
                <div className={`text-xs font-mono px-3.5 py-2.5 rounded-lg flex items-center justify-between ${
                  syncStatus !== 'error' ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border border-red-500/30 bg-red-500/10 text-red-300'
                }`}>
                  <span>{syncMessage}</span>
                  {syncStatus !== 'error' && (
                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">Active</span>
                  )}
                </div>
              )}
            </div>

            {/* Generated JSON Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-mute">Preview ~/.claude/settings.json</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(claudeSettingsPreview, 'claude_json')}
                  className="text-xs font-mono text-sky-400 hover:text-sky-300 transition"
                >
                  {copiedKey === 'claude_json' ? '✓ Copied' : 'Copy JSON'}
                </button>
              </div>
              <pre className="rounded-lg bg-neutral-900 p-4 font-mono text-xs text-neutral-200 overflow-x-auto leading-relaxed border border-hairline">
                <code>{claudeSettingsPreview}</code>
              </pre>
            </div>

            {/* Shell Export Alternative */}
            <div className="space-y-2">
              <span className="font-mono text-xs text-mute block">Or run directly in your terminal:</span>
              <div className="relative rounded-lg bg-neutral-900 p-4 font-mono text-xs text-neutral-200 overflow-x-auto space-y-1 border border-hairline">
                <div>export ANTHROPIC_BASE_URL="http://127.0.0.1:3001"</div>
                <div>export ANTHROPIC_AUTH_TOKEN="{claudeAuthToken}"</div>
                <div>export CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY="1"</div>
                <div className="text-emerald-400">claude --model {claudePrimaryModel}</div>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `export ANTHROPIC_BASE_URL="http://127.0.0.1:3001"\nexport ANTHROPIC_AUTH_TOKEN="${claudeAuthToken}"\nexport CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY="1"\nclaude --model ${claudePrimaryModel}`,
                      'claude_shell'
                    )
                  }
                  className="absolute top-3 right-3 rounded bg-neutral-800 px-2 py-1 text-[11px] text-mute hover:text-white transition"
                >
                  {copiedKey === 'claude_shell' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 leading-relaxed space-y-2">
              <div>
                <span className="text-sky-400 font-semibold">Note on ANTHROPIC_BASE_URL:</span> Claude Code automatically appends <code className="bg-zinc-800 text-zinc-100 px-1.5 py-0.5 rounded font-mono">/v1/messages</code>. Leaving the base URL as strictly <code className="bg-zinc-800 text-zinc-100 px-1.5 py-0.5 rounded font-mono">http://127.0.0.1:3001</code> guarantees reliable routing without URL doubling.
              </div>
              <div>
                <span className="text-sky-400 font-semibold">CLI Shortcut:</span> You can also run <code className="bg-zinc-800 text-zinc-100 px-1.5 py-0.5 rounded font-mono">routenex setup-claude</code> from your terminal to sync this configuration instantly.
              </div>
            </div>
          </div>
        )}

        {/* 2. Cursor IDE */}
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
                  <span>http://127.0.0.1:3001/v1</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('http://127.0.0.1:3001/v1', 'cursor_base')}
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
                  <span className="font-semibold text-ink font-mono">http://127.0.0.1:3001/v1</span>
                </div>

                <div className="p-3 rounded-lg bg-canvas border border-hairline">
                  <span className="text-mute block font-mono">API Key:</span>
                  <span className="font-semibold text-ink font-mono">rn-local-dev-default</span>
                </div>

                <div className="p-3 rounded-lg bg-canvas border border-hairline">
                  <span className="text-mute block font-mono">Model ID:</span>
                  <span className="font-semibold text-ink font-mono">combo/coding-power</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Aider CLI */}
        {selectedAgent === 'aider' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-ink">Connect Aider Pair Programmer</h4>
              <p className="mt-1 text-xs text-mute">
                Command-line AI pair programmer in your terminal with Git integration.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-body">Run Aider with RouteNex using standard OpenAI environment variables:</p>
              <div className="relative rounded-lg bg-neutral-900 p-4 font-mono text-xs text-neutral-200 overflow-x-auto space-y-1">
                <div>export OPENAI_API_BASE="http://127.0.0.1:3001/v1"</div>
                <div>export OPENAI_API_KEY="rn-local-dev-default"</div>
                <div className="text-emerald-400">aider --model openai/combo/coding-power</div>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      'export OPENAI_API_BASE="http://127.0.0.1:3001/v1"\nexport OPENAI_API_KEY="rn-local-dev-default"\naider --model openai/combo/coding-power',
                      'aider'
                    )
                  }
                  className="absolute top-3 right-3 rounded bg-neutral-800 px-2 py-1 text-[11px] text-mute hover:text-white transition"
                >
                  {copiedKey === 'aider' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. Python SDK */}
        {selectedAgent === 'python' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-ink">Python Integration (OpenAI SDK)</h4>
              <p className="mt-1 text-xs text-mute">
                Drop RouteNex into standard Python AI pipelines (LangChain, LlamaIndex, LiteLLM).
              </p>
            </div>

            <pre className="rounded-lg bg-neutral-900 p-4 font-mono text-xs text-neutral-200 overflow-x-auto leading-relaxed">
              <code>{`from openai import OpenAI

client = OpenAI(
    base_url="http://127.0.0.1:3001/v1",
    api_key="rn-local-dev-default"
)

response = client.chat.completions.create(
    model="combo/free-unlimited",
    messages=[{"role": "user", "content": "Hello from RouteNex Python SDK!"}]
)

print(response.choices[0].message.content)`}</code>
            </pre>
          </div>
        )}

        {/* 6. Node.js / TS */}
        {selectedAgent === 'node' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-ink">Node.js / TypeScript Integration</h4>
              <p className="mt-1 text-xs text-mute">
                Use RouteNex with the official OpenAI Node SDK.
              </p>
            </div>

            <pre className="rounded-lg bg-neutral-900 p-4 font-mono text-xs text-neutral-200 overflow-x-auto leading-relaxed">
              <code>{`import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://127.0.0.1:3001/v1',
  apiKey: 'rn-local-dev-default',
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: 'combo/coding-power',
    messages: [{ role: 'user', content: 'Explain quantum computing in one sentence.' }],
  });

  console.log(completion.choices[0].message.content);
}

main();`}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

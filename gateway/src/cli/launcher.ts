import { spawn } from 'node:child_process';
import readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
import { handleMcpJsonRpc } from '../routes/mcp.js';
import type { RoutingEngine } from '../router/engine.js';
import type { ProviderRegistry } from '../providers/registry.js';
import type { CircuitBreaker } from '../router/circuit-breaker.js';
import type { AdminStore } from '../storage/admin-store.js';

export interface RunAgentOptions {
  agent: string;
  model?: string;
  gatewayUrl?: string;
  apiKey?: string;
  extraArgs?: string[];
}

/**
 * Spawns a coding agent CLI tool with RouteNex environment variables injected per-process.
 * Never modifies or overwrites the user's global dotfiles (~/.bashrc, ~/.zshrc, etc.).
 */
export async function runAgent(options: RunAgentOptions): Promise<void> {
  const { agent, model = 'auto', gatewayUrl = 'http://127.0.0.1:3001', apiKey = 'rn-local-dev-default', extraArgs = [] } = options;

  const openaiBaseUrl = `${gatewayUrl.replace(/\/+$/, '')}/v1`;
  const anthropicBaseUrl = gatewayUrl.replace(/\/+$/, '');

  const injectedEnv: NodeJS.ProcessEnv = {
    ...process.env,
    OPENAI_BASE_URL: openaiBaseUrl,
    OPENAI_API_BASE: openaiBaseUrl,
    OPENAI_API_KEY: apiKey,
    ANTHROPIC_BASE_URL: anthropicBaseUrl,
    ANTHROPIC_API_KEY: apiKey,
    ROUTENEX_TARGET_MODEL: model,
  };

  console.log(`\x1b[36m⚡ RouteNex Agent Launcher\x1b[0m`);
  console.log(`  • Target Agent:   \x1b[1m${agent}\x1b[0m`);
  console.log(`  • Model Slug:     \x1b[33m${model}\x1b[0m`);
  console.log(`  • OpenAI Base:    ${openaiBaseUrl}`);
  console.log(`  • Anthropic Base: ${anthropicBaseUrl}`);
  console.log(`  • Scoped Key:     \x1b[32m${apiKey}\x1b[0m (isolated per-process)\n`);

  let binary = agent;
  let cmdArgs = [...extraArgs];

  if (agent === 'claude') {
    binary = 'claude';
  } else if (agent === 'aider') {
    binary = 'aider';
    if (!cmdArgs.includes('--openai-api-base')) {
      cmdArgs.push('--openai-api-base', openaiBaseUrl);
    }
    if (!cmdArgs.includes('--model')) {
      cmdArgs.push('--model', `openai/${model}`);
    }
  } else if (agent === 'cursor') {
    binary = 'cursor';
  } else if (agent === 'cline') {
    binary = 'code';
  } else if (agent === 'codex' || agent === 'opencode') {
    binary = agent;
  }

  const child = spawn(binary, cmdArgs, {
    stdio: 'inherit',
    env: injectedEnv,
    shell: true,
  });

  child.on('error', (err) => {
    console.error(`\x1b[31mError launching agent '${agent}': ${err.message}\x1b[0m`);
    console.log(`Make sure '${agent}' is installed in your PATH or run: routenex configure ${agent}`);
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

/**
 * Displays interactive configuration guides for coding agents and IDEs.
 */
export function configureAgent(tool: string): void {
  const toolName = tool.toLowerCase().trim();

  console.log(`\n\x1b[36m=== RouteNex Configuration Guide: ${tool.toUpperCase()} ===\x1b[0m\n`);

  switch (toolName) {
    case 'claude':
      console.log(`To configure Claude Code CLI:
  1. Temporary session:
     export ANTHROPIC_BASE_URL="http://127.0.0.1:3001"
     export ANTHROPIC_API_KEY="rn-local-dev-default"
     claude

  2. Or run directly without modifying environment:
     routenex run claude --model auto`);
      break;

    case 'cursor':
      console.log(`To configure Cursor IDE:
  1. Open Cursor Settings -> Models -> OpenAI API Key
  2. Toggle 'Override OpenAI Base URL' to:
     \x1b[1mhttp://127.0.0.1:3001/v1\x1b[0m
  3. Enter API Key:
     \x1b[32mrn-local-dev-default\x1b[0m
  4. Under 'Model Names', add:
     - auto (smart deterministic routing)
     - combo/free-unlimited (zero-cost pool)
     - groq/llama-3.3-70b-versatile`);
      break;

    case 'cline':
      console.log(`To configure Cline in VS Code:
  1. Click Cline Settings Gear icon in the sidebar
  2. Select API Provider: \x1b[1mOpenAI Compatible\x1b[0m
  3. Base URL: \x1b[1mhttp://127.0.0.1:3001/v1\x1b[0m
  4. API Key: \x1b[32mrn-local-dev-default\x1b[0m
  5. Model ID: \x1b[33mauto\x1b[0m or \x1b[33mcombo/coding-power\x1b[0m`);
      break;

    case 'aider':
      console.log(`To run Aider with RouteNex:
  routenex run aider --model auto
  
  Or manually:
  aider --openai-api-base http://127.0.0.1:3001/v1 --openai-api-key rn-local-dev-default --model openai/auto`);
      break;

    case 'codex':
    case 'opencode':
      console.log(`To run ${tool}:
  OPENAI_BASE_URL=http://127.0.0.1:3001/v1 OPENAI_API_KEY=rn-local-dev-default ${tool}`);
      break;

    default:
      console.log(`Supported tools: claude, cursor, cline, aider, codex, opencode
Usage: routenex configure <tool>`);
      break;
  }
  console.log();
}

/**
 * Connects to a remote RouteNex instance and stores the session token.
 */
export async function connectRemote(remoteUrl: string, token?: string): Promise<void> {
  const normalizedUrl = remoteUrl.replace(/\/+$/, '');
  console.log(`Connecting to remote RouteNex instance at \x1b[34m${normalizedUrl}\x1b[0m...`);

  try {
    const res = await fetch(`${normalizedUrl}/health/live`);
    if (!res.ok) {
      console.error(`\x1b[31mFailed to verify remote instance (HTTP ${res.status}).\x1b[0m`);
      process.exit(1);
    }

    const data = (await res.json()) as any;
    const configPath = path.resolve(process.cwd(), 'routenex_remote.json');
    const configContent = {
      remoteUrl: normalizedUrl,
      token: token || process.env.ROUTENEX_REMOTE_TOKEN || 'rn-remote-session-token',
      version: data.version || '1.0.0',
      connectedAt: new Date().toISOString(),
    };

    fs.writeFileSync(configPath, JSON.stringify(configContent, null, 2), 'utf-8');
    console.log(`\x1b[32m✓ Successfully connected to remote RouteNex instance!\x1b[0m`);
    console.log(`  • Remote Host: ${normalizedUrl}`);
    console.log(`  • Edition:     ${data.edition || 'RouteNex'}`);
    console.log(`  • Config saved to ${configPath}\n`);
  } catch (err: any) {
    console.error(`\x1b[31mConnection error: ${err.message}\x1b[0m`);
    process.exit(1);
  }
}

/**
 * Starts RouteNex built-in Model Context Protocol (MCP) server in stdio mode.
 */
export function startMcpStdio(
  engine: RoutingEngine,
  registry: ProviderRegistry,
  circuitBreaker: CircuitBreaker,
  adminStore: AdminStore
): void {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    try {
      const parsed = JSON.parse(trimmed);
      const res = await handleMcpJsonRpc(parsed, engine, registry, circuitBreaker, adminStore);
      if (res) {
        process.stdout.write(JSON.stringify(res) + '\n');
      }
    } catch (err: any) {
      const errRes = {
        jsonrpc: '2.0',
        error: { code: -32700, message: `Parse error: ${err.message}` },
      };
      process.stdout.write(JSON.stringify(errRes) + '\n');
    }
  });
}

#!/usr/bin/env node

/**
 * RouteNex CLI Entrypoint
 * 
 * Commands:
 *   routenex run <claude|cursor|cline|aider|codex|opencode> [--model <slug>]
 *   routenex configure <tool>
 *   routenex connect <remote-url> [token]
 *   routenex --mcp
 *   routenex [options] (starts gateway server)
 */

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8')
);

const args = process.argv.slice(2);
const launcherModulePath = path.resolve(__dirname, '../gateway/dist/cli/launcher.js');
const serverModulePath = path.resolve(__dirname, '../gateway/dist/server.js');
const launcherModuleUrl = pathToFileURL(launcherModulePath).href;
const serverModuleUrl = pathToFileURL(serverModulePath).href;

// 1. Stdout-clean MCP stdio mode (do not pollute stdout with banners)
if (args.includes('--mcp')) {
  if (!fs.existsSync(serverModulePath) || !fs.existsSync(launcherModulePath)) {
    process.stderr.write('Error: Gateway build not found. Run "npm run build" first.\n');
    process.exit(1);
  }

  const { createApp } = await import(serverModuleUrl);
  const { startMcpStdio } = await import(launcherModuleUrl);
  const { engine, registry, circuitBreaker, adminStore } = createApp();

  process.stderr.write(`RouteNex MCP Server v${pkg.version} listening on stdio (5 tools available)\n`);
  startMcpStdio(engine, registry, circuitBreaker, adminStore);
  // Keep process alive for stdio stream
} else if (args[0] === 'run') {
  // 2. One-Command Agent Launcher
  const agent = args[1];
  if (!agent) {
    console.error('\x1b[31mError: Target agent required.\x1b[0m');
    console.log('Usage: routenex run <claude|codex|cursor|cline|aider|opencode> [--model <slug>]');
    process.exit(1);
  }

  let model = 'auto';
  const modelIdx = args.findIndex((a) => a === '--model' || a === '-m');
  if (modelIdx !== -1 && args[modelIdx + 1]) {
    model = args[modelIdx + 1];
  }

  const extraArgs = args.slice(2).filter((a, i, arr) => {
    if (a === '--model' || a === '-m') return false;
    if (i > 0 && (arr[i - 1] === '--model' || arr[i - 1] === '-m')) return false;
    return true;
  });

  const { runAgent } = await import(launcherModuleUrl);
  await runAgent({
    agent,
    model,
    gatewayUrl: process.env.ROUTENEX_BASE_URL || 'http://127.0.0.1:3001',
    apiKey: process.env.ROUTENEX_API_KEY || 'rn-local-dev-default',
    extraArgs,
  });
} else if (args[0] === 'configure') {
  // 3. Interactive Agent Configuration
  const tool = args[1] || 'help';
  const { configureAgent } = await import(launcherModuleUrl);
  configureAgent(tool);
} else if (args[0] === 'connect') {
  // 4. Remote RouteNex Instance Connect
  const remoteUrl = args[1];
  if (!remoteUrl) {
    console.error('\x1b[31mError: Remote URL required.\x1b[0m');
    console.log('Usage: routenex connect <remote-url> [token]');
    process.exit(1);
  }
  const token = args[2];
  const { connectRemote } = await import(launcherModuleUrl);
  await connectRemote(remoteUrl, token);
} else if (args[0] === 'login') {
  // 5. Open Source Local Login / Browser Launcher
  const { loginLocal } = await import(launcherModuleUrl);
  const port = Number(process.env.ROUTENEX_PORT) || 3001;
  const token = args[1] || process.env.ROUTENEX_ADMIN_TOKEN;
  await loginLocal(port, token);
} else if (args[0] === 'auth' && args[1] === 'login') {
  // 6. Provider OAuth Login
  const provider = args[2];
  if (!provider) {
    console.error('\x1b[31mError: Provider required.\x1b[0m');
    console.log('Usage: routenex auth login <openrouter|google|github|antigravity|kimi|amazonq|claude>');
    process.exit(1);
  }
  const { loginOAuthProvider } = await import(launcherModuleUrl);
  const port = Number(process.env.ROUTENEX_PORT) || 3001;
  await loginOAuthProvider(provider, port);
} else if (args[0] === 'cloud' && args[1] === 'login') {
  // 7. RouteNex Cloud Supabase Login
  const { loginCloud } = await import(launcherModuleUrl);
  await loginCloud(args[2]);
} else if (args.includes('--help') || args.includes('-h')) {
  // 8. Help banner
  console.log(`
RouteNex v${pkg.version} — High-Performance AI Router & Agent Gateway

Usage:
  routenex [options]                                Start the gateway server
  routenex login [token]                            Launch local dashboard with zero cloud login
  routenex auth login <provider>                    Connect OAuth provider in Chrome/Edge
  routenex cloud login [url]                        Sign in to RouteNex Cloud Edition (Supabase)
  routenex run <agent> [--model <slug>]             Spawn agent with RouteNex injected per-process
  routenex configure <tool>                         Interactive config guide (claude, cursor, cline, aider)
  routenex connect <remote-url> [token]             Drive remote RouteNex instance with scoped token
  routenex --mcp                                    Launch built-in MCP server in stdio mode

Agent Launcher Examples:
  routenex run claude --model auto
  routenex run aider --model combo/coding-power
  routenex run cursor
  routenex run cline

Server Options:
  --port, -p <number>    Port to listen on (default: 3001 or ROUTENEX_PORT)
  --host <string>        Host address to bind to (default: 127.0.0.1)
  --api-key <string>     Master gateway key required for auth (optional)
  --no-open              Do not automatically launch Chrome/Edge on startup
  --version, -v          Print RouteNex version and exit
  --help, -h             Show this help screen
`);
  process.exit(0);
} else if (args.includes('--version') || args.includes('-v')) {
  console.log(`RouteNex v${pkg.version}`);
  process.exit(0);
} else {
  // 9. Default Server Mode
  console.log(`
  \x1b[36m____             _       _   _\x1b[0m           
 \x1b[36m|  _ \\ ___  _   _| |_ ___| \\ | | _____  __\x1b[0m
 \x1b[36m| |_) / _ \\| | | | __/ _ \\  \\| |/ _ \\ \\/ /\x1b[0m
 \x1b[36m|  _ < (_) | |_| | ||  __/ |\\  |  __/>  < \x1b[0m
 \x1b[36m|_| \\_\\___/ \\__,_|\\__\\___|_| \\_|\\___/_/\\_\\\x1b[0m
 \x1b[2mOpen-Source AI Gateway • MIT Licensed • v${pkg.version}\x1b[0m
`);

  let port = Number(process.env.ROUTENEX_PORT) || 3001;
  const portIdx = args.findIndex((a) => a === '--port' || a === '-p');
  if (portIdx !== -1 && args[portIdx + 1]) {
    port = Number(args[portIdx + 1]);
  }

  let host = process.env.ROUTENEX_HOST || '127.0.0.1';
  const hostIdx = args.indexOf('--host');
  if (hostIdx !== -1 && args[hostIdx + 1]) {
    host = args[hostIdx + 1];
  }

  if (!fs.existsSync(serverModulePath)) {
    console.error('\x1b[31mError: Gateway build not found. Please run "npm run build" first.\x1b[0m');
    process.exit(1);
  }

  const { startServer } = await import(serverModuleUrl);

  const serverInstance = startServer({
    port,
    host,
    apiKey: process.env.ROUTENEX_API_KEY,
    mockMode: true,
    groqApiKey: process.env.GROQ_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    mistralApiKey: process.env.MISTRAL_API_KEY,
    siliconflowApiKey: process.env.SILICONFLOW_API_KEY,
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
    logPrompts: false,
    dbPath: './routenex.json',
    maxRetries: 2,
    timeoutMs: 60000,
    defaultStrategy: 'balanced',
    rateLimitRpm: 120,
    persistenceEnabled: true,
  });

  const setupToken = `rn_local_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  if (serverInstance && serverInstance.adminStore) {
    serverInstance.adminStore.setAdminToken?.(setupToken);
  }

  const autoLoginUrl = `http://${host}:${port}/dashboard?auto_token=${setupToken}`;

  console.log(`\x1b[35m┌────────────────────────────────────────────────────────────────────────┐\x1b[0m`);
  console.log(`\x1b[35m│\x1b[0m  \x1b[1m\x1b[35m✨ RouteNex Open-Source Local Setup (Zero Cloud Login)\x1b[0m                 \x1b[35m│\x1b[0m`);
  console.log(`\x1b[35m│\x1b[0m  Token: \x1b[33m${setupToken}\x1b[0m                           \x1b[35m│\x1b[0m`);
  console.log(`\x1b[35m│\x1b[0m  URL:   \x1b[36m${autoLoginUrl}\x1b[0m     \x1b[35m│\x1b[0m`);
  console.log(`\x1b[35m│\x1b[0m  Zero Cloud Auth Required • 100% Offline & Self-Hosted                 \x1b[35m│\x1b[0m`);
  console.log(`\x1b[35m└────────────────────────────────────────────────────────────────────────┘\x1b[0m\n`);

  console.log(`\x1b[32m✔ Gateway Ready for Coding Agents & Client Applications:\x1b[0m`);
  console.log(`  • Web Dashboard: \x1b[1m\x1b[34mhttp://${host}:${port}/dashboard\x1b[0m (100% Offline Standalone)`);
  console.log(`  • Base URL:      \x1b[1mhttp://${host}:${port}/v1\x1b[0m`);
  console.log(`  • MCP Endpoint:  \x1b[1mhttp://${host}:${port}/v1/mcp\x1b[0m`);
  console.log(`  • Health Check:  http://${host}:${port}/health/live`);
  console.log(`  • Model Catalog: http://${host}:${port}/v1/models`);
  console.log(`  • Virtual Key:   \x1b[33mrn-local-dev-default\x1b[0m`);
  console.log(`  • Free Pools:    Pollinations (Zero-Key), Mistral (1B Tokens/mo), Cerebras (1M/day)`);
  console.log(`  • Free Combos:   combo/free-unlimited, combo/coding-power`);
  console.log(`\n\x1b[2mPress Ctrl+C to terminate gateway.\x1b[0m\n`);

  const shouldOpen = !args.includes('--no-open') && process.env.ROUTENEX_NO_OPEN !== 'true';
  if (shouldOpen) {
    const { openBrowser } = await import(pathToFileURL(path.resolve(__dirname, '../gateway/dist/cli/open-browser.js')).href).catch(() => ({ openBrowser: null }));
    if (openBrowser) {
      openBrowser(autoLoginUrl).catch(() => {});
    }
  }
}

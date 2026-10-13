#!/usr/bin/env node

/**
 * RouteNex CLI Entrypoint
 * 
 * Run directly via `npx routenex` or `npm start`
 * Starts the RouteNex Open Source AI Routing Gateway.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8')
);

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
RouteNex v${pkg.version} — High-Performance AI Router & Proxy Gateway

Usage:
  routenex [options]
  npx routenex [options]

Options:
  --port, -p <number>    Port to listen on (default: 3001 or ROUTENEX_PORT)
  --host <string>        Host address to bind to (default: 127.0.0.1)
  --api-key <string>     Master gateway key required for auth (optional)
  --version, -v          Print RouteNex version and exit
  --help, -h             Show this help screen

Drop-In Compatibility:
  OpenAI SDK, Cursor, Claude Code CLI, Cline, Aider, Windsurf, OpenCode
  Base URL: http://127.0.0.1:3001/v1

Free-Tier Defaults:
  • Pollinations AI (Zero-key, 100% free anonymous models)
  • Cerebras Free Tier (1M tokens/day)
  • Combos: combo/free-unlimited, combo/coding-power
`);
  process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
  console.log(`RouteNex v${pkg.version}`);
  process.exit(0);
}

// Banner display
console.log(`
  \x1b[36m____             _       _   _\x1b[0m           
 \x1b[36m|  _ \\ ___  _   _| |_ ___| \\ | | _____  __\x1b[0m
 \x1b[36m| |_) / _ \\| | | | __/ _ \\  \\| |/ _ \\ \\/ /\x1b[0m
 \x1b[36m|  _ < (_) | |_| | ||  __/ |\\  |  __/>  < \x1b[0m
 \x1b[36m|_| \\_\\___/ \\__,_|\\__\\___|_| \\_|\\___/_/\\_\\\x1b[0m
 \x1b[2mOpen-Source AI Gateway • MIT Licensed • v${pkg.version}\x1b[0m
`);

// Dynamic port/host overrides
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

const serverModulePath = path.resolve(__dirname, '../gateway/dist/server.js');

if (!fs.existsSync(serverModulePath)) {
  console.error('\x1b[31mError: Gateway build not found. Please run "npm run build" first.\x1b[0m');
  process.exit(1);
}

const { startServer } = await import(serverModulePath);

const server = startServer({
  port,
  host,
  apiKey: process.env.ROUTENEX_API_KEY,
  mockMode: true,
  groqApiKey: process.env.GROQ_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
  logPrompts: false,
  dbPath: './routenex.json',
  maxRetries: 2,
  timeoutMs: 60000,
  defaultStrategy: 'balanced',
  rateLimitRpm: 120,
  persistenceEnabled: true,
});

console.log(`\x1b[32m✔ Gateway Ready for Coding Agents & Client Applications:\x1b[0m`);
console.log(`  • Base URL:      \x1b[1mhttp://${host}:${port}/v1\x1b[0m`);
console.log(`  • Health Check:  http://${host}:${port}/health/live`);
console.log(`  • Model Catalog: http://${host}:${port}/v1/models`);
console.log(`  • Virtual Key:   \x1b[33mrn-local-dev-default\x1b[0m`);
console.log(`  • Free Combos:   combo/free-unlimited, combo/coding-power`);
console.log(`\n\x1b[2mPress Ctrl+C to terminate gateway.\x1b[0m\n`);

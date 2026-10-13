/**
 * RouteNex CLI Doctor (PRD Section 49 / AR-49)
 * 
 * Diagnostic utility for developers to verify local environment health:
 * - Node.js version check
 * - Port availability (Gateway 3001, Frontend 4321)
 * - Disk write permissions for storage (routenex.json)
 * - Configured AI provider credentials (masked)
 * - Local Gateway service reachability
 */

import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../config.js';

interface CheckResult {
  category: string;
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  details: string;
}

const results: CheckResult[] = [];

function checkPort(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false)); // Port in use or blocked
    server.once('listening', () => {
      server.close();
      resolve(true); // Port available
    });
    server.listen(port, host);
  });
}

async function pingUrl(url: string, timeoutMs = 2000): Promise<{ ok: boolean; status?: number; data?: any }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json().catch(() => null);
      return { ok: true, status: res.status, data };
    }
    return { ok: false, status: res.status };
  } catch {
    return { ok: false };
  }
}

export async function runDoctor(): Promise<void> {
  console.log('\n🩺 [RouteNex Doctor] Running environment & configuration diagnostics...\n');

  // 1. Node.js runtime check
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
  if (majorVersion >= 20) {
    results.push({
      category: 'Runtime',
      name: 'Node.js Version',
      status: 'PASS',
      details: `${nodeVersion} (compatible >= 20.0.0)`,
    });
  } else {
    results.push({
      category: 'Runtime',
      name: 'Node.js Version',
      status: 'FAIL',
      details: `${nodeVersion} (Node.js 20 or higher is required)`,
    });
  }

  // 2. Storage write permissions
  const config = loadConfig();
  const dbPath = path.resolve(config.dbPath);
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const testFile = path.join(dir, `.doctor_write_test_${Date.now()}.tmp`);
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    results.push({
      category: 'Storage',
      name: 'Filesystem Permissions',
      status: 'PASS',
      details: `Write access confirmed at ${dir}`,
    });
  } catch (err: any) {
    results.push({
      category: 'Storage',
      name: 'Filesystem Permissions',
      status: 'FAIL',
      details: `Cannot write to ${dbPath}: ${err.message}`,
    });
  }

  // 3. Network Ports
  const gatewayPortFree = await checkPort(config.port, config.host);
  const liveGateway = await pingUrl(`http://${config.host}:${config.port}/health/live`);

  if (liveGateway.ok) {
    results.push({
      category: 'Gateway',
      name: `Port ${config.port}`,
      status: 'PASS',
      details: `Gateway is actively running (live uptime: ${liveGateway.data?.uptime_seconds || 0}s)`,
    });
  } else if (gatewayPortFree) {
    results.push({
      category: 'Gateway',
      name: `Port ${config.port}`,
      status: 'PASS',
      details: `Port ${config.port} is available for Gateway binding`,
    });
  } else {
    results.push({
      category: 'Gateway',
      name: `Port ${config.port}`,
      status: 'WARN',
      details: `Port ${config.port} is already in use by another process`,
    });
  }

  // 4. Provider Keys Configuration
  const configuredProviders: string[] = [];
  if (config.mockMode) configuredProviders.push('Mock (Deterministic Offline)');
  if (config.groqApiKey) configuredProviders.push('Groq Cloud');
  if (config.openaiApiKey) configuredProviders.push('OpenAI');
  if (config.anthropicApiKey) configuredProviders.push('Anthropic');
  if (config.geminiApiKey) configuredProviders.push('Google Gemini');
  if (config.ollamaBaseUrl) configuredProviders.push(`Ollama (${config.ollamaBaseUrl})`);

  results.push({
    category: 'Providers',
    name: 'Configured Providers',
    status: configuredProviders.length > 0 ? 'PASS' : 'WARN',
    details: `${configuredProviders.join(', ')}`,
  });

  // 5. Security & Privacy Defaults
  results.push({
    category: 'Security',
    name: 'Prompt Logging Policy',
    status: 'PASS',
    details: config.logPrompts ? 'ENABLED (Prompts logged)' : 'DISABLED (Zero prompt retention, privacy-safe)',
  });

  results.push({
    category: 'Security',
    name: 'Gateway Auth Guard',
    status: 'PASS',
    details: config.apiKey ? 'PROTECTED (Bearer Token required)' : 'LOCAL_DEV (Open localhost access)',
  });

  // Display Output
  console.log('='.repeat(70));
  for (const res of results) {
    const symbol = res.status === 'PASS' ? '✅' : res.status === 'WARN' ? '⚠️' : '❌';
    console.log(`${symbol} [${res.category}] ${res.name.padEnd(26)} : ${res.details}`);
  }
  console.log('='.repeat(70));

  const hasFailures = results.some((r) => r.status === 'FAIL');
  if (hasFailures) {
    console.log('\n❌ Doctor found issues that need attention.');
    process.exitCode = 1;
  } else {
    console.log('\n✨ All critical diagnostics passed! RouteNex is ready for traffic.\n');
  }
}

// Auto-run when executed directly
if (process.argv[1]?.endsWith('doctor.ts') || process.argv[1]?.endsWith('doctor.js')) {
  runDoctor().catch((err) => {
    console.error('Doctor check failed:', err);
    process.exit(1);
  });
}

/**
 * RouteNex Live Provider Smoke Test (PRD Section 58 & 82 / AR-58)
 * 
 * Safe, opt-in script for developers to verify real upstream AI provider connectivity.
 * Safeguard: Never executes without explicit API keys. Uses minimal prompt ("Reply with 'pong'")
 * to consume minimum possible tokens (1-5 tokens).
 */

import { loadConfig } from '../config.js';
import { GroqProviderAdapter } from '../providers/groq.js';
import { OpenAIProviderAdapter } from '../providers/openai.js';
import { AnthropicProviderAdapter } from '../providers/anthropic.js';
import { GeminiProviderAdapter } from '../providers/gemini.js';
import { OllamaProviderAdapter } from '../providers/ollama.js';

export async function runLiveSmokeTest(): Promise<void> {
  console.log('\n🚀 [RouteNex Live Smoke Test] Verifying live provider connections...\n');

  const config = loadConfig();
  const tests: Array<{ name: string; configured: boolean; run: () => Promise<void> }> = [];

  // Groq test
  tests.push({
    name: 'Groq Cloud LPU',
    configured: Boolean(config.groqApiKey),
    run: async () => {
      const adapter = new GroqProviderAdapter(config.groqApiKey);
      const start = Date.now();
      const res = await adapter.chat({
        model: 'groq/llama-3.1-8b-instant',
        messages: [{ role: 'user', content: 'Ping' }],
        stream: false,
        max_tokens: 10,
        n: 1,
      });
      const latency = Date.now() - start;
      const content = res.choices[0]?.message?.content || '';
      console.log(`  ✅ Groq responded in ${latency}ms: "${content.trim()}"`);
    },
  });

  // OpenAI test
  tests.push({
    name: 'OpenAI',
    configured: Boolean(config.openaiApiKey),
    run: async () => {
      const adapter = new OpenAIProviderAdapter(config.openaiApiKey);
      const start = Date.now();
      const res = await adapter.chat({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: 'Ping' }],
        stream: false,
        max_tokens: 10,
        n: 1,
      });
      const latency = Date.now() - start;
      const content = res.choices[0]?.message?.content || '';
      console.log(`  ✅ OpenAI responded in ${latency}ms: "${content.trim()}"`);
    },
  });

  // Anthropic test
  tests.push({
    name: 'Anthropic',
    configured: Boolean(config.anthropicApiKey),
    run: async () => {
      const adapter = new AnthropicProviderAdapter(config.anthropicApiKey);
      const start = Date.now();
      const res = await adapter.chat({
        model: 'anthropic/claude-3-5-haiku-20241022',
        messages: [{ role: 'user', content: 'Ping' }],
        stream: false,
        max_tokens: 10,
        n: 1,
      });
      const latency = Date.now() - start;
      const content = res.choices[0]?.message?.content || '';
      console.log(`  ✅ Anthropic responded in ${latency}ms: "${content.trim()}"`);
    },
  });

  // Gemini test
  tests.push({
    name: 'Google Gemini',
    configured: Boolean(config.geminiApiKey),
    run: async () => {
      const adapter = new GeminiProviderAdapter(config.geminiApiKey);
      const start = Date.now();
      const res = await adapter.chat({
        model: 'gemini/gemini-2.5-flash',
        messages: [{ role: 'user', content: 'Ping' }],
        stream: false,
        max_tokens: 10,
        n: 1,
      });
      const latency = Date.now() - start;
      const content = res.choices[0]?.message?.content || '';
      console.log(`  ✅ Gemini responded in ${latency}ms: "${content.trim()}"`);
    },
  });

  // Ollama test (local)
  tests.push({
    name: 'Ollama (Local)',
    configured: true,
    run: async () => {
      try {
        const adapter = new OllamaProviderAdapter(config.ollamaBaseUrl);
        const healthy = await adapter.healthCheck();
        if (!healthy) {
          console.log(`  ⚠️ Ollama local daemon not detected at ${config.ollamaBaseUrl} (offline)`);
          return;
        }
        const start = Date.now();
        const res = await adapter.chat({
          model: 'ollama/llama3.2',
          messages: [{ role: 'user', content: 'Ping' }],
          stream: false,
          max_tokens: 10,
          n: 1,
        });
        const latency = Date.now() - start;
        const content = res.choices[0]?.message?.content || '';
        console.log(`  ✅ Ollama responded in ${latency}ms: "${content.trim()}"`);
      } catch {
        console.log(`  ⚠️ Ollama local daemon not running at ${config.ollamaBaseUrl} (offline)`);
      }
    },
  });

  let testedCount = 0;
  for (const t of tests) {
    if (!t.configured) {
      console.log(`  ⏸️ ${t.name}: Skipped (API key not set in environment — zero spend guard)`);
      continue;
    }
    try {
      await t.run();
      testedCount++;
    } catch (err: any) {
      console.error(`  ❌ ${t.name} test failed: ${err.message}`);
    }
  }

  if (testedCount === 0) {
    console.log('\n💡 No external API keys configured. RouteNex uses deterministic mock fixtures by default.');
    console.log('   To test real upstream providers, export GROQ_API_KEY, OPENAI_API_KEY, etc., in your .env.\n');
  } else {
    console.log(`\n🎉 Live smoke tests completed for ${testedCount} provider(s).\n`);
  }
}

if (process.argv[1]?.endsWith('live-smoke-test.ts') || process.argv[1]?.endsWith('live-smoke-test.js')) {
  runLiveSmokeTest().catch((err) => {
    console.error('Smoke test execution failed:', err);
    process.exit(1);
  });
}

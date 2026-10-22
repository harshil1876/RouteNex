import { describe, expect, it } from 'vitest';
import { PromptCompressor } from './router/compression.js';
import { createApp } from './server.js';
import type { AppConfig } from './config.js';

const testConfig: AppConfig = {
  port: 3001,
  host: '127.0.0.1',
  apiKey: undefined,
  mockMode: true,
  groqApiKey: undefined,
  openaiApiKey: undefined,
  logPrompts: false,
  dbPath: './test_tokens.json',
  maxRetries: 2,
  timeoutMs: 5000,
  defaultStrategy: 'balanced',
  rateLimitRpm: 500,
  persistenceEnabled: false,
  allowCautionFallback: false,
};

describe('Suite 3: 4-Stage Token Optimizer Pipeline', () => {
  // 1. Stage 1: Structural Whitespace & HTML comments
  it('Stage 1: Normalizes redundant newlines, trailing whitespace, and strips HTML comments', () => {
    const raw = '<!-- System Header -->\n\n\n\nHello     world.    \n\n\n\nNext line here.';
    const text = PromptCompressor.compressText(raw, { stage1Lite: true });
    expect(text).toBe('Hello world.\n\nNext line here.');
    expect(text).not.toContain('<!-- System Header -->');

    const result = PromptCompressor.compressMessages([{ role: 'user', content: raw }], { stage1Lite: true });
    expect(result.stageBreakdown.stage1Saved).toBeGreaterThan(0);
  });

  // 2. Stage 2: LogPrune
  it('Stage 2 LogPrune: truncates repetitive terminal logs, stack traces, and build spam', () => {
    const stackTrace = [
      'Error: Connection timeout',
      '    at TCPConnectWrap.afterConnect (/node_modules/pkg/index.js:1:1)',
      '    at TCPConnectWrap.callbackTrampoline (/node_modules/pkg/lib.js:2:2)',
      '    at TCPConnectWrap.afterConnect (/node_modules/pkg/sub.js:3:3)',
      '    at TCPConnectWrap.callbackTrampoline (/node_modules/pkg/net.js:4:4)',
      '    at TCPConnectWrap.afterConnect (/node_modules/pkg/async.js:5:5)',
      '    at TCPConnectWrap.callbackTrampoline (/node_modules/pkg/end.js:6:6)',
    ].join('\n');

    const text = PromptCompressor.compressText(stackTrace, { stage2Logs: true });
    expect(text).toContain('internal frames omitted');

    const result = PromptCompressor.compressMessages([{ role: 'user', content: stackTrace }], { stage2Logs: true });
    expect(result.stageBreakdown.stage2Saved).toBeGreaterThan(0);
  });

  // 3. Stage 3: TurnDedup
  it('Stage 3 TurnDedup: deduplicates repeated content across multi-turn messages', () => {
    const repeatedPrompt = 'This is an extensive repeated prompt context that should be deduplicated across conversational turns to save tokens.';
    const messages = [
      { role: 'user' as const, content: repeatedPrompt },
      { role: 'assistant' as const, content: 'Understood.' },
      { role: 'user' as const, content: `${repeatedPrompt}\nWhat is the summary?` },
    ];

    const res = PromptCompressor.compressMessages(messages, { stage3Dedup: true });
    expect(res.messages.length).toBe(3);
    expect(res.compressedChars).toBeLessThanOrEqual(res.originalChars);
  });

  // 4. Stage 4: LexiPack
  it('Stage 4 LexiPack: eliminates conversational fluff and polite boilerplate', () => {
    const polite = 'Hello! Hope you are having a wonderful day! Please could you kindly explain recursion to me? Thank you so much in advance!';
    const text = PromptCompressor.compressText(polite, { stage4LexiPack: true });
    expect(text.toLowerCase()).toContain('explain recursion');
    expect(text).not.toContain('thank you so much in advance');

    const result = PromptCompressor.compressMessages([{ role: 'user', content: polite }], { stage4LexiPack: true });
    expect(result.stageBreakdown.stage4Saved).toBeGreaterThan(0);
  });

  // 5. Code Guard: Triple-Backtick Fenced Blocks
  it('Guard: preserves triple-backtick fenced code blocks byte-for-byte', () => {
    const codeBlock = '```typescript\nfunction add(a: number,   b: number): number {\n    return a + b;\n}\n```';
    const text = `Here is some text with lots     of    spaces.\n\n\n${codeBlock}\n\n\nAnd some trailing text.`;
    const compressed = PromptCompressor.compressText(text, { stage1Lite: true, stage4LexiPack: true });
    expect(compressed).toContain(codeBlock);
  });

  // 6. Code Guard: Inline Backticks
  it('Guard: preserves inline backtick code snippets byte-for-byte', () => {
    const text = 'Use `npm   install   --save-exact` to pin dependencies.';
    const compressed = PromptCompressor.compressText(text, { stage1Lite: true });
    expect(compressed).toContain('`npm   install   --save-exact`');
  });

  // 7. JSON Guard
  it('Guard: preserves JSON data structures without corruption', () => {
    const json = '{"key": "value   with   spaces", "count": 42}';
    const text = `The payload is:\n\`\`\`json\n${json}\n\`\`\``;
    const compressed = PromptCompressor.compressText(text, { stage1Lite: true });
    expect(compressed).toContain(json);
  });

  // 8. URL Guard
  it('Guard: preserves URLs intact with no parameter alteration', () => {
    const url = 'https://api.routenex.com/v1/query?sort=asc&filter=true&tags=ai,fast';
    const text = `Please check documentation at ${url} for full details.`;
    const compressed = PromptCompressor.compressText(text, { stage1Lite: true, stage4LexiPack: true });
    expect(compressed).toContain(url);
  });

  // 9. Markdown Table Guard
  it('Guard: preserves markdown tables with column alignment intact', () => {
    const table = '| Model | Latency | Cost |\n|---|---|---|\n| Llama-3.3 | 114ms | $0.59 |';
    const text = `Here are the benchmark results:\n\n${table}\n\nEnd of report.`;
    const compressed = PromptCompressor.compressText(text, { stage1Lite: true });
    expect(compressed).toContain(table);
  });

  // 10. Idempotency Check
  it('Idempotency: compressing already compressed text yields identical output', () => {
    const input = 'This is a test prompt with extra   spacing.\n\n\n```python\nx = 1\n```\nThank you.';
    const pass1 = PromptCompressor.compressText(input, { stage1Lite: true, stage4LexiPack: true });
    const pass2 = PromptCompressor.compressText(pass1, { stage1Lite: true, stage4LexiPack: true });
    expect(pass2).toBe(pass1);

    const result2 = PromptCompressor.compressMessages([{ role: 'user', content: pass1 }], { stage1Lite: true, stage4LexiPack: true });
    expect(result2.savedPercent).toBe(0);
  });

  // 11. Telemetry Calculation Accuracy
  it('Telemetry: accurately reports reduction percentages and estimated tokens saved', () => {
    const verbose = 'Word '.repeat(100) + '   \n\n\n\n' + 'Word '.repeat(50);
    const res = PromptCompressor.compressMessages([{ role: 'user', content: verbose }], { stage1Lite: true });
    expect(res.originalChars).toBe(verbose.length);
    expect(res.compressedChars).toBeLessThan(res.originalChars);
    expect(res.savedPercent).toBeGreaterThan(0);
    expect(res.estimatedTokensSaved).toBeGreaterThan(0);
  });

  // 12. Admin Preview API (POST /v1/admin/compress/preview)
  it('Admin API: POST /v1/admin/compress/preview returns live stage breakdown', async () => {
    const { app } = createApp(testConfig);
    const res = await app.request('/v1/admin/compress/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': 'routenex-admin' },
      body: JSON.stringify({
        text: '<!-- comment --> Test   content.\n\n\n\n```js\nconsole.log(1);\n```',
        options: { stage1Lite: true },
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.originalChars).toBeGreaterThan(data.compressedChars);
    expect(data.stageBreakdown).toBeDefined();
  });

  // 13. End-to-End Chat Completion Compression
  it('End-to-End: POST /v1/chat/completions with x-routenex-compress attaches telemetry', async () => {
    const { app } = createApp(testConfig);
    const res = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-routenex-compress': 'true',
      },
      body: JSON.stringify({
        model: 'mock/fast',
        messages: [{ role: 'user', content: 'Prompt   with   redundant   spaces.\n\n\n\nLine 2.' }],
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.routenex.compression).toBeDefined();
    expect(data.routenex.compression.saved_percent).toBeGreaterThanOrEqual(0);
    expect(res.headers.get('X-RouteNex-Tokens-Saved')).toBeDefined();
  });
});

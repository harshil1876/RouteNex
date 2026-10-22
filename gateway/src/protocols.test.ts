import { describe, expect, it } from 'vitest';
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
  dbPath: './test_protocols.json',
  maxRetries: 2,
  timeoutMs: 5000,
  defaultStrategy: 'balanced',
  rateLimitRpm: 500,
  persistenceEnabled: false,
  allowCautionFallback: false,
};

describe('Suite 1: Multi-Protocol Ingress Endpoints', () => {
  const { app } = createApp(testConfig);

  // 1. OpenAI Chat Completions (JSON)
  it('OpenAI Chat: handles JSON completions correctly', async () => {
    const res = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mock/gpt-4',
        messages: [{ role: 'user', content: 'Protocol test JSON' }],
        stream: false,
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toMatch(/^chatcmpl-/);
    expect(data.choices[0].message.role).toBe('assistant');
    expect(data.choices[0].message.content).toContain('Received: "Protocol test JSON"');
    expect(data.usage?.total_tokens).toBeGreaterThan(0);
    expect(res.headers.get('X-RouteNex-Selected-Provider')).toBe('mock');
  });

  // 2. OpenAI Chat Completions (SSE Streaming)
  it('OpenAI Chat: handles SSE streaming completions with [DONE]', async () => {
    const res = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mock/fast',
        messages: [{ role: 'user', content: 'Stream test' }],
        stream: true,
      }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const text = await res.text();
    expect(text).toContain('data:');
    expect(text).toContain('[DONE]');
  });

  // 3. OpenAI Chat Completions with Tools
  it('OpenAI Chat: passes tool calls schema and returns response', async () => {
    const res = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mock/gpt-4',
        messages: [{ role: 'user', content: 'What is the weather in Tokyo?' }],
        tools: [
          {
            type: 'function',
            function: {
              name: 'get_weather',
              description: 'Get weather for location',
              parameters: {
                type: 'object',
                properties: { location: { type: 'string' } },
                required: ['location'],
              },
            },
          },
        ],
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.choices[0].message.content).toBeDefined();
  });

  // 4. OpenAI Responses API
  it('OpenAI Responses API: POST /v1/responses creates completed response', async () => {
    const res = await app.request('/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mock/gpt-4',
        input: 'Test Responses API',
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.object).toBe('response');
    expect(data.status).toBe('completed');
    expect(data.output[0].type).toBe('message');
    expect(data.output[0].content[0].type).toBe('output_text');
    expect(data.usage.total_tokens).toBeGreaterThan(0);
  });

  // 5. OpenAI Embeddings API
  it('OpenAI Embeddings API: POST /v1/embeddings returns 1536-dimensional vectors', async () => {
    const res = await app.request('/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: ['Vector search query 1', 'Vector search query 2'],
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.object).toBe('list');
    expect(data.data.length).toBe(2);
    expect(data.data[0].embedding.length).toBe(1536);
    expect(data.data[1].embedding.length).toBe(1536);
    expect(data.usage.total_tokens).toBeGreaterThan(0);
  });

  // 6. OpenAI Images Generation API
  it('OpenAI Images API: POST /v1/images/generations returns generated images', async () => {
    const res = await app.request('/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Futuristic cyberpunk city with neon routing lights',
        n: 2,
        size: '1024x1024',
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.length).toBe(2);
    expect(data.data[0].url).toContain('https://image.pollinations.ai');
    expect(data.routenex.provider).toBe('pollinations');
  });

  // 7. OpenAI Audio Transcriptions API
  it('OpenAI Audio Transcriptions: POST /v1/audio/transcriptions returns text', async () => {
    const res = await app.request('/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: 'mock-audio.mp3', model: 'whisper-1' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.text).toContain('RouteNex');
    expect(data.routenex.provider).toBe('groq/whisper-large-v3');
  });

  // 8. OpenAI Audio Speech API
  it('OpenAI Audio Speech: POST /v1/audio/speech returns audio stream', async () => {
    const res = await app.request('/v1/audio/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'tts-1',
        input: 'Voice output synthesized by RouteNex.',
        voice: 'alloy',
      }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('audio/mpeg');
    const bytes = await res.arrayBuffer();
    expect(bytes.byteLength).toBeGreaterThan(0);
  });

  // 9. Anthropic Messages API (JSON)
  it('Anthropic Messages API: POST /v1/messages returns message format', async () => {
    const res = await app.request('/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mock/claude',
        messages: [{ role: 'user', content: 'Anthropic protocol verification' }],
        max_tokens: 100,
        stream: false,
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe('message');
    expect(data.role).toBe('assistant');
    expect(data.content[0].type).toBe('text');
    expect(data.content[0].text).toContain('Anthropic protocol verification');
    expect(data.usage.input_tokens).toBeGreaterThan(0);
  });

  // 10. Anthropic Messages API (SSE)
  it('Anthropic Messages API: POST /v1/messages streams in Claude SSE format', async () => {
    const res = await app.request('/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mock/claude',
        messages: [{ role: 'user', content: 'Anthropic streaming verification' }],
        max_tokens: 100,
        stream: true,
      }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const text = await res.text();
    expect(text).toContain('event: message_start');
    expect(text).toContain('event: content_block_start');
    expect(text).toContain('event: content_block_delta');
    expect(text).toContain('event: content_block_stop');
    expect(text).toContain('event: message_stop');
  });

  // 11. Google Gemini API (generateContent)
  it('Google Gemini API: POST /v1beta/models/:model:generateContent returns candidates', async () => {
    const res = await app.request('/v1beta/models/mock/fast:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Gemini format query' }],
          },
        ],
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.candidates).toBeDefined();
    expect(data.candidates[0].content.parts[0].text).toContain('Gemini format query');
    expect(data.candidates[0].finishReason).toBe('STOP');
    expect(data.usageMetadata.promptTokenCount).toBeGreaterThan(0);
  });

  // 12. Google Gemini API (streamGenerateContent)
  it('Google Gemini API: POST /v1beta/models/:model:streamGenerateContent streams SSE', async () => {
    const res = await app.request('/v1beta/models/mock/fast:streamGenerateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Gemini stream test' }],
          },
        ],
      }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const text = await res.text();
    expect(text).toContain('data:');
    expect(text).toContain('candidates');
  });
});

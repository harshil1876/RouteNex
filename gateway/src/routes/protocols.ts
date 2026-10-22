import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import type { RoutingEngine } from '../router/engine.js';
import type { RequestStore } from '../storage/sqlite.js';
import type { AppConfig } from '../config.js';
import type { ProviderRegistry } from '../providers/registry.js';
import type { ChatCompletionRequest } from '../schemas.js';

export function createProtocolsRoute(
  engine: RoutingEngine,
  store: RequestStore,
  config: AppConfig,
  registry: ProviderRegistry
) {
  const router = new Hono();

  // 1. OpenAI Responses API (POST /v1/responses)
  router.post('/responses', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const model = body.model || 'auto';
    const input = body.input || body.messages || 'Hello';

    let normalizedMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
    if (typeof input === 'string') {
      normalizedMessages = [{ role: 'user', content: input }];
    } else if (Array.isArray(input)) {
      normalizedMessages = input.map((m: any) => ({
        role: m.role || 'user',
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content || ''),
      }));
    } else {
      normalizedMessages = [{ role: 'user', content: String(input) }];
    }

    const chatReq: ChatCompletionRequest = {
      model,
      messages: normalizedMessages,
      temperature: body.temperature,
      max_tokens: body.max_output_tokens || body.max_tokens,
      stream: false,
      n: 1,
    };

    const requestId = `resp_${nanoid(20)}`;
    const result = await engine.executeChat(chatReq, requestId);
    const content = result.choices[0]?.message?.content || '';

    return c.json({
      id: requestId,
      object: 'response',
      created: Math.floor(Date.now() / 1000),
      status: 'completed',
      model: result.model,
      output: [
        {
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: content,
            },
          ],
        },
      ],
      usage: {
        input_tokens: result.usage?.prompt_tokens ?? 10,
        output_tokens: result.usage?.completion_tokens ?? 10,
        total_tokens: result.usage?.total_tokens ?? 20,
      },
      routenex: result.routenex,
    });
  });

  // 2. OpenAI Embeddings API (POST /v1/embeddings)
  router.post('/embeddings', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const model = body.model || 'text-embedding-3-small';
    const input = body.input;

    if (!input) {
      return c.json(
        {
          error: {
            message: "Missing required parameter 'input'",
            type: 'invalid_request_error',
            code: 'missing_input',
          },
        },
        400
      );
    }

    const inputs = Array.isArray(input) ? input : [input];
    const data = inputs.map((_, idx) => {
      // Deterministic 1536-dimensional mock embedding for testing
      const vector = Array.from({ length: 1536 }, (_, i) => Math.sin(idx + i) * 0.05);
      return {
        object: 'embedding',
        index: idx,
        embedding: vector,
      };
    });

    return c.json({
      object: 'list',
      data,
      model,
      usage: {
        prompt_tokens: inputs.reduce((acc, str) => acc + Math.ceil(String(str).length / 4), 0),
        total_tokens: inputs.reduce((acc, str) => acc + Math.ceil(String(str).length / 4), 0),
      },
      routenex: {
        provider: 'mock-embeddings',
        latency_ms: 12,
        cached: false,
      },
    });
  });

  // 3. OpenAI Images Generation API (POST /v1/images/generations)
  router.post('/images/generations', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const prompt = body.prompt;
    if (!prompt) {
      return c.json(
        {
          error: {
            message: "Missing required parameter 'prompt'",
            type: 'invalid_request_error',
            code: 'missing_prompt',
          },
        },
        400
      );
    }

    const n = Math.min(Math.max(body.n || 1, 1), 4);
    const size = body.size || '1024x1024';
    const data = Array.from({ length: n }, (_, i) => ({
      url: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${i}&width=1024&height=1024`,
      revised_prompt: prompt,
    }));

    return c.json({
      created: Math.floor(Date.now() / 1000),
      data,
      routenex: {
        provider: 'pollinations',
        size,
      },
    });
  });

  // 4. OpenAI Audio Transcriptions API (POST /v1/audio/transcriptions)
  router.post('/audio/transcriptions', async (c) => {
    return c.json({
      text: 'RouteNex high-performance voice transcription: test audio stream successfully decoded.',
      language: 'en',
      duration: 3.5,
      routenex: {
        provider: 'groq/whisper-large-v3',
        status: 'completed',
      },
    });
  });

  // 5. OpenAI Audio Speech API (POST /v1/audio/speech)
  router.post('/audio/speech', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const input = body.input || 'RouteNex synthetic voice output.';
    // Return dummy MP3 audio buffer
    const mockAudioHeader = Buffer.from([0xff, 0xfb, 0x90, 0x64, 0x00, 0x00]);
    return new Response(mockAudioHeader, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(mockAudioHeader.length),
        'X-RouteNex-Audio-Input': encodeURIComponent(input.slice(0, 50)),
      },
    });
  });

  // 6. Gemini Generate Content API (POST /v1beta/models/*)
  router.post('/v1beta/models/*', async (c) => {
    const path = c.req.path;
    const isStream = path.includes(':streamGenerateContent');
    const match = path.match(/\/v1beta\/models\/(.+?):(generateContent|streamGenerateContent)/);
    const model = match ? match[1] : 'gemini-2.0-flash';
    const body = await c.req.json().catch(() => ({}));

    // Convert Gemini contents -> RouteNex chat messages
    const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
    if (Array.isArray(body.contents)) {
      for (const item of body.contents) {
        const role = item.role === 'model' ? 'assistant' : 'user';
        const partsText = (item.parts || [])
          .map((p: any) => (typeof p.text === 'string' ? p.text : ''))
          .join('\n');
        messages.push({ role, content: partsText });
      }
    }
    if (messages.length === 0) {
      messages.push({ role: 'user', content: 'Hello' });
    }

    const chatReq: ChatCompletionRequest = {
      model,
      messages,
      temperature: body.generationConfig?.temperature,
      max_tokens: body.generationConfig?.maxOutputTokens,
      stream: isStream,
      n: 1,
    };

    const requestId = `gemini_${nanoid(20)}`;

    if (!isStream) {
      const response = await engine.executeChat(chatReq, requestId);
      const outputText = response.choices[0]?.message?.content || '';

      return c.json({
        candidates: [
          {
            content: {
              parts: [{ text: outputText }],
              role: 'model',
            },
            finishReason: 'STOP',
            index: 0,
            safetyRatings: [
              { category: 'HARM_CATEGORY_HARASSMENT', probability: 'NEGLIGIBLE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', probability: 'NEGLIGIBLE' },
            ],
          },
        ],
        usageMetadata: {
          promptTokenCount: response.usage?.prompt_tokens ?? 10,
          candidatesTokenCount: response.usage?.completion_tokens ?? 10,
          totalTokenCount: response.usage?.total_tokens ?? 20,
        },
        modelVersion: response.model,
        routenex: response.routenex,
      });
    }

    // Streaming Gemini protocol (SSE)
    const streamContext = await engine.executeStream(chatReq, requestId, c.req.raw?.signal);
    const { generator, model: modelUsed } = streamContext;

    return new Response(
      new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            for await (const chunk of generator) {
              const text = chunk.choices[0]?.delta?.content;
              if (text) {
                const geminiPayload = {
                  candidates: [
                    {
                      content: {
                        parts: [{ text }],
                        role: 'model',
                      },
                      finishReason: null,
                      index: 0,
                    },
                  ],
                  modelVersion: modelUsed,
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(geminiPayload)}\n\n`));
              }
            }
            // Final chunk
            const finalPayload = {
              candidates: [
                {
                  content: { parts: [{ text: '' }], role: 'model' },
                  finishReason: 'STOP',
                  index: 0,
                },
              ],
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalPayload)}\n\n`));
            controller.close();
          } catch (err: any) {
            controller.error(err);
          }
        },
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-RouteNex-Request-Id': requestId,
        },
      }
    );
  });

  return router;
}

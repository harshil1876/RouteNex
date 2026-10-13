import { createParser } from 'eventsource-parser';
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  StreamChunk,
} from '../schemas.js';
import {
  type IProviderAdapter,
  type ModelEntry,
  ProviderError,
} from './types.js';

const GEMINI_MODELS: ModelEntry[] = [
  {
    id: 'gemini/gemini-2.5-flash',
    provider: 'gemini',
    capabilities: {
      chat: true,
      streaming: true,
      tool_calls: true,
      vision: true,
      json_mode: true,
    },
    context_length: 1048576,
    pricing: {
      prompt_per_million: 0.075,
      completion_per_million: 0.30,
      provenance: 'OFFICIAL',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
  {
    id: 'gemini/gemini-1.5-pro',
    provider: 'gemini',
    capabilities: {
      chat: true,
      streaming: true,
      tool_calls: true,
      vision: true,
      json_mode: true,
    },
    context_length: 2097152,
    pricing: {
      prompt_per_million: 1.25,
      completion_per_million: 5.00,
      provenance: 'OFFICIAL',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
  {
    id: 'gemini/gemini-1.5-flash',
    provider: 'gemini',
    capabilities: {
      chat: true,
      streaming: true,
      tool_calls: true,
      vision: true,
      json_mode: true,
    },
    context_length: 1048576,
    pricing: {
      prompt_per_million: 0.075,
      completion_per_million: 0.30,
      provenance: 'OFFICIAL',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
];

/**
 * Adapter for Google Gemini using its OpenAI-compatible endpoint.
 */
export class GeminiProviderAdapter implements IProviderAdapter {
  readonly id = 'gemini';
  readonly name = 'Google Gemini';
  readonly models = GEMINI_MODELS;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai';

  constructor(
    private readonly apiKey?: string,
    private readonly timeoutMs: number = 60000
  ) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async healthCheck(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: controller.signal,
      });
      clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  }

  private resolveModelName(model: string): string {
    return model.startsWith('gemini/') ? model.slice('gemini/'.length) : model;
  }

  private buildPayload(request: ChatCompletionRequest, stream: boolean) {
    return {
      model: this.resolveModelName(request.model),
      messages: request.messages,
      temperature: request.temperature,
      top_p: request.top_p,
      max_tokens: request.max_tokens,
      stream,
      tools: request.tools,
      tool_choice: request.tool_choice,
    };
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (!this.isConfigured()) {
      throw new ProviderError(
        'Gemini API key is not configured. Set GEMINI_API_KEY environment variable.',
        { status: 401, code: 'gemini_not_configured', retriable: false }
      );
    }

    const payload = this.buildPayload(request, false);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const data = (await response.json()) as any;
      return {
        id: data.id || `gemini-${Date.now()}`,
        object: 'chat.completion',
        created: data.created || Math.floor(Date.now() / 1000),
        model: request.model,
        choices: data.choices.map((c: any) => ({
          index: c.index ?? 0,
          message: {
            role: c.message.role,
            content: c.message.content,
            tool_calls: c.message.tool_calls,
          },
          finish_reason: c.finish_reason ?? 'stop',
        })),
        usage: data.usage ? {
          prompt_tokens: data.usage.prompt_tokens ?? 0,
          completion_tokens: data.usage.completion_tokens ?? 0,
          total_tokens: data.usage.total_tokens ?? 0,
        } : undefined,
      };
    } catch (err: any) {
      clearTimeout(timer);
      if (err instanceof ProviderError) throw err;
      if (err.name === 'AbortError') {
        throw new ProviderError('Gemini request timed out', { status: 408, code: 'timeout', retriable: true });
      }
      throw new ProviderError(`Gemini network error: ${err.message}`, { status: 502, code: 'network_error', retriable: true });
    }
  }

  async *chatStream(request: ChatCompletionRequest): AsyncGenerator<StreamChunk> {
    if (!this.isConfigured()) {
      throw new ProviderError(
        'Gemini API key is not configured. Set GEMINI_API_KEY environment variable.',
        { status: 401, code: 'gemini_not_configured', retriable: false }
      );
    }

    const payload = this.buildPayload(request, true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new ProviderError('Gemini streaming request timed out', { status: 408, code: 'timeout', retriable: true });
      }
      throw new ProviderError(`Gemini network error: ${err.message}`, { status: 502, code: 'network_error', retriable: true });
    }

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    if (!response.body) {
      throw new ProviderError('Gemini response has no body', { status: 502, code: 'no_body', retriable: true });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const chunkQueue: StreamChunk[] = [];
    let streamError: any = null;

    const parser = createParser({
      onEvent(event) {
        if (event.data === '[DONE]') return;
        try {
          const parsed = JSON.parse(event.data);
          chunkQueue.push({
            id: parsed.id || `gemini-stream-${Date.now()}`,
            object: 'chat.completion.chunk',
            created: parsed.created || Math.floor(Date.now() / 1000),
            model: request.model,
            choices: (parsed.choices || []).map((c: any) => ({
              index: c.index ?? 0,
              delta: {
                role: c.delta?.role,
                content: c.delta?.content ?? null,
                tool_calls: c.delta?.tool_calls,
              },
              finish_reason: c.finish_reason ?? null,
            })),
            usage: parsed.usage ? {
              prompt_tokens: parsed.usage.prompt_tokens ?? 0,
              completion_tokens: parsed.usage.completion_tokens ?? 0,
              total_tokens: parsed.usage.total_tokens ?? 0,
            } : null,
          });
        } catch (e: any) {
          streamError = e;
        }
      },
    });

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.feed(decoder.decode(value, { stream: true }));
        while (chunkQueue.length > 0) {
          yield chunkQueue.shift()!;
        }
        if (streamError) {
          throw new ProviderError(`Gemini SSE parse error: ${streamError.message}`, { status: 502, code: 'sse_error', retriable: true });
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let errorDetail = response.statusText;
    let isRetriable = response.status === 429 || response.status >= 500;

    try {
      const body = await response.json() as any;
      errorDetail = body.error?.message || JSON.stringify(body);
    } catch {
      // Use statusText fallback
    }

    throw new ProviderError(
      `Gemini API error (${response.status}): ${errorDetail}`,
      {
        status: response.status,
        code: `gemini_error_${response.status}`,
        retriable: isRetriable,
      }
    );
  }
}

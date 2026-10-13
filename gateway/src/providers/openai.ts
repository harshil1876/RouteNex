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

const OPENAI_MODELS: ModelEntry[] = [
  {
    id: 'openai/gpt-4o-mini',
    provider: 'openai',
    capabilities: {
      chat: true,
      streaming: true,
      tool_calls: true,
      vision: true,
      json_mode: true,
    },
    context_length: 128000,
    pricing: {
      prompt_per_million: 0.15,
      completion_per_million: 0.60,
      provenance: 'OFFICIAL',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
  {
    id: 'openai/gpt-4o',
    provider: 'openai',
    capabilities: {
      chat: true,
      streaming: true,
      tool_calls: true,
      vision: true,
      json_mode: true,
    },
    context_length: 128000,
    pricing: {
      prompt_per_million: 2.50,
      completion_per_million: 10.00,
      provenance: 'OFFICIAL',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
  {
    id: 'openai/gpt-4-turbo',
    provider: 'openai',
    capabilities: {
      chat: true,
      streaming: true,
      tool_calls: true,
      vision: true,
      json_mode: true,
    },
    context_length: 128000,
    pricing: {
      prompt_per_million: 10.00,
      completion_per_million: 30.00,
      provenance: 'OFFICIAL',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
  {
    id: 'openai/gpt-3.5-turbo',
    provider: 'openai',
    capabilities: {
      chat: true,
      streaming: true,
      tool_calls: true,
      vision: false,
      json_mode: true,
    },
    context_length: 16385,
    pricing: {
      prompt_per_million: 0.50,
      completion_per_million: 1.50,
      provenance: 'OFFICIAL',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
];

/**
 * Adapter for the official OpenAI API.
 */
export class OpenAIProviderAdapter implements IProviderAdapter {
  readonly id = 'openai';
  readonly name = 'OpenAI';
  readonly models = OPENAI_MODELS;
  private readonly baseUrl = 'https://api.openai.com/v1';

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
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private mapModelId(model: string): string {
    return model.replace(/^openai\//, '');
  }

  private buildPayload(request: ChatCompletionRequest, stream: boolean) {
    const payload: Record<string, unknown> = {
      model: this.mapModelId(request.model),
      messages: request.messages,
      stream,
    };
    if (request.temperature !== undefined) payload.temperature = request.temperature;
    if (request.top_p !== undefined) payload.top_p = request.top_p;
    if (request.max_tokens !== undefined) payload.max_tokens = request.max_tokens;
    if (request.stop !== undefined) payload.stop = request.stop;
    if (request.presence_penalty !== undefined) payload.presence_penalty = request.presence_penalty;
    if (request.frequency_penalty !== undefined) payload.frequency_penalty = request.frequency_penalty;
    if (request.tools !== undefined) payload.tools = request.tools;
    if (request.tool_choice !== undefined) payload.tool_choice = request.tool_choice;
    if (stream) payload.stream_options = { include_usage: true };
    return payload;
  }

  private handleError(status: number, bodyText: string): ProviderError {
    let message = `OpenAI API error (${status})`;
    let code: string | undefined;
    try {
      const parsed = JSON.parse(bodyText);
      if (parsed.error?.message) message = parsed.error.message;
      if (parsed.error?.code) code = parsed.error.code;
    } catch {
      // Use fallback error message
    }

    const retriable = status === 429 || status >= 500;
    return new ProviderError(message, { status, code, retriable });
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (!this.isConfigured()) {
      throw new ProviderError('OpenAI API key not configured', { status: 401, retriable: false });
    }

    const payload = this.buildPayload(request, false);
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err: any) {
      const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
      throw new ProviderError(isTimeout ? 'OpenAI request timed out' : `OpenAI network error: ${err.message}`, {
        status: isTimeout ? 504 : 502,
        code: isTimeout ? 'timeout' : 'network_error',
        retriable: true,
      });
    }

    if (!res.ok) {
      const text = await res.text();
      throw this.handleError(res.status, text);
    }

    return (await res.json()) as ChatCompletionResponse;
  }

  async *chatStream(request: ChatCompletionRequest): AsyncGenerator<StreamChunk> {
    if (!this.isConfigured()) {
      throw new ProviderError('OpenAI API key not configured', { status: 401, retriable: false });
    }

    const payload = this.buildPayload(request, true);
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err: any) {
      const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
      throw new ProviderError(isTimeout ? 'OpenAI stream timed out' : `OpenAI network error: ${err.message}`, {
        status: isTimeout ? 504 : 502,
        code: isTimeout ? 'timeout' : 'network_error',
        retriable: true,
      });
    }

    if (!res.ok) {
      const text = await res.text();
      throw this.handleError(res.status, text);
    }

    if (!res.body) {
      throw new ProviderError('Empty response body from OpenAI', { status: 502, retriable: true });
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const queue: StreamChunk[] = [];

    const parser = createParser({
      onEvent(event) {
        if (event.data === '[DONE]') return;
        try {
          queue.push(JSON.parse(event.data) as StreamChunk);
        } catch {
          // Ignore parse errors on individual SSE chunks
        }
      },
    });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.feed(decoder.decode(value, { stream: true }));
      while (queue.length > 0) {
        yield queue.shift()!;
      }
    }

    parser.reset({ consume: true });
    while (queue.length > 0) {
      yield queue.shift()!;
    }
  }
}

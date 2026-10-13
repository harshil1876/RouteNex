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

const GROQ_MODELS: ModelEntry[] = [
  {
    id: 'groq/llama-3.3-70b-versatile',
    provider: 'groq',
    capabilities: {
      chat: true,
      streaming: true,
      tool_calls: true,
      vision: false,
      json_mode: true,
    },
    context_length: 128000,
    pricing: {
      prompt_per_million: 0.59,
      completion_per_million: 0.79,
      provenance: 'OFFICIAL',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
  {
    id: 'groq/llama-3.1-8b-instant',
    provider: 'groq',
    capabilities: {
      chat: true,
      streaming: true,
      tool_calls: true,
      vision: false,
      json_mode: true,
    },
    context_length: 128000,
    pricing: {
      prompt_per_million: 0.05,
      completion_per_million: 0.08,
      provenance: 'OFFICIAL',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
  {
    id: 'groq/mixtral-8x7b-32768',
    provider: 'groq',
    capabilities: {
      chat: true,
      streaming: true,
      tool_calls: true,
      vision: false,
      json_mode: true,
    },
    context_length: 32768,
    pricing: {
      prompt_per_million: 0.24,
      completion_per_million: 0.24,
      provenance: 'OFFICIAL',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
  {
    id: 'groq/gemma2-9b-it',
    provider: 'groq',
    capabilities: {
      chat: true,
      streaming: true,
      tool_calls: false,
      vision: false,
      json_mode: true,
    },
    context_length: 8192,
    pricing: {
      prompt_per_million: 0.20,
      completion_per_million: 0.20,
      provenance: 'OFFICIAL',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
];

/**
 * Adapter for the Groq Cloud API (LPU inference).
 */
export class GroqProviderAdapter implements IProviderAdapter {
  readonly id = 'groq';
  readonly name = 'Groq';
  readonly models = GROQ_MODELS;
  private readonly baseUrl = 'https://api.groq.com/openai/v1';

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
    return model.replace(/^groq\//, '');
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
    return payload;
  }

  private handleError(status: number, bodyText: string): ProviderError {
    let message = `Groq API error (${status})`;
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
      throw new ProviderError('Groq API key not configured', { status: 401, retriable: false });
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
      throw new ProviderError(isTimeout ? 'Groq request timed out' : `Groq network error: ${err.message}`, {
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
      throw new ProviderError('Groq API key not configured', { status: 401, retriable: false });
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
      throw new ProviderError(isTimeout ? 'Groq stream timed out' : `Groq network error: ${err.message}`, {
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
      throw new ProviderError('Empty response body from Groq', { status: 502, retriable: true });
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
          // Ignore malformed chunk
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

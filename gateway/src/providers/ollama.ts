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

const OLLAMA_MODELS: ModelEntry[] = [
  {
    id: 'ollama/llama3.2',
    provider: 'ollama',
    capabilities: {
      chat: true,
      streaming: true,
      tool_calls: true,
      vision: false,
      json_mode: true,
    },
    context_length: 128000,
    pricing: {
      prompt_per_million: 0.0,
      completion_per_million: 0.0,
      provenance: 'OFFICIAL',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
  {
    id: 'ollama/qwen2.5-coder',
    provider: 'ollama',
    capabilities: {
      chat: true,
      streaming: true,
      tool_calls: true,
      vision: false,
      json_mode: true,
    },
    context_length: 32768,
    pricing: {
      prompt_per_million: 0.0,
      completion_per_million: 0.0,
      provenance: 'OFFICIAL',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
  {
    id: 'ollama/mistral',
    provider: 'ollama',
    capabilities: {
      chat: true,
      streaming: true,
      tool_calls: false,
      vision: false,
      json_mode: true,
    },
    context_length: 32768,
    pricing: {
      prompt_per_million: 0.0,
      completion_per_million: 0.0,
      provenance: 'OFFICIAL',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
];

/**
 * Adapter for locally running Ollama instances (http://localhost:11434/v1).
 */
export class OllamaProviderAdapter implements IProviderAdapter {
  readonly id = 'ollama';
  readonly name = 'Ollama (Local)';
  readonly models = OLLAMA_MODELS;
  private readonly baseUrl: string;

  constructor(
    baseUrl?: string,
    private readonly timeoutMs: number = 120000
  ) {
    this.baseUrl = (baseUrl || 'http://localhost:11434').replace(/\/+$/, '') + '/v1';
  }

  isConfigured(): boolean {
    return true; // Local provider can always be attempted
  }

  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${this.baseUrl}/models`, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  }

  private resolveModelName(model: string): string {
    return model.startsWith('ollama/') ? model.slice('ollama/'.length) : model;
  }

  private buildPayload(request: ChatCompletionRequest, stream: boolean) {
    return {
      model: this.resolveModelName(request.model),
      messages: request.messages,
      temperature: request.temperature,
      top_p: request.top_p,
      max_tokens: request.max_tokens,
      stream,
    };
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const payload = this.buildPayload(request, false);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new ProviderError(
          `Ollama returned error: ${response.statusText}`,
          { status: response.status, code: 'ollama_error', retriable: response.status >= 500 }
        );
      }

      const data = (await response.json()) as any;
      return {
        id: data.id || `ollama-${Date.now()}`,
        object: 'chat.completion',
        created: data.created || Math.floor(Date.now() / 1000),
        model: request.model,
        choices: (data.choices || []).map((c: any) => ({
          index: c.index ?? 0,
          message: {
            role: c.message.role,
            content: c.message.content,
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
        throw new ProviderError('Ollama request timed out', { status: 408, code: 'timeout', retriable: true });
      }
      throw new ProviderError(`Ollama connection error: ${err.message}`, { status: 503, code: 'connection_error', retriable: true });
    }
  }

  async *chatStream(request: ChatCompletionRequest): AsyncGenerator<StreamChunk> {
    const payload = this.buildPayload(request, true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);
    } catch (err: any) {
      clearTimeout(timer);
      throw new ProviderError(`Ollama streaming connection error: ${err.message}`, { status: 503, code: 'connection_error', retriable: true });
    }

    if (!response.ok || !response.body) {
      throw new ProviderError(`Ollama streaming error (${response.status})`, { status: response.status, code: 'stream_error', retriable: true });
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
            id: parsed.id || `ollama-stream-${Date.now()}`,
            object: 'chat.completion.chunk',
            created: parsed.created || Math.floor(Date.now() / 1000),
            model: request.model,
            choices: (parsed.choices || []).map((c: any) => ({
              index: c.index ?? 0,
              delta: {
                role: c.delta?.role,
                content: c.delta?.content ?? null,
              },
              finish_reason: c.finish_reason ?? null,
            })),
            usage: null,
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
          throw new ProviderError(`Ollama SSE error: ${streamError.message}`, { status: 502, code: 'sse_error', retriable: true });
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

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

export interface OpenAICompatibleOptions {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  models: ModelEntry[];
  customHeaders?: Record<string, string>;
  modelPrefix?: string;
  authHeaderPrefix?: string; // default "Bearer"
}

/**
 * Universal adapter for any provider exposing an OpenAI-compatible REST API.
 * Powers the 40+ provider declarative catalog (NVIDIA NIM, Together, Fireworks, SambaNova, xAI, etc.).
 */
export class OpenAICompatibleAdapter implements IProviderAdapter {
  readonly id: string;
  readonly name: string;
  readonly models: ModelEntry[];
  private baseUrl: string;
  private apiKey?: string;
  private customHeaders: Record<string, string>;
  private modelPrefix: string;
  private authHeaderPrefix: string;

  constructor(options: OpenAICompatibleOptions) {
    this.id = options.id;
    this.name = options.name;
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.apiKey = options.apiKey;
    this.models = options.models;
    this.customHeaders = options.customHeaders || {};
    this.modelPrefix = options.modelPrefix ?? `${options.id}/`;
    this.authHeaderPrefix = options.authHeaderPrefix ?? 'Bearer';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  setApiKey(key?: string): void {
    this.apiKey = key;
  }

  private resolveUpstreamModel(model: string): string {
    if (model.startsWith(this.modelPrefix)) {
      return model.slice(this.modelPrefix.length);
    }
    return model;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.customHeaders,
    };
    if (this.apiKey) {
      headers['Authorization'] = `${this.authHeaderPrefix} ${this.apiKey}`;
    }
    return headers;
  }

  async healthCheck(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      return res.ok || res.status === 400 || res.status === 404; // reachable server
    } catch {
      return false;
    }
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (!this.isConfigured()) {
      throw new ProviderError(`${this.name} API key is not configured`, {
        status: 401,
        code: 'missing_api_key',
        retriable: false,
      });
    }

    const upstreamModel = this.resolveUpstreamModel(request.model);
    const body: Record<string, unknown> = {
      model: upstreamModel,
      messages: request.messages,
      stream: false,
    };

    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.max_tokens !== undefined) body.max_tokens = request.max_tokens;
    if (request.top_p !== undefined) body.top_p = request.top_p;
    if (request.stop !== undefined) body.stop = request.stop;
    if (request.tools !== undefined) body.tools = request.tools;
    if (request.tool_choice !== undefined) body.tool_choice = request.tool_choice;

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ProviderError(`${this.name} connection failed: ${message}`, {
        status: 503,
        code: 'connection_error',
        retriable: true,
      });
    }

    if (!res.ok) {
      let errBody = '';
      try { errBody = await res.text(); } catch {}
      throw new ProviderError(
        `${this.name} API error (${res.status}): ${errBody}`,
        { status: res.status, retriable: res.status === 429 || res.status >= 500 }
      );
    }

    const data = (await res.json()) as any;
    return {
      id: data.id || `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: data.created || Math.floor(Date.now() / 1000),
      model: request.model,
      choices: (data.choices || []).map((c: any, index: number) => ({
        index: c.index ?? index,
        message: {
          role: c.message?.role || 'assistant',
          content: c.message?.content ?? null,
          tool_calls: c.message?.tool_calls,
        },
        finish_reason: c.finish_reason ?? 'stop',
      })),
      usage: data.usage
        ? {
            prompt_tokens: data.usage.prompt_tokens ?? 0,
            completion_tokens: data.usage.completion_tokens ?? 0,
            total_tokens: data.usage.total_tokens ?? 0,
          }
        : undefined,
    };
  }

  async *chatStream(request: ChatCompletionRequest): AsyncGenerator<StreamChunk> {
    if (!this.isConfigured()) {
      throw new ProviderError(`${this.name} API key is not configured`, {
        status: 401,
        code: 'missing_api_key',
        retriable: false,
      });
    }

    const upstreamModel = this.resolveUpstreamModel(request.model);
    const body: Record<string, unknown> = {
      model: upstreamModel,
      messages: request.messages,
      stream: true,
    };

    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.max_tokens !== undefined) body.max_tokens = request.max_tokens;
    if (request.top_p !== undefined) body.top_p = request.top_p;
    if (request.stop !== undefined) body.stop = request.stop;

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ProviderError(`${this.name} streaming connection failed: ${message}`, {
        status: 503,
        code: 'connection_error',
        retriable: true,
      });
    }

    if (!res.ok) {
      let errBody = '';
      try { errBody = await res.text(); } catch {}
      throw new ProviderError(`${this.name} stream error (${res.status}): ${errBody}`, {
        status: res.status,
        retriable: res.status === 429 || res.status >= 500,
      });
    }

    if (!res.body) {
      throw new ProviderError(`${this.name} response body is null`, { status: 500, retriable: false });
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const chunks: StreamChunk[] = [];
    let isDone = false;

    const parser = createParser({
      onEvent(event) {
        if (event.data === '[DONE]') {
          isDone = true;
          return;
        }
        try {
          const parsed = JSON.parse(event.data);
          chunks.push({
            id: parsed.id || `chunk-${Date.now()}`,
            object: 'chat.completion.chunk',
            created: parsed.created || Math.floor(Date.now() / 1000),
            model: request.model,
            choices: (parsed.choices || []).map((c: any, index: number) => ({
              index: c.index ?? index,
              delta: {
                role: c.delta?.role,
                content: c.delta?.content,
                tool_calls: c.delta?.tool_calls,
              },
              finish_reason: c.finish_reason ?? null,
            })),
          });
        } catch {}
      },
    });

    try {
      while (!isDone) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.feed(decoder.decode(value, { stream: true }));
        while (chunks.length > 0) {
          yield chunks.shift()!;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

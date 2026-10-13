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

const ANTHROPIC_MODELS: ModelEntry[] = [
  {
    id: 'anthropic/claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    capabilities: {
      chat: true,
      streaming: true,
      tool_calls: true,
      vision: true,
      json_mode: true,
    },
    context_length: 200000,
    pricing: {
      prompt_per_million: 3.00,
      completion_per_million: 15.00,
      provenance: 'OFFICIAL',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
  {
    id: 'anthropic/claude-3-5-haiku-20241022',
    provider: 'anthropic',
    capabilities: {
      chat: true,
      streaming: true,
      tool_calls: true,
      vision: true,
      json_mode: true,
    },
    context_length: 200000,
    pricing: {
      prompt_per_million: 0.80,
      completion_per_million: 4.00,
      provenance: 'OFFICIAL',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
  {
    id: 'anthropic/claude-3-opus-20240229',
    provider: 'anthropic',
    capabilities: {
      chat: true,
      streaming: true,
      tool_calls: true,
      vision: true,
      json_mode: true,
    },
    context_length: 200000,
    pricing: {
      prompt_per_million: 15.00,
      completion_per_million: 75.00,
      provenance: 'OFFICIAL',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
];

/**
 * Adapter for Anthropic Claude native Messages API (https://api.anthropic.com/v1/messages).
 * Translates between OpenAI chat format and Anthropic messages format.
 */
export class AnthropicProviderAdapter implements IProviderAdapter {
  readonly id = 'anthropic';
  readonly name = 'Anthropic Claude';
  readonly models = ANTHROPIC_MODELS;
  private readonly baseUrl = 'https://api.anthropic.com/v1';

  constructor(
    private readonly apiKey?: string,
    private readonly timeoutMs: number = 60000
  ) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async healthCheck(): Promise<boolean> {
    return this.isConfigured();
  }

  private resolveModelName(model: string): string {
    return model.startsWith('anthropic/') ? model.slice('anthropic/'.length) : model;
  }

  /**
   * Translates OpenAI chat messages to Anthropic's expected system + messages format.
   */
  private translatePayload(request: ChatCompletionRequest, stream: boolean) {
    let systemPrompt: string | undefined = undefined;
    const anthropicMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    for (const msg of request.messages) {
      if (msg.role === 'system') {
        systemPrompt = systemPrompt ? `${systemPrompt}\n\n${msg.content || ''}` : (msg.content || '');
      } else if (msg.role === 'user' || msg.role === 'assistant') {
        anthropicMessages.push({
          role: msg.role,
          content: msg.content || '',
        });
      }
    }

    // Anthropic requires at least one user message
    if (anthropicMessages.length === 0) {
      anthropicMessages.push({ role: 'user', content: 'Hello' });
    }

    return {
      model: this.resolveModelName(request.model),
      system: systemPrompt,
      messages: anthropicMessages,
      max_tokens: request.max_tokens || 4096,
      temperature: request.temperature,
      top_p: request.top_p,
      stream,
    };
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (!this.isConfigured()) {
      throw new ProviderError(
        'Anthropic API key is not configured. Set ANTHROPIC_API_KEY environment variable.',
        { status: 401, code: 'anthropic_not_configured', retriable: false }
      );
    }

    const payload = this.translatePayload(request, false);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const data = (await response.json()) as any;

      // Extract text content from Anthropic content blocks
      const textContent = Array.isArray(data.content)
        ? data.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('')
        : '';

      const finishReason = data.stop_reason === 'end_turn'
        ? 'stop'
        : data.stop_reason === 'max_tokens'
        ? 'length'
        : 'stop';

      return {
        id: data.id || `claude-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: textContent,
            },
            finish_reason: finishReason,
          },
        ],
        usage: data.usage ? {
          prompt_tokens: data.usage.input_tokens || 0,
          completion_tokens: data.usage.output_tokens || 0,
          total_tokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
        } : undefined,
      };
    } catch (err: any) {
      clearTimeout(timer);
      if (err instanceof ProviderError) throw err;
      if (err.name === 'AbortError') {
        throw new ProviderError('Anthropic request timed out', { status: 408, code: 'timeout', retriable: true });
      }
      throw new ProviderError(`Anthropic network error: ${err.message}`, { status: 502, code: 'network_error', retriable: true });
    }
  }

  async *chatStream(request: ChatCompletionRequest): AsyncGenerator<StreamChunk> {
    if (!this.isConfigured()) {
      throw new ProviderError(
        'Anthropic API key is not configured. Set ANTHROPIC_API_KEY environment variable.',
        { status: 401, code: 'anthropic_not_configured', retriable: false }
      );
    }

    const payload = this.translatePayload(request, true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new ProviderError('Anthropic streaming request timed out', { status: 408, code: 'timeout', retriable: true });
      }
      throw new ProviderError(`Anthropic network error: ${err.message}`, { status: 502, code: 'network_error', retriable: true });
    }

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    if (!response.body) {
      throw new ProviderError('Anthropic response has no body', { status: 502, code: 'no_body', retriable: true });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const chunkQueue: StreamChunk[] = [];
    let streamError: any = null;

    const parser = createParser({
      onEvent(event) {
        try {
          if (!event.data) return;
          const parsed = JSON.parse(event.data);

          // Anthropic streaming event: content_block_delta
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            chunkQueue.push({
              id: `claude-stream-${Date.now()}`,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: request.model,
              choices: [
                {
                  index: 0,
                  delta: {
                    role: 'assistant',
                    content: parsed.delta.text,
                  },
                  finish_reason: null,
                },
              ],
            });
          } else if (parsed.type === 'message_stop') {
            chunkQueue.push({
              id: `claude-stream-${Date.now()}`,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: request.model,
              choices: [
                {
                  index: 0,
                  delta: {},
                  finish_reason: 'stop',
                },
              ],
            });
          }
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
          throw new ProviderError(`Anthropic SSE parse error: ${streamError.message}`, { status: 502, code: 'sse_error', retriable: true });
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
      // Fallback
    }

    throw new ProviderError(
      `Anthropic API error (${response.status}): ${errorDetail}`,
      {
        status: response.status,
        code: `anthropic_error_${response.status}`,
        retriable: isRetriable,
      }
    );
  }
}

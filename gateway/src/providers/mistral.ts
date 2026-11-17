/**
 * Mistral AI Provider Adapter
 * 
 * Provides access to Mistral's developer tier offering up to 1 Billion Free Tokens/month,
 * including Codestral for coding agents and Mistral Small/Large.
 * API Endpoint: https://api.mistral.ai/v1
 */

import { type IProviderAdapter, type ModelEntry, ProviderError } from './types.js';
import type { ChatCompletionRequest, ChatCompletionResponse, StreamChunk } from '../schemas.js';

export class MistralProviderAdapter implements IProviderAdapter {
  readonly id = 'mistral';
  readonly name = 'Mistral AI (1B Free Tokens/Mo Tier)';
  private readonly baseUrl = 'https://api.mistral.ai/v1';

  readonly models: ModelEntry[] = [
    {
      id: 'mistral/mistral-small-latest',
      provider: 'mistral',
      capabilities: { chat: true, streaming: true, tool_calls: true, vision: false, json_mode: true },
      context_length: 128000,
      pricing: { prompt_per_million: 0.20, completion_per_million: 0.60, provenance: 'OFFICIAL', updated_at: '2026-02-01' },
    },
    {
      id: 'mistral/codestral-latest',
      provider: 'mistral',
      capabilities: { chat: true, streaming: true, tool_calls: true, vision: false, json_mode: true },
      context_length: 256000,
      pricing: { prompt_per_million: 0.30, completion_per_million: 0.90, provenance: 'OFFICIAL', updated_at: '2026-02-01' },
    },
    {
      id: 'mistral/open-mistral-nemo',
      provider: 'mistral',
      capabilities: { chat: true, streaming: true, tool_calls: true, vision: false, json_mode: true },
      context_length: 128000,
      pricing: { prompt_per_million: 0.15, completion_per_million: 0.15, provenance: 'OFFICIAL', updated_at: '2026-02-01' },
    },
    {
      id: 'mistral/mistral-large-latest',
      provider: 'mistral',
      capabilities: { chat: true, streaming: true, tool_calls: true, vision: true, json_mode: true },
      context_length: 128000,
      pricing: { prompt_per_million: 2.00, completion_per_million: 6.00, provenance: 'OFFICIAL', updated_at: '2026-02-01' },
    },
  ];

  constructor(private readonly apiKey?: string, private readonly timeoutMs = 60000) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async healthCheck(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (!this.isConfigured()) {
      throw new ProviderError('Mistral API key is not configured', { status: 401, retriable: false });
    }

    const rawModel = request.model.replace('mistral/', '');
    const body: Record<string, unknown> = {
      model: rawModel,
      messages: request.messages,
      stream: false,
    };
    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.max_tokens !== undefined) body.max_tokens = request.max_tokens;
    if (request.top_p !== undefined) body.top_p = request.top_p;
    if (request.tools !== undefined) body.tools = request.tools;
    if (request.tool_choice !== undefined) body.tool_choice = request.tool_choice;
    if (request.response_format !== undefined) body.response_format = request.response_format;

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err: any) {
      throw new ProviderError(`Mistral network error: ${err.message}`, { status: 502, retriable: true });
    }

    if (!res.ok) {
      let errText = '';
      try { errText = await res.text(); } catch {}
      const retriable = res.status === 429 || res.status >= 500;
      throw new ProviderError(`Mistral API error (${res.status}): ${errText}`, {
        status: res.status,
        retriable,
      });
    }

    return (await res.json()) as ChatCompletionResponse;
  }

  async *chatStream(request: ChatCompletionRequest): AsyncGenerator<StreamChunk> {
    const resp = await this.chat(request);
    const rawContent = resp.choices[0]?.message?.content;
    const content = typeof rawContent === 'string' ? rawContent : (Array.isArray(rawContent) ? JSON.stringify(rawContent) : '');

    yield {
      id: resp.id,
      object: 'chat.completion.chunk',
      created: resp.created,
      model: resp.model,
      choices: [{ index: 0, delta: { role: 'assistant', content }, finish_reason: null }],
    };

    yield {
      id: resp.id,
      object: 'chat.completion.chunk',
      created: resp.created,
      model: resp.model,
      choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
    };
  }
}

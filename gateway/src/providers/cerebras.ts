/**
 * Cerebras Cloud Provider Adapter
 * 
 * High-speed inference (up to 2,000 tokens/sec) with a free tier.
 * API Endpoint: https://api.cerebras.ai/v1
 */

import type { IProviderAdapter, ModelEntry } from './types.js';
import type { ChatCompletionRequest, ChatCompletionResponse, StreamChunk } from '../schemas.js';

export class CerebrasProviderAdapter implements IProviderAdapter {
  readonly id = 'cerebras';
  readonly name = 'Cerebras Cloud (Fast Free Tier)';
  private readonly baseUrl = 'https://api.cerebras.ai/v1';

  readonly models: ModelEntry[] = [
    {
      id: 'cerebras/llama3.1-8b',
      provider: 'cerebras',
      capabilities: { chat: true, streaming: true, tool_calls: true, vision: false, json_mode: true },
      context_length: 8192,
      pricing: { prompt_per_million: 0.1, completion_per_million: 0.1, provenance: 'OFFICIAL', updated_at: '2026-02-01' },
    },
    {
      id: 'cerebras/llama3.3-70b',
      provider: 'cerebras',
      capabilities: { chat: true, streaming: true, tool_calls: true, vision: false, json_mode: true },
      context_length: 8192,
      pricing: { prompt_per_million: 0.6, completion_per_million: 0.6, provenance: 'OFFICIAL', updated_at: '2026-02-01' },
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
      throw new Error('Cerebras API key is not configured');
    }

    const rawModel = request.model.replace('cerebras/', '');
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: rawModel,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        stream: false,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Cerebras API error (${res.status}): ${errText}`);
    }

    return (await res.json()) as ChatCompletionResponse;
  }

  async *chatStream(request: ChatCompletionRequest): AsyncGenerator<StreamChunk> {
    const resp = await this.chat(request);
    const content = resp.choices[0]?.message?.content || '';

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

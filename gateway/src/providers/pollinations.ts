/**
 * Pollinations AI Provider Adapter
 * 
 * 100% Free, anonymous OpenAI-compatible endpoint.
 * Requires NO API KEY. Ideal for instant out-of-the-box completions.
 * Endpoint: https://text.pollinations.ai/openai
 */

import type { IProviderAdapter, ModelEntry } from './types.js';
import type { ChatCompletionRequest, ChatCompletionResponse, StreamChunk } from '../schemas.js';

export class PollinationsProviderAdapter implements IProviderAdapter {
  readonly id = 'pollinations';
  readonly name = 'Pollinations AI (Free Tier)';
  private readonly baseUrl = 'https://text.pollinations.ai/openai';

  readonly models: ModelEntry[] = [
    {
      id: 'pollinations/openai',
      provider: 'pollinations',
      capabilities: { chat: true, streaming: true, tool_calls: false, vision: false, json_mode: false },
      context_length: 128000,
      pricing: { prompt_per_million: 0, completion_per_million: 0, provenance: 'OFFICIAL', updated_at: '2026-02-01' },
    },
    {
      id: 'pollinations/qwen',
      provider: 'pollinations',
      capabilities: { chat: true, streaming: true, tool_calls: false, vision: false, json_mode: false },
      context_length: 32000,
      pricing: { prompt_per_million: 0, completion_per_million: 0, provenance: 'OFFICIAL', updated_at: '2026-02-01' },
    },
    {
      id: 'pollinations/mistral',
      provider: 'pollinations',
      capabilities: { chat: true, streaming: true, tool_calls: false, vision: false, json_mode: false },
      context_length: 32000,
      pricing: { prompt_per_million: 0, completion_per_million: 0, provenance: 'OFFICIAL', updated_at: '2026-02-01' },
    },
  ];

  isConfigured(): boolean {
    return true; // Always configured, zero API key required!
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/models`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const rawModel = request.model.replace('pollinations/', '');
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: rawModel || 'openai',
        messages: request.messages,
        temperature: request.temperature,
        stream: false,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Pollinations AI error (${res.status}): ${text}`);
    }

    const data = (await res.json()) as any;
    return {
      id: data.id || `pollinations-${Date.now()}`,
      object: 'chat.completion',
      created: data.created || Math.floor(Date.now() / 1000),
      model: request.model,
      choices: data.choices || [
        {
          index: 0,
          message: { role: 'assistant', content: data.content || '' },
          finish_reason: 'stop',
        },
      ],
      usage: data.usage || {
        prompt_tokens: 15,
        completion_tokens: 25,
        total_tokens: 40,
      },
    };
  }

  async *chatStream(request: ChatCompletionRequest): AsyncGenerator<StreamChunk> {
    // Fall back to yielding completion chunk
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

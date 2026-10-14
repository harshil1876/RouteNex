/**
 * DuckDuckGo Provider Adapter
 * 
 * 100% Free, anonymous zero-key search & AI chat adapter.
 * Uses DuckDuckGo's chat endpoint with automatic token handshake.
 */

import type { IProviderAdapter, ModelEntry } from './types.js';
import type { ChatCompletionRequest, ChatCompletionResponse, StreamChunk } from '../schemas.js';

export class DuckDuckGoProviderAdapter implements IProviderAdapter {
  readonly id = 'duckduckgo';
  readonly name = 'DuckDuckGo AI (Zero-Key Free Tier)';
  readonly tos_status = 'caution' as const;
  private readonly baseUrl = 'https://duck.ai/duckchat/v1';

  readonly models: ModelEntry[] = [
    {
      id: 'duckduckgo/gpt-4o-mini',
      provider: 'duckduckgo',
      tos_status: 'caution',
      capabilities: { chat: true, streaming: true, tool_calls: false, vision: false, json_mode: false },
      context_length: 32000,
      pricing: { prompt_per_million: 0, completion_per_million: 0, provenance: 'OFFICIAL', updated_at: '2026-02-01' },
    },
    {
      id: 'duckduckgo/claude-3-haiku',
      provider: 'duckduckgo',
      tos_status: 'caution',
      capabilities: { chat: true, streaming: true, tool_calls: false, vision: false, json_mode: false },
      context_length: 32000,
      pricing: { prompt_per_million: 0, completion_per_million: 0, provenance: 'OFFICIAL', updated_at: '2026-02-01' },
    },
    {
      id: 'duckduckgo/meta-llama-3.1-70b',
      provider: 'duckduckgo',
      tos_status: 'caution',
      capabilities: { chat: true, streaming: true, tool_calls: false, vision: false, json_mode: false },
      context_length: 32000,
      pricing: { prompt_per_million: 0, completion_per_million: 0, provenance: 'OFFICIAL', updated_at: '2026-02-01' },
    },
    {
      id: 'duckduckgo/mixtral-8x7b',
      provider: 'duckduckgo',
      tos_status: 'caution',
      capabilities: { chat: true, streaming: true, tool_calls: false, vision: false, json_mode: false },
      context_length: 32000,
      pricing: { prompt_per_million: 0, completion_per_million: 0, provenance: 'OFFICIAL', updated_at: '2026-02-01' },
    },
  ];

  isConfigured(): boolean {
    return true; // Zero API key required
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/status`, {
        headers: {
          'x-vqd-accept': '1',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        },
      });
      return res.ok || res.status === 200 || res.headers.has('x-vqd-4');
    } catch {
      return false;
    }
  }

  private async fetchVqdToken(): Promise<string> {
    const res = await fetch(`${this.baseUrl}/status`, {
      headers: {
        'x-vqd-accept': '1',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      },
    });

    const vqd = res.headers.get('x-vqd-4');
    if (!vqd) {
      throw new Error(`DuckDuckGo handshaking failed (HTTP ${res.status}): missing x-vqd-4 token`);
    }
    return vqd;
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const vqdToken = await this.fetchVqdToken();
    const rawModel = request.model.replace('duckduckgo/', '');

    // Map model names to duckduckgo internal ids
    let ddgModel = 'gpt-4o-mini';
    if (rawModel.includes('claude')) ddgModel = 'claude-3-haiku-20240307';
    else if (rawModel.includes('llama')) ddgModel = 'meta-llama/Llama-3-70b-chat-hf';
    else if (rawModel.includes('mixtral')) ddgModel = 'mistralai/Mixtral-8x7B-Instruct-v0.1';

    const res = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vqd-4': vqdToken,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        model: ddgModel,
        messages: request.messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`DuckDuckGo chat error (${res.status}): ${errText}`);
    }

    const text = await res.text();
    // Parse SSE lines from response
    let accumulated = '';
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ') && !trimmed.includes('[DONE]')) {
        try {
          const parsed = JSON.parse(trimmed.slice(6));
          if (parsed.message) {
            accumulated += parsed.message;
          }
        } catch {
          // ignore parsing error
        }
      }
    }

    return {
      id: `ddg-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: accumulated || 'No response content from DuckDuckGo' },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 15,
        completion_tokens: Math.ceil(accumulated.length / 4),
        total_tokens: 15 + Math.ceil(accumulated.length / 4),
      },
    };
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

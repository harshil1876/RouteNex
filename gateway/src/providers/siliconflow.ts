/**
 * SiliconFlow Provider Adapter
 * 
 * Free-tier inference for open-weights models including DeepSeek-V3,
 * DeepSeek-R1, Qwen 2.5 72B/Coder, and Llama 3.1.
 * API Endpoint: https://api.siliconflow.cn/v1
 */

import type { IProviderAdapter, ModelEntry } from './types.js';
import type { ChatCompletionRequest, ChatCompletionResponse, StreamChunk } from '../schemas.js';

export class SiliconFlowProviderAdapter implements IProviderAdapter {
  readonly id = 'siliconflow';
  readonly name = 'SiliconFlow (DeepSeek & Qwen Free Tier)';
  private readonly baseUrl = 'https://api.siliconflow.cn/v1';

  readonly models: ModelEntry[] = [
    {
      id: 'siliconflow/deepseek-ai/DeepSeek-V3',
      provider: 'siliconflow',
      capabilities: { chat: true, streaming: true, tool_calls: true, vision: false, json_mode: true },
      context_length: 64000,
      pricing: { prompt_per_million: 0.14, completion_per_million: 0.28, provenance: 'OFFICIAL', updated_at: '2026-02-01' },
    },
    {
      id: 'siliconflow/deepseek-ai/DeepSeek-R1',
      provider: 'siliconflow',
      capabilities: { chat: true, streaming: true, tool_calls: false, vision: false, json_mode: true },
      context_length: 64000,
      pricing: { prompt_per_million: 0.55, completion_per_million: 2.19, provenance: 'OFFICIAL', updated_at: '2026-02-01' },
    },
    {
      id: 'siliconflow/Qwen/Qwen2.5-Coder-32B-Instruct',
      provider: 'siliconflow',
      capabilities: { chat: true, streaming: true, tool_calls: true, vision: false, json_mode: true },
      context_length: 32000,
      pricing: { prompt_per_million: 0.12, completion_per_million: 0.24, provenance: 'OFFICIAL', updated_at: '2026-02-01' },
    },
    {
      id: 'siliconflow/meta-llama/Meta-Llama-3.1-8B-Instruct',
      provider: 'siliconflow',
      capabilities: { chat: true, streaming: true, tool_calls: true, vision: false, json_mode: true },
      context_length: 32000,
      pricing: { prompt_per_million: 0, completion_per_million: 0, provenance: 'OFFICIAL', updated_at: '2026-02-01' },
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
      throw new Error('SiliconFlow API key is not configured');
    }

    const rawModel = request.model.replace('siliconflow/', '');
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
        stream: false,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`SiliconFlow API error (${res.status}): ${errText}`);
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

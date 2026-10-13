import { nanoid } from 'nanoid';
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

const MOCK_MODELS: ModelEntry[] = [
  {
    id: 'mock/gpt-4',
    provider: 'mock',
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
    id: 'mock/claude',
    provider: 'mock',
    capabilities: {
      chat: true,
      streaming: true,
      tool_calls: true,
      vision: false,
      json_mode: true,
    },
    context_length: 200000,
    pricing: {
      prompt_per_million: 0.0,
      completion_per_million: 0.0,
      provenance: 'OFFICIAL',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
  {
    id: 'mock/fast',
    provider: 'mock',
    capabilities: {
      chat: true,
      streaming: true,
      tool_calls: false,
      vision: false,
      json_mode: true,
    },
    context_length: 32000,
    pricing: {
      prompt_per_million: 0.0,
      completion_per_million: 0.0,
      provenance: 'OFFICIAL',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
  {
    id: 'mock/error',
    provider: 'mock',
    capabilities: {
      chat: true,
      streaming: true,
      tool_calls: false,
      vision: false,
      json_mode: false,
    },
    context_length: 8000,
    pricing: {
      prompt_per_million: 0.0,
      completion_per_million: 0.0,
      provenance: 'OFFICIAL',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
  {
    id: 'mock/timeout',
    provider: 'mock',
    capabilities: {
      chat: true,
      streaming: true,
      tool_calls: false,
      vision: false,
      json_mode: false,
    },
    context_length: 8000,
    pricing: {
      prompt_per_million: 0.0,
      completion_per_million: 0.0,
      provenance: 'OFFICIAL',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Deterministic mock provider adapter for local testing and offline development.
 */
export class MockProviderAdapter implements IProviderAdapter {
  readonly id = 'mock';
  readonly name = 'Mock Provider';
  readonly models = MOCK_MODELS;

  constructor(private readonly latencyMs: number = 200) {}

  isConfigured(): boolean {
    return true;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  private getLastUserText(request: ChatCompletionRequest): string {
    const userMsg = [...request.messages].reverse().find((m) => m.role === 'user');
    return userMsg?.content || 'Hello';
  }

  private generateContent(request: ChatCompletionRequest): string {
    const lastUserText = this.getLastUserText(request);
    const snippet = lastUserText.length > 60 ? `${lastUserText.slice(0, 57)}...` : lastUserText;
    return `[Mock:${request.model}] Received: "${snippet}". Deterministic response completed successfully.`;
  }

  private calculateTokens(promptText: string, completionText: string) {
    const countWords = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
    const promptWords = Math.max(1, countWords(promptText));
    const completionWords = Math.max(1, countWords(completionText));
    const prompt_tokens = Math.ceil(promptWords * 1.3);
    const completion_tokens = Math.ceil(completionWords * 1.3);
    return {
      prompt_tokens,
      completion_tokens,
      total_tokens: prompt_tokens + completion_tokens,
    };
  }

  private checkSpecialSimulations(model: string): void {
    if (model === 'mock/error') {
      throw new ProviderError('Simulated mock provider failure', {
        status: 500,
        code: 'mock_error',
        retriable: true,
      });
    }
    if (model === 'mock/timeout') {
      throw new ProviderError('Simulated mock provider timeout', {
        status: 504,
        code: 'mock_timeout',
        retriable: true,
      });
    }
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    this.checkSpecialSimulations(request.model);

    const delay = request.model === 'mock/fast' ? 20 : this.latencyMs;
    await sleep(delay);

    const reply = this.generateContent(request);
    const allPromptText = request.messages.map((m) => m.content || '').join(' ');
    const usage = this.calculateTokens(allPromptText, reply);

    return {
      id: `chatcmpl-${nanoid()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: reply,
          },
          finish_reason: 'stop',
        },
      ],
      usage,
    };
  }

  async *chatStream(request: ChatCompletionRequest): AsyncGenerator<StreamChunk> {
    this.checkSpecialSimulations(request.model);

    const initialDelay = request.model === 'mock/fast' ? 10 : Math.min(this.latencyMs, 100);
    await sleep(initialDelay);

    const streamId = `chatcmpl-${nanoid()}`;
    const created = Math.floor(Date.now() / 1000);

    // Initial chunk with role
    yield {
      id: streamId,
      object: 'chat.completion.chunk',
      created,
      model: request.model,
      choices: [
        {
          index: 0,
          delta: { role: 'assistant', content: '' },
          finish_reason: null,
        },
      ],
    };

    const reply = this.generateContent(request);
    const words = reply.split(' ');

    for (let i = 0; i < words.length; i++) {
      await sleep(request.model === 'mock/fast' ? 5 : 20);
      const isLast = i === words.length - 1;
      const piece = isLast ? words[i] : `${words[i]} `;

      yield {
        id: streamId,
        object: 'chat.completion.chunk',
        created,
        model: request.model,
        choices: [
          {
            index: 0,
            delta: { content: piece },
            finish_reason: null,
          },
        ],
      };
    }

    const allPromptText = request.messages.map((m) => m.content || '').join(' ');
    const usage = this.calculateTokens(allPromptText, reply);

    // Final finish chunk
    yield {
      id: streamId,
      object: 'chat.completion.chunk',
      created,
      model: request.model,
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: 'stop',
        },
      ],
      usage,
    };
  }
}

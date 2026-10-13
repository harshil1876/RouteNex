import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  StreamChunk,
} from '../schemas.js';

export interface ModelEntry {
  id: string;
  provider: string;
  capabilities: {
    chat: boolean;
    streaming: boolean;
    tool_calls: boolean;
    vision: boolean;
    json_mode: boolean;
  };
  context_length?: number;
  pricing?: {
    prompt_per_million: number | null;
    completion_per_million: number | null;
    provenance: 'OFFICIAL' | 'ESTIMATED' | 'UNKNOWN';
    updated_at: string | null;
  };
}

export interface IProviderAdapter {
  readonly id: string;
  readonly name: string;
  readonly models: ModelEntry[];
  chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  chatStream(request: ChatCompletionRequest): AsyncGenerator<StreamChunk>;
  isConfigured(): boolean;
  healthCheck(): Promise<boolean>;
}

export interface ProviderErrorOptions {
  status?: number;
  code?: string;
  retriable?: boolean;
}

export class ProviderError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly retriable: boolean;

  constructor(message: string, options: ProviderErrorOptions = {}) {
    super(message);
    this.name = 'ProviderError';
    this.status = options.status ?? 500;
    this.code = options.code;
    this.retriable = options.retriable ?? (this.status === 429 || this.status >= 500);
  }
}

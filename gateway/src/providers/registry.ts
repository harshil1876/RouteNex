import type { AppConfig } from '../config.js';
import type { ModelInfo } from '../schemas.js';
import { AnthropicProviderAdapter } from './anthropic.js';
import { GeminiProviderAdapter } from './gemini.js';
import { GroqProviderAdapter } from './groq.js';
import { MockProviderAdapter } from './mock.js';
import { OllamaProviderAdapter } from './ollama.js';
import { OpenAIProviderAdapter } from './openai.js';
import type { IProviderAdapter, ModelEntry } from './types.js';

/**
 * Registry managing provider adapters and available models.
 */
export class ProviderRegistry {
  private readonly adapters: Map<string, IProviderAdapter> = new Map();

  constructor(appConfig: AppConfig) {
    // Always include mock provider
    const mock = new MockProviderAdapter(200);
    this.adapters.set(mock.id, mock);

    // Initialize Groq adapter
    const groq = new GroqProviderAdapter(appConfig.groqApiKey, appConfig.timeoutMs);
    this.adapters.set(groq.id, groq);

    // Initialize OpenAI adapter
    const openai = new OpenAIProviderAdapter(appConfig.openaiApiKey, appConfig.timeoutMs);
    this.adapters.set(openai.id, openai);

    // Initialize Gemini adapter
    const gemini = new GeminiProviderAdapter(appConfig.geminiApiKey, appConfig.timeoutMs);
    this.adapters.set(gemini.id, gemini);

    // Initialize Anthropic adapter
    const anthropic = new AnthropicProviderAdapter(appConfig.anthropicApiKey, appConfig.timeoutMs);
    this.adapters.set(anthropic.id, anthropic);

    // Initialize Ollama adapter
    const ollama = new OllamaProviderAdapter(appConfig.ollamaBaseUrl, appConfig.timeoutMs);
    this.adapters.set(ollama.id, ollama);
  }

  /**
   * Retrieves an adapter by its provider ID (e.g. 'mock', 'groq', 'openai').
   */
  getAdapter(providerId: string): IProviderAdapter | undefined {
    return this.adapters.get(providerId);
  }

  /**
   * Returns all provider adapters that are currently configured with credentials,
   * plus the mock provider.
   */
  getConfiguredAdapters(): IProviderAdapter[] {
    return Array.from(this.adapters.values()).filter(
      (adapter) => adapter.id === 'mock' || adapter.isConfigured()
    );
  }

  /**
   * Looks up an adapter by full or short model ID (e.g. 'groq/llama-3.3-70b-versatile' or 'gpt-4o-mini').
   */
  getAdapterForModel(modelId: string): IProviderAdapter | undefined {
    // 1. Direct provider prefix match
    const parts = modelId.split('/');
    if (parts.length > 1) {
      const providerId = parts[0];
      const adapter = this.adapters.get(providerId);
      if (adapter && (adapter.id === 'mock' || adapter.isConfigured())) {
        return adapter;
      }
    }

    // 2. Exact match against configured models
    for (const adapter of this.getConfiguredAdapters()) {
      if (adapter.models.some((m) => m.id === modelId || m.id.endsWith(`/${modelId}`))) {
        return adapter;
      }
    }

    return undefined;
  }

  /**
   * Returns a model entry matching the given ID.
   */
  getModel(modelId: string): ModelEntry | undefined {
    for (const adapter of this.getConfiguredAdapters()) {
      const match = adapter.models.find(
        (m) => m.id === modelId || m.id.endsWith(`/${modelId}`)
      );
      if (match) return match;
    }
    return undefined;
  }

  /**
   * Returns all available model entries from configured providers.
   */
  getAllModels(): ModelEntry[] {
    return this.getConfiguredAdapters().flatMap((a) => a.models);
  }

  /**
   * Converts a ModelEntry to OpenAI-compatible ModelInfo schema.
   */
  static toModelInfo(entry: ModelEntry): ModelInfo {
    return {
      id: entry.id,
      object: 'model',
      created: 1704067200, // 2024-01-01 epoch default
      owned_by: entry.provider,
      routenex: {
        provider: entry.provider,
        capabilities: entry.capabilities,
        context_length: entry.context_length,
        pricing: entry.pricing,
      },
    };
  }

  /**
   * Returns all models formatted as OpenAI ModelInfo objects.
   */
  getModelCatalog(): ModelInfo[] {
    return this.getAllModels().map((m) => ProviderRegistry.toModelInfo(m));
  }
}

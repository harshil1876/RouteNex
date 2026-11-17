import type { AppConfig } from '../config.js';
import type { ModelInfo } from '../schemas.js';
import { AnthropicProviderAdapter } from './anthropic.js';
import { GeminiProviderAdapter } from './gemini.js';
import { GroqProviderAdapter } from './groq.js';
import { MockProviderAdapter } from './mock.js';
import { OllamaProviderAdapter } from './ollama.js';
import { OpenAIProviderAdapter } from './openai.js';
import type { IProviderAdapter, ModelEntry } from './types.js';

import { PollinationsProviderAdapter } from './pollinations.js';
import { CerebrasProviderAdapter } from './cerebras.js';
import { DeepSeekProviderAdapter } from './deepseek.js';
import { MistralProviderAdapter } from './mistral.js';
import { SiliconFlowProviderAdapter } from './siliconflow.js';
import { DuckDuckGoProviderAdapter } from './duckduckgo.js';
import { OpenAICompatibleAdapter } from './openai-compatible.js';
import catalogData from './catalog.js';

/**
 * Registry managing provider adapters and available models.
 */
export class ProviderRegistry {
  private readonly adapters: Map<string, IProviderAdapter> = new Map();

  constructor(appConfig: AppConfig) {
    // Always include mock provider
    const mock = new MockProviderAdapter(200);
    this.adapters.set(mock.id, mock);

    // Free-Tier Zero-Key Providers
    const pollinations = new PollinationsProviderAdapter();
    this.adapters.set(pollinations.id, pollinations);

    const duckduckgo = new DuckDuckGoProviderAdapter();
    this.adapters.set(duckduckgo.id, duckduckgo);

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

    // Initialize Mistral adapter (1B Free Tokens/Mo tier)
    const mistral = new MistralProviderAdapter(appConfig.mistralApiKey || process.env.MISTRAL_API_KEY, appConfig.timeoutMs);
    this.adapters.set(mistral.id, mistral);

    // Initialize SiliconFlow adapter (Free reasoning tier)
    const siliconflow = new SiliconFlowProviderAdapter(appConfig.siliconflowApiKey || process.env.SILICONFLOW_API_KEY, appConfig.timeoutMs);
    this.adapters.set(siliconflow.id, siliconflow);

    // Initialize Ollama adapter
    const ollama = new OllamaProviderAdapter(appConfig.ollamaBaseUrl, appConfig.timeoutMs);
    this.adapters.set(ollama.id, ollama);

    // Initialize Cerebras adapter (Free tier)
    const cerebras = new CerebrasProviderAdapter(process.env.CEREBRAS_API_KEY, appConfig.timeoutMs);
    this.adapters.set(cerebras.id, cerebras);

    // Initialize DeepSeek adapter
    const deepseek = new DeepSeekProviderAdapter(process.env.DEEPSEEK_API_KEY, appConfig.timeoutMs);
    this.adapters.set(deepseek.id, deepseek);

    // Initialize 40+ Declarative Catalog Providers
    for (const entry of (catalogData as unknown as any[])) {
      if (!this.adapters.has(entry.id)) {
        const envKey = entry.envKey ? process.env[entry.envKey] : undefined;
        const adapter = new OpenAICompatibleAdapter({
          id: entry.id,
          name: entry.name,
          baseUrl: entry.baseUrl,
          apiKey: envKey,
          models: entry.models || [],
          tos_status: entry.tos_status || 'official',
        });
        this.adapters.set(entry.id, adapter);
      }
    }
  }

  /**
   * Configures or updates the API key (and optional baseUrl) for any provider.
   * Supports dedicated adapters, 120+ declarative catalog providers, and custom providers.
   * Also supports "free" for OpenRouter to route :free models without requiring a paid key.
   */
  configureProviderKey(providerId: string, apiKey: string, baseUrl?: string): void {
    const trimmedKey = apiKey?.trim() || '';
    const isFreeOpenRouter = providerId === 'openrouter' && trimmedKey.toLowerCase() === 'free';
    const effectiveKey = isFreeOpenRouter ? 'free' : trimmedKey;

    // 1. Dedicated adapters
    if (providerId === 'groq') {
      this.adapters.set('groq', new GroqProviderAdapter(effectiveKey));
      return;
    }
    if (providerId === 'openai') {
      this.adapters.set('openai', new OpenAIProviderAdapter(effectiveKey));
      return;
    }
    if (providerId === 'gemini') {
      this.adapters.set('gemini', new GeminiProviderAdapter(effectiveKey));
      return;
    }
    if (providerId === 'anthropic') {
      this.adapters.set('anthropic', new AnthropicProviderAdapter(effectiveKey));
      return;
    }
    if (providerId === 'cerebras') {
      this.adapters.set('cerebras', new CerebrasProviderAdapter(effectiveKey));
      return;
    }
    if (providerId === 'deepseek') {
      this.adapters.set('deepseek', new DeepSeekProviderAdapter(effectiveKey));
      return;
    }
    if (providerId === 'ollama') {
      this.adapters.set('ollama', new OllamaProviderAdapter(baseUrl || 'http://localhost:11434/v1'));
      return;
    }
    if (providerId === 'mistral') {
      this.adapters.set('mistral', new MistralProviderAdapter(effectiveKey));
      return;
    }
    if (providerId === 'siliconflow') {
      this.adapters.set('siliconflow', new SiliconFlowProviderAdapter(effectiveKey));
      return;
    }

    // 2. Existing adapter in map (e.g. OpenAICompatibleAdapter or catalog entry)
    const existing = this.adapters.get(providerId);
    if (existing && typeof (existing as any).setApiKey === 'function') {
      (existing as any).setApiKey(effectiveKey);
      return;
    }

    // 3. Look up in declarative catalog
    const catalogEntry = (catalogData as unknown as any[]).find((c) => c.id === providerId);
    if (catalogEntry) {
      const adapter = new OpenAICompatibleAdapter({
        id: catalogEntry.id,
        name: catalogEntry.name,
        baseUrl: baseUrl || catalogEntry.baseUrl,
        apiKey: effectiveKey,
        models: catalogEntry.models || [],
        tos_status: catalogEntry.tos_status || 'official',
      });
      this.adapters.set(catalogEntry.id, adapter);
      return;
    }

    // 4. Custom generic OpenAI-compatible provider
    const customAdapter = new OpenAICompatibleAdapter({
      id: providerId,
      name: providerId,
      baseUrl: baseUrl || 'https://api.openai.com/v1',
      apiKey: effectiveKey,
      models: [],
    });
    this.adapters.set(providerId, customAdapter);
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
   * If not found statically, dynamically synthesizes a ModelEntry for custom model IDs
   * formatted as <provider>/<modelName> when the provider is registered or in catalog.
   */
  getModel(modelId: string): ModelEntry | undefined {
    // 1. Check configured adapters first
    for (const adapter of this.getConfiguredAdapters()) {
      const match = adapter.models.find(
        (m) => m.id === modelId || m.id.endsWith(`/${modelId}`)
      );
      if (match) return match;
    }

    // 2. Dynamically synthesize ModelEntry for custom model IDs (e.g. nvidia/deepseek-r1, openrouter/deepseek/deepseek-r1:free)
    const slashIdx = modelId.indexOf('/');
    if (slashIdx > 0) {
      const providerPrefix = modelId.slice(0, slashIdx);
      if (providerPrefix === 'anthropic') {
        const anthropicAdapter = this.adapters.get('anthropic');
        if (!anthropicAdapter || !anthropicAdapter.isConfigured()) {
          return undefined;
        }
      }
      const adapter = this.adapters.get(providerPrefix);
      const inCatalog = (catalogData as unknown as any[]).some((c) => c.id === providerPrefix);
      if (adapter || inCatalog) {
        return {
          id: modelId,
          provider: providerPrefix,
          capabilities: {
            chat: true,
            streaming: true,
            tool_calls: true,
            vision: false,
            json_mode: true,
          },
          context_length: 128000,
          pricing: {
            prompt_per_million: 0,
            completion_per_million: 0,
            provenance: 'OFFICIAL',
            updated_at: '2026-01-01T00:00:00Z',
          },
        };
      }
    }

    return undefined;
  }

  /**
   * Returns available model entries.
   */
  getAllModels(configuredOnly = false): ModelEntry[] {
    const list = configuredOnly ? this.getConfiguredAdapters() : Array.from(this.adapters.values());
    return list.flatMap((a) => a.models);
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

  /**
   * Returns all provider adapters in the registry.
   */
  getAllProviders(): IProviderAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Retrieves a provider by id.
   */
  getProvider(providerId: string): IProviderAdapter | undefined {
    return this.adapters.get(providerId);
  }

  /**
   * Dynamically registers or updates an adapter.
   */
  register(adapter: IProviderAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }
}

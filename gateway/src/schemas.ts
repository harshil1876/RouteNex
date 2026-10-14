// ─── RouteNex Gateway — Shared Zod Schemas ──────────────────────────
// These schemas define the OpenAI-compatible API contract used by RouteNex.
// They are shared between validation, provider adapters, and the dashboard.

import { z } from 'zod';

// ── Message Schema ───────────────────────────────────────────────────
export const MessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.union([z.string(), z.null()]).optional(),
  name: z.string().optional(),
  tool_calls: z.array(z.object({
    id: z.string(),
    type: z.literal('function'),
    function: z.object({
      name: z.string(),
      arguments: z.string(),
    }),
  })).optional(),
  tool_call_id: z.string().optional(),
});

export type Message = z.infer<typeof MessageSchema>;

// ── Provider Preferences (OpenRouter-compatible) ─────────────────────
export const ProviderPreferencesSchema = z.object({
  order: z.array(z.string()).optional(),
  allow_fallbacks: z.boolean().default(true),
  sort: z.enum([
    'price',
    'latency',
    'throughput',
    'balanced',
    'lkgp',
    'headroom',
    'reset-window',
    'cache-optimized',
  ]).optional(),
  ignore: z.array(z.string()).optional(),
  only: z.array(z.string()).optional(),
  max_price: z.object({
    prompt: z.number().optional(),
    completion: z.number().optional(),
  }).optional(),
  allow_caution: z.boolean().optional(),
  allow_caution_fallback: z.boolean().optional(),
}).optional();

export type ProviderPreferences = z.infer<typeof ProviderPreferencesSchema>;

// ── Chat Completions Request ─────────────────────────────────────────
export const ChatCompletionRequestSchema = z.object({
  model: z.string().default('auto'),
  messages: z.array(MessageSchema).min(1),
  // OpenRouter-style model fallback array
  models: z.array(z.string()).optional(),
  // Provider routing preferences
  provider: ProviderPreferencesSchema,
  // Standard OpenAI parameters
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  max_tokens: z.number().int().positive().optional(),
  stream: z.boolean().default(false),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  n: z.number().int().positive().default(1),
  user: z.string().optional(),
  compress: z.boolean().optional(),
  // Tool calling
  tools: z.array(z.object({
    type: z.literal('function'),
    function: z.object({
      name: z.string(),
      description: z.string().optional(),
      parameters: z.record(z.unknown()).optional(),
    }),
  })).optional(),
  tool_choice: z.union([
    z.literal('none'),
    z.literal('auto'),
    z.literal('required'),
    z.object({
      type: z.literal('function'),
      function: z.object({ name: z.string() }),
    }),
  ]).optional(),
  response_format: z.any().optional(),
});

export type ChatCompletionRequest = z.infer<typeof ChatCompletionRequestSchema>;

// ── Chat Completions Response ────────────────────────────────────────
export const ChatCompletionResponseSchema = z.object({
  id: z.string(),
  object: z.literal('chat.completion'),
  created: z.number(),
  model: z.string(),
  choices: z.array(z.object({
    index: z.number(),
    message: MessageSchema,
    finish_reason: z.enum(['stop', 'length', 'tool_calls', 'content_filter']).nullable(),
  })),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
  }).optional(),
  // RouteNex-specific metadata
  routenex: z.object({
    request_id: z.string(),
    provider: z.string(),
    model_used: z.string(),
    routing_reason: z.string(),
    latency_ms: z.number(),
    cost_estimate: z.object({
      total_usd: z.number().nullable(),
      provenance: z.enum(['MEASURED', 'ESTIMATED', 'UNKNOWN']),
      price_timestamp: z.string().nullable(),
    }).optional(),
    fallback_attempts: z.number().default(0),
    cache_hit: z.boolean().optional(),
    compression: z.object({
      original_chars: z.number(),
      compressed_chars: z.number(),
      saved_percent: z.number(),
      estimated_tokens_saved: z.number(),
    }).optional(),
  }).optional(),
});

export type ChatCompletionResponse = z.infer<typeof ChatCompletionResponseSchema>;

// ── Streaming Chunk ──────────────────────────────────────────────────
export const StreamChunkSchema = z.object({
  id: z.string(),
  object: z.literal('chat.completion.chunk'),
  created: z.number(),
  model: z.string(),
  choices: z.array(z.object({
    index: z.number(),
    delta: z.object({
      role: z.enum(['system', 'user', 'assistant', 'tool']).optional(),
      content: z.string().nullable().optional(),
      tool_calls: z.array(z.object({
        index: z.number(),
        id: z.string().optional(),
        type: z.literal('function').optional(),
        function: z.object({
          name: z.string().optional(),
          arguments: z.string().optional(),
        }).optional(),
      })).optional(),
    }),
    finish_reason: z.enum(['stop', 'length', 'tool_calls', 'content_filter']).nullable(),
  })),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
  }).optional().nullable(),
});

export type StreamChunk = z.infer<typeof StreamChunkSchema>;

// ── Model Info ───────────────────────────────────────────────────────
export const ModelInfoSchema = z.object({
  id: z.string(),
  object: z.literal('model'),
  created: z.number(),
  owned_by: z.string(),
  // RouteNex extensions
  routenex: z.object({
    provider: z.string(),
    capabilities: z.object({
      chat: z.boolean().default(true),
      streaming: z.boolean().default(true),
      tool_calls: z.boolean().default(false),
      vision: z.boolean().default(false),
      json_mode: z.boolean().default(false),
    }),
    context_length: z.number().optional(),
    pricing: z.object({
      prompt_per_million: z.number().nullable(),
      completion_per_million: z.number().nullable(),
      provenance: z.enum(['OFFICIAL', 'ESTIMATED', 'UNKNOWN']),
      updated_at: z.string().nullable(),
    }).optional(),
  }).optional(),
});

export type ModelInfo = z.infer<typeof ModelInfoSchema>;

// ── Routing Explanation ──────────────────────────────────────────────
export const RoutingExplanationSchema = z.object({
  request_id: z.string(),
  model_requested: z.string(),
  model_selected: z.string().nullable(),
  provider_selected: z.string().nullable(),
  reason: z.string(),
  reason_code: z.enum([
    'EXPLICIT_MODEL',
    'CAPABILITY_MATCH',
    'COST_MINIMIZED',
    'LATENCY_MINIMIZED',
    'BALANCED',
    'FALLBACK_CHAIN',
    'NO_ELIGIBLE_MODEL',
    'CIRCUIT_OPEN',
    'BUDGET_EXCEEDED',
    'LKGP_PINNED',
    'HEADROOM_MAXIMIZED',
    'RESET_WINDOW_OPTIMIZED',
    'CACHE_AFFINITY',
  ]),
  candidates_evaluated: z.array(z.object({
    model: z.string(),
    provider: z.string(),
    eligible: z.boolean(),
    rejection_reason: z.string().optional(),
    score: z.number().optional(),
  })),
  fallback_chain: z.array(z.string()),
});

export type RoutingExplanation = z.infer<typeof RoutingExplanationSchema>;

// ── Gateway Configuration ────────────────────────────────────────────
export const GatewayConfigSchema = z.object({
  port: z.number().default(3001),
  host: z.string().default('127.0.0.1'),
  auth: z.object({
    enabled: z.boolean().default(false),
    api_key: z.string().optional(),
  }).default({}),
  providers: z.record(z.object({
    api_key: z.string(),
    base_url: z.string().optional(),
    enabled: z.boolean().default(true),
    priority: z.number().default(0),
    rate_limit_rpm: z.number().optional(),
  })).default({}),
  routing: z.object({
    default_strategy: z.enum(['explicit', 'cost', 'latency', 'balanced']).default('balanced'),
    max_retries: z.number().int().min(0).max(5).default(2),
    timeout_ms: z.number().int().positive().default(60000),
    fallback_enabled: z.boolean().default(true),
  }).default({}),
  persistence: z.object({
    enabled: z.boolean().default(true),
    db_path: z.string().default('./routenex.db'),
    log_prompts: z.boolean().default(false),
  }).default({}),
  mock: z.object({
    enabled: z.boolean().default(false),
    latency_ms: z.number().default(200),
  }).default({}),
});

export type GatewayConfig = z.infer<typeof GatewayConfigSchema>;

// ── API Error ────────────────────────────────────────────────────────
export const ApiErrorSchema = z.object({
  error: z.object({
    message: z.string(),
    type: z.enum([
      'invalid_request_error',
      'authentication_error',
      'rate_limit_error',
      'provider_error',
      'routing_error',
      'internal_error',
    ]),
    code: z.string().nullable(),
    param: z.string().nullable(),
  }),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

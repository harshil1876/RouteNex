// Declarative Provider Catalog for RouteNex Universal Adapters
export const CATALOG_PROVIDERS = [
  {
    "id": "nvidia",
    "name": "NVIDIA NIM",
    "baseUrl": "https://integrate.api.nvidia.com/v1",
    "envKey": "NVIDIA_API_KEY",
    "category": "FREE",
    "freeTier": true,
    "badge": "1,000 Free Credits / NIM Microservices",
    "models": [
      {
        "id": "nvidia/meta/llama-3.1-405b-instruct",
        "provider": "nvidia",
        "capabilities": {
          "chat": true,
          "streaming": true,
          "tool_calls": true,
          "vision": false,
          "json_mode": true
        },
        "context_length": 128000,
        "pricing": {
          "prompt_per_million": 0,
          "completion_per_million": 0,
          "provenance": "OFFICIAL",
          "updated_at": "2026-01-01T00:00:00Z"
        }
      },
      {
        "id": "nvidia/nvidia/nemotron-4-340b-instruct",
        "provider": "nvidia",
        "capabilities": {
          "chat": true,
          "streaming": true,
          "tool_calls": true,
          "vision": false,
          "json_mode": true
        },
        "context_length": 4096,
        "pricing": {
          "prompt_per_million": 0,
          "completion_per_million": 0,
          "provenance": "OFFICIAL",
          "updated_at": "2026-01-01T00:00:00Z"
        }
      }
    ],
    "tos_status": "official"
  },
  {
    "id": "openrouter",
    "name": "OpenRouter",
    "baseUrl": "https://openrouter.ai/api/v1",
    "envKey": "OPENROUTER_API_KEY",
    "category": "FREE",
    "freeTier": true,
    "badge": ":free Models Available",
    "models": [
      {
        "id": "openrouter/auto",
        "provider": "openrouter",
        "capabilities": {
          "chat": true,
          "streaming": true,
          "tool_calls": true,
          "vision": true,
          "json_mode": true
        },
        "context_length": 128000,
        "pricing": {
          "prompt_per_million": null,
          "completion_per_million": null,
          "provenance": "UNKNOWN",
          "updated_at": null
        }
      },
      {
        "id": "openrouter/meta-llama/llama-3.1-8b-instruct:free",
        "provider": "openrouter",
        "capabilities": {
          "chat": true,
          "streaming": true,
          "tool_calls": false,
          "vision": false,
          "json_mode": true
        },
        "context_length": 131072,
        "pricing": {
          "prompt_per_million": 0,
          "completion_per_million": 0,
          "provenance": "OFFICIAL",
          "updated_at": "2026-01-01T00:00:00Z"
        }
      }
    ],
    "tos_status": "official"
  },
  {
    "id": "together",
    "name": "Together AI",
    "baseUrl": "https://api.together.xyz/v1",
    "envKey": "TOGETHER_API_KEY",
    "category": "API_KEY",
    "badge": "High Throughput Serverless",
    "models": [
      {
        "id": "together/meta-llama/Llama-3.3-70B-Instruct-Turbo",
        "provider": "together",
        "capabilities": {
          "chat": true,
          "streaming": true,
          "tool_calls": true,
          "vision": false,
          "json_mode": true
        },
        "context_length": 131072,
        "pricing": {
          "prompt_per_million": 0.88,
          "completion_per_million": 0.88,
          "provenance": "OFFICIAL",
          "updated_at": "2026-01-01T00:00:00Z"
        }
      },
      {
        "id": "together/Qwen/Qwen2.5-Coder-32B-Instruct",
        "provider": "together",
        "capabilities": {
          "chat": true,
          "streaming": true,
          "tool_calls": true,
          "vision": false,
          "json_mode": true
        },
        "context_length": 32768,
        "pricing": {
          "prompt_per_million": 0.8,
          "completion_per_million": 0.8,
          "provenance": "OFFICIAL",
          "updated_at": "2026-01-01T00:00:00Z"
        }
      }
    ],
    "tos_status": "official"
  },
  {
    "id": "fireworks",
    "name": "Fireworks AI",
    "baseUrl": "https://api.fireworks.ai/inference/v1",
    "envKey": "FIREWORKS_API_KEY",
    "category": "API_KEY",
    "badge": "Sub-100ms Inference",
    "models": [
      {
        "id": "fireworks/accounts/fireworks/models/llama-v3p3-70b-instruct",
        "provider": "fireworks",
        "capabilities": {
          "chat": true,
          "streaming": true,
          "tool_calls": true,
          "vision": false,
          "json_mode": true
        },
        "context_length": 131072,
        "pricing": {
          "prompt_per_million": 0.9,
          "completion_per_million": 0.9,
          "provenance": "OFFICIAL",
          "updated_at": "2026-01-01T00:00:00Z"
        }
      }
    ],
    "tos_status": "official"
  },
  {
    "id": "sambanova",
    "name": "SambaNova Systems",
    "baseUrl": "https://api.sambanova.ai/v1",
    "envKey": "SAMBANOVA_API_KEY",
    "category": "FREE",
    "freeTier": true,
    "badge": "Free Tier Available",
    "models": [
      {
        "id": "sambanova/Meta-Llama-3.3-70B-Instruct",
        "provider": "sambanova",
        "capabilities": {
          "chat": true,
          "streaming": true,
          "tool_calls": true,
          "vision": false,
          "json_mode": true
        },
        "context_length": 65536,
        "pricing": {
          "prompt_per_million": 0,
          "completion_per_million": 0,
          "provenance": "OFFICIAL",
          "updated_at": "2026-01-01T00:00:00Z"
        }
      }
    ],
    "tos_status": "official"
  },
  {
    "id": "deepinfra",
    "name": "DeepInfra",
    "baseUrl": "https://api.deepinfra.com/v1/openai",
    "envKey": "DEEPINFRA_API_KEY",
    "category": "API_KEY",
    "badge": "Cost Efficient Inference",
    "models": [
      {
        "id": "deepinfra/meta-llama/Meta-Llama-3.1-8B-Instruct",
        "provider": "deepinfra",
        "capabilities": {
          "chat": true,
          "streaming": true,
          "tool_calls": true,
          "vision": false,
          "json_mode": true
        },
        "context_length": 128000,
        "pricing": {
          "prompt_per_million": 0.05,
          "completion_per_million": 0.08,
          "provenance": "OFFICIAL",
          "updated_at": "2026-01-01T00:00:00Z"
        }
      }
    ],
    "tos_status": "official"
  },
  {
    "id": "xai",
    "name": "xAI (Grok)",
    "baseUrl": "https://api.x.ai/v1",
    "envKey": "XAI_API_KEY",
    "category": "API_KEY",
    "badge": "Frontier Reasoning & Vision",
    "models": [
      {
        "id": "xai/grok-2-1212",
        "provider": "xai",
        "capabilities": {
          "chat": true,
          "streaming": true,
          "tool_calls": true,
          "vision": true,
          "json_mode": true
        },
        "context_length": 131072,
        "pricing": {
          "prompt_per_million": 2,
          "completion_per_million": 10,
          "provenance": "OFFICIAL",
          "updated_at": "2026-01-01T00:00:00Z"
        }
      },
      {
        "id": "xai/grok-2-vision-1212",
        "provider": "xai",
        "capabilities": {
          "chat": true,
          "streaming": true,
          "tool_calls": true,
          "vision": true,
          "json_mode": true
        },
        "context_length": 32768,
        "pricing": {
          "prompt_per_million": 2,
          "completion_per_million": 10,
          "provenance": "OFFICIAL",
          "updated_at": "2026-01-01T00:00:00Z"
        }
      }
    ],
    "tos_status": "official"
  },
  {
    "id": "perplexity",
    "name": "Perplexity AI",
    "baseUrl": "https://api.perplexity.ai",
    "envKey": "PERPLEXITY_API_KEY",
    "category": "API_KEY",
    "badge": "Live Web Search & Grounding",
    "models": [
      {
        "id": "perplexity/sonar-pro",
        "provider": "perplexity",
        "capabilities": {
          "chat": true,
          "streaming": true,
          "tool_calls": false,
          "vision": false,
          "json_mode": false
        },
        "context_length": 127072,
        "pricing": {
          "prompt_per_million": 3,
          "completion_per_million": 15,
          "provenance": "OFFICIAL",
          "updated_at": "2026-01-01T00:00:00Z"
        }
      },
      {
        "id": "perplexity/sonar",
        "provider": "perplexity",
        "capabilities": {
          "chat": true,
          "streaming": true,
          "tool_calls": false,
          "vision": false,
          "json_mode": false
        },
        "context_length": 127072,
        "pricing": {
          "prompt_per_million": 1,
          "completion_per_million": 1,
          "provenance": "OFFICIAL",
          "updated_at": "2026-01-01T00:00:00Z"
        }
      }
    ],
    "tos_status": "official"
  },
  {
    "id": "zhipu",
    "name": "Zhipu AI (GLM)",
    "baseUrl": "https://open.bigmodel.cn/api/paas/v4",
    "envKey": "ZHIPU_API_KEY",
    "category": "FREE",
    "freeTier": true,
    "badge": "GLM-4-Flash 100% Free",
    "models": [
      {
        "id": "zhipu/glm-4-flash",
        "provider": "zhipu",
        "capabilities": {
          "chat": true,
          "streaming": true,
          "tool_calls": true,
          "vision": false,
          "json_mode": true
        },
        "context_length": 128000,
        "pricing": {
          "prompt_per_million": 0,
          "completion_per_million": 0,
          "provenance": "OFFICIAL",
          "updated_at": "2026-01-01T00:00:00Z"
        }
      }
    ],
    "tos_status": "official"
  },
  {
    "id": "lmstudio",
    "name": "LM Studio Local",
    "baseUrl": "http://localhost:1234/v1",
    "category": "LOCAL",
    "freeTier": true,
    "badge": "100% Private Local",
    "models": [
      {
        "id": "lmstudio/local-model",
        "provider": "lmstudio",
        "capabilities": {
          "chat": true,
          "streaming": true,
          "tool_calls": false,
          "vision": false,
          "json_mode": true
        },
        "context_length": 32768,
        "pricing": {
          "prompt_per_million": 0,
          "completion_per_million": 0,
          "provenance": "OFFICIAL",
          "updated_at": "2026-01-01T00:00:00Z"
        }
      }
    ],
    "tos_status": "official"
  },
  {
    "id": "vllm",
    "name": "vLLM High-Performance Local",
    "baseUrl": "http://localhost:8000/v1",
    "category": "LOCAL",
    "freeTier": true,
    "badge": "PagedAttention Engine",
    "models": [
      {
        "id": "vllm/default",
        "provider": "vllm",
        "capabilities": {
          "chat": true,
          "streaming": true,
          "tool_calls": true,
          "vision": false,
          "json_mode": true
        },
        "context_length": 65536,
        "pricing": {
          "prompt_per_million": 0,
          "completion_per_million": 0,
          "provenance": "OFFICIAL",
          "updated_at": "2026-01-01T00:00:00Z"
        }
      }
    ],
    "tos_status": "official"
  }
] as const;
export default CATALOG_PROVIDERS;

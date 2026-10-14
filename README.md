# 🚀 RouteNex — The Intelligent Open-Source AI Gateway

[![License: MIT OR Apache-2.0](https://img.shields.io/badge/License-MIT%20OR%20Apache--2.0-blue.svg)](LICENSE)
[![Tests Passing](https://img.shields.io/badge/Tests-31%2F31%20Passing-emerald.svg)](https://github.com/harshil1876/RouteNex)
[![Free Tokens](https://img.shields.io/badge/Free%20Tokens-~1.62B%2Fmonth-purple.svg)](https://github.com/harshil1876/RouteNex)
[![OpenAI Compatible](https://img.shields.io/badge/API-OpenAI%20Compatible-black.svg)](https://github.com/harshil1876/RouteNex)

> **One API. Your provider keys. Routing you can understand.**  
> Stop paying AI proxy markups. Aggregate over 1.6 Billion free tokens per month, survive provider rate limits with 3-layer resilience, and connect Cursor, Claude Code, Cline, or any OpenAI client in 30 seconds.

---

## ⚡ Instant Start (Zero Install)

Run RouteNex directly on your machine with one command. It starts both the **AI Gateway API** and the **Web Dashboard** with free-tier pools and local keys enabled:

```bash
npx routenex --open
```

* **Web Console**: [http://127.0.0.1:3001/dashboard](http://127.0.0.1:3001/dashboard)
* **OpenAI Endpoint**: `http://127.0.0.1:3001/v1/chat/completions`
* **Local Virtual Key**: `rn-local-dev-default` (or unauthenticated on localhost)

---

## 🎁 Free-Tier Pool Aggregator (~1.62 Billion Free Tokens/mo)

RouteNex connects directly to verified zero-cost and developer-tier allowances:

| Provider | Allowance | Key Required | Highlight Models |
| :--- | :--- | :--- | :--- |
| **Mistral AI** | **1,000,000,000 tokens / mo** | Free Developer Key | `codestral-latest`, `mistral-small-latest` |
| **Pollinations AI** | **~500,000,000 tokens / mo** | ❌ None (Zero-Key) | `pollinations/openai`, `pollinations/qwen` |
| **Cerebras Cloud** | **1,000,000 tokens / day** | Free Developer Key | `cerebras/llama-3.3-70b` (2,000 tok/sec) |
| **Groq Cloud** | **14,400 requests / day** | Free Developer Key | `groq/llama-3.3-70b-versatile`, `llama-3.1-8b` |
| **SiliconFlow** | **~50,000,000 tokens / mo** | Free Developer Key | `deepseek-ai/DeepSeek-V3`, `DeepSeek-R1` |
| **Google AI Studio**| **1,500 requests / day** | Free Developer Key | `gemini/gemini-2.5-flash`, `gemini-2.5-pro` |
| **DuckDuckGo AI** | **~20,000,000 tokens / mo** | ❌ None (Zero-Key) | `duckduckgo/gpt-4o-mini`, `claude-3-haiku` |

---

## 🛡️ 3-Layer Resilience Engine

When building autonomous coding agents, upstream downtime ruins workflows. RouteNex implements a domain-hardened resilience engine:

```
Request ──▶ [Layer 1: Provider Circuit Breaker] (Isolates cascading 5xx & timeouts)
                │ (Healthy)
                ▼
            [Layer 2: Key Cooldown]             (Backs off on 429 without dropping other keys)
                │ (Healthy)
                ▼
            [Layer 3: Model Lockout]            (Isolates 1 overloaded model without killing provider)
                │ (Healthy)
                ▼
            Upstream Inference Execution
```

1. **Layer 1 (Provider Breaker)**: Automatically opens on 3 consecutive 5xx failures or connection timeouts; initiates a 30s cooldown with half-open probe recovery.
2. **Layer 2 (Key Cooldown)**: Automatically parses `Retry-After` headers on HTTP 429 rate limits and cools down that specific key while sibling keys continue serving traffic.
3. **Layer 3 (Model Lockout)**: If a specific model is overloaded (HTTP 503) or deprecated (404), RouteNex locks only that model ID while allowing other models under the same provider to run.

---

## 🔀 Provider Combos (Failover Clusters)

Like OpenRouter and OmniRoute, RouteNex lets you request clusters that automatically cascade to the next target if the primary fails:

```json
{
  "model": "combo/free-unlimited",
  "messages": [{"role": "user", "content": "Write a quicksort in Rust"}]
}
```

* **`combo/free-unlimited`**: `groq/llama-3.3-70b-versatile` ➔ `cerebras/llama-3.3-70b` ➔ `pollinations/openai`
* **`combo/coding-power`**: `mistral/codestral-latest` ➔ `siliconflow/deepseek-ai/DeepSeek-V3` ➔ `openai/gpt-4o-mini`

---

## 🤖 Coding Agent Integrations (30 Seconds)

### Cursor IDE
1. Open **Cursor Settings** ➔ **Models** ➔ **OpenAI API Key**.
2. Set **Override OpenAI Base URL**: `http://localhost:3001/v1`
3. Enter API Key: `rn-local-dev-default`

### Claude Code CLI
```bash
export ANTHROPIC_BASE_URL="http://localhost:3001/v1"
claude --model combo/coding-power
```

### Cline (VS Code Extension)
1. Select Provider: **OpenAI Compatible**
2. Base URL: `http://localhost:3001/v1`
3. API Key: `rn-local-dev-default`
4. Model ID: `combo/free-unlimited`

---

## 🏛️ Product Editions: Open Source vs RouteNex Cloud

| Capability | RouteNex Open Source (OSS) | RouteNex Cloud (SaaS) |
| :--- | :---: | :---: |
| **Deployment** | 100% Self-Hosted (`npx routenex` or Docker) | Hosted Edge (`api.routenex.com`) |
| **Pricing** | Free Forever (MIT / Apache-2.0) | Managed Subscription & Pay-As-You-Go |
| **Authentication** | Local Virtual Keys (`rn-local-...`) | Hosted JWT & SAML SSO / OAuth |
| **Free-Tier Pools** | ✅ Yes (1.62B Free Tokens Aggregator) | ✅ Yes |
| **Provider BYOK** | ✅ Yes (Local Encrypted / JSON) | ✅ Yes (Vault Stored) |
| **Prompt Privacy** | 100% Local (Never leaves your machine) | Managed Edge Processing |
| **Team Workspaces & RBAC** | Single-User Local Console | Multi-Tenant (Owner, Admin, Developer) |
| **Spend Caps & Budget Quotas**| In-memory alerts | Hard Dollar Spend Caps per Key/Workspace |
| **Managed Edge Routing** | Localhost / LAN | Global POPs (US, EU, APAC) with 99.9% SLA |

---

## 🐳 Docker Deployment

Run RouteNex in Docker with persistent configuration storage:

```bash
docker compose up -d
```

The gateway API and Web Console will be available immediately at `http://localhost:3001`.

---

## 🧪 Testing & Verification

```bash
# Run Vitest API & Router test suite (31 tests)
npm run test:api

# Run full production build (Astro static + Gateway TypeScript)
npm run build
```

---

## 📄 License

Dual-licensed under the **[MIT License](LICENSE)** and the **[Apache License 2.0](LICENSE-APACHE)** at your option.

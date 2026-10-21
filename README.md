# 🚀 RouteNex — The Intelligent Open-Source AI Gateway & Agent Control Plane

[![npm version](https://img.shields.io/npm/v/routenex.svg?color=blue)](https://www.npmjs.com/package/routenex)
[![License: MIT OR Apache-2.0](https://img.shields.io/badge/License-MIT%20OR%20Apache--2.0-blue.svg)](LICENSE)
[![Tests Passing](https://img.shields.io/badge/Tests-73%2F73%20Passing-emerald.svg)](https://github.com/harshil1876/RouteNex)
[![Free Tokens](https://img.shields.io/badge/Free%20Tokens-~1.62B%2Fmonth-purple.svg)](https://github.com/harshil1876/RouteNex)
[![OpenAI Compatible](https://img.shields.io/badge/API-OpenAI%20%26%20Anthropic%20Compatible-black.svg)](https://github.com/harshil1876/RouteNex)
[![MCP Protocol](https://img.shields.io/badge/Protocol-Model%20Context%20Protocol%20(MCP)-orange.svg)](https://github.com/harshil1876/RouteNex)

> **One API. Your provider keys. Routing you can understand.**  
> Stop paying AI proxy markups. Aggregate over 1.6 Billion free tokens per month, survive upstream provider rate limits with 3-layer resilience, compress prompt bloat by 30-55% with LexiPack, and connect Cursor, Claude Code, Cline, or any OpenAI client in 30 seconds.

---

## Table of Contents

- [⚡ Instant Start (Zero Install)](#-instant-start-zero-install)
- [💻 Drop-In SDK Examples](#-drop-in-sdk-examples)
- [🎁 Free-Tier Pool Aggregator (~1.62B Tokens/mo)](#-free-tier-pool-aggregator-162b-tokensmo)
- [🛡️ 3-Layer Resilience Engine](#️-3-layer-resilience-engine)
- [🗜️ 4-Stage LexiPack Token Optimizer](#️-4-stage-lexipack-token-optimizer)
- [🔀 Grouped Model Combos & Failover Chains](#-grouped-model-combos--failover-chains)
- [🤖 One-Command Coding Agent Launcher](#-one-command-coding-agent-launcher)
- [🔌 Built-In Model Context Protocol (MCP) Server](#-built-in-model-context-protocol-mcp-server)
- [🧠 19 Deterministic Routing Strategies](#-19-deterministic-routing-strategies)
- [🌐 Supported Providers & Model Catalog (200+)](#-supported-providers--model-catalog-200)
- [📊 RouteNex Studio (Local Web Console on :3001)](#-routenex-studio-local-web-console-on-3001)
- [🐳 Docker & Self-Hosting](#-docker--self-hosting)
- [🔒 Security & Anti-Crash Hardening](#-security--anti-crash-hardening)
- [🏛️ Product Editions: Open Source vs RouteNex Cloud](#️-product-editions-open-source-vs-routenex-cloud)
- [⚖️ Dual License (MIT OR Apache-2.0)](#️-dual-license-mit-or-apache-20)
- [🤝 Contributing](#-contributing)

---

## ⚡ Instant Start (Zero Install)

Run RouteNex directly on your machine with one command. It starts both the **high-throughput AI Gateway API** and the **local RouteNex Studio console** with free-tier pools and local encrypted keystores:

```bash
npx routenex
```

* **Web Console**: [http://127.0.0.1:3001/dashboard](http://127.0.0.1:3001/dashboard)
* **OpenAI Endpoint**: `http://127.0.0.1:3001/v1/chat/completions`
* **Anthropic Endpoint**: `http://127.0.0.1:3001/v1/messages`
* **MCP Stdio Server**: `npx routenex --mcp`
* **Local Master Key**: `rn-local-dev-default` (or unauthenticated on localhost)
* **Default Console Password**: `routenex-admin`

---

## 💻 Drop-In SDK Examples

RouteNex is a drop-in replacement for OpenAI and Anthropic SDKs. Simply update the `base_url` or `baseURL`:

### Python (`openai` SDK):
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://127.0.0.1:3001/v1",
    api_key="rn-local-dev-default"  # Optional on localhost
)

# Route through free-tier combo with automatic failover
response = client.chat.completions.create(
    model="combo/free-unlimited",
    messages=[{"role": "user", "content": "Write a fast hash table in Rust"}]
)

print(response.choices[0].message.content)
```

### TypeScript / JavaScript (`openai` SDK):
```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://127.0.0.1:3001/v1',
  apiKey: 'rn-local-dev-default',
});

const response = await client.chat.completions.create({
  model: 'auto',
  messages: [{ role: 'user', content: 'Explain quantum teleportation' }],
});

console.log(response.choices[0].message.content);
```

### cURL:
```bash
curl http://127.0.0.1:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto",
    "messages": [{"role": "user", "content": "Ping RouteNex"}]
  }'
```

---

## 🎁 Free-Tier Pool Aggregator (~1.62B Tokens/mo)

RouteNex connects directly to verified zero-cost and developer-tier allowances without middleman markups:

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

Autonomous coding agents frequently crash when an upstream provider returns a 429 rate limit or 503 overload. RouteNex implements a domain-hardened 3-layer resilience engine:

```
Incoming Request
       │
       ▼
[Layer 1: Provider Circuit Breaker] ──▶ (Trips on 3x consecutive 5xx errors; 30s cooldown with half-open probe)
       │ (Healthy)
       ▼
[Layer 2: Key Cooldown]             ──▶ (Parses Retry-After on 429; cools down ONLY failing key without dropping pool)
       │ (Healthy)
       ▼
[Layer 3: Model Lockout]            ──▶ (Isolates 1 overloaded/deprecated model without knocking out sibling models)
       │ (Healthy)
       ▼
Upstream Inference & Stream Execution
```

* **Layer 1 (Provider Breaker)**: Isolates failing providers automatically and routes traffic to the next candidate in your fallback chain.
* **Layer 2 (Key Cooldown)**: Backs off on HTTP 429 per API key without interrupting other keys in your multi-key pool.
* **Layer 3 (Model Lockout)**: If a specific model is overloaded (HTTP 503) or not found (404), RouteNex locks only that model ID while allowing all other models under the same provider to run.

---

## 🗜️ 4-Stage LexiPack Token Optimizer

RouteNex includes a proprietary 4-stage prompt compression pipeline that reduces token consumption by **30% to 55%** before sending requests over the wire:

* **Stage 1 (Lite)**: Strips HTML comments, duplicate spaces, and redundant newlines.
* **Stage 2 (Log Pruner)**: Truncates repeated stack traces, terminal noise, and build output spam.
* **Stage 3 (Deduplication)**: Identifies and dedupes large repeated paragraphs across multi-turn conversation history.
* **Stage 4 (LexiPack Compact)**: Strips polite conversational fluff ("Sure, I would be happy to help with that!") while **preserving code blocks, markdown tables, JSON payloads, and URLs byte-for-byte**.

Enable compression per-request via header or JSON field:
```bash
curl http://127.0.0.1:3001/v1/chat/completions \
  -H "X-RouteNex-Compress: true" \
  -H "Content-Type: application/json" \
  -d '{"model": "auto", "messages": [{"role": "user", "content": "..."}]}'
```

---

## 🔀 Grouped Model Combos & Failover Chains

Define grouped model clusters that automatically cascade to the next target if the primary candidate fails or rate-limits:

```json
{
  "model": "combo/coding-power",
  "messages": [{"role": "user", "content": "Write a binary search algorithm in Zig"}]
}
```

Pre-configured combos include:
* **`combo/free-unlimited`**: `groq/llama-3.3-70b-versatile` ➔ `cerebras/llama-3.3-70b` ➔ `pollinations/openai`
* **`combo/coding-power`**: `mistral/codestral-latest` ➔ `siliconflow/deepseek-ai/DeepSeek-V3` ➔ `openai/gpt-4o-mini`
* **`combo/reasoning-trio`**: `deepseek/deepseek-r1` ➔ `openai/o3-mini` ➔ `google/gemini-2.5-pro`

---

## 🤖 One-Command Coding Agent Launcher

Launch your favorite coding agent with RouteNex environment variables and isolated virtual keys injected per-process without touching or modifying your global dotfiles (`~/.bashrc`, `~/.zshrc`):

```bash
# Launch Claude Code, Aider, Cursor, Cline, or OpenCode directly
npx routenex run claude --model auto
npx routenex run aider --model combo/coding-power
npx routenex run cursor
npx routenex run cline
```

### Interactive Tool Setup
Run `npx routenex configure <tool>` to inspect drop-in setup instructions:
```bash
npx routenex configure cursor
npx routenex configure claude
npx routenex configure cline
```

---

## 🔌 Built-In Model Context Protocol (MCP) Server

RouteNex includes a native Model Context Protocol (MCP) JSON-RPC 2.0 server with 5 autonomous tools (`list_models`, `explain_route`, `get_free_tier_quotas`, `test_provider_health`, `upsert_combo`):

### 1. Local Stdio MCP (Claude Desktop, Cursor, Cline)
Add to your `claude_desktop_config.json` or Cursor MCP settings:
```json
{
  "mcpServers": {
    "routenex": {
      "command": "npx",
      "args": ["routenex", "--mcp"]
    }
  }
}
```

### 2. Remote HTTP MCP (VPS & Self-Hosters with Bearer Auth)
Connect over HTTP JSON-RPC 2.0 with your scoped virtual key:
```bash
curl -X POST http://127.0.0.1:3001/v1/mcp \
  -H "Authorization: Bearer rn_live_your_virtual_key" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}'
```

---

## 🧠 19 Deterministic Routing Strategies

RouteNex evaluates candidates deterministically across 19 strategies:

1. **`cost`**: Floor price sorting (routes to lowest prompt/completion cost).
2. **`latency`**: Nitro speed sorting (routes to lowest time-to-first-token).
3. **`balanced`**: 60% cost / 40% latency weighted score.
4. **`lkgp`**: Last-Known-Good Provider pinning with fallback on disruption.
5. **`headroom`**: Failure-rate weighted scoring.
6. **`reset-window`**: Prioritizes providers closest to their quota reset time.
7. **`cache-affinity`**: Routes to the provider most likely to hit semantic cache.

---

## 🌐 Supported Providers & Model Catalog (200+)

RouteNex includes out-of-the-box adapters for all major frontier and open-weight model providers:

* **OpenAI**: GPT-4o, GPT-4o-mini, o1, o3-mini.
* **Anthropic**: Claude 3.7 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Haiku, Opus.
* **Google**: Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.0 Flash.
* **Groq**: Llama 3.3 70B, Llama 3.1 8B, Mixtral 8x7B.
* **Cerebras**: Llama 3.3 70B, Llama 3.1 8B (ultra-high speed 2,000 tok/s).
* **Mistral AI**: Codestral, Mistral Large 2, Mistral Small.
* **DeepSeek**: DeepSeek-R1, DeepSeek-V3.
* **SiliconFlow**: DeepSeek-R1, DeepSeek-V3, Qwen 2.5 Coder.
* **Ollama**: Local models (`llama3.2`, `qwen2.5-coder`, `deepseek-r1:8b`).
* **DuckDuckGo & Pollinations**: Zero-key anonymous web models.

---

## 📊 RouteNex Studio (Local Web Console on :3001)

Opening [http://localhost:3001/dashboard](http://localhost:3001/dashboard) gives you a local, private control plane built with the monochrome Vercel Geist design system:

* **Interactive NexFlow Canvas**: Visual routing DAG simulator with live test pulses.
* **LexiPack Studio**: Real-time compression diff preview with syntax-highlighted token savings.
* **Provider Matrix**: AES-256-GCM encrypted key storage, multi-key pools, and one-click health probes.
* **Radial Topology Map**: Live visualization of active circuits, cooldown timers, and model lockouts.
* **Doctor Diagnostics**: System health, listening ports, and runtime environment verification.
* **SQLite Storage Maintenance**: Execute `VACUUM`, export full JSON telemetry, or reset logs with one click.

---

## 🐳 Docker & Self-Hosting

### Using Docker Run:
```bash
docker run -d \
  -p 3001:3001 \
  -v routenex-data:/app/data \
  --name routenex-gateway \
  harshil1876/routenex:latest
```

### Using Docker Compose:
```yaml
version: '3.8'

services:
  routenex:
    image: harshil1876/routenex:latest
    container_name: routenex-gateway
    ports:
      - "3001:3001"
    environment:
      - ROUTENEX_PORT=3001
      - ROUTENEX_HOST=0.0.0.0
      - ROUTENEX_MOCK_MODE=true
      - ROUTENEX_DEFAULT_STRATEGY=balanced
      - ROUTENEX_PERSISTENCE=true
      - ROUTENEX_DB_PATH=/app/data/routenex.json
    volumes:
      - routenex-data:/app/data
    restart: unless-stopped

volumes:
  routenex-data:
```

Start container:
```bash
docker compose up -d
```

---

## 🔒 Security & Anti-Crash Hardening

RouteNex is engineered with strict production defense-in-depth:

* **OWASP Security Headers**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`.
* **SSRF Protection**: Strictly blocks private loopbacks and cloud metadata endpoints (`169.254.169.254`, AWS/GCP instance metadata).
* **10MB Request Body Guard**: Rejects oversized payloads with HTTP 413 to prevent memory exhaustion under DDoS.
* **Timing-Safe Key Comparison**: Uses `crypto.timingSafeEqual` to prevent side-channel timing attacks on authentication tokens.
* **Brute-Force Protection**: Enforces rate limiting on admin authentication endpoints (HTTP 429 after 10 failed guesses).
* **Zero Secret Leakage**: API keys are masked in API outputs and never written to stdout or logs.

---

## 🏛️ Product Editions: Open Source vs RouteNex Cloud

| Feature | RouteNex Open Source (OSS) | RouteNex Cloud (SaaS) |
| :--- | :---: | :---: |
| **Repository** | [Public GitHub](https://github.com/harshil1876/RouteNex) | Private Commercial Repo |
| **Deployment** | 100% Self-Hosted (`npx routenex` or Docker) | Hosted Global Edge (`api.routenex.com`) |
| **Pricing** | Free Forever (MIT / Apache-2.0) | Prepaid Compute Credits & Stripe Billing |
| **Keystore** | Local AES-256-GCM Keystore | Cloudflare D1 / Encrypted Vault |
| **Telemetry** | Local SQLite WAL Persistence | Centralized Multi-Tenant Audit Logs |
| **Team Workspaces & RBAC** | Single-User Console | Organization Workspaces (Owner, Admin, Dev) |
| **Spend Caps** | Soft In-Memory Alerts | Hard Dollar Monthly Spend Caps |
| **Managed SLA** | Community Supported | 99.9% Uptime SLA with Global POPs |

---

## ⚖️ Dual License (MIT OR Apache-2.0)

RouteNex is dual-licensed under both the **[MIT License](LICENSE)** and the **[Apache License 2.0](LICENSE-APACHE)** at your option.

### Why Dual Licensing?
* **MIT License**: Grants maximum simplicity and freedom for solo developers and personal projects.
* **Apache License 2.0**: Provides an explicit patent grant and protection against patent litigation, making RouteNex enterprise-friendly and safe for corporate adoption.

You may choose whichever license best fits your organization's legal policies.

---

## 🤝 Contributing

We welcome community contributions, bug fixes, and new provider adapters!

1. Fork the repository on GitHub.
2. Review our [Contributing Guidelines](CONTRIBUTING.md).
3. Run tests before submitting a PR:
   ```bash
   npm run test:api   # 73 Vitest integration tests
   npm run build      # Static Astro and Gateway build
   ```
4. Open a Pull Request following our [PR Template](.github/PULL_REQUEST_TEMPLATE.md).

For security disclosures, please refer to [SECURITY.md](SECURITY.md).

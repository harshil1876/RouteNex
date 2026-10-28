<p align="center">
  <img src="https://raw.githubusercontent.com/harshil1876/RouteNex/main/public/logo.png" width="140" alt="RouteNex Logo" />
</p>

# 🚀 RouteNex — The Intelligent Open-Source AI Gateway & Agent Control Plane

[![npm version](https://img.shields.io/npm/v/routenex.svg?color=blue)](https://www.npmjs.com/package/routenex)
[![License: MIT OR Apache-2.0](https://img.shields.io/badge/License-MIT%20OR%20Apache--2.0-blue.svg)](LICENSE)
[![Tests Passing](https://img.shields.io/badge/Tests-143%2F143%20Passing-emerald.svg)](https://github.com/harshil1876/RouteNex)
[![Free Tokens](https://img.shields.io/badge/Free%20Tokens-~1.62B%2Fmonth-purple.svg)](https://github.com/harshil1876/RouteNex)
[![Overhead](https://img.shields.io/badge/Overhead-%3C2ms%20Latency-brightgreen.svg)](https://github.com/harshil1876/RouteNex)
[![OpenAI Compatible](https://img.shields.io/badge/API-OpenAI%20%26%20Anthropic%20Compatible-black.svg)](https://github.com/harshil1876/RouteNex)
[![MCP Protocol](https://img.shields.io/badge/Protocol-Model%20Context%20Protocol%20(MCP)-orange.svg)](https://github.com/harshil1876/RouteNex)

> **One API. Your provider keys. Zero proxy markups.**  
> Aggregate over **1.6 Billion free tokens per month**, survive provider rate limits with **3-layer resilience**, compress prompt bloat by **30–55%** with LexiPack, and connect **Cursor, Claude Code, Cline, or any OpenAI client** in 30 seconds.

---

## 📑 Table of Contents

- [Why RouteNex?](#-why-routenex)
- [⚡ Instant Start (Zero Install)](#-instant-start-zero-install)
- [💻 30-Second SDK Drop-In](#-30-second-sdk-drop-in)
- [🤖 Coding Agent Integrations (Cursor, Claude Code, Cline, Aider)](#-coding-agent-integrations)
- [⚡ NexWorkers: Autonomous Routed Workers & Action Shield](#-nexworkers-autonomous-routed-workers--action-shield)
- [🎁 Free-Tier Pool Aggregator (~1.62B Free Tokens/mo)](#-free-tier-pool-aggregator-162b-free-tokensmo)
- [🔑 Multi-Key Pooling (Multiply Free RPM Limits)](#-multi-key-pooling-multiply-free-rpm-limits)
- [🛡️ 3-Layer Resilience Engine](#️-3-layer-resilience-engine)
- [🗜️ 4-Stage LexiPack Prompt Compression](#️-4-stage-lexipack-prompt-compression)
- [🔀 Model Combos & Grouped Fallback Chains](#-model-combos--grouped-fallback-chains)
- [🔌 Built-In Model Context Protocol (MCP) Server](#-built-in-model-context-protocol-mcp-server)
- [🧠 19 Deterministic Routing Strategies](#-19-deterministic-routing-strategies)
- [🌐 Supported Providers & Model Catalog (200+)](#-supported-providers--model-catalog-200)
- [📊 RouteNex Studio (Local Web Console on :3001)](#-routenex-studio-local-web-console-on-3001)
- [🐳 Self-Hosting: Docker, Compose & Systemd](#-self-hosting-docker-compose--systemd)
- [🔒 Security & Anti-Crash Hardening](#-security--anti-crash-hardening)
- [🏛️ Open Source vs RouteNex Cloud](#️-open-source-vs-routenex-cloud)
- [⚖️ Dual License (MIT OR Apache-2.0)](#️-dual-license-mit-or-apache-20)
- [🤝 Contributing & Community](#-contributing--community)

---

## 💡 Why RouteNex?

When building autonomous coding agents or LLM apps, developers face three major frustrations:

1. **AI Proxy Markups**: Hosted routing services add 10% to 30% price markups just to provide fallback routing and token accounting.
2. **Fragile Agent Runs**: When an upstream provider returns HTTP 429 (rate limit) or 503 (overload), coding agents (Cursor, Claude Code, Cline) crash mid-task, losing context and wasting time.
3. **Prompt Bloat & Token Waste**: Repetitive build logs, giant stack traces, and verbose conversational filler inflate token consumption, quickly burning through budgets and context windows.

**RouteNex solves all three:**
* **Zero Markup**: 100% open-source, BYOK-first (Bring Your Own Keys), running locally on your laptop or VPS.
* **3-Layer Circuit Breakers**: Transparently retries and falls back across providers, cooling down failing keys without interrupting working keys.
* **LexiPack Token Optimization**: Compresses prompt payloads by **30% to 55%** before transmitting over the wire while preserving code, JSON, and markdown formatting byte-for-byte.
* **Sub-2ms Routing Overhead**: Ultra-fast in-memory routing decision pipeline with zero-latency response caching.

---

## ⚡ Instant Start (Zero Install)

Run RouteNex directly on your machine with one command. It starts both the **high-performance AI Gateway API** and the **RouteNex Studio console**:

```bash
npx routenex
```

```
  ____             _       _   _           
 |  _ \ ___  _   _| |_ ___| \ | | _____  __
 | |_) / _ \| | | | __/ _ \  \| |/ _ \ \/ /
 |  _ < (_) | |_| | ||  __/ |\  |  __/>  < 
 |_| \_\___/ \__,_|\__\___|_| \_|\___/_/\_\
 Open-Source AI Gateway • MIT/Apache-2.0 • v0.2.0

┌────────────────────────────────────────────────────────────────────────┐
│  ✨ RouteNex Open-Source Local Gateway Console                         │
│  Default Password: routenex-admin                                      │
│  Console URL:      http://127.0.0.1:3001/dashboard                     │
│  Zero Cloud Auth Required • 100% Offline & Self-Hosted                 │
└────────────────────────────────────────────────────────────────────────┘

✔ Gateway Ready:
  • OpenAI API:    http://127.0.0.1:3001/v1/chat/completions
  • Anthropic API: http://127.0.0.1:3001/v1/messages
  • MCP Stdio:     npx routenex --mcp
  • Virtual Key:   rn-local-dev-default
```

---

## 💻 30-Second SDK Drop-In

RouteNex is a drop-in replacement for any OpenAI-compatible SDK:

### Python (`openai` SDK)
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://127.0.0.1:3001/v1",
    api_key="rn-local-dev-default"  # Optional on localhost
)

response = client.chat.completions.create(
    model="combo/free-unlimited",
    messages=[{"role": "user", "content": "Write a thread-safe LRU cache in Rust"}]
)

print(response.choices[0].message.content)
```

### TypeScript / JavaScript (`openai` SDK)
```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://127.0.0.1:3001/v1',
  apiKey: 'rn-local-dev-default',
});

const response = await client.chat.completions.create({
  model: 'auto',
  messages: [{ role: 'user', content: 'Explain Raft consensus in simple terms' }],
});

console.log(response.choices[0].message.content);
```

### cURL
```bash
curl http://127.0.0.1:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto",
    "messages": [{"role": "user", "content": "Hello RouteNex!"}]
  }'
```

---

## 🤖 Coding Agent Integrations

Connect RouteNex to your favorite coding tools in seconds.

### 1. Claude Code
Launch Claude Code with RouteNex injected per-process with zero modification to your shell profile:
```bash
npx routenex run claude --model auto
```

Or configure manually in your environment:
```bash
export ANTHROPIC_BASE_URL="http://127.0.0.1:3001"
export ANTHROPIC_API_KEY="rn-local-dev-default"
claude
```

### 2. Cursor IDE
1. Open **Cursor Settings** ➔ **Models**.
2. Under **OpenAI API Key**, enter `rn-local-dev-default`.
3. Toggle **Override OpenAI Base URL** on and set:
   ```
   http://127.0.0.1:3001/v1
   ```
4. Add your preferred model names (e.g. `auto`, `combo/coding-power`, `groq/llama-3.3-70b-versatile`).

### 3. Cline (VS Code Extension)
1. In the Cline sidebar, click the **Settings (gear)** icon.
2. Select **OpenAI Compatible** as API Provider.
3. Set **Base URL**: `http://127.0.0.1:3001/v1`
4. Set **API Key**: `rn-local-dev-default`
5. Set **Model ID**: `auto` or `combo/coding-power`

### 4. Aider
```bash
npx routenex run aider --model combo/coding-power
```
Or directly:
```bash
aider --openai-api-base http://127.0.0.1:3001/v1 --openai-api-key rn-local-dev-default
```

### 5. Continue.dev
In `~/.continue/config.json`:
```json
{
  "models": [
    {
      "title": "RouteNex Auto",
      "provider": "openai",
      "model": "auto",
      "apiBase": "http://127.0.0.1:3001/v1",
      "apiKey": "rn-local-dev-default"
    }
  ]
}
```

---

## ⚡ NexWorkers: Autonomous Routed Workers & Action Shield

NexWorkers are background and interactive autonomous specialists running inside RouteNex, orchestrated with **Tri-Model Routing**, **Token Optimizer Compression**, and **Action Shield Human-in-the-Loop policy gating**.

Every worker is exposed as a first-class **Virtual Model ID** on `/v1/chat/completions` (e.g. `model: "worker/pr-guardian"`), so you can invoke them directly from Cursor, Claude Code, Python, or curl.

```
                    ┌────────────────────────────────────────────────────────┐
                    │                   Incoming Task / Webhook              │
                    └───────────────────────────┬────────────────────────────┘
                                                │
                                                ▼
                                    ┌───────────────────────┐
                                    │      Pulse Model      │  (auto:floor / free triage)
                                    └───────────┬───────────┘
                                                │
                                                ▼
                                    ┌───────────────────────┐
                                    │    Token Optimizer    │  (-48% tokens via LogPrune & TurnDedup)
                                    └───────────┬───────────┘
                                                │
                                                ▼
                                    ┌───────────────────────┐
                                    │     Brain Combo       │  (auto:balanced / combo/coding-power)
                                    └───────────┬───────────┘
                                                │
                                    ┌───────────┴───────────┐
                      Read Tool (auto)                      Write / Destructive Tool (ask)
                            │                                     │
                            ▼                                     ▼
                     Execute Directly                     [ Action Shield Gate ]
                                                                  │
                                                        ┌─────────┴─────────┐
                                                        ▼                   ▼
                                                     Approve               Deny
```

### 1. 4 Default Pre-Configured Specialists

| Specialist | Virtual Model ID | Brain Combo | Primary Mission |
| :--- | :--- | :--- | :--- |
| **PR & Security Guardian** | `worker/pr-guardian` | `auto:balanced` | Audits pull requests, flags CVEs, OWASP vulnerabilities, and credential leaks. |
| **Inbox & Webhook Triage** | `worker/inbox-triage` | `auto:floor` | Categorizes incoming GitHub issues, alerts, and webhooks with automated labeling. |
| **Cost & Latency Watchdog** | `worker/cost-watchdog` | `auto:balanced` | Audits provider spend ledgers, flags quota anomalies, and enforces budget caps. |
| **Release Notes & Docs Architect** | `worker/release-architect` | `combo/coding-power` | Compiles git commit diffs into user-facing release notes and documentation. |

### 2. Invoke as a Virtual Model (OpenAI SDK Drop-In)

Call any worker as a standard model name from any client:

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://127.0.0.1:3001/v1",
    api_key="rn-local-dev-default"
)

# Triggers the PR & Security Guardian worker pipeline
response = client.chat.completions.create(
    model="worker/pr-guardian",
    messages=[{"role": "user", "content": "Review recent commit b6aa133 for auth bypasses"}]
)

print(response.choices[0].message.content)
```

### 3. Action Shield Human-in-the-Loop Gating

* **Auto-Execute Read-Only Tools**: Benign tools (`git.log`, `read_file`, `fetch_metrics`) run automatically.
* **Pause on Write / Destructive Tools**: Whenever a worker invokes write tools (`github.merge_pr`, `exec_command`, `slack.post`), Action Shield pauses the execution in SQLite and surfaces an interactive Approval Card in RouteNex Studio.
* **Sensitive Argument Scrubbing**: High-entropy API tokens, Authorization headers, and private keys are scrubbed before rendering in the approval queue.
* **Operator Controls**: 1-click **Approve & Execute**, **Deny & Skip Step**, or **Always Allow Tool** for that worker.

### 4. Tri-Model Cost Efficiency

* **Brain Combo**: Frontier model for deep reasoning and code generation (`auto:balanced` or `combo/coding-power`).
* **Guard Model**: Fast, sub-30ms policy evaluator (`auto:free` or local model) screening tool calls against safety rules.
* **Pulse Model**: Ultra-cheap floor model (`auto:floor`) for high-frequency webhook or cron triage.

---

## 🎁 Free-Tier Pool Aggregator (~1.62B Free Tokens/mo)

RouteNex connects directly to verified zero-cost and developer-tier allowances:

| Provider | Monthly Allowance | Key Required | Highlight Models |
| :--- | :--- | :--- | :--- |
| **Mistral AI** | **1,000,000,000 tokens / mo** | Free Developer Key | `codestral-latest`, `mistral-small-latest` |
| **Pollinations AI** | **~500,000,000 tokens / mo** | ❌ None (Zero-Key) | `pollinations/openai`, `pollinations/qwen` |
| **Cerebras Cloud** | **1,000,000 tokens / day** | Free Developer Key | `cerebras/llama-3.3-70b` (2,000 tok/sec) |
| **Groq Cloud** | **14,400 requests / day** | Free Developer Key | `groq/llama-3.3-70b-versatile`, `llama-3.1-8b` |
| **SiliconFlow** | **~50,000,000 tokens / mo** | Free Developer Key | `deepseek-ai/DeepSeek-V3`, `DeepSeek-R1` |
| **Google AI Studio**| **1,500 requests / day** | Free Developer Key | `gemini/gemini-2.5-flash`, `gemini-2.5-pro` |
| **DuckDuckGo AI** | **~20,000,000 tokens / mo** | ❌ None (Zero-Key) | `duckduckgo/gpt-4o-mini`, `claude-3-haiku` |

---

## 🔑 Multi-Key Pooling (Multiply Free RPM Limits)

Free-tier developer accounts often have tight rate limits (e.g. 30 requests/minute on Groq).  
RouteNex features **Multi-Key Pooling**:

```
Request 1 ──▶ Key A (sk-groq-key1) ──▶ Upstream
Request 2 ──▶ Key B (sk-groq-key2) ──▶ Upstream
Request 3 ──▶ Key C (sk-groq-key3) ──▶ Upstream
```

* Add multiple free API keys for the same provider in RouteNex Studio.
* RouteNex rotates keys using intelligent **round-robin** and **headroom** load balancing.
* If Key A hits HTTP 429, RouteNex automatically cools down Key A and transparently routes the request to Key B without failing the user's prompt.
* **Multiplies your free throughput**: 3 free Groq keys = **90 RPM**; 5 keys = **150 RPM**.

---

## 🛡️ 3-Layer Resilience Engine

```
Incoming Prompt
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

* **Layer 1 (Provider Breaker)**: Automatically trips on 3 consecutive 5xx failures or timeouts; initiates a 30s cooldown with half-open recovery probes.
* **Layer 2 (Key Cooldown)**: Backs off on HTTP 429 per API key without interrupting other keys in your multi-key pool.
* **Layer 3 (Model Lockout)**: If a specific model is overloaded (HTTP 503) or deprecated (404), RouteNex isolates only that individual model ID while allowing all other models under the same provider to run.
* **Adaptive Self-Healing**: Automatically intercepts HTTP 400 `"Unsupported parameter: X"` errors from downstream providers, appends `X` to the blocked parameter list for that provider, and retries the prompt instantly.

---

## 🗜️ 4-Stage LexiPack Prompt Compression

RouteNex includes a proprietary 4-stage prompt compression pipeline that cuts prompt payload size by **30% to 55%** before sending requests over the wire:

* **Stage 1 (Lite)**: Strips HTML comments, duplicate spaces, and redundant newlines.
* **Stage 2 (Log Pruner)**: Truncates repeated stack traces, terminal noise, and build output spam.
* **Stage 3 (Deduplication)**: Identifies and dedupes large repeated paragraphs across multi-turn conversation history.
* **Stage 4 (LexiPack Compact)**: Strips polite conversational fluff ("Sure, I would be happy to help with that!") while **preserving code blocks, markdown tables, JSON payloads, and URLs byte-for-byte**.

Enable compression per-request via header:
```bash
curl http://127.0.0.1:3001/v1/chat/completions \
  -H "X-RouteNex-Compress: true" \
  -H "Content-Type: application/json" \
  -d '{"model": "auto", "messages": [{"role": "user", "content": "..."}]}'
```

---

## 🔀 Model Combos & Grouped Fallback Chains

Define grouped model clusters that automatically cascade to the next target if the primary candidate fails or rate-limits:

```json
{
  "model": "combo/coding-power",
  "messages": [{"role": "user", "content": "Implement quicksort in Go"}]
}
```

Pre-configured combos include:
* **`combo/free-unlimited`**: `groq/llama-3.3-70b-versatile` ➔ `cerebras/llama-3.3-70b` ➔ `pollinations/openai`
* **`combo/coding-power`**: `mistral/codestral-latest` ➔ `siliconflow/deepseek-ai/DeepSeek-V3` ➔ `openai/gpt-4o-mini`
* **`combo/reasoning-trio`**: `deepseek/deepseek-r1` ➔ `openai/o3-mini` ➔ `google/gemini-2.5-pro`

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

## 🐳 Self-Hosting: Docker, Compose & Systemd

### Docker Run
```bash
docker run -d \
  -p 3001:3001 \
  -v routenex-data:/app/data \
  --name routenex-gateway \
  harshil1876/routenex:latest
```

### Docker Compose
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

### Systemd (Linux VPS / Server)
Create `/etc/systemd/system/routenex.service`:
```ini
[Unit]
Description=RouteNex AI Gateway Daemon
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu
ExecStart=/usr/bin/npx routenex
Restart=always
RestartSec=5
Environment=ROUTENEX_PORT=3001
Environment=ROUTENEX_HOST=0.0.0.0

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now routenex
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

## 🏛️ Open Source vs RouteNex Cloud

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

## 🤝 Contributing & Community

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

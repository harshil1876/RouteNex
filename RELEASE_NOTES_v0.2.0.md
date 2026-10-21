# RouteNex v0.2.0 — Official Open-Source Release Notes

> **RouteNex: The Intelligent Open-Source AI Gateway & Agent Control Plane.**  
> One endpoint for every AI model. Deterministic routing, 3-layer resilience, 0ms caching, 4-stage LexiPack token optimization, and zero vendor lock-in.

---

## 🚀 Key Highlights in v0.2.0

### 1. Unified Standalone Architecture
* **Single Command Execution**: `npx routenex` or `docker compose up -d` starts both the high-throughput Hono gateway (`:3001`) and the static web console.
* **Zero Cloud Dependency**: Operates 100% offline with local AES-256-GCM keystores, SHA-256 virtual access keys, and local SQLite WAL persistence.
* **Open Source Gateway Auth Gate**: Protected by default local setup password (`routenex-admin`), configurable via terminal or environment variables.

### 2. 3-Layer Resilience Engine
Survives upstream AI provider outages and rate limits without dropping in-flight agent workflows:
* **Layer 1 (Provider Circuit Breaker)**: Automatically trips on 3 consecutive 5xx failures or timeouts; initiates a 30-second cooldown with half-open recovery probes.
* **Layer 2 (Key Cooldown)**: Automatically parses `Retry-After` headers on HTTP 429 rate limits, cooling down only that specific provider key while sibling keys in the pool continue serving traffic.
* **Layer 3 (Model Lockout)**: If a specific upstream model returns HTTP 503 or 404, RouteNex isolates only that individual model ID without affecting sibling models under the same provider.

### 3. Free-Tier Pool Aggregator (~1.62 Billion Free Tokens/mo)
Connects directly to verified zero-cost and developer allowances across:
* **Mistral AI**: 1 Billion tokens/month (`codestral-latest`, `mistral-small-latest`).
* **Pollinations AI**: ~500M tokens/month (Zero-key anonymous).
* **Cerebras Cloud**: 1,000,000 tokens/day at 2,000 tok/sec (`cerebras/llama-3.3-70b`).
* **Groq Cloud**: 14,400 requests/day (`groq/llama-3.3-70b-versatile`, `llama-3.1-8b`).
* **SiliconFlow**: ~50M tokens/month (`DeepSeek-V3`, `DeepSeek-R1`).
* **Google AI Studio**: 1,500 requests/day (`gemini-2.5-flash`, `gemini-2.5-pro`).
* **DuckDuckGo AI**: ~20M tokens/month (Zero-key anonymous).

### 4. 4-Stage LexiPack Token Optimizer
Compresses prompt payload size by 30% to 55% before transmitting over the wire, saving API costs and latency:
* **Stage 1 (Lite)**: Strips HTML comments, duplicate whitespace, and multi-line breaks.
* **Stage 2 (Log Pruner)**: Truncates repeated stack traces, terminal noise, and build output.
* **Stage 3 (Deduplication)**: Identifies and dedupes repetitive multi-turn conversation context.
* **Stage 4 (LexiPack Compact)**: Strips polite conversational fluff while preserving code blocks, markdown tables, JSON, and URLs byte-for-byte.

### 5. Multi-Model Fallback Combos & 19 Routing Strategies
* Pre-configured clusters: `combo/free-unlimited`, `combo/coding-power`, `combo/reasoning-trio`.
* Strategies: `cost` (floor price), `latency` (nitro speed), `balanced`, `lkgp` (last-known-good provider), `headroom` (failure rate weighted), `reset-window`, and `cache-optimized`.

### 6. One-Command Coding Agent Integrations
Spawns developer tools with RouteNex environment variables and isolated virtual keys injected per-process without touching global shell profiles:
```bash
npx routenex run claude --model auto
npx routenex run aider --model combo/coding-power
npx routenex run cursor
npx routenex run cline
```

### 7. Native Model Context Protocol (MCP) Server
Built-in JSON-RPC 2.0 MCP server exposing 5 autonomous tools for agent IDEs:
* `list_models`: Filter by capabilities, free-only status, or provider.
* `explain_route`: Dry-run routing evaluation detailing candidates and scores.
* `get_free_tier_quotas`: Real-time tracking of developer allowances and failures.
* `test_provider_health`: Active connectivity check.
* `upsert_combo`: Dynamic fallback cluster creation.
* Supports both **Stdio MCP** (Claude Desktop, Cursor) and **Remote HTTP MCP** (`/v1/mcp`).

### 8. SQLite WAL Persistence & Storage Maintenance
* SQLite WAL mode (`PRAGMA journal_mode = WAL`) with busy timeout and bounded 5,000 LRU ring buffer.
* Built-in `/v1/admin/storage/vacuum` maintenance and `/v1/admin/storage/export` JSON export.

---

## 📦 Quickstart

### With npx:
```bash
npx routenex
```
Open **http://127.0.0.1:3001/dashboard** in your browser.

### With Docker:
```bash
docker run -d -p 3001:3001 -v routenex-data:/app/data --name routenex harshil1876/routenex:latest
```

### Python SDK Drop-in:
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://127.0.0.1:3001/v1",
    api_key="rn-local-dev-default"  # or optional on localhost
)

response = client.chat.completions.create(
    model="combo/free-unlimited",
    messages=[{"role": "user", "content": "Explain quantum teleportation"}]
)
print(response.choices[0].message.content)
```

### TypeScript SDK Drop-in:
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

---

## 🧪 Verification & Quality Metrics
* **Vitest Integration Tests**: 73 tests passed (0 failures).
* **Static Build**: 217 static pages compiled with zero errors.
* **Security Guardrails**: OWASP security headers, SSRF private IP blocker, 10MB payload cap, timing-safe string comparison, brute-force rate limiter.
* **License**: MIT License & Apache License 2.0 dual-license.

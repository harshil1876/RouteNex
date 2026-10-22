# RouteNex — Community Launch Kit & Distribution Playbook

Use these battle-tested, developer-centric launch posts to introduce **RouteNex v0.2.3** across Hacker News, Reddit, Twitter/X, Product Hunt, and developer Discord communities.

---

## 📑 Distribution Checklist

| Platform | Channel / Subreddit | Best Time to Post | Primary Angle |
| :--- | :--- | :--- | :--- |
| **Hacker News** | [Show HN](https://news.ycombinator.com/show) | 07:00–09:00 EST (Tue–Thu) | Open-source architecture, zero markup, multi-protocol translation, 127/127 tests |
| **Reddit** | `r/LocalLLaMA` | 09:00–11:00 EST | Self-hosted resilience, multi-key pooling, local models (Ollama), 1.62B free tokens |
| **Reddit** | `r/selfhosted` | 10:00–12:00 EST | 100% offline AES-256 keystore, Docker Compose, SQLite WAL, zero cloud dependency |
| **Reddit** | `r/ClaudeAI` & `r/OpenAI` | 11:00–13:00 EST | Claude Code & Cursor proxy, seamless Anthropic ⇄ OpenAI translation, 429 failover |
| **Twitter / X** | Tech & Dev Twitter | 08:30–10:30 EST | 6-tweet visual thread, instant `npx routenex` command, coding agent demo |
| **Product Hunt** | [Product Hunt Submit](https://www.producthunt.com) | 00:01 PST (Launch Day) | Developer Tools, 3-layer resilience, 0ms cache, 4-stage LexiPack optimizer |
| **Discord Communities** | Cursor, Cline, Aider, Ollama | Afternoon / Evenings | Native drop-in integration, `npx routenex run [agent]`, MCP server |

---

## 1. Hacker News — "Show HN"

**Title**:  
`Show HN: RouteNex – Open-source AI gateway with multi-protocol translation, 3-layer resilience, and free-tier pool`

**Target URL**: `https://github.com/harshil1876/RouteNex`  
*(Or submit as a text post with the following content)*:

**Content**:
```markdown
Hey HN,

I built RouteNex (https://github.com/harshil1876/RouteNex) because I was tired of two frustrating problems when building AI coding agents and LLM applications:

1. Paying third-party AI proxy markups (10% to 30%) just to get fallback routing and basic usage metrics.
2. Having agent workflows (Claude Code, Cursor, Cline) abruptly crash midway through complex coding tasks because an upstream provider hit a rate limit (HTTP 429) or temporary outage (503).

RouteNex is a lightweight, self-hosted, deterministic AI router and gateway. You bring your own API keys, run it locally or on your own VPS, and point any OpenAI, Anthropic, or Gemini SDK directly to `http://localhost:3001`.

Here is what's under the hood in v0.2.3:

* Multi-Protocol Ingress & Bidirectional Translation:
  - Supports OpenAI Chat (`/v1/chat/completions`), Responses (`/v1/responses`), Embeddings, Images, and Audio.
  - Native Anthropic Messages API (`/v1/messages`) with true Claude SSE streaming events (`message_start`, `content_block_delta`, `message_delta`, `message_stop`).
  - Google Gemini API (`/v1beta/models/*:generateContent` & `:streamGenerateContent`).
  - Seamlessly cross-translates requests: you can point Claude Code or Cursor to RouteNex and route to Groq, Mistral, Gemini, or local Ollama models with zero code changes.

* 3-Layer Resilience Engine:
  - Layer 1 (Provider Breaker): Trips on 3 consecutive 5xx errors; 30s cooldown with automated half-open recovery probes.
  - Layer 2 (Key Cooldown): Parses `Retry-After` on HTTP 429 and cools down only the specific key while remaining keys in the pool keep serving traffic.
  - Layer 3 (Model Lockout): Isolates single failing or deprecated model IDs without knocking out sibling models on the same provider.
  - Adaptive Param Shield: Intercepts upstream HTTP 400 schema errors (e.g. unsupported `temperature` or `max_tokens` vs `max_output_tokens`), automatically filters invalid keys, and retries instantly.
  - Fast Client Abort Cleanup: When a client drops an SSE connection (e.g. user hits cancel in Cursor), upstream sockets are aborted in < 50ms, eliminating wasted tokens.

* Free-Tier Pool Aggregator:
  - Automatically aggregates developer free tiers across Mistral (1B tokens/mo free), Cerebras (1M/day at 2,000 tok/s), Groq (14.4k req/day), Pollinations, Google AI Studio, and SiliconFlow (~1.62B free tokens/month total).
  - Multi-Key Pooling rotates multiple free keys via round-robin to multiply your RPM limits.

* 4-Stage LexiPack Token Optimizer:
  - Strips terminal noise, repeated build logs, duplicate multi-turn context, and conversational filler while preserving code blocks, markdown tables, and JSON byte-for-byte (saving 30–55% token expenditure).

* Native MCP Server:
  - Built-in stdio and HTTP JSON-RPC 2.0 MCP server with 5 autonomous tools for Claude Desktop, Cursor, and Cline (`npx routenex --mcp`).

* 100% Offline & Verified:
  - Zero cloud accounts required. Local AES-256-GCM encrypted keystores with atomic `.tmp` + `renameSync` writes and SQLite WAL persistence.
  - Full automated Vitest test suite with 127/127 passing tests.
  - Extremely lightweight: packed size is ~3.7MB with only 5 runtime dependencies; starts in ~2 seconds.

You can run it right now with zero installation:
$ npx routenex

Or with Docker:
$ docker run -p 3001:3001 -v routenex-data:/app/data harshil1876/routenex

GitHub: https://github.com/harshil1876/RouteNex
Docs & Model Catalog: https://routenex.dev

I would love to hear your feedback on the multi-protocol translation layer, routing algorithms, and adapter architecture!
```

---

## 2. Reddit — r/LocalLLaMA, r/selfhosted, r/OpenAI, r/ClaudeAI

**Subreddits**:
* `r/LocalLLaMA`
* `r/selfhosted`
* `r/OpenAI`
* `r/ClaudeAI`

**Title**:  
`I built an open-source AI gateway with multi-protocol translation (OpenAI/Claude/Gemini), 3-layer resilience, and free-tier pooling (npx routenex)`

**Post Body**:
```markdown
Hey everyone,

If you run local AI coding agents (Claude Code, Cursor, Cline, Aider) or mix local Ollama models with cloud providers, you probably know how fragile upstream routing can be. One 429 rate limit or 503 outage crashes your agent mid-task, and hosted routing services charge 10% to 30% markups just to handle fallbacks.

I open-sourced **RouteNex** (dual-licensed under MIT and Apache-2.0) — a lightweight, self-hosted AI routing gateway and control plane designed to solve this completely.

### 🌟 What Makes RouteNex Different:

1. **Multi-Protocol Translation Ingress**:
   - Not just OpenAI `/v1/chat/completions`.
   - Native Anthropic Messages API (`/v1/messages`) with true Claude SSE streaming events.
   - Google Gemini API (`/v1beta/models/*:generateContent`).
   - OpenAI Responses API (`/v1/responses`), Embeddings, Images, and Audio.
   - Send Anthropic payloads to Groq or local Ollama; send OpenAI payloads to Claude or Gemini. Zero client modification needed.

2. **3-Layer Resilience Engine + Adaptive Param Shield**:
   - **Provider Breaker**: Trips on consecutive 5xx errors; 30s cooldown with half-open probes.
   - **Key Cooldown**: Parses `Retry-After` on HTTP 429 and cools down only the failing key without breaking the pool.
   - **Model Lockout**: Isolates single failing or deprecated model IDs while keeping sibling models healthy.
   - **Adaptive Param Shield**: Intercepts HTTP 400 parameter errors (e.g. unsupported `temperature` or `max_tokens`), strips incompatible keys on the fly, and retries.
   - **< 50ms SSE Abort**: Upstream socket is cancelled immediately when you abort in Cursor/Claude Code, preventing burned credits.

3. **1.62 Billion Free Tokens/Month Aggregator**:
   - Out-of-the-box pooling across Mistral (1B tokens/mo free), Cerebras (1M/day at 2,000 tok/s), Groq (14.4k req/day), Pollinations (zero-key), and Google AI Studio.
   - Multi-key rotation allows you to add multiple free keys per provider to multiply your free RPM.

4. **4-Stage LexiPack Prompt Compression**:
   - Strips repetitive build logs, terminal spam, and conversational fluff while preserving code blocks, markdown tables, and JSON payloads byte-for-byte (saving 30–55% token expenditure).

5. **Native MCP Server & Agent Launcher**:
   - Built-in stdio & HTTP MCP server (`npx routenex --mcp`) for Claude Desktop, Cursor, and Cline.
   - One-command agent injection: `npx routenex run claude --model auto` or `npx routenex run aider`.

6. **100% Offline & Self-Hosted**:
   - Zero telemetry, zero cloud accounts. Local AES-256-GCM encrypted keystores (atomic writes) and SQLite WAL persistence.
   - 127/127 passing automated Vitest tests across 7 test suites.
   - Lightweight package: ~3.7MB packed, 5 runtime dependencies, starts in ~2 seconds.

### ⚡ Quick Start:

Run directly with zero installation:
```bash
npx routenex
```

Or with Docker Compose:
```yaml
services:
  routenex:
    image: harshil1876/routenex:latest
    ports:
      - "3001:3001"
    volumes:
      - routenex-data:/app/data
    restart: unless-stopped

volumes:
  routenex-data:
```

### 💻 30-Second Agent Drop-In:

**Claude Code**:
```bash
npx routenex run claude --model auto
```

**Cursor IDE**:
- Settings ➔ Models ➔ OpenAI API Key: `rn-local-dev-default`
- Override Base URL: `http://localhost:3001/v1`
- Model: `auto` or `combo/free-unlimited`

**Python SDK**:
```python
from openai import OpenAI

client = OpenAI(base_url="http://localhost:3001/v1", api_key="rn-local-dev-default")
response = client.chat.completions.create(
    model="combo/free-unlimited",
    messages=[{"role": "user", "content": "Hello RouteNex!"}]
)
print(response.choices[0].message.content)
```

GitHub: https://github.com/harshil1876/RouteNex  
Docs & 200+ Model Catalog: https://routenex.dev  

I would love to get your feedback, hear what providers or routing strategies you want added, and answer any questions!
```

---

## 3. Twitter / X Launch Thread

**Tweet 1 (The Hook & Announcement)**:  
`Introducing RouteNex v0.2.3 🚀 — The open-source AI gateway & agent control plane.`  
`One endpoint for every AI model with multi-protocol translation (OpenAI, Claude, Gemini), 3-layer resilience, 0ms cache, and zero vendor markup.`  
`Start in 2 seconds: npx routenex`  
`🧵👇`  

**Tweet 2 (Multi-Protocol Ingress)**:  
`Stop re-writing SDK code for different providers.`  
`RouteNex natively accepts:`  
`• OpenAI Chat & Responses API (/v1/responses)`  
`• Anthropic Messages (/v1/messages with native Claude SSE)`  
`• Google Gemini (/v1beta/models/*)`  
`• Embeddings, Audio & Image endpoints`  
`Send Claude prompts to Groq or Gemini seamlessly. 🔄`  

**Tweet 3 (Resilience & Anti-Crash)**:  
`Autonomous coding agents crash when upstream providers hit 429s or 503s.`  
`RouteNex implements 3-layer resilience:`  
`1️⃣ Provider Breaker: isolates 5xx outages with 30s cooldown`  
`2️⃣ Key Cooldown: backs off on 429s per-key without killing sibling keys`  
`3️⃣ Model Lockout: isolates 1 failing model ID`  
`Plus an Adaptive Param Shield that auto-fixes HTTP 400 schema mismatches! 🛡️`  

**Tweet 4 (Free-Tier Aggregator & LexiPack)**:  
`🎁 Connects to ~1.62 Billion free tokens/month across Mistral (1B tokens free/mo), Cerebras (2,000 tok/s), Groq, and Pollinations.`  
`🗜️ 4-Stage LexiPack optimizer cuts prompt bloat by 30-55% while keeping code and JSON byte-for-byte intact.`  

**Tweet 5 (One-Command Agent Launcher & MCP)**:  
`Launch your coding agent with isolated virtual keys injected per-process:`  
`$ npx routenex run claude --model auto`  
`$ npx routenex run cursor`  
`$ npx routenex run cline`  
`$ npx routenex run aider`  
`Plus a built-in MCP server for Claude Desktop and Cline ($ npx routenex --mcp). ⚡`  

**Tweet 6 (Open Source & Getting Started)**:  
`RouteNex is 100% open-source (MIT & Apache-2.0), 100% offline with local AES-256 encrypted keystores, and backed by 127/127 passing automated tests.`  
`⭐ Star on GitHub: https://github.com/harshil1876/RouteNex`  
`📖 Docs & 200+ Model Catalog: https://routenex.dev`  
`Try it now: $ npx routenex`  

---

## 4. Product Hunt Launch Copy

* **Product Name**: RouteNex
* **Tagline**: The open-source AI gateway with multi-protocol translation & 3-layer resilience
* **Category**: Developer Tools, Artificial Intelligence, Open Source
* **Pricing**: Free / Open Source (MIT & Apache-2.0)
* **Website URL**: `https://routenex.dev`
* **Repository URL**: `https://github.com/harshil1876/RouteNex`

### Elevator Pitch:
> Stop paying AI proxy markups. RouteNex provides deterministic routing, multi-protocol translation across OpenAI, Claude, and Gemini, 3-layer circuit breakers, a 1.62B free-token aggregator, and 4-stage prompt compression in a single self-hosted binary that starts in 2 seconds (`npx routenex`).

### Key Features to Highlight:
1. **Multi-Protocol Translation Ingress**: Seamless cross-translation between OpenAI (`/v1/chat/completions`, `/v1/responses`), Anthropic (`/v1/messages` with native Claude SSE), and Google Gemini (`/v1beta`).
2. **3-Layer Resilience Engine**: Provider Circuit Breaker, Key Cooldown (per-key 429 backoff), and Model Lockout.
3. **Adaptive Param Shield**: Auto-recovers from HTTP 400 parameter errors and aborts upstream sockets in < 50ms on client disconnect.
4. **1.62B Free-Tier Pool Aggregator**: Out-of-the-box developer quotas across Mistral, Cerebras, Groq, and Pollinations.
5. **4-Stage LexiPack Compression**: Cuts prompt token bloat by 30–55% without touching code or JSON.
6. **Native MCP Server & Agent Launcher**: Drop-in support for Claude Desktop, Cursor, Cline, and Aider.
7. **100% Local & Verified**: AES-256-GCM encrypted keystore, SQLite persistence, and 127/127 passing automated tests.

### Maker's First Comment:
```markdown
Hi Product Hunt! 👋

I built RouteNex because building resilient AI agents and applications requires handling provider rate limits, failovers, and latency without adding expensive proxy infrastructure or vendor lock-in.

When building with tools like Cursor, Claude Code, or Cline, nothing is more frustrating than an upstream 429 rate limit crashing a 10-minute agent run halfway through. RouteNex solves this with:

- Multi-Protocol Translation: Point Anthropic, OpenAI, or Gemini SDKs to RouteNex and route across any provider seamlessly.
- 3-Layer Circuit Breakers: Retries failing requests across alternative models and cools down individual rate-limited keys without interrupting working keys.
- Free-Tier Aggregation: Automatically pools verified free developer tiers (~1.62B tokens/month) so you can build prototypes with zero API spend.
- 100% Offline & Private: Runs locally via `npx routenex` or Docker, storing encrypted credentials on your own machine with zero cloud telemetry.

We dual-licensed RouteNex under MIT and Apache-2.0 and backed it with 127 automated Vitest tests.

Run it in 2 seconds:
$ npx routenex

Check out the code on GitHub (https://github.com/harshil1876/RouteNex) and explore our docs (https://routenex.dev).

I’m here all day to answer questions and would love your feedback!
```

---

## 5. Developer Community Snippets (Discord / Forums)

### A. Cursor Discord & Forum (`#extensions` / `#general`)
```markdown
Hey everyone! If you use Cursor with BYOK or local models and get frustrated by 429 rate limits or want to use multiple free keys/providers seamlessly, I built an open-source AI gateway called **RouteNex**:

- **Drop-in with Cursor**: Just set OpenAI Base URL to `http://localhost:3001/v1` and API key to `rn-local-dev-default`.
- **3-Layer Fallback**: If Claude or OpenAI hits a 429 or 503, RouteNex transparently routes your prompt to the next healthy model in your fallback chain without crashing Cursor.
- **Multi-Protocol**: Send Claude format or OpenAI format to Groq, Mistral, Gemini, or local Ollama.
- **Free-Tier Pool**: Connects to free tiers on Mistral, Cerebras (2,000 tok/s), and Groq (~1.62B tokens/month).
- **Zero Install**: Run `npx routenex` in terminal.

Repo: https://github.com/harshil1876/RouteNex
Docs: https://routenex.dev
```

### B. Cline / Roo Code Discord (`#community-showcase`)
```markdown
Hey folks! For anyone running Cline who wants bulletproof fallbacks and prompt token optimization, check out **RouteNex**:

- **Native MCP Server**: Run `npx routenex --mcp` and add it to your Cline MCP settings.
- **Agent Launcher**: Run `npx routenex run cline` to launch with isolated virtual keys.
- **LexiPack Compression**: Cuts repetitive terminal and stack trace token bloat by 30-55% while preserving code and JSON byte-for-byte.
- **Failover Chains**: Automatically falls back to secondary models or cools down individual rate-limited keys.
- **Open-source & Self-hosted**: 100% local AES-256 storage, 127/127 tests passing.

GitHub: https://github.com/harshil1876/RouteNex
```

### C. Aider Discord (`#show-and-tell`)
```markdown
Hey Aider community! I built an open-source router called **RouteNex** that pairs super well with Aider:

Launch Aider with RouteNex injected automatically:
`npx routenex run aider --model combo/coding-power`

Features:
- Pools free developer models (Codestral, DeepSeek-V3 via SiliconFlow, Llama 3.3 70B via Cerebras/Groq).
- 3-layer circuit breakers prevent broken runs when upstream APIs rate-limit.
- Fast < 50ms socket abort when canceling generation.
- 100% offline, self-hosted, MIT/Apache-2.0.

Check it out: https://github.com/harshil1876/RouteNex
```

### D. Ollama Community Discord
```markdown
Hey all! If you run local Ollama models alongside cloud providers, **RouteNex** makes combining them seamless:

- Unified OpenAI, Anthropic, and Gemini endpoint pointing to your local `http://localhost:11434` and cloud keys.
- Grouped combos: try local `ollama/llama3.2` first, fall back to free Cerebras or Groq cloud if your local GPU is busy.
- 0ms local response cache and 4-stage prompt compression.
- Completely self-hosted: `npx routenex` or Docker.

GitHub: https://github.com/harshil1876/RouteNex
```

---

## 6. Objections & AMA Reply Cheatsheet

Keep these concise, accurate answers ready when replying to comments:

### Q1: "How is RouteNex different from LiteLLM / OpenRouter / Portkey?"
> - **vs LiteLLM**: RouteNex is a lightweight zero-dependency Node.js binary (~3.7MB packed, starts in 2s with `npx routenex`) with built-in multi-protocol translation (OpenAI, Anthropic Messages with native Claude SSE, and Gemini), a built-in Vercel Geist local web console, 4-stage LexiPack prompt compression, native MCP server, and free-tier pool aggregation.
> - **vs OpenRouter**: OpenRouter is a hosted closed-source cloud proxy that charges markups and sees your prompts. RouteNex is 100% open-source (MIT/Apache-2.0), self-hosted, BYOK-first, and runs completely offline on your own machine with local AES-256-GCM encryption.
> - **vs Portkey**: Portkey requires complex multi-service cloud architecture. RouteNex is designed for developer velocity: run one command (`npx routenex`) and your gateway, Studio console, MCP server, and agent launcher are running instantly.

### Q2: "Are my API keys and prompts secure?"
> Yes. RouteNex operates 100% offline. All provider keys are encrypted locally using AES-256-GCM with atomic `.tmp` + `renameSync` writes. Telemetry and logs use local SQLite WAL files on your own disk. Prompts and keys are never sent to external servers or telemetry endpoints.

### Q3: "How does the free-tier aggregator work without charging me?"
> Frontier providers (Mistral, Cerebras, Groq, Google AI Studio) offer generous official free developer allowances (e.g. Mistral gives 1B tokens/mo, Cerebras gives 1M tokens/day at 2,000 tok/s). RouteNex lets you plug in your free keys and pools them using multi-key rotation and intelligent round-robin, maximizing your daily throughput without spending a dime.

### Q4: "Does it support streaming (SSE) and tool calls?"
> Yes. RouteNex supports streaming end-to-end for both OpenAI-compatible SSE and Anthropic Claude SSE events (`message_start`, `content_block_delta`, `message_delta`, `message_stop`). Tool calling, function calling, and structured JSON schemas pass through transparently with full parameter validation and 127/127 passing automated tests.

# RouteNex — Community Launch Kit & Distribution Playbook

Use these battle-tested, developer-centric launch posts to introduce RouteNex to the community on Hacker News, Reddit, Twitter/X, and Product Hunt.

---

## 1. Hacker News — "Show HN"

**Title**:  
`Show HN: RouteNex – Open-source AI gateway with 0ms cache, 3-layer resilience, and free-tier pools`

**Post URL**: `https://github.com/harshil1876/RouteNex`  
*(Or submit as text post with the following content)*:

**Content**:
```markdown
Hey HN,

I built RouteNex (https://github.com/harshil1876/RouteNex) because I was tired of two things when building AI coding agents and LLM applications:

1. Paying third-party AI proxy markups just to get fallback routing and basic metrics.
2. Having my agent workflows crash midway because an upstream provider hit a rate limit (429) or temporary 503 outage.

RouteNex is a lightweight, self-hosted, deterministic AI router and gateway. You bring your own API keys, run it locally or on your own VPS, and point any OpenAI-compatible SDK to `http://localhost:3001/v1`.

Some key features:

* 3-Layer Resilience:
  - Layer 1 (Provider Breaker): Trips on consecutive 5xx errors; 30s cooldown with half-open probes.
  - Layer 2 (Key Cooldown): Parses Retry-After on HTTP 429 and cools down only the specific key while other keys in the pool continue serving traffic.
  - Layer 3 (Model Lockout): Isolates single failing model IDs without knocking out sibling models on the same provider.

* Free-Tier Pool Aggregator: Direct out-of-the-box pooling across Mistral (1B tokens/mo free), Cerebras (1M/day at 2,000 tok/s), Groq (14.4k req/day), Pollinations, and Google AI Studio (~1.62B free tokens/month total).

* 4-Stage LexiPack Token Optimizer: Strips duplicate whitespace, build log spam, and conversational fluff while preserving code blocks, markdown tables, and JSON byte-for-byte (saving 30-55% token expenditure).

* Native MCP Server: Built-in stdio and HTTP JSON-RPC 2.0 MCP server with 5 autonomous tools for Claude Desktop, Cursor, and Cline.

* Zero Cloud Account Required: Operates 100% offline with local AES-256-GCM encrypted keystores and SQLite WAL persistence.

You can try it right now with zero installation:
$ npx routenex

Or with Docker:
$ docker run -p 3001:3001 -v routenex-data:/app/data harshil1876/routenex

GitHub: https://github.com/harshil1876/RouteNex
Docs & 200+ Model Catalog: https://routenex.dev

Would love your feedback on the routing strategies and adapter design!
```

---

## 2. Reddit — r/LocalLLaMA & r/selfhosted

**Subreddits**:
* `r/LocalLLaMA`
* `r/selfhosted`
* `r/OpenAI`

**Title**:  
`I built an open-source AI routing gateway with 3-layer circuit breakers, 0ms cache, and free-tier pooling (npx routenex)`

**Post Body**:
```markdown
Hey everyone,

If you run local agents (Claude Code, Cursor, Cline, Aider) or self-host LLMs alongside cloud APIs, you probably know how fragile upstream routing can be.

I open-sourced **RouteNex** (MIT / Apache-2.0) — a lightweight standalone gateway that acts as a unified OpenAI-compatible endpoint with deterministic routing and resilience:

**What makes it different from other proxies:**
1. **Zero Cloud Dependencies**: 100% offline. Local AES-256-GCM encrypted keystores and SQLite WAL persistence. Your prompts and keys never leave your machine.
2. **3-Layer Circuit Breakers**:
   - Provider Breaker (isolates cascading 5xx outages)
   - Key Cooldown (backs off on 429 per-key without killing sibling keys)
   - Model Lockout (locks only the failing model ID, keeping sibling models active)
3. **1.62 Billion Free Tokens Aggregator**: Automatically routes through developer allowances (Mistral 1B free tokens/mo, Cerebras 1M/day at 2,000 tok/s, Groq 14.4k req/day, Pollinations, Google AI Studio).
4. **LexiPack Token Compression**: 4-stage optimizer that strips repetitive stack traces, terminal noise, and filler phrases without touching code blocks or JSON formatting (30-55% token savings).
5. **Native MCP Server**: Pre-built stdio & HTTP MCP server exposing model lists, dry-run routing explanations, and health checks to Claude Desktop, Cursor, and Cline.
6. **Local Studio Dashboard**: Built-in visual canvas, provider credentials matrix, combo builder, and real-time latency analytics on `http://localhost:3001`.

**Quick Start:**
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
volumes:
  routenex-data:
```

GitHub: https://github.com/harshil1876/RouteNex
Model Catalog & Docs: https://routenex.dev

Feedback, bug reports, and provider PRs are very welcome!
```

---

## 3. Twitter / X Launch Thread

**Tweet 1 (Hook)**:  
`Introducing RouteNex 🚀 — The open-source AI gateway & agent control plane.`  
`One endpoint for every AI model. Deterministic routing, 3-layer resilience, 0ms cache, and zero vendor markup.`  
`Run locally with one command: npx routenex`  
`🧵👇`  

**Tweet 2 (Resilience)**:  
`Autonomous coding agents crash when upstream providers hit 429s or 503s.`  
`RouteNex implements 3-layer resilience:`  
`1️⃣ Provider Breaker: isolates 5xx outages`  
`2️⃣ Key Cooldown: backs off on 429s without killing sibling keys`  
`3️⃣ Model Lockout: isolates 1 failing model without taking down the provider`  

**Tweet 3 (Free Tokens & LexiPack)**:  
`🎁 Connects to ~1.62 Billion free tokens/month across Mistral, Cerebras (2,000 tok/s), Groq, and Pollinations.`  
`🗜️ 4-Stage LexiPack optimizer cuts prompt token bloat by 30-55% while keeping code and JSON byte-for-byte intact.`  

**Tweet 4 (Agent Launcher & MCP)**:  
`Launch your coding agent with isolated virtual keys injected per-process:`  
`$ npx routenex run claude --model auto`  
`$ npx routenex run cursor`  
`$ npx routenex run aider`  
`Plus a built-in MCP server for Claude Desktop and Cline.`  

**Tweet 5 (Call to Action)**:  
`RouteNex is 100% open-source under MIT & Apache 2.0.`  
`⭐ Star on GitHub: https://github.com/harshil1876/RouteNex`  
`📖 Explore the 200+ Model Catalog & Docs: https://routenex.dev`  
`Let me know what you think!`

---

## 4. Product Hunt Launch Copy

* **Tagline**: The open-source AI gateway with 3-layer resilience & 0ms cache
* **Category**: Developer Tools, Artificial Intelligence, Open Source
* **Elevator Pitch**: Stop paying AI proxy markups. RouteNex provides deterministic routing, 3-layer circuit breakers, a 1.62B free-token aggregator, and 4-stage prompt compression in a single self-hosted binary.
* **Makers First Comment**:
  > Hi Product Hunt! 👋  
  > I built RouteNex because building resilient AI agents requires handling provider rate limits, failovers, and latency without adding complex proxy infrastructure or vendor lock-in.  
  > RouteNex runs locally with `npx routenex` or Docker, operates 100% offline with SQLite storage and local encrypted keystores, and connects directly to your favorite tools (Cursor, Claude Code, Cline).  
  > We'd love your feedback and feature requests!

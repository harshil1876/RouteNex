# RouteNex — Architecture

## Overview

RouteNex is an open-source, self-hosted AI routing gateway that provides a single
OpenAI-compatible endpoint for multiple AI model providers. It operates under a
strict Bring Your Own Key (BYOK) model.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                             │
│  (cURL, Python SDK, JS SDK, Cursor, Claude Code, any OpenAI    │
│   compatible client)                                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ POST /v1/chat/completions
                           │ GET  /v1/models
                           │ POST /v1/router/explain
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RouteNex Gateway (Hono.js)                   │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐      │
│  │   Auth   │→ │  Rate    │→ │  Request  │→ │  Router  │      │
│  │Middleware│  │  Limiter │  │ Validator │  │  Engine  │      │
│  └──────────┘  └──────────┘  └───────────┘  └────┬─────┘      │
│                                                   │             │
│  ┌────────────────────────────────────────────────┼─────────┐  │
│  │              Provider Adapter Layer             │         │  │
│  │                                                 ▼         │  │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌──────────────┐   │  │
│  │  │  Mock  │  │  Groq  │  │ OpenAI │  │Circuit Breaker│  │  │
│  │  │Adapter │  │Adapter │  │Adapter │  │  Per-Provider │  │  │
│  │  └────────┘  └────────┘  └────────┘  └──────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────┐  ┌──────────────────┐                        │
│  │   Storage    │  │   Usage/Cost     │                        │
│  │  (JSON file) │  │   Tracking       │                        │
│  └──────────────┘  └──────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Upstream AI Providers                         │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │   Groq   │  │  OpenAI  │  │  Gemini  │  │  Ollama  │      │
│  │ (free    │  │ (BYOK)   │  │  (BYOK)  │  │ (local)  │      │
│  │  tier)   │  │          │  │          │  │          │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  RouteNex Frontend (Astro)                      │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Landing     │  │ Documentation│  │  Dashboard   │         │
│  │  Page        │  │  (Static)    │  │ (React       │         │
│  │  (Static)    │  │              │  │  Islands)    │         │
│  └──────────────┘  └──────────────┘  └──────┬───────┘         │
│                                              │                  │
│                               Connects to Gateway API           │
└─────────────────────────────────────────────────────────────────┘
```

## Component Details

### Gateway API (Hono.js + TypeScript)
- **Framework**: Hono.js — ultra-lightweight (14KB), runs on Node.js, Bun, Deno, and Cloudflare Workers
- **Validation**: Zod schemas for all request/response types
- **Streaming**: Native Web Streams API + Server-Sent Events (SSE)
- **Storage**: JSON file-based append log (zero-dependency, optional)
- **Port**: Default 3001 (configurable via ROUTENEX_PORT)

### Frontend (Astro + React + Tailwind CSS v4)
- **Framework**: Astro v7 with static generation for marketing pages
- **Interactive**: React islands for dashboard components
- **Design**: Vercel Geist design system (DESIGN.md)
- **Port**: Default 4321 (Astro dev server)

### Routing Engine
- **Deterministic**: No ML or LLM-based routing. Every decision is explainable.
- **Strategies**: explicit (direct model), cost (cheapest), latency (fastest), balanced (weighted)
- **Fallback**: OpenRouter-compatible `models[]` array for failover chains
- **Circuit Breaker**: CLOSED → OPEN (after 3 failures) → HALF_OPEN (after 30s cooldown)

### Provider Adapters
Each adapter implements `IProviderAdapter`:
- `chat()` — Non-streaming completion
- `chatStream()` — SSE streaming completion
- `isConfigured()` — Check if API key is available
- `healthCheck()` — Verify provider connectivity

### Security Model
- **No user accounts** — single operator mode
- **Optional API key** — set ROUTENEX_API_KEY to require auth
- **Localhost-first** — auth disabled by default for 127.0.0.1
- **Secret redaction** — provider keys never appear in logs or responses
- **No prompt logging** — disabled by default (ROUTENEX_LOG_PROMPTS=false)

## Deployment Options

1. **Local Development**: `npm run dev` (zero config needed)
2. **Docker**: `docker compose up` (production-ready)
3. **Self-Hosted**: Any Node.js server
4. **Cloudflare Pages**: Static frontend only

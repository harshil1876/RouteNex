# 🎬 RouteNex — TCS Zeta Innovate Demonstration Script

This document provides the complete, rehearsed 5-to-10 minute presentation and live demonstration walkthrough for the **TCS Zeta Innovate** showcase.

---

## 🎯 1. The Opening Pitch (60 Seconds)

> *"Good morning / afternoon evaluators. Today, enterprise and indie AI applications face three critical vulnerabilities:*
> 
> 1. ***Vendor Fragility***: *When OpenAI or Anthropic experiences an outage or sudden 429 rate-limit, the application crashes.*
> 2. ***Opaque Costs***: *Teams have zero real-time visibility into per-request token expenditure, model pricing fluctuations, or cost-performance trade-offs.*
> 3. ***Proprietary Lock-in***: *Existing routing solutions force teams to either route all traffic through an expensive SaaS proxy or pay for enterprise platforms.*
> 
> *Our solution is **RouteNex** — an open-source, self-hostable, provider-agnostic AI routing gateway built on a strict **Bring Your Own Key (BYOK)** model. It gives you one OpenAI-compatible endpoint with deterministic routing, automatic circuit-breaker fallback, and complete cost visibility."*

---

## 🏗️ 2. Architecture Walkthrough (90 Seconds)

Present the architecture diagram from [`docs/architecture.md`](file:///c:/Users/Harshil/Projects/RouteNex/docs/architecture.md):

* **Single Port of Entry**: Point any client (Python SDK, cURL, Cursor, Claude Code) to `http://127.0.0.1:3001/v1`.
* **Zero-Setup Lightweight Gateway**: Built in TypeScript with Hono.js — ultra-fast, zero-native-build dependencies, embedded file-based persistence (zero database server overhead).
* **Provider Adapters**: Universal abstraction supporting Groq, OpenAI, Google Gemini, Ollama, and a built-in Deterministic Mock Adapter for 100% offline, zero-cost development.
* **Geist UI & Dashboard**: Built in Astro v7 + Tailwind CSS v4 + React Islands strictly following Vercel's Geist design language ([`DESIGN.md`](file:///c:/Users/Harshil/Projects/RouteNex/DESIGN.md)).

---

## ⚡ 3. Live Technical Demonstration (3-4 Minutes)

### Step 1: Starting the Gateway
In terminal 1:
```bash
npm run dev:api
```
*Point out the startup banner*:
* Notice that `Auth` is disabled for localhost developer mode.
* Notice that secrets are never printed.
* Notice that the Mock Provider is active for zero-cost offline demonstration.

### Step 2: Open the RouteNex Dashboard
In your browser, navigate to:
```
http://localhost:4321/dashboard
```
* **Connection Badge**: Notice the green indicator showing `LIVE TELEMETRY • Gateway Connected`.
* **Telemetry KPIs**: Live requests counter, success rate, median latency, and configured providers.
* **Latency Profile**: Hourly latency sparkline showing performance across upstream providers.

### Step 3: Demonstrating Cascading Failover (The "Zero-Downtime" Test)
Open the **⚡ Live Playground** tab in the dashboard (or use cURL):

Select model: `Cascade Chain: [mock/error → mock/fast → mock/gpt-4]`
Enter prompt: *"Generate a resilient distributed systems plan"*
Click **Send Through Gateway →**

**Explain what just happened to the evaluators**:
1. RouteNex first attempted to call `mock/error`.
2. The gateway caught the simulated upstream provider outage.
3. Rather than returning a 500 error to the client, RouteNex stepped down the fallback chain to `mock/fast`.
4. The client received a `200 OK` response with `fallback_attempts: 1`.
5. Point out the amber alert: `⚡ Cascade Failover Triggered: Mitigated 1 failing candidate before successful completion.`

### Step 4: Demonstrating OpenRouter-Style cURL Request
Run this in terminal:
```bash
curl http://127.0.0.1:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto",
    "provider": { "sort": "cost" },
    "messages": [{"role": "user", "content": "What is RouteNex?"}]
  }'
```
Show the response payload containing the `routenex` metadata block:
```json
{
  "routenex": {
    "provider": "mock",
    "model_used": "mock/fast",
    "routing_reason": "Optimized candidate 'mock/fast' selected using 'cost' strategy.",
    "latency_ms": 11,
    "cost_estimate": { "total_usd": 0, "provenance": "ESTIMATED" }
  }
}
```

### Step 5: Dry-Run Route Explanation (`POST /v1/router/explain`)
Show how developers can inspect routing decisions **without** making paid calls:
```bash
curl http://127.0.0.1:3001/v1/router/explain \
  -H "Content-Type: application/json" \
  -d '{"model":"auto","messages":[{"role":"user","content":"Analyze dataset"}]}'
```
Explain:
* Candidate models evaluated.
* Scoring breakdown.
* Exclusions (e.g. circuit breakers or capability mismatches).
* Reason code returned: `COST_MINIMIZED` or `BALANCED`.

---

## 🛡️ 4. Technical Defense & Anticipated Questions

### Q1: Why didn't you use PostgreSQL or Redis?
> **Answer**: *"For an open-source tool designed to run locally or inside edge containers, requiring PostgreSQL or Redis creates unnecessary operational friction. By using an embedded file-based store, RouteNex boots instantly in a single command (`npm run dev` or `docker compose up`) with zero database administration and zero cost."*

### Q2: Why TypeScript over Python?
> **Answer**: *"Astro, React, and modern full-stack web platforms use TypeScript. By writing the gateway in TypeScript with Hono.js, we eliminate polyglot complexity, share Zod schemas directly across backend and frontend, and natively handle Web Streams and Server-Sent Events without external bridge libraries."*

### Q3: What is your monetization model?
> **Answer**: *"We operate on an open-core model. The core self-hosted router is 100% free and MIT-licensed. In Phase 7 of our roadmap, commercialization will focus on enterprise management: team workspace policies, audit logs, and an optional managed hosted gateway with SLA guarantees."*

---

## 🏁 5. Closing Summary

> *"RouteNex proves that resilient, multi-provider AI infrastructure does not need to be expensive or complex. With zero upfront cost, deterministic routing, and a clean Vercel Geist design, RouteNex is ready for developer adoption and long-term commercialization. Thank you."*

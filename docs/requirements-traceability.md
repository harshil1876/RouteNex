# RouteNex — Requirements Traceability Matrix

This document tracks all foundational requirements from the PRD and their verification status in RouteNex.

| PRD Section | Requirement Description | Implementation Location | Verification Method | Status |
| :--- | :--- | :--- | :--- | :--- |
| **AR-01** | Executive summary & zero-cost promise | `gateway/src/providers/mock.ts` | Vitest mock tests | ✅ **VERIFIED** |
| **AR-02 / ADR** | Modular TypeScript architecture | `gateway/src/server.ts`, `src/` | `npm run build` | ✅ **VERIFIED** |
| **AR-03 / 04** | BYOK-first model, no token resale | `gateway/src/config.ts` | Code inspection | ✅ **VERIFIED** |
| **AR-08** | Core MVP unified chat completions | `gateway/src/routes/chat.ts` | `POST /v1/chat/completions` test | ✅ **VERIFIED** |
| **AR-21** | Gateway authentication (Bearer key) | `gateway/src/middleware/auth.ts` | Vitest auth test | ✅ **VERIFIED** |
| **AR-22 / 35** | Model catalog inspection | `gateway/src/routes/models.ts` | `GET /v1/models` live test | ✅ **VERIFIED** |
| **AR-23** | Explicit model routing | `gateway/src/router/engine.ts` | Vitest engine test | ✅ **VERIFIED** |
| **AR-24 / 29** | Deterministic auto routing (cost/latency/balanced) | `gateway/src/router/engine.ts` | Vitest strategy tests | ✅ **VERIFIED** |
| **AR-30** | Bounded retry and fallback cascade | `gateway/src/router/engine.ts` | Live fallback test (`models: []`) | ✅ **VERIFIED** |
| **AR-31** | Circuit breaker state machine (Closed/Open/Half-Open) | `gateway/src/router/circuit-breaker.ts` | Vitest circuit breaker test | ✅ **VERIFIED** |
| **AR-34** | SSE Streaming (`stream: true`) | `gateway/src/routes/chat.ts` | Vitest SSE streaming parser | ✅ **VERIFIED** |
| **AR-36** | Dry-run routing explanation | `gateway/src/routes/explain.ts` | `POST /v1/router/explain` live test | ✅ **VERIFIED** |
| **AR-37 / 56** | Usage tracking, token accounting, latency telemetry | `gateway/src/routes/usage.ts` | `GET /v1/usage` live test | ✅ **VERIFIED** |
| **AR-41** | Provider adapter abstraction (`IProviderAdapter`) | `gateway/src/providers/types.ts` | Contract tests | ✅ **VERIFIED** |
| **AR-41 / 82** | Groq & OpenAI provider adapters | `gateway/src/providers/groq.ts`, `openai.ts` | Provider registry tests | ✅ **VERIFIED** |
| **AR-41 / 82** | Google Gemini & Ollama adapters | `gateway/src/providers/gemini.ts`, `ollama.ts` | Provider registry & build tests | ✅ **VERIFIED** |
| **AR-45** | Cost provenance marking (`MEASURED`, `ESTIMATED`, `UNKNOWN`) | `gateway/src/schemas.ts` | Schema validation | ✅ **VERIFIED** |
| **AR-48** | Developer dashboard with Geist design system | `src/pages/dashboard/index.astro`, `src/components/dashboard/` | Astro static build | ✅ **VERIFIED** |
| **AR-48** | Live Playground interactive test bench | `src/components/dashboard/Playground.tsx` | Interactive UI integration | ✅ **VERIFIED** |
| **AR-28** | Prompt token compression (10-30% saving) | `gateway/src/router/compression.ts` | Vitest compression test | ✅ **VERIFIED** |
| **AR-49** | CLI Doctor diagnostic utility | `gateway/src/cli/doctor.ts` | `npm run doctor` execution | ✅ **VERIFIED** |
| **AR-52 / 89** | Secret sentinel redaction guardrail | `gateway/src/gateway.test.ts` | Vitest sentinel test | ✅ **VERIFIED** |
| **AR-58 / 82** | Opt-in safe live smoke testing | `gateway/src/scripts/live-smoke-test.ts` | `npm run test:live` execution | ✅ **VERIFIED** |
| **AR-60 / 61** | Docker Compose and zero-setup local running | `docker-compose.yml`, `gateway/Dockerfile` | Configuration validation | ✅ **VERIFIED** |

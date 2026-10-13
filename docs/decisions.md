# RouteNex — Architecture Decision Records

## ADR-001: TypeScript Monorepo over Python/FastAPI Backend

**Status**: Accepted  
**Date**: 2026-10-14

**Context**: The PRD mentioned Python/FastAPI as a candidate backend. The project already uses Astro (TypeScript/Node.js) for the frontend.

**Decision**: Use TypeScript for both frontend and gateway API.

**Rationale**:
1. Single language across the entire stack — no polyglot complexity
2. Shared Zod schemas between gateway validation and dashboard types
3. Hono.js provides the same performance characteristics as FastAPI for HTTP routing
4. Native Web Streams API for SSE streaming (no adapter libraries needed)
5. Simplified Docker deployment (one Node.js runtime)
6. Most AI provider SDKs have excellent TypeScript support
7. Reduced hiring/contribution barrier — one language to learn

**Consequences**: Cannot use Python-specific ML libraries directly, but this is irrelevant for the deterministic MVP router.

---

## ADR-002: Hono.js over Express/Fastify

**Status**: Accepted  
**Date**: 2026-10-14

**Context**: Need a lightweight HTTP framework for the gateway API.

**Decision**: Use Hono.js

**Rationale**:
1. 14KB bundle — ultra-lightweight
2. Runs on Node.js, Bun, Deno, AND Cloudflare Workers (future portability)
3. Native streaming support via Web Streams API
4. Built-in middleware (CORS, Bearer Auth, etc.)
5. TypeScript-first with excellent type inference
6. Active community (36K+ GitHub stars)

---

## ADR-003: No External Database for MVP

**Status**: Accepted  
**Date**: 2026-10-14

**Context**: The PRD specifies persistence for request logs and usage analytics.

**Decision**: Use JSON file-based append log for MVP. No external database server required.

**Rationale**:
1. Zero infrastructure cost and zero setup friction
2. Works identically on localhost, Docker, and cloud
3. Request logs are append-only (perfect for file-based storage)
4. Can be disabled entirely for pure proxy mode
5. Future migration path to SQLite or PostgreSQL is trivial

**Consequences**: Not suitable for high-throughput production use (>1000 req/s). Acceptable for MVP and self-hosted single-operator deployments.

---

## ADR-004: BYOK-Only — No Managed Inference

**Status**: Accepted  
**Date**: 2026-10-14

**Context**: RouteNex must not subsidize or broker AI inference tokens.

**Decision**: Users provide their own provider API keys via environment variables. RouteNex never stores, shares, or charges for tokens.

**Rationale**:
1. Zero liability for upstream billing
2. No payment processing infrastructure needed
3. Users control their own costs directly with providers
4. Aligns with open-source self-hosted philosophy
5. Provider keys are encrypted at rest (future) and redacted from all outputs

---

## ADR-005: Deterministic Routing Only for MVP

**Status**: Accepted  
**Date**: 2026-10-14

**Context**: The PRD envisions future ML-powered routing. The MVP needs reliable, testable routing.

**Decision**: All routing decisions in MVP are deterministic and rule-based.

**Rationale**:
1. Every routing decision can be unit tested with deterministic inputs
2. The `/v1/router/explain` endpoint returns the exact reasoning
3. No dependency on expensive inference calls for routing itself
4. Strategies: explicit model → cost-sorted → latency-sorted → balanced scoring
5. Future ML routing can be added as an opt-in strategy without changing the interface

---

## ADR-006: OpenRouter-Compatible Request Format

**Status**: Accepted  
**Date**: 2026-10-14

**Context**: Need a standard request format that supports model fallback chains.

**Decision**: Support both standard OpenAI format AND OpenRouter extensions:
- `model: string` — single model (OpenAI standard)
- `models: string[]` — fallback chain (OpenRouter extension)
- `provider: { sort, order, allow_fallbacks, max_price }` — routing preferences (OpenRouter extension)

**Rationale**:
1. Full backward compatibility with any OpenAI SDK
2. Power users get fine-grained control via optional fields
3. OpenRouter is the de facto standard for multi-model routing
4. Existing tools (Cursor, Claude Code, etc.) work without modification

---

## ADR-007: Vercel Geist Design System

**Status**: Accepted  
**Date**: 2026-10-14

**Context**: The project requires a professional, developer-focused UI.

**Decision**: Use Vercel's Geist design system as implemented in DESIGN.md.

**Rationale**:
1. Clean, monochrome aesthetic trusted by developers
2. Strong typography hierarchy with Geist Sans/Mono
3. Restrained color palette prevents garish AI dashboard syndrome
4. Well-documented tokens for consistent implementation
5. Responsive and accessible by design

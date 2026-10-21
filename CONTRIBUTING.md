# Contributing to RouteNex

Thank you for your interest in contributing to RouteNex! RouteNex is the open-source, BYOK-first AI routing gateway designed for developer sovereignty, deterministic routing, and zero-markup model access.

## Core Architectural Principles

Before writing code, please keep these mandatory principles in mind:

1. **Open-Source Independence**: The RouteNex Open Source edition must remain 100% self-hosted, offline-capable, and completely functional without requiring any cloud subscription or external backend.
2. **BYOK (Bring Your Own Key)**: We never intermediate payments or mark up provider tokens. Users supply their own upstream provider keys.
3. **Zero Secret Leaks**: Upstream API keys must **never** be logged to stdout, persisted in request traces, or echoed back in error responses or model lists.
4. **Deterministic & Testable**: Routing decisions, fallbacks, and circuit breaker transitions must be deterministic, transparent, and verified with automated tests.
5. **Vercel Geist Design System**: All dashboard UI components adhere strictly to the minimal monochrome design tokens in [`DESIGN.md`](./DESIGN.md).

---

## Local Development Setup

### Prerequisites
- **Node.js**: `v20.x` or `v22.x`
- **npm**: `v10+`
- **Git**

### Installation

```bash
# Clone the repository
git clone https://github.com/harshil1876/RouteNex.git
cd RouteNex

# Install dependencies (installs root, frontend, and gateway workspace)
npm install
```

### Running Locally

```bash
# Terminal 1: Run the Astro Frontend Dashboard (port 4321)
npm run dev

# Terminal 2: Run the RouteNex Gateway Backend (port 3001)
npm run dev:api

# Or start the unified CLI launcher
npm start
```

### Running Tests and Builds

Before opening a pull request, ensure all tests pass and the full build succeeds:

```bash
# Run Vitest API integration and unit test suite (73 tests)
npm run test:api

# Compile both Astro frontend and Gateway TypeScript
npm run build
```

---

## Adding a New Provider Adapter

RouteNex uses an adapter architecture. To add a new provider:

1. **Create Adapter File**:
   Create `gateway/src/providers/<provider-name>.ts` implementing the `IProviderAdapter` interface:
   ```typescript
   import type { IProviderAdapter, ModelEntry } from './types.js';
   import type { ChatCompletionRequest, ChatCompletionResponse, StreamChunk } from '../schemas.js';

   export class MyProviderAdapter implements IProviderAdapter {
     readonly id = 'myprovider';
     readonly name = 'My Provider';
     readonly models: ModelEntry[] = [ /* ... */ ];

     constructor(private apiKey?: string) {}

     isConfigured(): boolean { return !!this.apiKey; }
     async healthCheck(): Promise<boolean> { /* ... */ }
     async chat(req: ChatCompletionRequest): Promise<ChatCompletionResponse> { /* ... */ }
     async *chatStream(req: ChatCompletionRequest): AsyncGenerator<StreamChunk> { /* ... */ }
   }
   ```

2. **Register Adapter**:
   Add the provider instance and models in `gateway/src/providers/registry.ts`.

3. **Add Configuration**:
   Update `gateway/src/config.ts` if a new environment variable (e.g. `MYPROVIDER_API_KEY`) is needed.

4. **Add Unit & Integration Tests**:
   Add test coverage in `gateway/src/gateway.test.ts` verifying model registration, unconfigured key safety, and execution.

---

## Pull Request Guidelines

1. **Branch Naming**:
   - `feat/feature-name` for new features
   - `fix/bug-description` for bug fixes
   - `docs/documentation-update` for documentation changes
2. **Commit Messages**:
   - Use clear, descriptive commit messages (e.g., `feat(cache): add SHA-256 0ms response cache`).
3. **Continuous Integration**:
   - Every pull request automatically triggers GitHub Actions CI. All checks must be green before merging.

---

## License

By contributing to RouteNex, you agree that your contributions will be licensed under its dual [MIT](./LICENSE) OR [Apache-2.0](./LICENSE-APACHE) license.

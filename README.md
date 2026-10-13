# 🚀 RouteNex — Open-Source AI Routing Gateway

> **One API. Your provider keys. Routing you can understand.**

RouteNex is a lightweight, self-hostable, provider-agnostic AI routing gateway. It exposes a unified, OpenAI-compatible endpoint (`/v1/chat/completions`) across multiple AI model providers (Groq, OpenAI, Google Gemini, Ollama, etc.) with deterministic policy routing, automatic circuit-breaker fallback, token telemetry, and zero vendor lock-in under a **Bring Your Own Key (BYOK)** model.

---

## ⚡ Quick Start (60 Seconds)

### 1. Clone & Install
```bash
git clone https://github.com/your-username/RouteNex.git
cd RouteNex
npm install
cd gateway && npm install && cd ..
```

### 2. Start the Gateway (Offline Mock Mode by default)
```bash
# Starts gateway on http://127.0.0.1:3001
npm run dev:api
```

### 3. Send Your First Request
```bash
curl http://127.0.0.1:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto",
    "messages": [{"role": "user", "content": "Hello RouteNex!"}]
  }'
```

### 4. Start the Web & Dashboard UI
```bash
# In another terminal: starts dashboard at http://localhost:4321
npm run dev:web
```

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────┐
│                      Client Layer                      │
│   (cURL, Python SDK, JS SDK, Cursor, Claude Code)     │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ POST /v1/chat/completions
                            │ GET  /v1/models
                            │ POST /v1/router/explain
                            ▼
┌────────────────────────────────────────────────────────┐
│                RouteNex Gateway (Hono.js)              │
│                                                        │
│  [Rate Limiter] ──▶ [Auth Middleware] ──▶ [Validator]  │
│                                               │        │
│                                               ▼        │
│                                      [Routing Engine]  │
│                                               │        │
│                ┌──────────────────────────────┼────┐   │
│                ▼                              ▼    ▼   │
│         [Circuit Breaker]              [Fallback Chain]│
│                │                                       │
│                ├───────────────┬───────────────┐       │
│                ▼               ▼               ▼       │
│          [Mock Adapter]  [Groq Adapter]  [OpenAI Adap] │
└────────────────┼───────────────┼───────────────┼───────┘
                 │               │               │
                 ▼               ▼               ▼
           Deterministic    Groq Cloud      OpenAI API
             Fixtures       (Fast/Free)       (BYOK)
```

---

## 🎯 Key Features

* **Universal OpenAI-Compatible API**: Drop-in replacement for OpenAI SDK, Cursor, Claude Code, Cline, and custom clients.
* **OpenRouter-Compatible Fallback Chains**: Pass a `models: string[]` array. If the primary model fails or hits a rate-limit (429/5xx), RouteNex automatically cascades to the next healthy candidate:
  ```json
  {
    "models": ["groq/llama-3.3-70b-versatile", "openai/gpt-4o-mini", "mock/gpt-4"],
    "messages": [{"role": "user", "content": "Draft an API migration plan"}]
  }
  ```
* **Provider Routing Preferences**: Enforce optimization by price, latency, or throughput:
  ```json
  {
    "model": "auto",
    "provider": {
      "sort": "price",
      "allow_fallbacks": true,
      "max_price": { "prompt": 0.000002, "completion": 0.000008 }
    }
  }
  ```
* **Deterministic Circuit Breakers**: 3-state machine (`CLOSED` → `OPEN` → `HALF_OPEN`) automatically isolates failing or rate-limited providers to protect your application.
* **Dry-Run Inspection (`/v1/router/explain`)**: Test and inspect candidate eligibility, capability checks, and scoring without making paid provider calls.
* **Zero-Setup Embedded Persistence**: Built-in JSON request logging tracks latency, token counts, error rates, and cost estimates. Never logs prompt contents by default.
* **Geist Design System**: Minimalist, high-performance developer UI built with Astro, React islands, and Tailwind CSS v4.

---

## 💻 SDK Integration Examples

### Python (using official `openai` SDK)
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://127.0.0.1:3001/v1",
    api_key="not-needed" # or ROUTENEX_API_KEY if auth enabled
)

response = client.chat.completions.create(
    model="auto",
    messages=[{"role": "user", "content": "Explain circuit breakers in distributed systems"}]
)

print(response.choices[0].message.content)
```

### TypeScript / JavaScript
```typescript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "http://127.0.0.1:3001/v1",
  apiKey: "not-needed",
});

const stream = await client.chat.completions.create({
  model: "auto",
  messages: [{ role: "user", content: "Write a quicksort implementation in Rust" }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || "");
}
```

---

## ⚙️ Configuration & Environment Variables

Copy `.env.example` to `.env` to configure upstream keys:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `ROUTENEX_PORT` | `3001` | Gateway API port |
| `ROUTENEX_HOST` | `127.0.0.1` | Gateway bind host (`0.0.0.0` for Docker) |
| `ROUTENEX_API_KEY` | *(empty)* | Optional Bearer auth key. Auth is disabled when unset. |
| `ROUTENEX_MOCK_MODE` | `true` | Enables deterministic mock provider for zero-cost testing |
| `GROQ_API_KEY` | *(empty)* | Groq API Key (enables Groq provider) |
| `OPENAI_API_KEY` | *(empty)* | OpenAI API Key (enables OpenAI provider) |
| `ROUTENEX_DEFAULT_STRATEGY` | `balanced` | Default auto routing: `explicit`, `cost`, `latency`, `balanced` |
| `ROUTENEX_MAX_RETRIES` | `2` | Maximum retry attempts per request |
| `ROUTENEX_TIMEOUT_MS` | `60000` | Upstream provider timeout |
| `ROUTENEX_PERSISTENCE` | `true` | Persist request metadata & token telemetry |
| `ROUTENEX_LOG_PROMPTS` | `false` | Log prompt content (disabled by default for privacy) |

---

## 🐳 Docker Deployment

Run both the Gateway API and the Astro UI in a single command:

```bash
docker compose up -d
```

* **Gateway API**: `http://localhost:3001`
* **Web UI & Dashboard**: `http://localhost:4321`

---

## 🧪 Testing & Verification

Run the test suite:
```bash
# Run Vitest test suite in gateway
npm run test:api

# Run full project production builds
npm run build
```

---

## 📄 License

MIT License. Free and open source for developers and organizations.

# RouteNex Product Editions & Architecture Specification

## 1. Executive Summary & Product Editions

RouteNex is architected around two distinct product offerings sharing a unified, versioned routing core:

```
                          ┌─────────────────────────────────────┐
                          │     Shared Routing Core & Types     │
                          │   (Engine, Adapters, Schemas, CB)   │
                          └──────────────────┬──────────────────┘
                                             │
                   ┌─────────────────────────┴─────────────────────────┐
                   ▼                                                   ▼
┌─────────────────────────────────────┐     ┌─────────────────────────────────────┐
│       RouteNex Open Source          │     │          RouteNex Cloud             │
│   (Self-Hostable AI Gateway)        │     │     (Hosted Managed Service)        │
├─────────────────────────────────────┤     ├─────────────────────────────────────┤
│ • 100% self-hosted & offline-first  │     │ • Hosted edge infrastructure        │
│ • Local Web Admin UI                │     │ • Multi-tenant team workspaces      │
│ • BYOK (Bring Your Own Key)         │     │ • Centralized usage & virtual keys  │
│ • Local Virtual Keys & Model Aliases│     │ • Managed billing / credit pools    │
│ • Zero external database dependency │     │ • Global latency edge routing       │
│ • Zero dependence on RouteNex Cloud │     │ • SLA, SOC2, Audit logs, SSO        │
└─────────────────────────────────────┘     └─────────────────────────────────────┘
```

---

## 2. Deep Dive: OmniRoute & OpenRouter Architectural Analysis

### A. OmniRoute (`diegosouzapw/OmniRoute`)
OmniRoute is an AI Gateway that unifies multi-provider LLM access.

| Feature Area | OmniRoute Open Source | OmniRoute Cloud (Paid / Closed) | RouteNex Equivalent Strategy |
| :--- | :--- | :--- | :--- |
| **Deployment** | Self-hosted Docker / local binary | Hosted multi-region infrastructure | Open source: Docker + Node CLI; Cloud: Hosted edge |
| **Provider Credentials** | Local BYOK configured via Admin UI or `.env` | Encrypted vault synced across team members | **Open Source**: Local Admin UI + `.env` with encrypted in-memory masking; **Cloud**: KMS-vaulted team keys |
| **Virtual API Keys** | Local access tokens for downstream apps | Centralized team tokens with monthly budget caps | **Open Source**: Local virtual keys with rate limits; **Cloud**: Organization tokens with budget limits |
| **Model Aliases** | Virtual aliases (e.g. `fast` -> `groq/llama-3.1-8b`) | Dynamic team presets & workspace defaults | **Open Source**: Configurable model alias dictionary in Admin UI |
| **Logging & Inspector** | Local file/SQLite logging; request drawer | Centralized observability, retention policies | **Open Source**: Privacy-first embedded JSON store with detail drawer |
| **Auth & Multi-Tenancy** | Single-admin password or disabled on localhost | Full multi-tenant RBAC (Owner, Admin, Member) | **Open Source**: Zero-friction local auth; **Cloud**: Supabase/Auth0 SSO |

### B. OpenRouter (`OpenRouterTeam`)
OpenRouter is a public marketplace router that provides:
1. **Fallback Arrays**: `models: ["provider/model-a", "provider/model-b"]` where downstream failover happens automatically.
2. **Dynamic Strategy Routing**: Prioritizing by lowest cost or lowest latency.
3. **Model Catalog & Transparent Pricing**: Per-million token rates with prompt caching distinctions and context sizes.
4. **Prompt Transformation / Compression**: Minimizing token overhead before hitting upstream providers.

---

## 3. Product Editions Feature Matrix

| Feature | RouteNex Open Source | RouteNex Cloud | RouteNex Enterprise | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Core Routing Engine** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Complete |
| **Multi-Provider BYOK Adapters** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Complete |
| **OpenAI Protocol Compatibility** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Complete |
| **Streaming Failover & SSE** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Complete |
| **Deterministic Fallback Cascades** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Complete |
| **3-State Circuit Breakers** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Complete |
| **Prompt Token Compression** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Complete |
| **Local Admin Console UI** | ✅ Yes | ❌ (Replaced by Cloud Console) | ✅ Yes | 🔄 In Implementation |
| **Dynamic Provider Key Manager (UI)** | ✅ Yes | ✅ Yes (Vaulted) | ✅ Yes (Vaulted) | 🔄 In Implementation |
| **Local Virtual Key Generator** | ✅ Yes | ✅ Yes (with Budgets) | ✅ Yes (with Quotas) | 🔄 In Implementation |
| **Custom Model Aliases** | ✅ Yes | ✅ Yes | ✅ Yes | 🔄 In Implementation |
| **Request Inspector Drawer** | ✅ Yes | ✅ Yes | ✅ Yes | 🔄 In Implementation |
| **Dark / Light Geist Theme** | ✅ Yes | ✅ Yes | ✅ Yes | 🔄 In Implementation |
| **Docker Compose Self-Hosting** | ✅ Yes | ❌ Managed | ✅ Yes (Air-Gapped) | ✅ Complete |
| **CLI Doctor Diagnostics** | ✅ Yes | ❌ Managed | ✅ Yes | ✅ Complete |
| **Multi-Tenant Team Workspaces** | ❌ Excluded | ✅ Yes | ✅ Yes | ⏳ Cloud Roadmap |
| **Hosted Edge Infrastructure** | ❌ Excluded | ✅ Yes | ❌ Custom VPC | ⏳ Cloud Roadmap |
| **Centralized Billing & Stripe Pools** | ❌ Excluded | ✅ Yes | ✅ Custom PO | ⏳ Cloud Roadmap |
| **SLA & Audit Log Retention** | ❌ Excluded | 99.9% SLA | 99.99% Custom SLA | ⏳ Cloud Roadmap |
| **SAML / Okta Enterprise SSO** | ❌ Excluded | ❌ Add-on | ✅ Included | ⏳ Enterprise Roadmap |

---

## 4. Key Architectural Separation Principles

1. **Zero Open-Source Cloud Dependency**:
   - The Open Source edition must NEVER call `api.routenex.com` or require a cloud token to operate.
   - It runs completely offline on `http://127.0.0.1:3001` or user-defined hosts.
2. **Local Admin UI vs. Cloud Marketing Website**:
   - The website clearly distinguishes between **Open Source (Self-Host Now)** and **Cloud (Hosted / Join Waitlist)**.
   - The Dashboard provides an **Edition Toggle**:
     - **Mode A: Local Self-Hosted Gateway (`Connected to 127.0.0.1:3001`)** with full control over local keys, virtual tokens, aliases, and request inspection.
     - **Mode B: Cloud Hosted Preview** demonstrating team collaboration, hosted edge endpoints, and organization budgets.
3. **BYOK First**:
   - Both Open Source and Cloud prioritize Bring Your Own Key.
   - Users maintain direct billing relationships with upstream providers (Groq, OpenAI, Anthropic, Gemini).

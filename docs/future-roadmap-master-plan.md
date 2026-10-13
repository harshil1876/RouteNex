# RouteNex — Master Future Plan & Strategic Architecture Roadmap

> **From Local Gateway to Global AI Infrastructure Platform**  
> *Analysis of OmniRoute, OpenRouter, Licensing Models, and the "1.6B Free Tokens" Strategy.*

---

## 1. Legal & Licensing Framework (MIT vs Apache 2.0)

### How Licensing Works
You do not need to register with a government agency, file paperwork, or pay fees to license your open-source software. Under international copyright law (Berne Convention), as the creator and author of the RouteNex codebase, you own the exclusive copyright. You license it simply by placing an official `LICENSE` file in the root of the repository with your copyright notice.

### License Comparison for RouteNex

| Criterion | **MIT License** | **Apache 2.0 License** | **Dual License (MIT + Apache 2.0)** |
| :--- | :--- | :--- | :--- |
| **Simplicity** | Short, readable in 30 seconds. | Longer, formal legal text. | Standard practice in modern systems (e.g., Rust). |
| **Permissiveness** | Full commercial and private use. | Full commercial and private use. | Maximum compatibility. |
| **Patent Grant** | Implicit. | Explicit patent retaliation clause. | Protects contributors and users. |
| **Trademark Protection**| Not explicitly reserved. | Explicitly reserves your trademarks/logos. | Prevents others from using the "RouteNex" name. |
| **Developer Adoption** | Highest (preferred by JS/Node community). | High (preferred by enterprise foundations). | Best of both worlds. |

### The RouteNex Licensing Strategy
1. **Core Gateway & Open Source UI**: Released under the **MIT License** (with copyright to Harshil Patel and RouteNex contributors). This removes all friction for developer adoption.
2. **RouteNex Cloud (Hosted SaaS)**: RouteNex Cloud is a hosted commercial service operated by RouteNex. The SaaS business model uses the open-source MIT core without being forced to open-source proprietary cloud infrastructure, billing modules, or enterprise multi-tenant clustering.

---

## 2. Reverse-Engineering the "1.6B Free Tokens" Strategy

### Where Does 1.6 Billion Free Tokens Come From?
OmniRoute does **not** pay for 1.6 billion tokens out of pocket. Instead, it aggregates the generous **free-tier allowances** provided by leading AI infrastructure companies:

| Provider | Free Tier Allowance | Approx. Monthly Free Tokens |
| :--- | :--- | :--- |
| **Google AI Studio (Gemini 2.5 Flash)** | 15 RPM / 1,500 requests/day | ~150,000,000 tokens |
| **Groq Cloud (LLaMA 3.3 70B & 3.1 8B)** | 30 RPM / 14,400 requests/day | ~120,000,000 tokens |
| **Cerebras Cloud (LLaMA 3.1 8B/70B)** | 1,000,000 tokens/day (ultra-fast) | ~30,000,000 tokens |
| **Cloudflare Workers AI** | 10,000 AI Neurons/day | ~15,000,000 tokens |
| **SiliconFlow** | 20M tokens on signup + daily bonus | ~25,000,000 tokens |
| **NVIDIA NIM** | 1,000 API credits on signup | ~50,000,000 tokens |
| **Mistral AI Free Tier** | 1 RPM / 500k tokens/mo | ~500,000 tokens |
| **OpenRouter (`:free` models)** | 20 requests/min across 10+ free models | ~100,000,000 tokens |
| **Pollinations AI** | 100% Anonymous, unlimited rate-limited | ~500,000,000 tokens |
| **Puter AI** | Free anonymous OpenAI endpoint | ~600,000,000 tokens |
| **Total Aggregated Free Capacity** | Across 15+ Free Tier Providers | **~1.6 Billion Tokens / Month** |

### How RouteNex Implements This: The "Zero-Key Out of the Box" Experience
By adding built-in adapters for **Pollinations AI**, **Puter AI**, and **OpenRouter Free**, RouteNex can offer a killer feature:
> **Run `npx routenex` and immediately start querying AI models with zero API keys, zero signups, and zero credit cards.**

When users want higher throughput or lower latency, they can plug in their free keys from Groq, Cerebras, and Google AI Studio into a **Free Tier Combo Pool**.

---

## 3. Comprehensive End-to-End Roadmap

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 ROUTENEX ROADMAP                                       │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│    SPRINTS 1 - 2         │       SPRINTS 3 - 4         │        SPRINTS 5 - 6          │
│ Open Source Free Pool    │ Combos & IDE Integrations   │ Hosted Cloud SaaS & Billing   │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ • 1-Command CLI Runner   │ • Provider Combos (Failover)│ • Hosted Edge (routenex.com)  │
│   (npx routenex@latest)  │ • Pre-Emptive Quota Guard   │ • Team Workspaces & RBAC      │
│ • Free-Tier Catalog      │ • Cursor / Cline 1-Click    │ • Cloud Key Vault & Budgets   │
│   (Pollinations, Puter,  │ • Caveman & RTK Compression │ • Stripe Unified Invoicing    │
│    Cerebras, Cloudflare) │ • MCP Server Protocol       │ • 99.9% SLA & SOC2 Logs       │
│ • Category Provider Grid │ • Webhook Event Alerts      │ • Enterprise Air-Gapped VPC   │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

---

### Track A: RouteNex Open Source (Developer Adoption Engine)

#### Milestone 1: 1-Command Global CLI (`npx routenex@latest`)
- **Package**: Publish `@routenex/cli` and `routenex` on npm.
- **Behavior**: Running `npx routenex@latest` starts the gateway server and immediately opens the web dashboard in the user's default browser at `http://localhost:3001`.
- **Zero Config**: Defaults to the Free Tier Pool with Pollinations / Puter / Mock mode enabled.

#### Milestone 2: OmniRoute-Style Categorized Provider Grid
- Recreate the provider management experience seen in the OmniRoute UI:
  - **Filter Tabs**: `All (150+)`, `Free Tier (25+)`, `API Key Compatible`, `Local Daemons`, `OAuth`.
  - **Quick Toggles**: Toggle any provider on/off with an active switch.
  - **Test All Button**: Concurrently probe all enabled providers and report real-time ping latency.

#### Milestone 3: Provider Combos & Pre-Emptive Quota Router
- **Combos**: Allow developers to define custom groups, for example:
  - `combo/fast-coding`: Groq $\rightarrow$ Cerebras $\rightarrow$ SiliconFlow.
  - `combo/reasoning`: Gemini 2.5 Flash $\rightarrow$ DeepSeek R1 $\rightarrow$ Claude 3.5 Sonnet.
  - `combo/free-unlimited`: Pollinations $\rightarrow$ Puter $\rightarrow$ OpenRouter Free.
- **Pre-Emptive Quota Guard**: Track provider rate limits (e.g. Groq 30 RPM, Gemini 15 RPM). When request count approaches the limit, automatically route to the next provider *before* upstream throws a 429 error.

#### Milestone 4: 1-Click IDE & Coding Agent Integrations
- Provide instant setup guides and auto-configuration files for:
  - **Cursor**: Export `.cursorrules` and endpoint config.
  - **Claude Code CLI**: Run Claude Code directed at RouteNex proxy.
  - **Cline / Roo Code**: VS Code extension setup with virtual key.
  - **OpenCode & Aider**: Command line coding agents.

#### Milestone 5: Model Context Protocol (MCP) & Agent-to-Agent (A2A)
- Expose RouteNex as an MCP Server so Anthropic Claude Desktop, Cursor, and other agentic systems can inspect available models and route autonomously.

---

### Track B: RouteNex Cloud (Hosted Commercial Platform)

#### Milestone 6: Hosted Multi-Region Edge Infrastructure
- Deploy RouteNex on global serverless edge infrastructure (Cloudflare Workers / Fly.io):
  - Primary URL: `https://api.routenex.com/v1/chat/completions`.
  - Global edge latency: < 20ms routing overhead in US, EU, and APAC.

#### Milestone 7: Team Workspaces, RBAC & Cloud Key Vault
- **Authentication**: GitHub, Google, and email magic links via Supabase/Auth0.
- **Workspaces**: Create organizations and invite team members.
- **Roles**:
  - `Owner`: Full access, billing, and member management.
  - `Admin`: Manage provider credentials and keys.
  - `Developer`: Read-only access to virtual keys and logs.
- **KMS Encrypted Vault**: Upstream provider keys encrypted with AWS KMS / GCP Cloud KMS.

#### Milestone 8: Centralized Billing & Stripe Integration
- **Credit Wallets**: Teams can deposit funds via credit card / Stripe.
- **Unified Invoicing**: Instead of managing separate accounts and invoices with OpenAI, Anthropic, Google, Groq, and DeepSeek, teams receive **one consolidated monthly invoice**.
- **Virtual Key Spend Limits**:
  - Assign dollar limits per key (e.g. `Dev-Key-1`: max $25/month).
  - Webhook alerts at 80% quota; hard cutoff at 100%.

#### Milestone 9: Enterprise SLA & Air-Gapped Deployments
- **SLA**: 99.9% uptime SLA for Cloud, 99.99% for Enterprise.
- **Compliance**: SOC2 Type II audit trail exports and HIPAA-compliant data agreements.
- **Private VPC / On-Premise**: Helm chart for air-gapped Kubernetes clusters.

---

## 4. Immediate Next Steps

1. **Commit Official MIT License**: ✅ Complete (`LICENSE` added and linked in `package.json`).
2. **Implement Free-Tier Providers Engine**: Add Pollinations and Puter adapters for zero-key instant completions.
3. **Build the Categorized Provider Grid UI**: Upgrade the Console to feature categorized tabs (Free Tier, API Key, Local) with toggle switches and "Test All" probes.
4. **Prepare npm CLI Package**: Scaffold the binary entrypoint for `npx routenex`.

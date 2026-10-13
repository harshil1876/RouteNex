# ☁️ Deploying RouteNex to Cloudflare Pages (Free Tier)

This guide documents how to deploy the RouteNex website and documentation to **Cloudflare Pages** completely free of charge.

---

## 1. Prerequisites
- A free [Cloudflare account](https://dash.cloudflare.com)
- Your RouteNex repository pushed to GitHub or GitLab

---

## 2. Cloudflare Pages Setup (Git Integration)

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Go to **Compute (Workers) > Workers & Pages > Create application > Pages > Connect to Git**.
3. Select your repository `RouteNex`.
4. Configure Build settings:
   - **Framework preset**: `Astro`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Node.js version**: In **Environment variables**, set:
     - `NODE_VERSION`: `22`
     - `PUBLIC_GATEWAY_URL`: `http://your-gateway-url:3001` (or your self-hosted API domain)
5. Click **Save and Deploy**.

---

## 3. Direct CLI Deployment (Wrangler)

If deploying via command line:
```bash
# 1. Build the Astro static site
npm run build

# 2. Deploy the dist directory to Cloudflare Pages
npx wrangler pages deploy dist --project-name routenex
```

---

## 4. Architecture: Free Cloudflare Pages + Self-Hosted Gateway

```
┌───────────────────────────────────────┐
│     Cloudflare Edge (Pages CDN)       │
│  - Landing Page (Fast Global Static)  │
│  - Documentation (Static)             │
│  - Dashboard UI (React Islands)       │
└──────────────────┬────────────────────┘
                   │
                   │ Client-side fetch
                   ▼
┌───────────────────────────────────────┐
│     RouteNex Self-Hosted Gateway      │
│     (Docker Compose / VPS / Local)    │
│  - Unified /v1/chat/completions       │
│  - Upstream Provider Key Encryption   │
│  - Long-lived SSE streaming           │
└───────────────────────────────────────┘
```

> **Why separate Gateway hosting from Cloudflare Pages?**  
> AI completions (especially with frontier models like Claude 3.5 Sonnet or Llama 3.3 70B) can generate responses over 30 to 60+ seconds. Serverless edge workers on free tiers impose execution and CPU time limits that can interrupt long SSE streams. By running the static web UI on Cloudflare Pages and the gateway in a container or VPS, you get maximum speed, zero edge timeouts, and $0 cost.

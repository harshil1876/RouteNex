# ==============================================================================
# RouteNex — Unified Standalone AI Gateway & Dashboard Dockerfile
# ==============================================================================

# ─── Stage 1: Build Astro Static Frontend ─────────────────────────────────────
FROM node:22-alpine AS frontend-builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build:web || npx astro build

# ─── Stage 2: Build Gateway TypeScript Server ──────────────────────────────────
FROM node:22-alpine AS gateway-builder
WORKDIR /app/gateway

COPY gateway/package.json gateway/package-lock.json ./
RUN npm ci

COPY gateway/ ./
RUN npx tsc

# ─── Stage 3: Production Runtime (Unified Single Container) ───────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV ROUTENEX_PORT=3001
ENV ROUTENEX_HOST=0.0.0.0
ENV ROUTENEX_MOCK_MODE=true

# Copy package manifests & binary
COPY package.json ./
COPY bin/ ./bin/

# Copy compiled frontend and gateway
COPY --from=frontend-builder /app/dist ./dist
COPY --from=gateway-builder /app/gateway/dist ./gateway/dist
COPY --from=gateway-builder /app/gateway/node_modules ./gateway/node_modules
COPY --from=gateway-builder /app/gateway/package.json ./gateway/package.json

# Create directory for persistent local databases & request logs
RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health/live || exit 1

CMD ["node", "bin/routenex.js"]

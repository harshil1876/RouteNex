FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --production

# Copy source
COPY src/ ./src/
COPY tsconfig.json ./

# Build
RUN npx tsc

# Production stage
FROM node:22-alpine AS production
WORKDIR /app

COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./

# Create data directory for persistence
RUN mkdir -p /data

EXPOSE 3001

CMD ["node", "dist/server.js"]

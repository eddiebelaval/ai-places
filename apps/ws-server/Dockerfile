FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm@9

# Build stage
FROM base AS builder
WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared ./packages/shared
COPY apps/ws-server ./apps/ws-server

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared package
WORKDIR /app/packages/shared
RUN pnpm type-check

# Build ws-server
WORKDIR /app/apps/ws-server
RUN pnpm build

# Production stage - use base with pnpm for workspace protocol support
FROM base AS production
WORKDIR /app

# Copy workspace structure needed for pnpm to resolve workspace deps
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./

# Copy shared package (needed for workspace resolution)
COPY --from=builder /app/packages/shared ./packages/shared

# Copy ws-server with built artifacts
COPY --from=builder /app/apps/ws-server/dist ./apps/ws-server/dist
COPY --from=builder /app/apps/ws-server/package.json ./apps/ws-server/

# Install production dependencies only using pnpm
WORKDIR /app/apps/ws-server
RUN pnpm install --prod --frozen-lockfile

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

EXPOSE 8080

CMD ["node", "dist/index.js"]

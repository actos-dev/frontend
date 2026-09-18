# ==============================================================================
# Multi-stage Dockerfile for Actos Web Frontend
# Stages: base -> deps -> builder -> runner
# Base OS: Node 22 Alpine
# ==============================================================================

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ------------------------------------------------------------------------------
# Stage 1: Dependencies (deps)
# Installs dependencies deterministically using pnpm and pnpm-lock.yaml
# ------------------------------------------------------------------------------
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy dependency manifests
COPY package.json pnpm-lock.yaml ./

# Deterministic frozen-lockfile installation
RUN pnpm install --frozen-lockfile

# ------------------------------------------------------------------------------
# Stage 2: Builder
# Builds the Next.js production standalone bundle
# ------------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# These values are public routing configuration, not secrets. NEXT_PUBLIC_*
# is embedded in the browser bundle at build time; the two server-side values
# are also supplied again at runtime by Compose.
ARG ACTOS_API_URL
ARG ACTOS_SITE_URL
ARG NEXT_PUBLIC_ACTOS_API_URL
# Consumed at build time by next.config.ts (image remotePatterns) and at
# runtime by proxy.ts (CSP img-src/media-src). Optional: the code defaults to
# the production media origin when it is unset.
ARG ACTOS_MEDIA_URL
# Public form of the media origin for the browser bundle (the markdown
# remote-image policy reads it). Defaults to the server-side value.
ARG NEXT_PUBLIC_ACTOS_MEDIA_URL
# Communities UI switch; on by default.
ARG NEXT_PUBLIC_FEATURE_COMMUNITIES=true
ENV ACTOS_API_URL=$ACTOS_API_URL
ENV ACTOS_SITE_URL=$ACTOS_SITE_URL
ENV NEXT_PUBLIC_ACTOS_API_URL=$NEXT_PUBLIC_ACTOS_API_URL
ENV ACTOS_MEDIA_URL=$ACTOS_MEDIA_URL
ENV NEXT_PUBLIC_ACTOS_MEDIA_URL=${NEXT_PUBLIC_ACTOS_MEDIA_URL:-$ACTOS_MEDIA_URL}
ENV NEXT_PUBLIC_FEATURE_COMMUNITIES=$NEXT_PUBLIC_FEATURE_COMMUNITIES

# Standalone build produces .next/standalone and .next/static
RUN test -n "$ACTOS_API_URL" \
    && test -n "$ACTOS_SITE_URL" \
    && test -n "$NEXT_PUBLIC_ACTOS_API_URL" \
    && pnpm build

# ------------------------------------------------------------------------------
# Stage 3: Runner
# Minimal production runtime container with non-root security
# ------------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Security: Non-root user nextjs:nodejs (UID 1001)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Only copy public, standalone output, and static files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Ensure static and public files are accessible whether standalone root is ./ or subfolder
RUN set -eux; \
    for d in . frontend app; do \
      if [ -d "$d" ]; then \
        mkdir -p "$d/.next"; \
        [ -e "$d/.next/static" ] || cp -rn ./.next/static "$d/.next/" 2>/dev/null || true; \
        [ -e "$d/public" ] || cp -rn ./public "$d/" 2>/dev/null || true; \
      fi; \
    done; \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Health check endpoint verification
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/healthz || exit 1

# Launch standalone server (checks root, frontend/, app/ subdirectories)
CMD ["sh", "-c", "if [ -f ./server.js ]; then exec node server.js; elif [ -f ./frontend/server.js ]; then exec node frontend/server.js; elif [ -f ./app/server.js ]; then exec node app/server.js; else exec node $(find . -name server.js | head -n 1); fi"]

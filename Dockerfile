# Build stage (Node 22 — better-sqlite3@13 requires Node >=22; matches CI)
FROM node:22-alpine AS builder

# openssl: Prisma's Query Engine.
# build-base + python3: better-sqlite3 publishes no prebuilt binary for
# Alpine/musl, so its native module is compiled from source during `npm ci`.
RUN apk add --no-cache openssl build-base python3

WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci

COPY . .
RUN npm run build
# Keep only runtime dependencies for the runner. Prisma CLI is a production
# dependency because migrations run at container startup.
RUN npm prune --omit=dev

# Prepare standalone: copy static and public into standalone output
RUN cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/

# Run stage
FROM node:22-alpine AS runner

RUN apk add --no-cache openssl wget

# Run as a non-root user for least-privilege. The image ships no app code as
# root: /app/data (the SQLite volume) is chowned to nextjs so the unprivileged
# startup (prisma migrate) can write to it.
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8008
ENV DATABASE_URL="file:/app/data/dev.db"

# Copy standalone app
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public

# Prisma 7 CLI, adapter, and runtime dependencies are needed for startup
# migrations. The builder tree was pruned to production dependencies above.
COPY --from=builder --chown=nextjs:nextjs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nextjs /app/prisma/schema.prisma ./prisma/
COPY --from=builder --chown=nextjs:nextjs /app/prisma/migrations ./prisma/migrations
COPY --from=builder --chown=nextjs:nextjs /app/prisma.config.ts ./prisma.config.ts

# Startup script (migrate-deploy baseline strategy + node server.js), owned + exec by nextjs.
COPY --chown=nextjs:nextjs scripts/start.sh ./start.sh
RUN chmod +x ./start.sh

# Ensure the SQLite data dir exists and is writable by the non-root user.
RUN mkdir -p /app/data && chown -R nextjs:nextjs /app/data

USER nextjs

EXPOSE 8008

# Coolify/Docker health check: the runner image is Alpine (no curl), so probe
# the health endpoint with wget. localhost + PORT keeps it container-internal.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8008/api/health || exit 1

# Apply migrations (preserving existing self-hosted SQLite DBs) and start the server.
ENTRYPOINT ["./start.sh"]

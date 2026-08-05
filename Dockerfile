# Build stage (Node 20 matches the supported runtime and CI environment)
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci

COPY . .
RUN npm run build

# Prepare standalone: copy static and public into standalone output
RUN cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/

# Run stage
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl wget

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8008
ENV DATABASE_URL="file:/app/data/dev.db"

# Copy standalone app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma schema + CLI for db push at startup. Copying the CLI from the builder
# avoids a network `npm install prisma` in the runner stage (more reproducible).
COPY --from=builder /app/prisma/schema.prisma ./prisma/
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Ensure data dir exists for SQLite default
RUN mkdir -p /app/data

EXPOSE 8008

# Coolify/Docker health check: the runner image is Alpine (no curl), so probe
# the health endpoint with wget. localhost + PORT keeps it container-internal.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8008/api/health || exit 1

# Apply schema and start the server
ENTRYPOINT ["sh", "-c", "npx prisma db push --skip-generate && node server.js"]

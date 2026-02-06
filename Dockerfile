# Build stage (Node 20: matches vitest and current deps; lock file may be out of sync)
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm install

COPY . .
RUN npm run build

# Prepare standalone: copy static and public into standalone output
RUN cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/

# Run stage
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8008
ENV DATABASE_URL="file:/app/data/dev.db"

# Copy standalone app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma schema and CLI for db push at startup
COPY --from=builder /app/prisma/schema.prisma ./prisma/
RUN npm install prisma

# Ensure data dir exists for SQLite default
RUN mkdir -p /app/data

EXPOSE 8008

# Apply schema and start the server
ENTRYPOINT ["sh", "-c", "npx prisma db push --skip-generate && node server.js"]

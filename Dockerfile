# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
RUN npm run build

# Prepare standalone: copy static and public into standalone output
RUN cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/

# Run stage
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
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

EXPOSE 3000

# Apply schema and start the server
ENTRYPOINT ["sh", "-c", "npx prisma db push && node server.js"]

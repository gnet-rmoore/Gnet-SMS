# --- Stage 1: Build API ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
# Ignore postinstall until prisma sources are present
RUN npm ci --ignore-scripts

COPY . .
ENV NODE_ENV=production
ENV DATABASE_PROVIDER=postgresql
# Placeholder URL so prisma generate can run during image build
ENV DATABASE_URL=postgresql://build:build@localhost:5432/sms?schema=public
# API image: esbuild server only. SPA is built/served by Dockerfile.frontend.
RUN npx tsx prisma/setup-provider.ts \
  && npx prisma generate \
  && mkdir -p dist \
  && printf '%s\n' '<!doctype html><html><body><p>API container — use frontend-spa for UI</p></body></html>' > dist/index.html \
  && npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs

# --- Stage 2: Runtime ---
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
# Alpine ships OpenSSL 3; force the matching Prisma engine (detection is flaky on musl)
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/.prisma/client/libquery_engine-linux-musl-openssl-3.0.x.so.node

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

COPY scripts/service-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health/live || exit 1

CMD ["sh", "-c", "entrypoint.sh"]

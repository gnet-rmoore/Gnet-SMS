# --- Stage 1: Build ---
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
RUN npm install

COPY prisma ./prisma
COPY tsconfig.json ./
COPY shared ../shared
COPY src ./src

ENV NODE_ENV=production
ENV DATABASE_PROVIDER=postgresql
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x
# Placeholder so `prisma generate` can run at build time without a live DB
ENV DATABASE_URL=postgresql://build:build@localhost:5432/placeholder?schema=academic
RUN npx prisma generate \
  && npm run build

# --- Stage 2: Runtime ---
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV PORT=3015

RUN addgroup -S academic && adduser -S academic -G academic

COPY package.json package-lock.json* ./
RUN npm install --omit=dev && chown -R academic:academic /app

COPY --from=builder --chown=academic:academic /app/dist ./dist
COPY --from=builder --chown=academic:academic /app/prisma ./prisma
COPY --from=builder --chown=academic:academic /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=academic:academic /app/node_modules/@prisma ./node_modules/@prisma

USER academic

COPY service-entrypoint.sh /usr/local/bin/entrypoint.sh

EXPOSE 3015
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3015/health/live || exit 1

CMD ["sh", "-c", "entrypoint.sh"]

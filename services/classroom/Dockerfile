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
ENV DATABASE_URL=postgresql://build:build@localhost:5432/placeholder?schema=classroom
RUN npx prisma generate \
  && npm run build

# --- Stage 2: Runtime ---
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV PORT=3014

RUN addgroup -S classroom && adduser -S classroom -G classroom

COPY package.json package-lock.json* ./
RUN npm install --omit=dev && chown -R classroom:classroom /app

COPY --from=builder --chown=classroom:classroom /app/dist ./dist
COPY --from=builder --chown=classroom:classroom /app/prisma ./prisma
COPY --from=builder --chown=classroom:classroom /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=classroom:classroom /app/node_modules/@prisma ./node_modules/@prisma

USER classroom

COPY service-entrypoint.sh /usr/local/bin/entrypoint.sh

EXPOSE 3014
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3014/health/live || exit 1

CMD ["sh", "/usr/local/bin/entrypoint.sh"]

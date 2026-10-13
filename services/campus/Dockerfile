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
ENV DATABASE_URL=postgresql://build:build@localhost:5432/placeholder?schema=campus
RUN npx prisma generate \
  && npm run build

# --- Stage 2: Runtime ---
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV PORT=3018

RUN addgroup -S campus && adduser -S campus -G campus

COPY package.json package-lock.json* ./
RUN npm install --omit=dev && chown -R campus:campus /app

COPY --from=builder --chown=campus:campus /app/dist ./dist
COPY --from=builder --chown=campus:campus /app/prisma ./prisma
COPY --from=builder --chown=campus:campus /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=campus:campus /app/node_modules/@prisma ./node_modules/@prisma

USER campus

COPY service-entrypoint.sh /usr/local/bin/entrypoint.sh

EXPOSE 3018
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3018/health/live || exit 1

CMD ["sh", "/usr/local/bin/entrypoint.sh"]

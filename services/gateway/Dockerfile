# --- Stage 1: Build ---
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- Stage 2: Runtime ---
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8081

RUN addgroup -S gateway && adduser -S gateway -G gateway

COPY package.json package-lock.json* ./
RUN npm install --omit=dev && chown -R gateway:gateway /app

COPY --from=builder --chown=gateway:gateway /app/dist ./dist

USER gateway

COPY service-entrypoint.sh /usr/local/bin/entrypoint.sh

EXPOSE 8081
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8081/health/live || exit 1

CMD ["sh", "/usr/local/bin/entrypoint.sh"]

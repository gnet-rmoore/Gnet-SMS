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
ENV DATABASE_URL=postgresql://build:build@localhost:5432/placeholder?schema=finance
RUN npx prisma generate \
  && npm run build

# --- Stage 2: Runtime ---
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl chromium nss freetype harfbuzz ca-certificates ttf-freefont

ENV NODE_ENV=production
ENV PORT=3016
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV RECEIPT_HTML_PDF=1

RUN addgroup -S finance && adduser -S finance -G finance

COPY package.json package-lock.json* ./
RUN npm install --omit=dev && chown -R finance:finance /app

COPY --from=builder --chown=finance:finance /app/dist ./dist
COPY --from=builder --chown=finance:finance /app/src/receipt-templates ./receipt-templates
COPY --from=builder --chown=finance:finance /app/prisma ./prisma
COPY --from=builder --chown=finance:finance /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=finance:finance /app/node_modules/@prisma ./node_modules/@prisma

USER finance

COPY service-entrypoint.sh /usr/local/bin/entrypoint.sh

EXPOSE 3016
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3016/health/live || exit 1

CMD ["sh", "-c", "entrypoint.sh"]

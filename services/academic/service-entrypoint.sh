#!/bin/sh
set -e
# Default preserves the historical academic-schema workflow (prisma db push).
# Set DB_SYNC_STRATEGY=migrate once a baseline migration exists.
if [ "$DB_SYNC_STRATEGY" = "migrate" ]; then
  echo "[entrypoint] prisma migrate deploy..."
  npx prisma migrate deploy
else
  echo "[entrypoint] prisma db push..."
  npx prisma db push --skip-generate --accept-data-loss
fi
if [ -f prisma/seed.cjs ] || [ -f prisma/seed.ts ]; then
  if [ "$RUN_SEED" = "true" ]; then
    echo "[entrypoint] seeding..."
    if [ -f dist/seed.cjs ]; then
      node dist/seed.cjs || true
    elif command -v tsx >/dev/null 2>&1; then
      tsx prisma/seed.ts || true
    fi
  fi
fi
exec node dist/server.cjs

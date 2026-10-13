#!/bin/sh
set -e
echo "[entrypoint] prisma db push..."
npx prisma db push --skip-generate --accept-data-loss
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

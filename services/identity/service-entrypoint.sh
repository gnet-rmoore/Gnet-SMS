#!/bin/sh
set -e
echo "[entrypoint] prisma db push..."
npx prisma db push --skip-generate --accept-data-loss
if [ -f prisma/seed.cjs ] || [ -f prisma/seed.ts ]; then
  # Seed runs on every boot by default; the seed itself is idempotent (it skips
  # when a Super Admin already exists). Set RUN_SEED=false to disable entirely.
  if [ "${RUN_SEED:-true}" != "false" ]; then
    echo "[entrypoint] seeding (idempotent)..."
    if [ -f dist/seed.cjs ]; then
      node dist/seed.cjs || true
    elif [ -x node_modules/.bin/tsx ]; then
      node_modules/.bin/tsx prisma/seed.ts || true
    elif command -v npx >/dev/null 2>&1; then
      npx --no-install tsx prisma/seed.ts || true
    fi
  fi
fi
exec node dist/server.cjs

#!/usr/bin/env bash
# Free disk space on the production host without touching PostgreSQL data.
#
# The backups volume and the Postgres data volume both live on the Docker host
# disk. When it fills up, Postgres fails with
#   FATAL: could not write init file ... No space left on device
# so cleanup must remove old dumps, dangling images, and build cache - never
# volumes (deleting sms_pgdata would destroy the database).
#
# Usage (on the Lightsail host, from the deploy directory):
#   bash scripts/cleanup-production.sh
#   BACKUP_RETENTION=3 bash scripts/cleanup-production.sh
set -euo pipefail

DIR="${1:-$(pwd)}"
cd "$DIR"
RETENTION="${BACKUP_RETENTION:-7}"
MIN_FREE_PCT="${MIN_FREE_PCT:-10}"

dc() {
  docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.hub.yml --profile edge "$@"
}

show_disk() {
  df -h /
  echo
  docker system df || true
}

echo "=== Disk before cleanup ==="
show_disk

echo
echo "=== Pruning database backups (keep last ${RETENTION}) ==="
identity_running="$(dc ps --status running --services 2>/dev/null | grep -x identity || true)"
if [ -n "$identity_running" ]; then
  dc exec -T identity sh -c \
    "ls -1t /app/backups/*.sql 2>/dev/null | tail -n +$((RETENTION + 1)) | xargs -r rm -f" \
    || echo "warning: could not prune /app/backups"
else
  echo "identity container is not running; skipping /app/backups prune"
fi

echo
echo "=== Pruning dangling images and build cache (volumes are preserved) ==="
docker image prune -f || true
docker builder prune -f --filter until=168h || true

echo
echo "=== Disk after cleanup ==="
show_disk

FREE_PCT="$(df -P / | awk 'NR==2 {gsub("%", "", $5); print 100 - $5}')"
echo
if [ "$FREE_PCT" -lt "$MIN_FREE_PCT" ]; then
  echo "WARNING: only ${FREE_PCT}% free (target: ${MIN_FREE_PCT}%)."
  echo "Inspect large paths with: du -xh --max-depth=1 / 2>/dev/null | sort -h | tail -20"
  exit 1
fi
echo "OK: ${FREE_PCT}% free."

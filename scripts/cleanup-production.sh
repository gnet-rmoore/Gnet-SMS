#!/usr/bin/env bash
# Free disk space on the production host without touching PostgreSQL data.
#
# The backups volume and the Postgres data volume both live on the Docker host
# disk. When it fills up, Postgres fails with
#   FATAL: could not write init file ... No space left on device
# so cleanup must remove old dumps, unused images, and build cache - never
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
CRITICAL_FREE_PCT="${CRITICAL_FREE_PCT:-30}"

dc() {
  docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.hub.yml --profile edge "$@"
}

show_disk() {
  df -h /
  echo
  docker system df || true
}

free_pct() {
  df -P / | awk 'NR==2 {gsub("%", "", $5); print 100 - $5}'
}

trim_container_logs() {
  local min_size="$1"
  sudo -n find /var/lib/docker/containers -name '*-json.log' -size +"$min_size" \
    -exec truncate -s 0 {} \; 2>/dev/null || true
}

echo "=== Disk before cleanup ==="
show_disk

# On a 100% full disk Docker's garbage collector can fail with "gc failed".
# Free non-image space first so the daemon has room to prune images.
echo
echo "=== Trimming container logs and journal ==="
trim_container_logs 100M
sudo -n journalctl --vacuum-size=200M 2>/dev/null || true

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

# The production host only pulls images; it never builds them, so all build
# cache is disposable.
echo
echo "=== Pruning build cache ==="
docker builder prune -af || true

echo
echo "=== Pruning unused images (volumes are preserved) ==="
if ! docker image prune -af; then
  echo "warning: docker image prune failed (daemon GC); freeing more space and retrying"
  sudo -n journalctl --vacuum-size=50M 2>/dev/null || true
  sleep 5
  docker image prune -af || true
fi

FREE="$(free_pct)"
echo "Free after first pass: ${FREE}%"

if [ "$FREE" -lt "$CRITICAL_FREE_PCT" ]; then
  echo
  echo "=== Still below ${CRITICAL_FREE_PCT}% free - running critical cleanup ==="
  trim_container_logs 10M
  sudo -n journalctl --vacuum-size=50M 2>/dev/null || true
  docker container prune -f || true
  docker network prune -f || true
  docker builder prune -af || true
  docker image prune -af || true
fi

echo
echo "=== Disk after cleanup ==="
show_disk
FREE="$(free_pct)"

if [ "$FREE" -lt "$MIN_FREE_PCT" ]; then
  echo "WARNING: only ${FREE}% free (target: ${MIN_FREE_PCT}%)."
  echo "Inspect large paths with: du -xh --max-depth=1 / 2>/dev/null | sort -h | tail -20"
  exit 1
fi
echo "OK: ${FREE}% free."

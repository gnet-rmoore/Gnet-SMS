#!/bin/bash
# Check disk space and fail if < 30% free
# Usage: bash scripts/check-disk-space.sh
# Exit 0 if OK, exit 1 if below threshold

THRESHOLD=30  # 30% free space minimum

# Get current disk usage
# Note: This works in Git Bash on Windows, and natively on Linux/macOS
CURRENT_PCT=$(df -h . | tail -1 | awk '{print $5}' | tr -d '%')
CURRENT_GB=$(df -h . | tail -1 | awk '{print $3}')

echo "========================================="
echo " Disk Space Check"
echo "========================================="
echo " Free space: ${CURRENT_GB} used, ${CURRENT_PCT}% used"
echo " Threshold:  ${THRESHOLD}% minimum free"
echo "========================================="

if [ "$CURRENT_PCT" -le "$((100 - THRESHOLD))" ]; then
  FREE_PCT=$((100 - CURRENT_PCT))
  echo "✅ OK: ${FREE_PCT}% free space available"
  echo "-----------------------------------------"
  exit 0
else
  FREE_PCT=$((100 - CURRENT_PCT))
  echo "❌ FAIL: Only ${FREE_PCT}% free, need at least ${THRESHOLD}% free"
  echo "-----------------------------------------"
  echo "Run cleanup (never prunes volumes - that would delete PostgreSQL data):"
  echo "  docker image prune -f"
  echo "  docker builder prune -f"
  echo "  bash scripts/cleanup-production.sh   # on the server"
  echo "-----------------------------------------"
  exit 1
fi
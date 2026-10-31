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

if [ "$CURRENT_PCT" -ge "$THRESHOLD" ]; then
  FREE_PCT=$((100 - CURRENT_PCT))
  echo "✅ OK: ${FREE_PCT}% free space available"
  echo "-----------------------------------------"
  exit 0
else
  echo "❌ FAIL: Only ${CURRENT_PCT}% used, need at least ${THRESHOLD}% free"
  echo "-----------------------------------------"
  echo "Run cleanup: docker system prune -a --volumes"
  echo "Or: npm run docker:prune"
  echo "-----------------------------------------"
  exit 1
fi
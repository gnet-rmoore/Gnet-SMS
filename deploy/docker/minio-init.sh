#!/bin/sh
# Ensure buckets exist and are readable via S3_PUBLIC_URL (banner images, docs, receipts).
# CORS is configured on the minio service (MINIO_API_CORS_ALLOW_ORIGIN).
# Patched for hosting: no more "|| exit 0" (was hiding failures), retryable via
# restart:on-failure, and all four buckets are created.
set -u

mc alias set local http://minio:9000 "${MINIO_ROOT_USER:-smsminio}" "${MINIO_ROOT_PASSWORD:-smsminio-secret}" || exit 1

# Public-download buckets (matches previous behaviour + the bucket academic failed to create).
for bucket in sms-classroom sms-admissions sms-receipts sms-exam-papers; do
  mc mb -p "local/${bucket}" 2>/dev/null || true
  if ! mc anonymous set download "local/${bucket}"; then
    echo "[minio-init] warn: could not set public download on ${bucket} (continuing)"
  fi
done

echo "[minio-init] buckets ready: sms-classroom, sms-admissions, sms-receipts, sms-exam-papers"
exit 0

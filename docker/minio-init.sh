#!/bin/sh
# Ensure buckets exist and are readable via S3_PUBLIC_URL (banner images, docs, receipts).
# CORS is enabled server-wide via MINIO_API_CORS_ALLOW_ORIGIN on the minio service.
# Do not fail the stack if disk is full — log and continue.
set -u

mc alias set local http://minio:9000 "${MINIO_ROOT_USER:-smsminio}" "${MINIO_ROOT_PASSWORD:-smsminio-secret}" || exit 0

for bucket in sms-classroom sms-admissions sms-receipts sms-school-assets; do
  mc mb -p "local/${bucket}" 2>/dev/null || true
  if ! mc anonymous set download "local/${bucket}"; then
    echo "[minio-init] warn: could not set public download on ${bucket} (continuing)"
  fi
done

echo "[minio-init] buckets ready (best-effort public download): sms-classroom, sms-admissions, sms-receipts, sms-school-assets"
exit 0

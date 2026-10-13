#!/usr/bin/env bash
# Tag and push Gnet SMS service images to Docker Hub.
#
# Prerequisites: docker login (Docker Hub)
# Usage:
#   ./scripts/publish-docker-hub.sh
#   DOCKERHUB_USER=you DOCKER_TAG=2026-08-07 ./scripts/publish-docker-hub.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

HUB_USER="${DOCKERHUB_USER:-gnetllc}"
TAG="${DOCKER_TAG:-latest}"
LOCAL_PREFIX="gnet-sms-2026"

SERVICES=(
  identity
  lifecycle
  ops
  staff
  classroom
  academic
  finance
  comms
  campus
  api-gateway
  frontend-spa
)

echo "Publishing to docker.io/${HUB_USER}/gnet-sms-*:${TAG}"

for svc in "${SERVICES[@]}"; do
  local_image="${LOCAL_PREFIX}-${svc}:latest"
  hub_image="${HUB_USER}/gnet-sms-${svc}:${TAG}"

  if ! docker image inspect "$local_image" >/dev/null 2>&1; then
    echo "SKIP  $local_image (not built locally — run: docker compose build $svc)"
    continue
  fi

  echo "TAG   $local_image -> $hub_image"
  docker tag "$local_image" "$hub_image"
  echo "PUSH  $hub_image"
  if ! docker push "$hub_image"; then
    echo "ERROR: push failed for $hub_image" >&2
    echo "Login is OK, but this account cannot push to the ${HUB_USER}/ namespace." >&2
    echo "1. Confirm your Hub username at https://hub.docker.com/" >&2
    echo "2. docker logout && docker login -u \"\$DOCKERHUB_USER\"" >&2
    echo "3. Re-run: DOCKERHUB_USER=\$DOCKERHUB_USER ./scripts/publish-docker-hub.sh" >&2
    exit 1
  fi
done

if docker image inspect "${LOCAL_PREFIX}-sms-api:latest" >/dev/null 2>&1; then
  hub_image="${HUB_USER}/gnet-sms-sms-api:${TAG}"
  docker tag "${LOCAL_PREFIX}-sms-api:latest" "$hub_image"
  docker push "$hub_image"
fi

echo "Done. Team can run:"
echo "  docker compose -f docker-compose.yml -f docker-compose.hub.yml pull"
echo "  docker compose -f docker-compose.yml -f docker-compose.hub.yml up -d --no-build"

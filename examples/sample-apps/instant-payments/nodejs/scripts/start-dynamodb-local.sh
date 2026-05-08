#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

HOST_PORT="${DYNAMODB_LOCAL_HOST_PORT:-18000}"
export DYNAMODB_LOCAL_HOST_PORT="$HOST_PORT"

docker compose up -d dynamodb-local

timeout_s=30
start="$(date +%s)"
while true; do
  if curl -sS "http://localhost:${HOST_PORT}" >/dev/null 2>&1; then
    echo "DynamoDB Local is ready on http://localhost:${HOST_PORT}"
    exit 0
  fi

  now="$(date +%s)"
  if (( now - start > timeout_s )); then
    echo "Timed out waiting for DynamoDB Local" >&2
    docker compose logs dynamodb-local || true
    exit 1
  fi
  sleep 1
done


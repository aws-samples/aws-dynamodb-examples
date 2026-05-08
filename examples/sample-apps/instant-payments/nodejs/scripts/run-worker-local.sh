#!/usr/bin/env bash
# Same DynamoDB env defaults as run-app-local.sh — run streams worker against local DynamoDB.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

HOST_PORT="${DYNAMODB_LOCAL_HOST_PORT:-18000}"
DYNAMODB_ENDPOINT="${DYNAMODB_ENDPOINT:-http://localhost:${HOST_PORT}}"
DYNAMODB_REGION="${DYNAMODB_REGION:-eu-west-1}"
DYNAMODB_CLIENTTYPE="${DYNAMODB_CLIENTTYPE:-high-level}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dynamodb-endpoint) DYNAMODB_ENDPOINT="$2"; shift 2 ;;
    --dynamodb-region) DYNAMODB_REGION="$2"; shift 2 ;;
    --dynamodb-client-type) DYNAMODB_CLIENTTYPE="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

cd "$PROJECT_DIR"

export DYNAMODB_ENDPOINT
export DYNAMODB_REGION
export DYNAMODB_CLIENTTYPE
export DYNAMODB_TABLENAME="${DYNAMODB_TABLENAME:-JS_InstantPayments}"
export DYNAMODB_IDEMPOTENCY_TTL_SECONDS="${DYNAMODB_IDEMPOTENCY_TTL_SECONDS:-2592000}"
export DYNAMODB_STREAMS_ITERATOR_TYPE="${DYNAMODB_STREAMS_ITERATOR_TYPE:-LATEST}"

exec node src/workers/localStreamsWorker.mjs

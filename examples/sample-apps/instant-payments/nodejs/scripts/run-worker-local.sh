#!/usr/bin/env bash
# Same DynamoDB env defaults as run-app-local.sh — run streams worker against local DynamoDB.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

HOST_PORT="${DYNAMODB_LOCAL_HOST_PORT:-18000}"
AWS_ENDPOINT_URL="${AWS_ENDPOINT_URL:-http://localhost:${HOST_PORT}}"
AWS_REGION="${AWS_REGION:-eu-west-1}"
DYNAMODB_CLIENT_TYPE="${DYNAMODB_CLIENT_TYPE:-high-level}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --aws-endpoint-url) AWS_ENDPOINT_URL="$2"; shift 2 ;;
    --aws-region) AWS_REGION="$2"; shift 2 ;;
    --dynamodb-client-type) DYNAMODB_CLIENT_TYPE="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

cd "$PROJECT_DIR"

export AWS_ENDPOINT_URL
export AWS_REGION
export DYNAMODB_CLIENT_TYPE
export DYNAMODB_TABLE_NAME="${DYNAMODB_TABLE_NAME:-JS_InstantPayments}"
export DYNAMODB_IDEMPOTENCY_TTL_SECONDS="${DYNAMODB_IDEMPOTENCY_TTL_SECONDS:-2592000}"
export DYNAMODB_STREAMS_ITERATOR_TYPE="${DYNAMODB_STREAMS_ITERATOR_TYPE:-LATEST}"

exec node src/workers/localStreamsWorker.mjs

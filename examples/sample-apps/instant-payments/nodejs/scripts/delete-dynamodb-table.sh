#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

HOST_PORT="${DYNAMODB_LOCAL_HOST_PORT:-18000}"
DYNAMODB_ENDPOINT="http://localhost:${HOST_PORT}"
DYNAMODB_REGION="eu-west-1"
TABLE_NAME="${DYNAMODB_TABLENAME:-JS_InstantPayments}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dynamodb-endpoint) DYNAMODB_ENDPOINT="$2"; shift 2 ;;
    --dynamodb-region) DYNAMODB_REGION="$2"; shift 2 ;;
    --table-name) TABLE_NAME="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

aws dynamodb delete-table \
  --endpoint-url "$DYNAMODB_ENDPOINT" \
  --region "$DYNAMODB_REGION" \
  --table-name "$TABLE_NAME"

aws dynamodb wait table-not-exists \
  --endpoint-url "$DYNAMODB_ENDPOINT" \
  --region "$DYNAMODB_REGION" \
  --table-name "$TABLE_NAME"

echo "Deleted table $TABLE_NAME"


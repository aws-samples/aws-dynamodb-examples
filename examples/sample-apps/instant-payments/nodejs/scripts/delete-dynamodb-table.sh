#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

HOST_PORT="${DYNAMODB_LOCAL_HOST_PORT:-18000}"
AWS_ENDPOINT_URL="http://localhost:${HOST_PORT}"
AWS_REGION="eu-west-1"
TABLE_NAME="${DYNAMODB_TABLE_NAME:-JS_InstantPayments}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --aws-endpoint-url) AWS_ENDPOINT_URL="$2"; shift 2 ;;
    --aws-region) AWS_REGION="$2"; shift 2 ;;
    --table-name) TABLE_NAME="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

# Avoid picking up real AWS SSO/profile credentials when talking to DynamoDB Local.
unset AWS_PROFILE AWS_DEFAULT_PROFILE AWS_SESSION_TOKEN
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-local}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-local}"

aws dynamodb delete-table \
  --endpoint-url "$AWS_ENDPOINT_URL" \
  --region "$AWS_REGION" \
  --table-name "$TABLE_NAME"

aws dynamodb wait table-not-exists \
  --endpoint-url "$AWS_ENDPOINT_URL" \
  --region "$AWS_REGION" \
  --table-name "$TABLE_NAME"

echo "Deleted table $TABLE_NAME"


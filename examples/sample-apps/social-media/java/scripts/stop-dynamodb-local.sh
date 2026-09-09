#!/usr/bin/env bash
# =============================================================================
# stop-dynamodb-local.sh - Stops the DynamoDB Local Docker container
#
# Usage:
#   ./scripts/stop-dynamodb-local.sh
#
# This stops and removes only the DynamoDB Local container.
# Safe to run even if the container is already stopped or absent.
# In-memory data will be lost.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVICE_NAME="dynamodb-local"

cd "$PROJECT_DIR"
echo "Stopping DynamoDB Local..."

if [[ -z "$(docker compose ps -q "$SERVICE_NAME")" ]]; then
    echo "DynamoDB Local is not running."
    exit 0
fi

docker compose stop "$SERVICE_NAME"
docker compose rm -f "$SERVICE_NAME"

if [[ -z "$(docker compose ps -q "$SERVICE_NAME")" ]]; then
    echo "DynamoDB Local stopped."
    exit 0
fi

echo "ERROR: DynamoDB Local container still exists after stop/remove."
docker compose ps "$SERVICE_NAME" || true
exit 1

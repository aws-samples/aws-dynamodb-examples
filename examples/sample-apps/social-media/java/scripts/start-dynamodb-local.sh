#!/usr/bin/env bash
# =============================================================================
# start-dynamodb-local.sh - Starts DynamoDB Local in a Docker container
#
# Usage:
#   ./scripts/start-dynamodb-local.sh
#
# Starts the module's own docker-compose.yml dynamodb-local service. DynamoDB
# Local will be accessible at http://localhost:8000. The script waits until the
# endpoint responds before returning. If startup times out, the script prints
# recent container logs and exits non-zero. Data is stored in memory and will be
# lost when the container stops.
#
# Prerequisites:
#   - Docker / Rancher Desktop running
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENDPOINT="http://localhost:8000"
MAX_ATTEMPTS=10
SLEEP_SECONDS=1

cd "$PROJECT_DIR"
echo "Starting DynamoDB Local..."
docker compose up -d dynamodb-local

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
    if curl --silent --show-error --output /dev/null "$ENDPOINT"; then
        echo "DynamoDB Local is running at $ENDPOINT"
        exit 0
    fi

    echo "Waiting for DynamoDB Local to become ready (attempt $attempt/$MAX_ATTEMPTS)..."
    sleep "$SLEEP_SECONDS"
done

echo "ERROR: DynamoDB Local did not become ready at $ENDPOINT within $((MAX_ATTEMPTS * SLEEP_SECONDS)) seconds."
docker compose logs --tail=50 dynamodb-local || true
exit 1

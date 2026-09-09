#!/usr/bin/env bash
# =============================================================================
# start-s3-local.sh - Starts the selected S3-compatible service and waits for it
#
# Usage:
#   ./scripts/start-s3-local.sh [--s3-backend minio|floci]
#
# Optional arguments:
#   --s3-backend   minio | floci (default: minio)
#
# Starts the module's own docker-compose.yml S3-compatible service under the
# matching compose profile (s3-minio or s3-floci) and waits until it responds.
# Only the selected backend starts. Any other S3-compatible store is supported
# by pointing S3_ENDPOINT at it directly.
#
# Endpoints:
#   minio -> http://localhost:9000 (console http://localhost:9001)
#   floci -> http://localhost:4566
#
# S3 non-endorsement statement:
#   The sample can run fully offline against any S3-compatible object store (for
#   example MinIO, Floci, or similar). Such tools are used only to make the
#   sample runnable without AWS. They are not part of AWS, and Amazon does not
#   provide, endorse, or recommend them for production use. For production, use
#   Amazon S3.
#
# Prerequisites:
#   - Docker / Rancher Desktop running
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

S3_BACKEND="minio"
MAX_ATTEMPTS=30
SLEEP_SECONDS=1

require_option_value() {
    local OPTION_NAME="$1"
    local OPTION_VALUE="${2-}"

    if [[ -z "$OPTION_VALUE" || "$OPTION_VALUE" == --* ]]; then
        echo "ERROR: Option $OPTION_NAME requires a value"
        exit 1
    fi
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --s3-backend)
            require_option_value "$1" "${2-}"
            S3_BACKEND="$2"; shift 2 ;;
        *)
            echo "ERROR: Unknown option: $1"; exit 1 ;;
    esac
done

case "$S3_BACKEND" in
    minio)
        SERVICE_NAME="minio"
        PROFILE="s3-minio"
        READY_URL="http://localhost:9000/minio/health/live"
        ENDPOINT="http://localhost:9000" ;;
    floci)
        SERVICE_NAME="floci"
        PROFILE="s3-floci"
        READY_URL="http://localhost:4566/_localstack/health"
        ENDPOINT="http://localhost:4566" ;;
    *)
        echo "ERROR: Unknown --s3-backend '$S3_BACKEND' (expected minio or floci)"; exit 1 ;;
esac

cd "$PROJECT_DIR"
echo "Starting S3-compatible backend '$S3_BACKEND' at $ENDPOINT..."
docker compose --profile "$PROFILE" up -d "$SERVICE_NAME"

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
    if curl --silent --show-error --output /dev/null "$READY_URL"; then
        echo "S3-compatible backend '$S3_BACKEND' is running at $ENDPOINT"
        exit 0
    fi

    echo "Waiting for '$S3_BACKEND' to become ready (attempt $attempt/$MAX_ATTEMPTS)..."
    sleep "$SLEEP_SECONDS"
done

echo "ERROR: '$S3_BACKEND' did not become ready at $READY_URL within $((MAX_ATTEMPTS * SLEEP_SECONDS)) seconds."
docker compose logs --tail=50 "$SERVICE_NAME" || true
exit 1

#!/usr/bin/env bash
# =============================================================================
# stop-s3-local.sh - Stops the selected S3-compatible service
#
# Usage:
#   ./scripts/stop-s3-local.sh [--s3-backend minio|floci]
#
# Optional arguments:
#   --s3-backend   minio | floci (default: minio)
#
# Stops and removes only the selected S3-compatible container. Safe to run even
# if the container is already stopped or absent. In-memory data will be lost.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

S3_BACKEND="minio"

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
        PROFILE="s3-minio" ;;
    floci)
        SERVICE_NAME="floci"
        PROFILE="s3-floci" ;;
    *)
        echo "ERROR: Unknown --s3-backend '$S3_BACKEND' (expected minio or floci)"; exit 1 ;;
esac

cd "$PROJECT_DIR"
echo "Stopping S3-compatible backend '$S3_BACKEND'..."

if [[ -z "$(docker compose --profile "$PROFILE" ps -q "$SERVICE_NAME")" ]]; then
    echo "S3-compatible backend '$S3_BACKEND' is not running."
    exit 0
fi

docker compose --profile "$PROFILE" stop "$SERVICE_NAME"
docker compose --profile "$PROFILE" rm -f "$SERVICE_NAME"

if [[ -z "$(docker compose --profile "$PROFILE" ps -q "$SERVICE_NAME")" ]]; then
    echo "S3-compatible backend '$S3_BACKEND' stopped."
    exit 0
fi

echo "ERROR: '$S3_BACKEND' container still exists after stop/remove."
docker compose --profile "$PROFILE" ps "$SERVICE_NAME" || true
exit 1

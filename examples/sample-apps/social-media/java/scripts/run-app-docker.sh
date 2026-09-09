#!/usr/bin/env bash
# =============================================================================
# run-app-docker.sh - Runs the app + DynamoDB Local + an S3-compatible store
#                     together via docker-compose
#
# Usage:
#   ./scripts/run-app-docker.sh [--stop] [--dynamodb-client-type <type>] \
#       [--s3-backend minio|floci]
#
# Optional arguments:
#   --stop                  Stop all containers (app + both S3 profiles)
#   --dynamodb-client-type  high-level | low-level (default: high-level)
#   --s3-backend            minio | floci (default: minio). Wires s3.endpoint,
#                           credentials, and s3.path-style for the chosen backend.
#
# The app container connects to DynamoDB Local (http://dynamodb-local:8000) and
# to the selected S3 backend (http://minio:9000 or http://floci:4566) over the
# Docker network. Only the selected S3 backend starts.
#
# The S3-compatible backends (MinIO, Floci) are demo-only, not part of AWS, and
# not endorsed. Use Amazon S3 for production.
#
# Prerequisites:
#   - Docker / Rancher Desktop running
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

STOP=false
CLIENT_TYPE="high-level"
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
        --stop)
            STOP=true; shift ;;
        --dynamodb-client-type)
            require_option_value "$1" "${2-}"
            CLIENT_TYPE="$2"; shift 2 ;;
        --s3-backend)
            require_option_value "$1" "${2-}"
            S3_BACKEND="$2"; shift 2 ;;
        *)
            echo "ERROR: Unknown option: $1"; exit 1 ;;
    esac
done

cd "$PROJECT_DIR"

if $STOP; then
    echo "Stopping all containers..."
    docker compose --profile app --profile s3-minio --profile s3-floci down
    exit 0
fi

case "$S3_BACKEND" in
    minio)
        S3_PROFILE="s3-minio"
        export S3_ENDPOINT="http://minio:9000" ;;
    floci)
        S3_PROFILE="s3-floci"
        export S3_ENDPOINT="http://floci:4566" ;;
    *)
        echo "ERROR: Unknown --s3-backend '$S3_BACKEND' (expected minio or floci)"; exit 1 ;;
esac
export S3_PATHSTYLE="true"
export DYNAMODB_CLIENTTYPE="$CLIENT_TYPE"

echo "Starting app + DynamoDB Local + S3 backend '$S3_BACKEND' via docker-compose..."
echo "  Client type : $CLIENT_TYPE"
echo "  S3 backend  : $S3_BACKEND"
echo "  S3 endpoint : $S3_ENDPOINT"

# Bring up the selected S3 backend first and wait for readiness so the app can
# ensure its bucket on startup.
"$SCRIPT_DIR/start-s3-local.sh" --s3-backend "$S3_BACKEND"

docker compose --profile app --profile "$S3_PROFILE" build --no-cache social-media-app
docker compose --profile app --profile "$S3_PROFILE" up

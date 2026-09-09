#!/usr/bin/env bash
# =============================================================================
# run-app-local.sh - Runs the app on the host machine
#
# DynamoDB Local and an S3-compatible store must already be running in Docker
# (use start-dynamodb-local.sh and start-s3-local.sh).
#
# Usage:
#   ./scripts/run-app-local.sh [--dynamodb-endpoint <url>] [--dynamodb-region <region>] \
#       [--dynamodb-client-type <type>] [--s3-backend minio|floci]
#
# Optional arguments:
#   --dynamodb-endpoint     DynamoDB endpoint (default: http://localhost:8000)
#   --dynamodb-region       AWS region (default: eu-west-1)
#   --dynamodb-client-type  high-level | low-level (default: high-level)
#   --s3-backend            minio | floci (default: minio). Wires s3.endpoint,
#                           credentials, and s3.path-style for the chosen backend.
#
# The S3-compatible backends (MinIO, Floci) are demo-only, not part of AWS, and
# not endorsed. Use Amazon S3 for production. For an Amazon S3 run, omit
# --s3-backend and set s3.endpoint empty plus real credentials via the AWS
# provider chain.
#
# Prerequisites:
#   - Application built (run build-app.sh first)
#   - DynamoDB Local running (run start-dynamodb-local.sh)
#   - S3-compatible store running (run start-s3-local.sh --s3-backend ...)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

ENDPOINT="http://localhost:8000"
REGION="eu-west-1"
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
        --dynamodb-endpoint)
            require_option_value "$1" "${2-}"
            ENDPOINT="$2"; shift 2 ;;
        --dynamodb-region)
            require_option_value "$1" "${2-}"
            REGION="$2"; shift 2 ;;
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

case "$S3_BACKEND" in
    minio)
        S3_ENDPOINT="http://localhost:9000" ;;
    floci)
        S3_ENDPOINT="http://localhost:4566" ;;
    *)
        echo "ERROR: Unknown --s3-backend '$S3_BACKEND' (expected minio or floci)"; exit 1 ;;
esac
S3_PATHSTYLE="true"

JAR=$(find "$PROJECT_DIR/target" -name "*.jar" -not -name "*-sources.jar" | head -1)
if [[ -z "$JAR" ]]; then
    echo "ERROR: No JAR found in target/. Run build-app.sh first."
    exit 1
fi

echo "Starting Social Media app..."
echo "  DynamoDB endpoint    : $ENDPOINT"
echo "  DynamoDB region      : $REGION"
echo "  DynamoDB client type : $CLIENT_TYPE"
echo "  S3 backend           : $S3_BACKEND"
echo "  S3 endpoint          : $S3_ENDPOINT"
echo "  S3 path-style        : $S3_PATHSTYLE"
echo "  JAR                  : $JAR"

# Credentials for local S3-compatible endpoints are supplied in-app as fake
# static credentials, selected from the local endpoint host.
java -jar "$JAR" \
    --dynamodb.endpoint="$ENDPOINT" \
    --dynamodb.region="$REGION" \
    --dynamodb.client-type="$CLIENT_TYPE" \
    --s3.endpoint="$S3_ENDPOINT" \
    --s3.path-style="$S3_PATHSTYLE"

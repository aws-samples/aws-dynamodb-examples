#!/usr/bin/env bash
# =============================================================================
# delete-dynamodb-tables.sh - Deletes DynamoDB tables for the Social Media app
#
# Usage:
#   ./scripts/delete-dynamodb-tables.sh [--dynamodb-endpoint <url>] \
#       [--dynamodb-region <region>] [--table-name <name[,name...]>]
#
# Optional arguments:
#   --dynamodb-endpoint  DynamoDB endpoint (default: http://localhost:8000)
#   --dynamodb-region    AWS region (default: eu-west-1)
#   --table-name         Comma-separated list of table names to delete. When
#                        omitted, all six language-qualified default tables are
#                        deleted (JavaUserGraph, JavaContent, JavaTimelines,
#                        JavaConversations, JavaMessages, JavaNotifications).
#
# WARNING: This permanently deletes the tables and all their data.
#
# Tables are deleted one by one. For each name the script waits until deletion
# is confirmed before moving to the next. A table that does not exist is skipped
# without error, so the script is safe to run after a partial teardown.
#
# To bring the tables back for this sample, run the Spring Boot app once. With
# dynamodb.create-resources enabled (the default), the app recreates the six
# tables with the same configuration (Streams, TTL) and re-seeds the demo data.
# In production this flag stays off and tables are created separately through
# CDK, CloudFormation, Terraform, or the console.
#
# Prerequisites:
#   - AWS CLI v2 installed
#   - DynamoDB Local running (for local usage) or valid AWS credentials (for AWS)
# =============================================================================
set -euo pipefail

ENDPOINT="http://localhost:8000"
REGION="eu-west-1"
TABLE_NAMES="JavaUserGraph,JavaContent,JavaTimelines,JavaConversations,JavaMessages,JavaNotifications"

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
        --table-name)
            require_option_value "$1" "${2-}"
            TABLE_NAMES="$2"; shift 2 ;;
        -*)
            echo "ERROR: Unknown option: $1"; exit 1 ;;
        *)
            echo "ERROR: Unexpected argument: $1"; exit 1 ;;
    esac
done

IFS=',' read -r -a TABLES <<< "$TABLE_NAMES"

for TABLE_NAME in "${TABLES[@]}"; do
    TABLE_NAME="$(echo "$TABLE_NAME" | xargs)"
    [[ -z "$TABLE_NAME" ]] && continue

    if ! aws dynamodb describe-table \
        --table-name "$TABLE_NAME" \
        --endpoint-url "$ENDPOINT" \
        --region "$REGION" \
        --no-cli-pager >/dev/null 2>&1; then
        echo "Table '$TABLE_NAME' does not exist, skipping."
        continue
    fi

    echo "Deleting DynamoDB table '$TABLE_NAME' at endpoint '$ENDPOINT' in region '$REGION'..."
    aws dynamodb delete-table \
        --table-name "$TABLE_NAME" \
        --endpoint-url "$ENDPOINT" \
        --region "$REGION" \
        --no-cli-pager

    echo "Waiting until table '$TABLE_NAME' no longer exists..."
    aws dynamodb wait table-not-exists \
        --table-name "$TABLE_NAME" \
        --endpoint-url "$ENDPOINT" \
        --region "$REGION" \
        --no-cli-pager

    echo "Table '$TABLE_NAME' has been fully deleted."
done

echo "Done."

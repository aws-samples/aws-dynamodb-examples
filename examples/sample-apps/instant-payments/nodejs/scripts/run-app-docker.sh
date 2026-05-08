#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

STOP=false
DYNAMODB_CLIENTTYPE="high-level"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --stop) STOP=true; shift ;;
    --dynamodb-client-type) DYNAMODB_CLIENTTYPE="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

cd "$PROJECT_DIR"

if [[ "$STOP" == "true" ]]; then
  docker compose --profile app down
  exit 0
fi

export DYNAMODB_CLIENTTYPE
docker compose --profile app up --build


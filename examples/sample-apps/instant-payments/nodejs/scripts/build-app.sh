#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

SKIP_TESTS=false
for arg in "$@"; do
  case "$arg" in
    --skip-tests) SKIP_TESTS=true ;;
    *) echo "Unknown arg: $arg" >&2; exit 2 ;;
  esac
done

cd "$PROJECT_DIR"

npm install

if [[ "$SKIP_TESTS" == "true" ]]; then
  exit 0
fi

npm test


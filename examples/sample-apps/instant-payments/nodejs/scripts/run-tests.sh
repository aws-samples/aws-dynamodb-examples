#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

RUN_UNIT=false
RUN_INTEGRATION=false
RUN_SMOKE=false

if [[ $# -eq 0 ]]; then
  RUN_UNIT=true
  RUN_INTEGRATION=true
  RUN_SMOKE=true
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --unit) RUN_UNIT=true; shift ;;
    --integration) RUN_INTEGRATION=true; shift ;;
    --smoke) RUN_SMOKE=true; shift ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

npm install

if [[ "$RUN_UNIT" == "true" ]]; then
  npm test
fi

if [[ "$RUN_INTEGRATION" == "true" ]]; then
  npm test
fi

if [[ "$RUN_SMOKE" == "true" ]]; then
  npm run scripts:smoke
fi


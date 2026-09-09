#!/usr/bin/env bash
# =============================================================================
# run-tests.sh - Runs unit, integration, and smoke tests (filtered by JUnit 5 tags)
#
# Usage:
#   ./scripts/run-tests.sh                        Run all tests
#   ./scripts/run-tests.sh --unit                 Run unit tests only (no Docker)
#   ./scripts/run-tests.sh --integration          Run integration tests only
#   ./scripts/run-tests.sh --smoke                Run smoke tests only
#   ./scripts/run-tests.sh --integration --smoke  Run integration + smoke
#
# Options:
#   --unit         Run unit tests only (fast, no Docker required)
#   --integration  Run integration tests (requires Docker)
#   --smoke        Run smoke tests (requires Docker)
#
# Docker / Rancher Desktop:
#   Integration and smoke tests use Testcontainers with DynamoDB Local and an
#   S3-compatible container (MinIO, and Floci via testcontainers-floci). The
#   test profile deletes, recreates, and re-seeds all six tables before each
#   test method for isolation.
#   For Rancher Desktop, DOCKER_HOST and Ryuk are configured automatically.
#   For Docker Desktop, override DOCKER_HOST if needed.
#
# Prerequisites:
#   - JDK 21, Maven
#   - Docker or Rancher Desktop (only for integration/smoke tests)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

GROUPS_ARR=()
while [[ $# -gt 0 ]]; do
    case "$1" in
        --unit) GROUPS_ARR+=(unit); shift ;;
        --integration) GROUPS_ARR+=(integration); shift ;;
        --smoke) GROUPS_ARR+=(smoke); shift ;;
        *) echo "ERROR: Unknown option: $1"; exit 1 ;;
    esac
done

if [[ ${#GROUPS_ARR[@]} -eq 0 ]]; then
    TEST_GROUPS="unit,integration,smoke"
else
    TEST_GROUPS=$(IFS=,; echo "${GROUPS_ARR[*]}")
fi

cd "$PROJECT_DIR"

if [[ "$TEST_GROUPS" == "unit" ]]; then
    mvn test -Dgroups=unit
else
    export DOCKER_HOST="${DOCKER_HOST:-unix://$HOME/.rd/docker.sock}"
    export TESTCONTAINERS_RYUK_DISABLED=true
    mvn test -P rancher-desktop -Dgroups="$TEST_GROUPS"
fi

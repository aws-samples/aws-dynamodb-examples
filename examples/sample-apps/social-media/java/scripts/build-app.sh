#!/usr/bin/env bash
# =============================================================================
# build-app.sh - Builds the Social Media sample application
#
# Usage:
#   ./scripts/build-app.sh [--skip-tests]
#
# Optional arguments:
#   --skip-tests   Build without running tests
#
# The script will fail if:
#   - JDK 21 is not available
#   - Maven is not installed
#   - Build or tests fail
#
# Prerequisites:
#   - JDK 21
#   - Maven 3.6.3+
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

SKIP_TESTS=""
if [[ "${1:-}" == "--skip-tests" ]]; then
    SKIP_TESTS="-DskipTests"
    echo "Building without tests..."
fi

cd "$PROJECT_DIR"
echo "Building Social Media app..."
mvn clean package $SKIP_TESTS
echo "Build complete. JAR is at: target/*.jar"

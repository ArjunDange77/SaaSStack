#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

bash "$ROOT/scripts/ruff-check.sh"

echo "==> Backend pytest (coverage floor 70%)"
(
  cd "$ROOT/backend"
  pytest --cov-fail-under=70
)

echo "==> Frontend vitest (coverage floor 40%)"
(
  cd "$ROOT/frontend"
  npm run test:coverage
)

echo "All tests passed."

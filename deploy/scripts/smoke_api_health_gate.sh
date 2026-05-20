#!/usr/bin/env bash
# Early deploy gate: wait for /api/health/ only (no product-specific public routes).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export API_BASE_URL="${API_BASE_URL:?API_BASE_URL required}"
export EXPECTED_ENV="${EXPECTED_ENV:-}"
export EXPECTED_VERSION="${EXPECTED_VERSION:-}"

bash "$ROOT/deploy/scripts/wait_for_api.sh"
echo "SMOKE OK: API health gate passed"

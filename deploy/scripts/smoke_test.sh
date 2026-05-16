#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT/backend"

pip install -q httpx >/dev/null 2>&1 || true
export PYTHONPATH="$ROOT/backend:${PYTHONPATH:-}"
python "$ROOT/deploy/scripts/smoke_test.py"

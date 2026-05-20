#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT/backend"

pip install -q httpx >/dev/null 2>&1 || true
export PYTHONPATH="$ROOT/deploy/scripts:$ROOT/backend:${PYTHONPATH:-}"
if [ ! -f "$ROOT/deploy/scripts/smoke_env.py" ]; then
  echo "SMOKE FAIL: missing deploy/scripts/smoke_env.py" >&2
  exit 1
fi
python "$ROOT/deploy/scripts/smoke_test.py"

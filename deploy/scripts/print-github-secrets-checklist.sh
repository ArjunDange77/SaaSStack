#!/usr/bin/env bash
# Print GitHub staging secrets checklist from local provision output.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FILE="$ROOT/deploy/.secrets/github-staging-secrets.env"

if [[ ! -f "$FILE" ]]; then
  echo "Missing $FILE — run ./deploy/scripts/provision-staging-india.sh first"
  exit 1
fi

echo "=== Copy each line to GitHub → Settings → Environments → staging → Secrets ==="
echo ""
grep -v '^#' "$FILE" | grep -v '^$' || true
echo ""
echo "Repo: https://github.com/settings (your org/repo → Environments → staging)"
echo "Never commit this file."

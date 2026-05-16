#!/usr/bin/env bash
# Add or update BUDGET_ALERT_EMAIL in local azure-account file (gitignored).
set -euo pipefail

EMAIL="${1:-}"
LOCAL="$(
  cd "$(dirname "$0")/../.." && pwd
)/deploy/.secrets/azure-account.local.env"

if [[ -z "$EMAIL" ]]; then
  echo "Usage: $0 you@example.com"
  exit 1
fi

mkdir -p "$(dirname "$LOCAL")"
touch "$LOCAL"
if grep -q '^BUDGET_ALERT_EMAIL=' "$LOCAL" 2>/dev/null; then
  sed -i.bak "s/^BUDGET_ALERT_EMAIL=.*/BUDGET_ALERT_EMAIL=$EMAIL/" "$LOCAL"
  rm -f "${LOCAL}.bak"
else
  echo "BUDGET_ALERT_EMAIL=$EMAIL" >>"$LOCAL"
fi
chmod 600 "$LOCAL"
echo "Updated BUDGET_ALERT_EMAIL in $LOCAL"

#!/usr/bin/env bash
# Write pilot URLs to gitignored local file after provision.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/deploy/.secrets/pilot-urls.local.md"
SECRETS="$ROOT/deploy/.secrets/staging.secrets.env"

API="${STAGING_API_URL:-https://saasstack-staging-api.azurewebsites.net}"
SWA="${SWA_URL:-}"

if [[ -f "$SECRETS" ]]; then
  # shellcheck disable=SC1090
  source "$SECRETS"
  API="${STAGING_API_URL:-$API}"
  SWA="${SWA_URL:-$SWA}"
fi

mkdir -p "$(dirname "$OUT")"
cat >"$OUT" <<EOF
# Pilot URLs (local only)

- API health: ${API}/api/health/
- Public booking: ${SWA:-<swa-url>}/book/pg-demo
- Staging API: ${API}

Demo: tenant \`pg-demo\`, users \`admin\` / \`staff\` / \`resident\`

Stop compute: ./deploy/scripts/stop-staging-india.sh
EOF
chmod 600 "$OUT"
echo "Wrote $OUT"

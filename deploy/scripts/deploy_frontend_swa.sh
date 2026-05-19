#!/usr/bin/env bash
# Deploy pre-built frontend/dist to Azure Static Web Apps (production).
# Prefers live token from `az` (OIDC) so a stale GitHub secret cannot target the wrong SWA.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DIST="${1:-frontend/dist}"
RG="${AZURE_RESOURCE_GROUP:-rg-saasstack-staging}"
SWA_NAME="${STATIC_WEB_APP_NAME:-saasstack-staging-web}"

if [[ ! -f "$ROOT/$DIST/index.html" ]]; then
  echo "ERROR: $DIST/index.html missing — build frontend first" >&2
  exit 1
fi

bash "$ROOT/deploy/scripts/verify_frontend_dist.sh" "$DIST"

SWA_HOST=""
AZ_TOKEN=""
if command -v az >/dev/null 2>&1 && az account show >/dev/null 2>&1; then
  echo "Reading SWA deployment token from Azure ($SWA_NAME in $RG)..."
  AZ_TOKEN="$(az staticwebapp secrets list \
    --name "$SWA_NAME" \
    --resource-group "$RG" \
    --query properties.apiKey -o tsv 2>/dev/null || true)"
  SWA_HOST="$(az staticwebapp show \
    --name "$SWA_NAME" \
    --resource-group "$RG" \
    --query defaultHostname -o tsv 2>/dev/null || true)"
  [[ -n "$SWA_HOST" ]] && echo "  SWA hostname: $SWA_HOST"
fi

TOKEN="${AZ_TOKEN:-${AZURE_STATIC_WEB_APPS_API_TOKEN:-}}"
if [[ -z "$TOKEN" ]]; then
  echo "ERROR: no SWA deployment token (OIDC/az or GitHub AZURE_STATIC_WEB_APPS_API_TOKEN)" >&2
  exit 1
fi
if [[ -z "$AZ_TOKEN" && -n "${AZURE_STATIC_WEB_APPS_API_TOKEN:-}" ]]; then
  echo "WARN: using GitHub secret token; prefer az-fetched token for $SWA_NAME"
fi

echo "Deploying $DIST to Static Web App (production)..."
cd "$ROOT"
npx --yes @azure/static-web-apps-cli@1.1.10 deploy "$DIST" \
  --deployment-token "$TOKEN" \
  --env production \
  --no-use-keychain

VERIFY_URL="${UNIFIED_SWA_URL:-https://${SWA_HOST:-saasstack-staging-web.azurestaticapps.net}}"
status="$(curl -sS -o /dev/null -w "%{http_code}" "${VERIFY_URL%/}/" || echo "000")"
if [[ "$status" == "404" ]] || [[ "$status" == "000" ]] || [[ "$status" -ge 400 ]]; then
  echo "ERROR: after deploy, ${VERIFY_URL}/ returned HTTP ${status}" >&2
  exit 1
fi
echo "OK: ${VERIFY_URL}/ returned HTTP ${status}"

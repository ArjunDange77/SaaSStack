#!/usr/bin/env bash
# Phase 0: validate local config and Azure CLI before guardrails/provision.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=lib/load-local-secrets.sh
source "$ROOT/deploy/scripts/lib/load-local-secrets.sh"

LOCAL_ENV="$ROOT/deploy/.secrets/azure-account.local.env"
FAIL=0

echo "=== SaaSStack Azure prep ==="

if ! command -v az >/dev/null 2>&1; then
  echo "FAIL: Azure CLI not found. brew install azure-cli"
  exit 1
fi
echo "OK: az $(az version --query '\"azure-cli\"' -o tsv 2>/dev/null || az version | head -1)"

if [[ ! -f "$LOCAL_ENV" ]]; then
  echo "FAIL: Missing $LOCAL_ENV"
  echo "  cp deploy/.secrets/azure-account.local.env.example $LOCAL_ENV"
  exit 1
fi
load_local_secrets "$LOCAL_ENV"

[[ -n "${AZURE_SUBSCRIPTION_ID:-}" ]] || { echo "FAIL: AZURE_SUBSCRIPTION_ID empty"; FAIL=1; }
[[ -n "${AZURE_LOCATION:-}" ]] || { echo "FAIL: AZURE_LOCATION empty"; FAIL=1; }
[[ -n "${BUDGET_ALERT_EMAIL:-}" ]] || {
  echo "FAIL: BUDGET_ALERT_EMAIL missing in $LOCAL_ENV"
  echo "  Add: BUDGET_ALERT_EMAIL=you@example.com"
  FAIL=1
}
[[ "$FAIL" -eq 0 ]] && echo "OK: local env file"

if ! az account show >/dev/null 2>&1; then
  echo ""
  echo "FAIL: Not logged in. Run in your terminal:"
  echo "  az login"
  echo "  az account set --subscription \"\$AZURE_SUBSCRIPTION_ID\""
  exit 1
fi

CURRENT="$(az account show --query id -o tsv)"
if [[ "$CURRENT" != "${AZURE_SUBSCRIPTION_ID}" ]]; then
  echo "Setting subscription to local env value..."
  az account set --subscription "$AZURE_SUBSCRIPTION_ID"
fi
az account show --query "{Name:name, Id:id, State:state}" -o table
echo "OK: Azure login + subscription"

echo ""
echo "Portal checklist (manual): Cost Management → Free Trial active, do NOT upgrade to PAYG"
echo "Prep complete. Next: ./deploy/scripts/cost-guardrails-setup.sh"

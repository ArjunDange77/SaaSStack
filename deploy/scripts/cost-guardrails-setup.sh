#!/usr/bin/env bash
# Run ALL recommended cost guardrails before first Azure deploy.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=lib/load-local-secrets.sh
source "$ROOT/deploy/scripts/lib/load-local-secrets.sh"
load_local_secrets || true

EMAIL="${BUDGET_ALERT_EMAIL:-}"
AMOUNT="${BUDGET_AMOUNT:-25}"
CURRENCY="${BUDGET_CURRENCY:-USD}"

echo "=== SaaSStack cost guardrails (pre-deploy) ==="
echo ""

if ! command -v az >/dev/null 2>&1; then
  echo "Install Azure CLI: brew install azure-cli"
  exit 1
fi

if ! az account show >/dev/null 2>&1; then
  echo "Run: az login"
  exit 1
fi

SUB_NAME="$(az account show --query name -o tsv)"
SUB_ID="$(az account show --query id -o tsv)"
echo "Subscription: $SUB_NAME"
echo "ID:           $SUB_ID"
echo ""

if [[ -z "$EMAIL" ]]; then
  echo "Set BUDGET_ALERT_EMAIL to create budget alerts."
  echo "  BUDGET_ALERT_EMAIL=you@example.com $0"
  exit 1
fi

echo "--- Creating budget (${AMOUNT} ${CURRENCY}/month, alerts 80% + 100%) ---"
BUDGET_ALERT_EMAIL="$EMAIL" BUDGET_AMOUNT="$AMOUNT" BUDGET_CURRENCY="$CURRENCY" \
  "$ROOT/deploy/scripts/setup-budget-alert.sh"

echo ""
echo "--- Portal actions YOU must confirm manually ---"
echo "1. Cost Management → verify free trial / spending limit (do NOT upgrade to PAYG yet)"
echo "2. Budgets → confirm 'saasstack-validation-budget' exists"
echo "3. Commit to ONE resource group: rg-saasstack-staging"
echo "4. Read: deploy/docs/cost-guardrails.md"
echo ""
echo "--- After deploy: stop when idle ---"
echo "  ./deploy/scripts/stop-staging-india.sh"
echo ""
echo "--- Emergency: delete all staging Azure resources ---"
echo "  ./deploy/scripts/teardown-staging-india.sh"
echo ""
echo "Guardrails setup script finished. Complete portal checklist before provisioning."

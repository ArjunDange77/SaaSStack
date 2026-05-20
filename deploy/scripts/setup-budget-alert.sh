#!/usr/bin/env bash
# Create a low-cost budget alert on your Azure subscription (India / trial friendly).
# Requires: az login, Cost Management permissions.
set -euo pipefail

AMOUNT="${BUDGET_AMOUNT:-25}"
CURRENCY="${BUDGET_CURRENCY:-USD}"
EMAIL="${BUDGET_ALERT_EMAIL:-}"

if ! command -v az >/dev/null 2>&1; then
  echo "Install Azure CLI first: https://learn.microsoft.com/cli/azure/install-azure-cli"
  exit 1
fi

if [[ -z "$EMAIL" ]]; then
  echo "Set BUDGET_ALERT_EMAIL to your email, e.g.:"
  echo "  BUDGET_ALERT_EMAIL=you@example.com $0"
  exit 1
fi

SUBSCRIPTION_ID="$(az account show --query id -o tsv)"
SCOPE="/subscriptions/${SUBSCRIPTION_ID}"
START="$(date -u +%Y-%m-01)"
if date -u -v+1y +%Y-%m-01 >/dev/null 2>&1; then
  END="$(date -u -v+1y +%Y-%m-01)"
else
  END="$(date -u -d '+1 year' +%Y-%m-01)"
fi

echo "Creating budget: ${AMOUNT} ${CURRENCY} on ${SCOPE}"
echo "Alerts at 80% and 100% → $EMAIL"

az consumption budget create \
  --budget-name "saasstack-validation-budget" \
  --amount "$AMOUNT" \
  --category cost \
  --time-grain monthly \
  --start-date "$START" \
  --end-date "$END" \
  --resource "$SCOPE" \
  --notifications '{
    "actual_GreaterThan_80_Percent": {
      "enabled": true,
      "operator": "GreaterThan",
      "threshold": 80,
      "contactEmails": ["'"$EMAIL"'"],
      "contactRoles": [],
      "contactGroups": [],
      "thresholdType": "actual"
    },
    "actual_GreaterThan_100_Percent": {
      "enabled": true,
      "operator": "GreaterThan",
      "threshold": 100,
      "contactEmails": ["'"$EMAIL"'"],
      "contactRoles": [],
      "contactGroups": [],
      "thresholdType": "actual"
    }
  }' 2>/dev/null || {
  echo ""
  echo "If budget API failed, create manually in Azure Portal:"
  echo "  Cost Management + Billing → Budgets → Create"
  echo "  Amount: ${AMOUNT} ${CURRENCY}, alert at 80% and 100%"
  echo "  Scope: subscription ${SUBSCRIPTION_ID}"
}

echo "Done. Also enable free trial spending limits in Azure Portal → Cost Management."

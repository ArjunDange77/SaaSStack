#!/usr/bin/env bash
# DELETE entire staging resource group — stops all charges in that group.
set -euo pipefail

RG="${AZURE_RESOURCE_GROUP:-rg-saasstack-staging}"

if ! command -v az >/dev/null 2>&1; then
  echo "Azure CLI required."
  exit 1
fi

echo "WARNING: This permanently deletes ALL resources in: $RG"
echo "Including: App Service, PostgreSQL, Static Web App, storage, etc."
echo ""
read -r -p "Type the resource group name to confirm: " CONFIRM

if [[ "$CONFIRM" != "$RG" ]]; then
  echo "Aborted (name did not match)."
  exit 1
fi

az group delete --name "$RG" --yes --no-wait
echo "Delete started (async). Verify in Portal → Resource groups."
echo "Local secrets in deploy/.secrets/ are NOT deleted — remove manually if needed."

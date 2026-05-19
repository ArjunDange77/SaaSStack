#!/usr/bin/env bash
# Remove School Bus–only Azure RGs after unified staging is verified (Phase 1 cutover).
# Does NOT delete rg-saasstack-staging.
set -euo pipefail

if ! command -v az >/dev/null 2>&1; then
  echo "Azure CLI required: az login" >&2
  exit 1
fi

RGS=(
  rg-saasstack-sb-staging
  rg-saasstack-shared
  rg-saasstack-sb-prod
)

echo "This will delete the following resource groups (if they exist):"
for rg in "${RGS[@]}"; do
  echo "  - $rg"
done
echo ""
echo "Keep: rg-saasstack-staging (unified PG + School Bus staging)"
echo ""

CONFIRM="${TEARDOWN_CONFIRM:-}"
if [[ -z "$CONFIRM" ]]; then
  read -r -p "Type 'delete-sb-stacks' to confirm: " CONFIRM
fi

if [[ "$CONFIRM" != "delete-sb-stacks" ]]; then
  echo "Aborted."
  exit 1
fi

for rg in "${RGS[@]}"; do
  if az group exists --name "$rg" -o tsv 2>/dev/null | grep -qi true; then
    echo "Deleting $rg..."
    az group delete --name "$rg" --yes --no-wait
  else
    echo "Skip (not found): $rg"
  fi
done

echo "Delete started (async). Verify in Azure Portal → Resource groups."

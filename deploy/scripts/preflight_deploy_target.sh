#!/usr/bin/env bash
# Validate Azure deploy target before migrate/build (fail fast on RG/app/slot mismatch).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=lib/app_service_slot_args.sh
source "$ROOT/deploy/scripts/lib/app_service_slot_args.sh"

RG="${AZURE_RESOURCE_GROUP:?AZURE_RESOURCE_GROUP required}"
APP="${AZURE_WEBAPP_NAME:?AZURE_WEBAPP_NAME required}"
DEPLOY_SLOT="${DEPLOY_SLOT:-}"
PROFILE="${DEPLOY_PROFILE:-}"

if ! command -v az >/dev/null 2>&1; then
  echo "ERROR: Azure CLI not found" >&2
  exit 1
fi

echo "=== Deploy preflight ==="
echo "  Resource group: $RG"
echo "  API app:        $APP"
echo "  Deploy slot:    ${DEPLOY_SLOT:-<production>}"
[[ -n "$PROFILE" ]] && echo "  Profile:        $PROFILE"

if [[ -n "$PROFILE" ]]; then
  PROFILE_FILE="$ROOT/deploy/azure/profiles/${PROFILE}.yaml"
  if [[ ! -f "$PROFILE_FILE" ]]; then
    echo "ERROR: profile file not found: $PROFILE_FILE" >&2
    exit 1
  fi
  python3 "$ROOT/deploy/scripts/validate_deploy_profile.py" --profile "$PROFILE" --preflight-env
fi

echo "Checking resource group..."
if ! az group show --name "$RG" --output none 2>/dev/null; then
  echo "ERROR: resource group not found: $RG" >&2
  exit 1
fi
echo "OK: resource group exists"

echo "Checking API web app..."
if ! az webapp show --resource-group "$RG" --name "$APP" --output none 2>/dev/null; then
  echo "ERROR: web app not found: ${APP} in ${RG}" >&2
  exit 1
fi
echo "OK: web app exists"

assert_deploy_slot_exists "$RG" "$APP" "$DEPLOY_SLOT"

echo "Checking app settings access..."
if ! az webapp config appsettings list \
  --resource-group "$RG" \
  --name "$APP" \
  "${SLOT_ARGS[@]}" \
  --query "[0].name" -o tsv >/dev/null 2>&1; then
  echo "ERROR: cannot read app settings (RBAC or wrong slot)" >&2
  exit 1
fi
echo "OK: app settings readable"

if [[ -n "$PROFILE" && -z "$DEPLOY_SLOT" ]]; then
  if deploy_slot_exists "$RG" "$APP" "staging"; then
    echo "WARN: 'staging' slot exists but deploy_slot is empty (unified stack uses production slot only)"
  fi
fi

echo "Preflight passed."

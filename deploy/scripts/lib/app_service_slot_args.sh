# shellcheck shell=bash
# Source to set SLOT_ARGS array for az webapp commands (empty = production slot).
_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$_LIB_DIR/az_cli.sh" ]]; then
  # shellcheck source=az_cli.sh
  source "$_LIB_DIR/az_cli.sh"
fi

DEPLOY_SLOT="${DEPLOY_SLOT:-}"
SLOT_ARGS=()
if [[ -n "$DEPLOY_SLOT" ]]; then
  SLOT_ARGS=(--slot "$DEPLOY_SLOT")
fi

# Returns 0 if slot exists (or slot name is empty = production).
deploy_slot_exists() {
  local rg=$1 app=$2 slot=$3
  if [[ -z "$slot" ]]; then
    return 0
  fi
  if declare -F az_run >/dev/null 2>&1; then
    az_run webapp deployment slot list --resource-group "$rg" --name "$app" \
      --query "[?name=='${slot}'].name" -o tsv | grep -qx "$slot"
  else
    az webapp deployment slot list --resource-group "$rg" --name "$app" \
      --query "[?name=='${slot}'].name" -o tsv 2>/dev/null | grep -qx "$slot"
  fi
}

# Exit 1 when a non-empty deploy slot is configured but missing on the web app.
assert_deploy_slot_exists() {
  local rg=$1 app=$2 slot=$3
  if [[ -z "$slot" ]]; then
    return 0
  fi
  if deploy_slot_exists "$rg" "$app" "$slot"; then
    return 0
  fi
  echo "ERROR: deployment slot '${slot}' not found on ${app} in ${rg}" >&2
  echo "  Fix DEPLOY_SLOT / workflow deploy_slot, or create the slot before deploy." >&2
  exit 1
}

# For seed scripts: fail if slot is set but missing (no silent fallback to production).
reconcile_deploy_slot_or_fail() {
  local rg=$1 app=$2
  if [[ -z "$DEPLOY_SLOT" ]]; then
    SLOT_ARGS=()
    return 0
  fi
  assert_deploy_slot_exists "$rg" "$app" "$DEPLOY_SLOT"
  # shellcheck disable=SC2034 # SLOT_ARGS consumed by scripts that source this library
  SLOT_ARGS=(--slot "$DEPLOY_SLOT")
}

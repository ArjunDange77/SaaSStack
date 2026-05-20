# shellcheck shell=bash
# Azure CLI helpers for deploy scripts (timeouts + clearer CI failures).

AZ_CLI_TIMEOUT_SEC="${AZ_CLI_TIMEOUT_SEC:-90}"

# Run az with a wall-clock timeout. Surfaces stderr on failure (do not swallow in CI).
az_run() {
  local timeout_sec="${AZ_CLI_TIMEOUT_SEC}"
  if ! command -v timeout >/dev/null 2>&1; then
    az "$@" --only-show-errors
    return $?
  fi
  if ! timeout "$timeout_sec" az "$@" --only-show-errors; then
    local rc=$?
    if [[ "$rc" -eq 124 ]]; then
      echo "ERROR: az command timed out after ${timeout_sec}s: az $*" >&2
      echo "  Check Azure login, subscription, and network from the runner." >&2
    fi
    return "$rc"
  fi
}

# True if Microsoft.Web/sites exists in the resource group (no appservice extension quirks).
webapp_resource_exists() {
  local rg=$1 app=$2
  az_run resource show \
    --resource-group "$rg" \
    --name "$app" \
    --resource-type "Microsoft.Web/sites" \
    --output none
}

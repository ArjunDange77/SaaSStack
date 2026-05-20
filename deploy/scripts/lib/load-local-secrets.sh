# shellcheck shell=bash
# Source local-only Azure account settings (subscription ID, region, RG).
load_local_secrets() {
  local secrets_file="${1:-}"
  if [[ -z "$secrets_file" ]]; then
    local root
    root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
    secrets_file="$root/deploy/.secrets/azure-account.local.env"
  fi
  if [[ -f "$secrets_file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$secrets_file"
    set +a
    if [[ -n "${AZURE_SUBSCRIPTION_ID:-}" ]] && command -v az >/dev/null 2>&1; then
      az account set --subscription "$AZURE_SUBSCRIPTION_ID" >/dev/null 2>&1 || true
    fi
    return 0
  fi
  return 1
}

# shellcheck shell=bash
# Resolve unified staging Static Web App URL from Azure defaultHostname (not resource name).
resolve_unified_swa_url() {
  local rg="${AZURE_RESOURCE_GROUP:-rg-saasstack-staging}"
  local name="${STATIC_WEB_APP_NAME:-saasstack-staging-web}"
  local host=""

  if command -v az >/dev/null 2>&1 && az account show >/dev/null 2>&1; then
    host="$(az staticwebapp show --name "$name" --resource-group "$rg" \
      --query defaultHostname -o tsv 2>/dev/null || true)"
    if [[ -n "$host" ]]; then
      printf 'https://%s\n' "$host"
      return 0
    fi
  fi

  if [[ -n "${UNIFIED_SWA_URL:-}" ]]; then
    printf '%s\n' "${UNIFIED_SWA_URL%/}"
    return 0
  fi
  if [[ -n "${SMOKE_SWA_URL:-}" ]]; then
    printf '%s\n' "${SMOKE_SWA_URL%/}"
    return 0
  fi

  printf 'https://%s.azurestaticapps.net\n' "$name"
  return 1
}

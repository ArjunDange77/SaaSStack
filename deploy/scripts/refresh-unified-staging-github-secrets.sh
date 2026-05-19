#!/usr/bin/env bash
# Refresh GitHub staging secrets for unified stack (SWA token + correct URLs).
# Run: az login && gh auth login, then:
#   bash deploy/scripts/refresh-unified-staging-github-secrets.sh
#   bash deploy/scripts/refresh-unified-staging-github-secrets.sh --push
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SECRETS_DIR="$ROOT/deploy/.secrets"
ENV_FILE="$SECRETS_DIR/github-staging-secrets.env"
RG="${AZURE_RESOURCE_GROUP:-rg-saasstack-staging}"
API_APP="${AZURE_WEBAPP_NAME:-saasstack-staging-api}"
SWA_NAME="${STATIC_WEB_APP_NAME:-saasstack-staging-web}"
API_URL="${STAGING_API_URL:-https://saasstack-staging-api.azurewebsites.net}"
SWA_URL="${UNIFIED_SWA_URL:-https://saasstack-staging-web.azurestaticapps.net}"
PUSH=0

for arg in "$@"; do
  case "$arg" in
    --push) PUSH=1 ;;
    -h|--help)
      echo "Usage: $0 [--push]"
      echo "  Refreshes deploy/.secrets/github-staging-secrets.env"
      echo "  --push  Also run: gh secret set ... --env staging"
      exit 0
      ;;
  esac
done

if ! command -v az >/dev/null 2>&1; then
  echo "ERROR: install Azure CLI and run: az login" >&2
  exit 1
fi

az account show >/dev/null 2>&1 || {
  echo "ERROR: not logged in — run: az login" >&2
  exit 1
}

echo "=== Unified staging secret refresh ==="
echo "  RG:       $RG"
echo "  API app:  $API_APP"
echo "  SWA:      $SWA_NAME"
echo ""

if ! az group show --name "$RG" --output none 2>/dev/null; then
  echo "ERROR: resource group not found: $RG" >&2
  exit 1
fi

if ! az webapp show --resource-group "$RG" --name "$API_APP" --output none 2>/dev/null; then
  echo "ERROR: API web app not found: $API_APP" >&2
  exit 1
fi

if ! az staticwebapp show --name "$SWA_NAME" --resource-group "$RG" --output none 2>/dev/null; then
  echo "ERROR: Static Web App not found: $SWA_NAME in $RG" >&2
  echo "  Run: bash deploy/scripts/provision-staging-india.sh" >&2
  exit 1
fi

SWA_HOST="$(az staticwebapp show --name "$SWA_NAME" --resource-group "$RG" --query defaultHostname -o tsv)"
SWA_URL="https://${SWA_HOST}"
SWA_TOKEN="$(az staticwebapp secrets list --name "$SWA_NAME" --resource-group "$RG" --query properties.apiKey -o tsv)"

if [[ -z "$SWA_TOKEN" ]]; then
  echo "ERROR: could not read SWA deployment token for $SWA_NAME" >&2
  exit 1
fi

PG_HOST="$(az postgres flexible-server list --resource-group "$RG" --query "[0].fullyQualifiedDomainName" -o tsv 2>/dev/null || true)"
PG_USER="${POSTGRES_USER:-}"
PG_DB="${POSTGRES_DB:-saasstack_staging}"
DJANGO_SECRET="${DJANGO_SECRET_KEY:-}"

# Preserve passwords from existing env file when refreshing.
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source <(grep -E '^(POSTGRES_PASSWORD|DJANGO_SECRET_KEY|POSTGRES_USER|AZURE_CLIENT_ID)=' "$ENV_FILE" 2>/dev/null || true)
  PG_USER="${POSTGRES_USER:-$PG_USER}"
  PG_DB="${POSTGRES_DB:-$PG_DB}"
  DJANGO_SECRET="${DJANGO_SECRET_KEY:-$DJANGO_SECRET}"
fi

if [[ -z "$PG_HOST" ]]; then
  PG_HOST="${DB_HOST:-saasstack-staging-pg.postgres.database.azure.com}"
fi

if [[ -z "$PG_USER" ]]; then
  PG_USER="$(az postgres flexible-server show --resource-group "$RG" --name "${SWA_NAME%-web}-pg" --query administratorLogin -o tsv 2>/dev/null || \
    az postgres flexible-server list --resource-group "$RG" --query "[0].administratorLogin" -o tsv 2>/dev/null || echo "saasstackadmin")"
fi

SUBSCRIPTION_ID="$(az account show --query id -o tsv)"
TENANT_ID="$(az account show --query tenantId -o tsv)"

mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR" 2>/dev/null || true

{
  echo "# Refreshed $(date -u +%Y-%m-%dT%H:%MZ) — unified staging (do not commit)"
  echo "AZURE_SUBSCRIPTION_ID=$SUBSCRIPTION_ID"
  echo "AZURE_TENANT_ID=$TENANT_ID"
  [[ -n "${AZURE_CLIENT_ID:-}" ]] && echo "AZURE_CLIENT_ID=$AZURE_CLIENT_ID"
  echo "AZURE_WEBAPP_NAME=$API_APP"
  echo "STAGING_API_URL=$API_URL"
  echo "VITE_API_BASE=$API_URL"
  echo "AZURE_STATIC_WEB_APPS_API_TOKEN=$SWA_TOKEN"
  echo "POSTGRES_DB=$PG_DB"
  echo "POSTGRES_USER=$PG_USER"
  [[ -n "${POSTGRES_PASSWORD:-}" ]] && echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD"
  echo "DB_HOST=$PG_HOST"
  echo "DB_PORT=5432"
  [[ -n "$DJANGO_SECRET" ]] && echo "DJANGO_SECRET_KEY=$DJANGO_SECRET"
  echo "SMOKE_USERNAME=admin"
  echo "SMOKE_PASSWORD=admin"
  echo "SMOKE_SWA_URL=$SWA_URL"
  echo "SMOKE_WEB_URL=$SWA_URL"
} >"$ENV_FILE"
chmod 600 "$ENV_FILE"

echo "Wrote: $ENV_FILE"
echo ""
echo "Critical values (verify before push):"
echo "  STAGING_API_URL / VITE_API_BASE     = $API_URL"
echo "  SMOKE_SWA_URL / SMOKE_WEB_URL       = $SWA_URL"
echo "  AZURE_WEBAPP_NAME                   = $API_APP"
echo "  AZURE_STATIC_WEB_APPS_API_TOKEN   = (${#SWA_TOKEN} chars, from $SWA_NAME)"
echo ""

MISSING=()
[[ -z "${POSTGRES_PASSWORD:-}" ]] && MISSING+=("POSTGRES_PASSWORD")
[[ -z "${AZURE_CLIENT_ID:-}" ]] && MISSING+=("AZURE_CLIENT_ID")
[[ -z "$DJANGO_SECRET" ]] && MISSING+=("DJANGO_SECRET_KEY")

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "WARN: still missing in $ENV_FILE (copy from old secrets or provision output):"
  printf '  - %s\n' "${MISSING[@]}"
  echo ""
  echo "  AZURE_CLIENT_ID: bash deploy/scripts/setup-github-oidc.sh"
  echo "  POSTGRES_PASSWORD / DJANGO_SECRET_KEY: provision output or Azure Portal"
  echo ""
fi

echo "WRONG (delete or overwrite in GitHub if present):"
echo "  SMOKE_SWA_URL=https://saasstack-sb-staging-web-staging.azurewebsites.net"
echo "  AZURE_WEBAPP_NAME=saasstack-sb-staging-api"
echo ""

if [[ "$PUSH" -eq 1 ]]; then
  if ! command -v gh >/dev/null 2>&1; then
    echo "ERROR: gh CLI required for --push. brew install gh && gh auth login" >&2
    exit 1
  fi
  REPO="${GITHUB_REPO_SLUG:-}"
  if [[ -z "$REPO" ]]; then
    REMOTE="$(git -C "$ROOT" remote get-url origin 2>/dev/null || true)"
    [[ "$REMOTE" =~ github\.com[:/]([^/]+)/([^/.]+) ]] && REPO="${BASH_REMATCH[1]}/${BASH_REMATCH[2]}"
  fi
  [[ -z "$REPO" ]] && { echo "Set GITHUB_REPO_SLUG=org/repo"; exit 1; }

  echo "Pushing to GitHub environment 'staging' on $REPO ..."
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line// }" ]] && continue
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      val="${BASH_REMATCH[2]}"
      [[ -z "$val" ]] && { echo "  skip (empty): $key"; continue; }
      echo "  $key"
      echo -n "$val" | gh secret set "$key" --env staging --repo "$REPO"
    fi
  done <"$ENV_FILE"
  echo "Done. Re-run Deploy Staging after you push code."
else
  echo "Push to GitHub:"
  echo "  bash deploy/scripts/refresh-unified-staging-github-secrets.sh --push"
  echo "  # or: bash deploy/scripts/sync-github-staging-secrets.sh"
fi

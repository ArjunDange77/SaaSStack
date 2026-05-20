#!/usr/bin/env bash
# Register GitHub OIDC federated credential for deploy-staging.yml (no long-lived Azure passwords).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=lib/load-local-secrets.sh
source "$ROOT/deploy/scripts/lib/load-local-secrets.sh"
load_local_secrets || true

SECRETS_DIR="$ROOT/deploy/.secrets"
ENV_NAME="${GITHUB_ENVIRONMENT:-staging}"

case "$ENV_NAME" in
  schoolbus-staging)
    RG="${AZURE_RESOURCE_GROUP:-rg-saasstack-sb-staging}"
    SECRETS_OUT="$SECRETS_DIR/github-schoolbus-staging-secrets.env"
    ;;
  schoolbus-production)
    RG="${AZURE_RESOURCE_GROUP:-rg-saasstack-sb-prod}"
    SECRETS_OUT="$SECRETS_DIR/github-schoolbus-production-secrets.env"
    ;;
  production)
    RG="${AZURE_RESOURCE_GROUP:-rg-saasstack-prod}"
    SECRETS_OUT="$SECRETS_DIR/github-production-secrets.env"
    ;;
  *)
    RG="${AZURE_RESOURCE_GROUP:-rg-saasstack-staging}"
    SECRETS_OUT="$SECRETS_DIR/github-staging-secrets.env"
    ;;
esac

GITHUB_ORG="${GITHUB_ORG:-}"
GITHUB_REPO="${GITHUB_REPO:-}"

if ! command -v az >/dev/null 2>&1; then
  echo "Azure CLI required."
  exit 1
fi

if [[ -z "$GITHUB_ORG" || -z "$GITHUB_REPO" ]]; then
  if command -v git >/dev/null 2>&1 && git -C "$ROOT" remote get-url origin &>/dev/null; then
    REMOTE="$(git -C "$ROOT" remote get-url origin)"
    if [[ "$REMOTE" =~ github\.com[:/]([^/]+)/([^/.]+)(\.git)?$ ]]; then
      GITHUB_ORG="${BASH_REMATCH[1]}"
      GITHUB_REPO="${BASH_REMATCH[2]}"
    fi
  fi
fi

if [[ -z "$GITHUB_ORG" || -z "$GITHUB_REPO" ]]; then
  echo "Set GITHUB_ORG and GITHUB_REPO, e.g.:"
  echo "  GITHUB_ORG=myorg GITHUB_REPO=SaaSStack $0"
  exit 1
fi

APP_NAME="saasstack-github-${ENV_NAME}"
SUBSCRIPTION_ID="$(az account show --query id -o tsv)"
TENANT_ID="$(az account show --query tenantId -o tsv)"

echo "Creating app registration: $APP_NAME"
APP_ID="$(az ad app create --display-name "$APP_NAME" --query appId -o tsv)"
az ad sp create --id "$APP_ID" --output none 2>/dev/null || true

echo "Assigning Contributor on $RG..."
RG_ID="$(az group show --name "$RG" --query id -o tsv)"
az role assignment create \
  --assignee "$APP_ID" \
  --role Contributor \
  --scope "$RG_ID" \
  --output none 2>/dev/null || echo "(role may already exist)"

FED_NAME="github-${ENV_NAME}"
SUBJECT="repo:${GITHUB_ORG}/${GITHUB_REPO}:environment:${ENV_NAME}"

echo "Adding federated credential: $SUBJECT"
az ad app federated-credential create \
  --id "$APP_ID" \
  --parameters "{
    \"name\": \"${FED_NAME}\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"${SUBJECT}\",
    \"audiences\": [\"api://AzureADTokenExchange\"]
  }" \
  --output none 2>/dev/null || echo "(credential may already exist)"

mkdir -p "$SECRETS_DIR"
{
  echo "AZURE_CLIENT_ID=$APP_ID"
  echo "AZURE_TENANT_ID=$TENANT_ID"
  echo "AZURE_SUBSCRIPTION_ID=$SUBSCRIPTION_ID"
} >>"$SECRETS_OUT"

echo ""
echo "OIDC ready. Add to GitHub → Environments → ${ENV_NAME}:"
echo "  AZURE_CLIENT_ID=$APP_ID"
echo "  AZURE_TENANT_ID=$TENANT_ID"
echo "  AZURE_SUBSCRIPTION_ID=$SUBSCRIPTION_ID"
echo ""
echo "Also copy remaining values from: $SECRETS_OUT"

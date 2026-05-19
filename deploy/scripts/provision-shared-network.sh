#!/usr/bin/env bash
# Provision shared VNet, NAT, private DNS for Postgres PE (rg-saasstack-shared).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=lib/load-local-secrets.sh
source "$ROOT/deploy/scripts/lib/load-local-secrets.sh"
load_local_secrets || true

SHARED_RG="${AZURE_SHARED_RESOURCE_GROUP:-rg-saasstack-shared}"
LOCATION="${AZURE_LOCATION:-centralindia}"

if ! command -v az >/dev/null 2>&1; then
  echo "Azure CLI (az) is required."
  exit 1
fi

echo "Creating shared resource group $SHARED_RG in $LOCATION..."
az group create --name "$SHARED_RG" --location "$LOCATION" --tags purpose=shared-infra product=platform

DEPLOYMENT_NAME="saasstack-shared-$(date +%Y%m%d%H%M%S)"
echo "Deploying shared network (Bicep)..."
az deployment group create \
  --resource-group "$SHARED_RG" \
  --name "$DEPLOYMENT_NAME" \
  --template-file "$ROOT/deploy/azure/shared/main.bicep" \
  --parameters location="$LOCATION" \
  --output json >"$ROOT/deploy/.secrets/shared-network-deployment.json" 2>/dev/null || {
  az deployment group create \
    --resource-group "$SHARED_RG" \
    --name "$DEPLOYMENT_NAME" \
    --template-file "$ROOT/deploy/azure/shared/main.bicep" \
    --parameters location="$LOCATION"
}

INTEGRATION_SUBNET="$(az deployment group show --resource-group "$SHARED_RG" --name "$DEPLOYMENT_NAME" --query properties.outputs.integrationSubnetId.value -o tsv)"
PE_SUBNET="$(az deployment group show --resource-group "$SHARED_RG" --name "$DEPLOYMENT_NAME" --query properties.outputs.privateEndpointSubnetId.value -o tsv)"
DNS_ZONE="$(az deployment group show --resource-group "$SHARED_RG" --name "$DEPLOYMENT_NAME" --query properties.outputs.postgresPrivateDnsZoneId.value -o tsv)"

SECRETS_DIR="$ROOT/deploy/.secrets"
mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"

{
  echo "# Shared network outputs — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "AZURE_SHARED_RESOURCE_GROUP=$SHARED_RG"
  echo "INTEGRATION_SUBNET_ID=$INTEGRATION_SUBNET"
  echo "PRIVATE_ENDPOINT_SUBNET_ID=$PE_SUBNET"
  echo "POSTGRES_PRIVATE_DNS_ZONE_ID=$DNS_ZONE"
} >"$SECRETS_DIR/shared-network.env"

echo "Wrote $SECRETS_DIR/shared-network.env"
echo "Integration subnet: $INTEGRATION_SUBNET"

#!/usr/bin/env bash
# Seed demo PG data on staging via App Service (after first successful container deploy).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SECRETS_FILE="${1:-$ROOT/deploy/.secrets/staging.secrets.env}"
RG="${AZURE_RESOURCE_GROUP:-rg-saasstack-staging}"

if [[ ! -f "$SECRETS_FILE" ]]; then
  echo "Missing $SECRETS_FILE — run provision-staging-india.sh first"
  exit 1
fi

# shellcheck disable=SC1090
source "$SECRETS_FILE"

APP="${AZURE_WEBAPP_NAME:?}"

if ! command -v az >/dev/null 2>&1; then
  echo "Azure CLI required."
  exit 1
fi

echo "Seeding kernel + PG demo on $APP (this may take 1–2 minutes)..."
az webapp ssh --resource-group "$RG" --name "$APP" --command "python manage.py seed_kernel" || {
  echo "SSH seed failed. Try Azure Portal → App Service → SSH and run:"
  echo "  python manage.py seed_kernel"
  echo "  python manage.py seed_pg --demo"
  exit 1
}

az webapp ssh --resource-group "$RG" --name "$APP" --command "python manage.py seed_pg --demo"

echo ""
echo "Demo ready:"
echo "  Tenant: pg-demo"
echo "  Users: admin / staff / resident (password: admin unless you changed seed)"
echo "  Booking: \${SWA_URL:-<your-swa>}/book/pg-demo"

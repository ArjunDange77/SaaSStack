#!/usr/bin/env bash
# Run once after: az login (browser)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
chmod +x deploy/scripts/*.sh deploy/scripts/lib/*.sh

echo "=== Azure login check ==="
az account show -o table

echo ""
./deploy/scripts/run-staging-deployment.sh

echo ""
GITHUB_ORG="${GITHUB_ORG:-ArjunDange77}" GITHUB_REPO="${GITHUB_REPO:-SaaSStack}" \
  ./deploy/scripts/setup-github-oidc.sh

echo ""
./deploy/scripts/print-github-secrets-checklist.sh

echo ""
echo "=== Manual: copy secrets to GitHub Environment 'staging', then: ==="
echo "  git push -u origin staging"
echo "After Actions succeed:"
echo "  ./deploy/scripts/seed-staging-azure.sh"

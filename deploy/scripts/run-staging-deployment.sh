#!/usr/bin/env bash
# Run full staging deployment pipeline (guardrails → provision). Requires az login.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

chmod +x deploy/scripts/*.sh deploy/scripts/lib/*.sh 2>/dev/null || true

echo "========== Phase 0: Prep =========="
./deploy/scripts/prep-azure.sh

echo ""
echo "========== Phase 1: Cost guardrails =========="
./deploy/scripts/cost-guardrails-setup.sh

echo ""
echo "========== Phase 2: Provision centralindia =========="
./deploy/scripts/provision-staging-india.sh

echo ""
echo "========== Phase 3: Next steps (manual) =========="
echo "1. GITHUB_ORG=... GITHUB_REPO=... ./deploy/scripts/setup-github-oidc.sh"
echo "2. Copy deploy/.secrets/github-staging-secrets.env → GitHub Environment staging"
echo "3. git push -u origin staging"
echo "4. After Actions green: ./deploy/scripts/seed-staging-azure.sh"

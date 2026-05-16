# SaaSStack deployment (local operator files)

**Runbooks in `deploy/docs/` are gitignored** — they stay on your machine only (subscription IDs, URLs, notes).

## First-time setup

1. Copy `deploy/.secrets/azure-account.local.env.example` → `deploy/.secrets/azure-account.local.env`
2. Set `AZURE_SUBSCRIPTION_ID`, `AZURE_LOCATION=centralindia`, `BUDGET_ALERT_EMAIL`  
   Optional overrides: `AZURE_APP_LOCATION=southindia`, `AZURE_SWA_LOCATION=eastasia` (defaults — cheapest layout when centralindia cannot host API/SWA)
3. `az login` then read **`deploy/docs/cost-guardrails.md`**
4. `./deploy/scripts/cost-guardrails-setup.sh`
5. `./deploy/scripts/provision-staging-india.sh`

## Scripts (safe to commit — no secrets)

| Script | Purpose |
|--------|---------|
| `scripts/cost-guardrails-setup.sh` | Budget alerts before deploy |
| `scripts/provision-staging-india.sh` | Bicep + staging RG |
| `scripts/setup-github-oidc.sh` | GitHub federated login |
| `scripts/stop-staging-india.sh` / `start-staging-india.sh` | Save money when idle |
| `scripts/teardown-staging-india.sh` | Delete entire staging RG |

Secrets output: `deploy/.secrets/` (gitignored).

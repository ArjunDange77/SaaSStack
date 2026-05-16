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

Public booking rate limits use the Postgres `django_cache` table. `createcachetable` runs on staging/production container start. If the table is missing, throttles log a warning and allow traffic (degraded mode) instead of returning 500. One-off repair: `bash deploy/scripts/fix_staging_cache_table.sh`. Tune limits via `PUBLIC_BOOKING_*_RATE` env vars.

## Deploy guards (staging / production)

Faulty code should be blocked **before** users see it:

| Layer | What it does |
|-------|----------------|
| **CI on every `staging` push** | `deploy-staging` calls reusable `ci.yml`: pytest (with `DatabaseCache` + `createcachetable`), frontend build + tests, Docker build |
| **Early API gate** | After backend deploy, `smoke_public_api.sh` checks health + `GET .../rooms/available/` **before** Static Web App upload |
| **Full smoke** | Login, catalog, dashboard, public booking again at end of workflow |
| **Entrypoint** | `createcachetable` must succeed or container startup fails (no silent `|| true`) |
| **Runtime** | Throttle cache errors → allow request + log (booking stays up; limits may be off briefly) |
| **Frontend** | HTML 500 pages are not shown raw to users |

**Recommended GitHub setting:** Branch protection on `staging` → require status checks `ci / backend`, `ci / frontend`, `ci / docker-backend` before merge (optional if you only push directly to `staging`; direct pushes still run CI via `workflow_call`).

**Before you push:** run locally — `cd backend && pytest` and `cd frontend && npm run test:run && npm run build`.

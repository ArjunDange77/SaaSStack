# SaaSStack deployment (local operator files)

**Runbooks in `deploy/docs/` are gitignored** — they stay on your machine only (subscription IDs, URLs, notes).

## First-time setup

1. Copy `deploy/.secrets/azure-account.local.env.example` → `deploy/.secrets/azure-account.local.env`
2. Set `AZURE_SUBSCRIPTION_ID`, `AZURE_LOCATION=centralindia`, `BUDGET_ALERT_EMAIL`  
   Optional overrides: `AZURE_APP_LOCATION=southindia`, `AZURE_SWA_LOCATION=eastasia` (defaults — cheapest layout when centralindia cannot host API/SWA)
3. `az login` then read **`deploy/docs/cost-guardrails.md`**
4. `./deploy/scripts/cost-guardrails-setup.sh`
5. `./deploy/scripts/provision-staging-india.sh` (PG Management)

**School Bus (separate RG):** see [`deploy/azure/PLANNING.md`](azure/PLANNING.md) and [`deploy/azure/RUNBOOK-schoolbus.md`](azure/RUNBOOK-schoolbus.md).

```bash
./deploy/scripts/provision-shared-network.sh
./deploy/scripts/provision-schoolbus-staging.sh
GITHUB_ENVIRONMENT=schoolbus-staging ./deploy/scripts/setup-github-oidc.sh
./deploy/scripts/sync-github-schoolbus-staging-secrets.sh
```

## Scripts (safe to commit — no secrets)

| Script | Purpose |
|--------|---------|
| `scripts/cost-guardrails-setup.sh` | Budget alerts before deploy |
| `scripts/provision-staging-india.sh` | PG Bicep + `rg-saasstack-staging` |
| `scripts/provision-shared-network.sh` | Shared VNet + NAT (`rg-saasstack-shared`) |
| `scripts/provision-schoolbus-staging.sh` | School Bus stack + secrets file |
| `scripts/provision-schoolbus-production.sh` | School Bus prod RG |
| `scripts/setup-github-oidc.sh` | GitHub federated login (set `GITHUB_ENVIRONMENT`) |
| `scripts/sync-github-staging-secrets.sh` | PG staging secrets → GitHub |
| `scripts/sync-github-schoolbus-staging-secrets.sh` | School Bus staging secrets |
| `scripts/smoke_schoolbus_staging.sh` | School Bus API smoke |
| `scripts/coexistence_smoke.sh` | PG + Bus URLs together |
| `scripts/stop-staging-india.sh` / `start-staging-india.sh` | Save money when idle |
| `scripts/teardown-staging-india.sh` | Delete entire staging RG |

Secrets output: `deploy/.secrets/` (gitignored).

Public booking rate limits use the Postgres `django_cache` table. `createcachetable` runs on staging/production container start. If the table is missing, throttles log a warning and allow traffic (degraded mode) instead of returning 500. One-off repair: `bash deploy/scripts/fix_staging_cache_table.sh`. Tune limits via `PUBLIC_BOOKING_*_RATE` env vars.

## Deploy guards (staging / production)

| Layer | What it does |
|-------|----------------|
| **CI** | pytest, frontend build+tests (+ dist artifact for deploy) |
| **Deploy** | Docker build+push to GHCR (GHA cache), then App Service + SWA |
| **Early API gate** | `wait_for_api.sh` + public rooms JSON **before** SWA upload (no fixed `sleep 90`) |
| **Full smoke** | Login, catalog, dashboard, public booking at end |
| **Entrypoint** | `createcachetable` must succeed or container startup fails |

**PG staging demo seed:** `deploy-pg-staging` runs `ensure_staging_demo_seed.sh` after the API is up. Manual re-seed: **Actions → Deploy PG Staging → Re-seed pg-demo**.

**School Bus:** `deploy-schoolbus-staging` deploys to App Service slot `staging`. Runs `ensure_staging_sb_demo_seed.sh` after API is up. Manual re-seed: **Actions → Deploy School Bus Staging → Re-seed sb-demo**.

**Staging smoke secrets:** operator login uses `SMOKE_USERNAME` / `SMOKE_PASSWORD` secrets. Resident login uses workflow defaults `resident` / `admin` (do not add empty `SMOKE_RESIDENT_*` GitHub secrets — they used to override defaults and caused `login ()` 400).

**Typical staging deploy time:** ~4–6 min (was ~9–10 min) — no per-push seed restart, no duplicate Docker/frontend builds.

**Before you push:** `bash scripts/test-all.sh` (or `cd backend && pytest` — coverage floor 70% is enforced in `pytest.ini`) and `cd frontend && npm run build`.

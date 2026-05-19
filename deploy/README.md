# SaaSStack deployment (local operator files)

**Runbooks in `deploy/docs/` are gitignored** — they stay on your machine only (subscription IDs, URLs, notes).

## First-time setup

1. Copy `deploy/.secrets/azure-account.local.env.example` → `deploy/.secrets/azure-account.local.env`
2. Set `AZURE_SUBSCRIPTION_ID`, `AZURE_LOCATION=centralindia`, `BUDGET_ALERT_EMAIL`  
   Optional overrides: `AZURE_APP_LOCATION=southindia`, `AZURE_SWA_LOCATION=eastasia` (defaults — cheapest layout when centralindia cannot host API/SWA)
3. `az login` then read **`deploy/docs/cost-guardrails.md`**
4. `./deploy/scripts/cost-guardrails-setup.sh`
5. `./deploy/scripts/provision-staging-india.sh` (unified staging: PG + School Bus)

**School Bus** uses the same stack (multi-tenant). See [`deploy/azure/PLANNING.md`](azure/PLANNING.md) and [`deploy/azure/RUNBOOK-schoolbus.md`](azure/RUNBOOK-schoolbus.md).

After unified staging is verified, remove old SB-only Azure RGs:

```bash
bash deploy/scripts/teardown-schoolbus-staging.sh
```

GitHub: use **Deploy Staging** workflow and the `staging` environment ([STAGING-SECRETS.md](azure/STAGING-SECRETS.md)).

## Scripts (safe to commit — no secrets)

| Script | Purpose |
|--------|---------|
| `scripts/cost-guardrails-setup.sh` | Budget alerts before deploy |
| `scripts/provision-staging-india.sh` | PG Bicep + `rg-saasstack-staging` |
| `scripts/teardown-schoolbus-staging.sh` | Delete retired SB/shared RGs after cutover |
| `scripts/smoke_unified_staging.sh` | PG + School Bus smoke on one API URL |
| `scripts/seed_goa_pilot_via_db.sh` | Goa pilot seed via Postgres from CI (primary) |
| `scripts/ensure_staging_goa_pilot_seed.sh` | Sparse-check + DB seed; optional API verify |
| `scripts/seed_staging_goa_pilot.sh` | **Fallback** — app-setting restart (slow) |
| `scripts/provision-schoolbus-staging.sh` | **Deprecated** — do not use for staging |
| `scripts/provision-schoolbus-production.sh` | School Bus prod RG (Phase 2, minimal) |
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

**Unified staging:** `deploy-staging` runs CI, deploys to `rg-saasstack-staging`, migrates, ensures pg-demo + Goa pilot seeds, runs `smoke_unified_staging.sh`. Manual re-seed: **Actions → Deploy Staging** → check seed_pg_demo / seed_goa_pilot.

**Staging smoke secrets:** operator login uses `SMOKE_USERNAME` / `SMOKE_PASSWORD` secrets. Resident login uses workflow defaults `resident` / `admin` (do not add empty `SMOKE_RESIDENT_*` GitHub secrets — they used to override defaults and caused `login ()` 400).

**Typical staging deploy time:** ~4–6 min (was ~9–10 min) — no per-push seed restart, no duplicate Docker/frontend builds.

**Before you push:** `bash scripts/test-all.sh` (or `cd backend && pytest` — coverage floor 70% is enforced in `pytest.ini`) and `cd frontend && npm run build`.

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

| Layer | What it does |
|-------|----------------|
| **CI** | pytest, frontend build+tests (+ dist artifact for deploy) |
| **Deploy** | Docker build+push to GHCR (GHA cache), then App Service + SWA |
| **Early API gate** | `wait_for_api.sh` + public rooms JSON **before** SWA upload (no fixed `sleep 90`) |
| **Full smoke** | Login, catalog, dashboard, public booking at end |
| **Entrypoint** | `createcachetable` must succeed or container startup fails |

**Staging demo seed:** deploy runs `ensure_staging_demo_seed.sh` after the API is up — if the public seatmap has fewer than 48 rooms, it triggers `seed_staging_demo.sh` automatically (~3–5 min one-time restart). Manual override: **Actions → Deploy Staging → Run workflow** with **Re-seed pg-demo** checked, or `bash deploy/scripts/seed_staging_demo.sh` locally with `az login`.

**Staging smoke secrets:** set `SMOKE_RESIDENT_USER` / `SMOKE_RESIDENT_PASSWORD` to `resident` / `admin` (or omit those secrets entirely so smoke defaults apply). Empty GitHub secrets override defaults and break resident login.

**Typical staging deploy time:** ~4–6 min (was ~9–10 min) — no per-push seed restart, no duplicate Docker/frontend builds.

**Before you push:** `cd backend && pytest` and `cd frontend && npm run test:run && npm run build`.

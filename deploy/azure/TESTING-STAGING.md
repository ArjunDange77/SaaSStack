# Unified staging test checklist

Run before `teardown-schoolbus-staging.sh`.

## Tier 1 — Local

```bash
bash scripts/test-all.sh
docker compose exec backend python manage.py seed_goa_pilot --reset
docker compose exec backend python manage.py seed_pg --demo
```

Login at `http://localhost:5173`: `kamlesh` / `admin` @ `sai-baba-school-bus`; PG operator @ `pg-demo`.

## Tier 2 — CI

Green **Deploy Staging** on GitHub (includes `ci.yml` with deploy script shellcheck + profile validation). Goa pilot data is seeded from the workflow via **Postgres** (`seed_goa_pilot_via_db.sh`) after migrate — not via app restart.

Force re-seed: **Actions → Deploy Staging → Run workflow** → check **seed_goa_pilot**.

Confirm in deploy job logs:

- **Verify frontend dist before SWA upload** — `OK: frontend dist ready`
- **Deploy frontend to Static Web Apps** — upload success
- **Smoke tests** — `OK: SWA HTTP 200` and `Unified staging smoke passed`

## Tier 2.5 — Pre-push (Azure CLI)

After `az login` and subscription set, validate the deploy target **before** pushing (same checks as the first step in Deploy Staging):

```bash
export AZURE_RESOURCE_GROUP=rg-saasstack-staging
export AZURE_WEBAPP_NAME=saasstack-staging-api
export DEPLOY_SLOT=
export DEPLOY_PROFILE=unified-staging
bash deploy/scripts/preflight_deploy_target.sh
```

Offline (no Azure): `python3 deploy/scripts/validate_deploy_profile.py --all-profiles`

## Tier 3 — API smoke

```bash
export STAGING_API_URL="https://saasstack-staging-api.azurewebsites.net"
export GOA_MIN_STUDENTS=15
bash deploy/scripts/smoke_unified_staging.sh
```

Includes SWA check at `https://saasstack-staging-web.azurestaticapps.net` (override with `SMOKE_SWA_URL`).

## Tier 4 — Manual UI

**URLs**

| Surface | URL |
|---------|-----|
| SWA | https://saasstack-staging-web.azurestaticapps.net |
| API | https://saasstack-staging-api.azurewebsites.net |

**If SWA shows Azure 404:** demo via local UI + staging API:

```bash
cd frontend && export VITE_API_BASE=https://saasstack-staging-api.azurewebsites.net && npm run dev
```

### School Bus (Goa pilot) — Acts 1–4 (~15 min)

| User | Tenant | Password | Check |
|------|--------|----------|-------|
| `kamlesh` | `sai-baba-school-bus` | `admin` | `/sb/dashboard` — Command center |
| `suresh` | `sai-baba-school-bus` | `admin` | `/sb/driver` — Today's trip (mobile width) |
| `priya` | `sai-baba-school-bus` | `admin` | `/sb/parent` — parent portal, IST times |

See [RUNBOOK-schoolbus.md](RUNBOOK-schoolbus.md) for demo narrative (fees, notifications, KPIs).

### PG (optional)

| User | Tenant | Password | Check |
|------|--------|----------|-------|
| PG operator | `pg-demo` | GitHub `staging` smoke secrets | PG dashboard |

## Tier 5 — Teardown unused RGs (cost savings)

**After** Tier 3 passes and demo is done. Deletes legacy stacks only:

- `rg-saasstack-sb-staging`
- `rg-saasstack-shared` (NAT)
- `rg-saasstack-sb-prod` (if exists)

**Keeps** `rg-saasstack-staging`.

```bash
az group list --query "[?starts_with(name,'rg-saasstack')].name" -o table
TEARDOWN_CONFIRM=delete-sb-stacks bash deploy/scripts/teardown-schoolbus-staging.sh
```

Re-run Tier 3; confirm old SB hostnames are gone. Check **Cost Management** for spend drop.

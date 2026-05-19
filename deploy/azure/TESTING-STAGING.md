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

Green **Deploy Staging** on GitHub (includes `ci.yml` with deploy script shellcheck + profile validation).

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
bash deploy/scripts/smoke_unified_staging.sh
```

## Tier 4 — Manual UI (SWA)

| User | Tenant | Password | Check |
|------|--------|----------|-------|
| PG operator | `pg-demo` | smoke secrets | PG dashboard |
| `kamlesh` | `sai-baba-school-bus` | `admin` | `/sb/dashboard` |
| `suresh` | `sai-baba-school-bus` | `admin` | `/sb/driver` |
| `priya` | `sai-baba-school-bus` | `admin` | `/sb/parent` IST times |

## Tier 5 — After teardown

Re-run Tier 3; confirm old SB hostnames are gone.

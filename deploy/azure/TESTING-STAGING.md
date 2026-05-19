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

Green **Deploy Staging** on GitHub (includes `ci.yml`).

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

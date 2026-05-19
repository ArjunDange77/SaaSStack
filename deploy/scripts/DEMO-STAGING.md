# Staging client demo — quick reference

**Deploy SHA (latest green run):** `cb976d20c81988d258f219074429e24d8271e241`

## URLs

| Surface | URL | Status (verify before demo) |
|---------|-----|-----------------------------|
| API | https://saasstack-staging-api.azurewebsites.net | Health 200, Goa 15 students |
| SWA (unified) | https://saasstack-staging-web.azurestaticapps.net | Must show login, not Azure 404 |

Update GitHub `staging` secret `SMOKE_SWA_URL` to the **unified** SWA URL (not `saasstack-sb-staging-web-staging.azurewebsites.net`).

## Demo option A — SWA (after redeploy)

1. Open unified SWA URL → login **kamlesh** / **admin**, tenant **sai-baba-school-bus**
2. Acts 1–4 in [RUNBOOK-schoolbus.md](azure/RUNBOOK-schoolbus.md)

## Demo option B — Local UI + staging API (works today)

```bash
cd frontend
export VITE_API_BASE=https://saasstack-staging-api.azurewebsites.net
npm run dev
```

Open http://localhost:5173 — same Acts 1–4; data from Azure Postgres.

## Verify before demo

```bash
export STAGING_API_URL=https://saasstack-staging-api.azurewebsites.net
export GOA_MIN_STUDENTS=15
bash deploy/scripts/smoke_unified_staging.sh
```

## Teardown (after SWA + demo)

```bash
TEARDOWN_CONFIRM=delete-sb-stacks bash deploy/scripts/teardown-schoolbus-staging.sh
```

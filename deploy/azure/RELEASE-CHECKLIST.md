# Multi-product release checklist

## Before merge to `staging`

- [ ] `cd backend && pytest` green
- [ ] `cd frontend && npm run test:run && npm run build` green
- [ ] Path filters: only intended product workflow will auto-run

## After School Bus deploy

- [ ] `curl -f $STAGING_API_URL/api/health/`
- [ ] `bash deploy/scripts/smoke_schoolbus_staging.sh`
- [ ] PG unchanged: `bash deploy/scripts/smoke_public_api.sh` against PG URL
- [ ] Morning-ops demo (staging or local `sb-demo`): operator dashboard → driver trip flow → parent portal (see `RUNBOOK-schoolbus.md`)

## Coexistence (Phase 7)

```bash
export STAGING_API_URL=https://saasstack-staging-api.azurewebsites.net
export SB_STAGING_API_URL=https://saasstack-sb-staging-api.azurewebsites.net
bash deploy/scripts/coexistence_smoke.sh
```

## Production School Bus

- [ ] GitHub environment `schoolbus-production` has required reviewers
- [ ] Slot smoke passed before swap
- [ ] 30 min monitor App Insights after swap

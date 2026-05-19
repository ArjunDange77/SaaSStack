# School Bus release runbook

## Staging deploy

1. Merge to `staging` with paths under `school_bus/` **or** run **Deploy School Bus Staging** (`workflow_dispatch`).
2. Workflow deploys backend + frontend to App Service **slot `staging`**.
3. Verify: `https://<api-app>-staging.azurewebsites.net/api/health/`
4. Run `bash deploy/scripts/smoke_schoolbus_staging.sh` locally if needed.

## Production promotion (slot swap)

1. Merge to `main` (School Bus paths) or dispatch **Deploy School Bus Production**.
2. Pipeline deploys to **staging** slots, runs smoke on slot URLs, then:
   - `az webapp deployment slot swap` for API and frontend.
3. Confirm `PRODUCTION_API_URL/api/health/`.

## Rollback

1. **Fast:** Re-run production workflow swap (swap again) — previous bits return on production slot.
2. **App-only:** Redeploy prior GHCR image tag to staging slot, then swap.
3. **Database:** `az postgres flexible-server restore` to PITR before bad migration.

## Kernel-only changes

No auto-deploy. Manually run **Deploy PG Staging** and/or **Deploy School Bus Staging** after CI passes on PR.

## Infra changes

```bash
./deploy/scripts/provision-shared-network.sh
./deploy/scripts/provision-schoolbus-staging.sh
GITHUB_ENVIRONMENT=schoolbus-staging ./deploy/scripts/setup-github-oidc.sh
./deploy/scripts/sync-github-schoolbus-staging-secrets.sh
```

## Monitoring

- Application Insights: `saasstack-sb-staging-insights` in product RG.
- Optional metric alerts: enable `actionGroupId` in Bicep `alerts` module when action group exists.

## Local demo (`sb-demo`)

After `python manage.py seed_school_bus` (tenant slug `sb-demo`, password `admin` for all):

| User | Role | UI |
|------|------|-----|
| `sb-operator` | Owner | `/sb/dashboard` — KPIs, fees, incidents |
| `sb-driver` | Staff + driver profile | `/sb/driver` — start trip, mark pickup, complete |
| `sb-parent` | Parent | `/sb/parent` — children, attendance, fee alerts |

**Morning-ops walkthrough:** Operator opens command center → Driver starts today’s trip and marks pickup at each stop → optional incident → complete trip → Parent refreshes portal for attendance and reminders.

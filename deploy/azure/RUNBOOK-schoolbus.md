# School Bus release runbook

## Staging deploy

### GitHub OIDC (required once)

The `schoolbus-staging` environment must have `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and `AZURE_SUBSCRIPTION_ID`. If **Azure login** fails with “Not all values are present”, run locally:

```bash
# After rg-saasstack-sb-staging exists:
GITHUB_ENVIRONMENT=schoolbus-staging AZURE_RESOURCE_GROUP=rg-saasstack-sb-staging \
  bash deploy/scripts/setup-github-oidc.sh
bash deploy/scripts/sync-github-schoolbus-staging-secrets.sh
```

App Service VNet integration must use the **same region** as the shared VNet (`centralindia`). Do not set `AZURE_APP_LOCATION=southindia` for School Bus unless the shared VNet is also in that region.

1. Merge to `staging` with paths under `school_bus/` **or** run **Deploy School Bus Staging** (`workflow_dispatch`).
2. Workflow deploys backend + frontend to App Service **slot `staging`**.
3. Open the **staging slot** frontend (not the production hostname): `https://<web-app>-staging.azurewebsites.net`
4. Verify API: `https://<api-app>-staging.azurewebsites.net/api/health/`
5. If you see **Welcome to nginx!**, the zip is on `wwwroot` but the container was not configured — run `bash deploy/scripts/fix_schoolbus_frontend_nginx.sh` and redeploy the frontend zip (workflow includes `deploy/nginx/app-service-startup.sh`).
6. Run `bash deploy/scripts/smoke_schoolbus_staging.sh` locally if needed.

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

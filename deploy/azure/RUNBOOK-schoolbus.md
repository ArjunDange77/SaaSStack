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

## Goa pilot client demo (`goa-bus`) — 15 minutes

**Setup (staging):** from repo root, with `az login` and School Bus API deployed to the **staging** slot:

```bash
# From repo root (Mac/Linux), after az login
export DEPLOY_SLOT=staging   # optional; defaults to staging
bash deploy/scripts/seed_staging_goa_pilot.sh
```

Sets `SEED_GOA_PILOT_STAGING=true`, restarts the **API staging slot**, runs `seed_goa_pilot --reset` on boot, then verifies **kamlesh** @ **goa-bus** (≥15 students).

**Requires:** deploy the latest API to staging first (includes `seed_goa_pilot` and `entrypoint.sh` hook). Push/merge to `staging` and wait for **Deploy School Bus Staging** to finish, then run the script.

**Manual fallback:** Portal → `saasstack-sb-staging-api` → **SSH** (staging slot) → `python manage.py migrate --noinput && python manage.py seed_goa_pilot --reset`

**Setup (local Docker):**

```bash
docker compose up -d db redis backend
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py seed_goa_pilot --reset
```

Tenant slug **`goa-bus`**. Three browser tabs: operator (desktop), driver (narrow/mobile), parent.

| User | Password | Role |
|------|----------|------|
| `kamlesh` | `admin` | Operator (owner) |
| `suresh` | `admin` | Driver |
| `priya` | `admin` | Parent (Rahul Naik) |

### Act 1 — Operator morning briefing (3 min)

1. Sign in as **kamlesh**, tenant **goa-bus**.
2. Open **Command center** (`/sb/dashboard`): morning greeting, green/amber/red banner, trip progress cards, action items (overdue fees, absent students, today’s incidents).
3. Open **Fees** (`/sb/fees`): overdue → due this month → paid; use **Send reminder** (opens WhatsApp).
4. Mention yesterday’s seeded incident in the briefing list.

### Act 2 — Driver stop-by-stop (4 min)

1. Sign in as **suresh** on a phone-sized window → **Today's trip**.
2. **Start trip** → stop-by-stop attendance: mark PRESENT/ABSENT (48px), optional absent reason.
3. **Next stop** through the route; **Complete trip** (success state).
4. Operator opens **Notifications** (`/sb/notifications`): pickup message logged; **Open WhatsApp** for wa.me link.

### Act 3 — Parent portal (4 min)

1. Sign in as **priya** → `/sb/parent`.
2. **Child status hero** (on bus / en route / absent).
3. **Attendance calendar** (month dots); **Alerts** drawer (not a wall of banners).
4. Fee card at bottom (paid / unpaid).

### Act 4 — Trends & close (4 min)

1. Back to **kamlesh**: 3-month seed KPIs (~₹1.25L collected, ~₹37.5K outstanding April, 6 incidents).
2. Collection % on fees page; “live tracking coming soon” on parent map placeholder.

## Local demo (`sb-demo`)

After `python manage.py seed_school_bus` (tenant slug `sb-demo`, password `admin` for all):

| User | Role | UI |
|------|------|-----|
| `sb-operator` | Owner | `/sb/dashboard` — KPIs, fees, incidents |
| `sb-driver` | Staff + driver profile | `/sb/driver` — start trip, mark pickup, complete |
| `sb-parent` | Parent | `/sb/parent` — children, attendance, fee alerts |

**Morning-ops walkthrough:** Operator opens command center → Driver starts today’s trip and marks pickup/drop at each stop → optional incident → complete trip → Parent refreshes portal for attendance and reminders.

### Local verification

```bash
docker compose up -d db backend
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py seed_kernel
docker compose exec backend python manage.py seed_school_bus
bash deploy/scripts/verify_sb_local_logins.sh
cd frontend && npm run dev   # http://localhost:5173
```

### Client staging URLs

| Service | URL |
|---------|-----|
| Frontend (slot) | https://saasstack-sb-staging-web-staging.azurewebsites.net |
| API (slot) | https://saasstack-sb-staging-api-staging.azurewebsites.net |

Logins: `sb-operator`, `sb-driver`, `sb-parent` — password `admin`, tenant `sb-demo`.

**V1 out of scope:** payment gateway, WhatsApp/SMS, live GPS, PDF reporting.

**Ops:** `python manage.py generate_monthly_fees --tenant sb-demo` for monthly fee rows.

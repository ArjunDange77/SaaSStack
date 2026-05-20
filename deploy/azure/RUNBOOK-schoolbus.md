# School Bus release runbook

## Staging deploy (unified with PG)

School Bus staging uses **`rg-saasstack-staging`** (same API/DB/frontend as PG Management). Tenants: `pg-demo`, `sai-baba-school-bus`.

| Item | Value |
|------|--------|
| API | `https://saasstack-staging-api.azurewebsites.net` |
| Frontend | Static Web App (`saasstack-staging-web`) |
| GitHub workflow | **Deploy Staging** (`.github/workflows/deploy-staging.yml`) |
| GitHub environment | `staging` |

### GitHub OIDC (required once)

```bash
GITHUB_ENVIRONMENT=staging AZURE_RESOURCE_GROUP=rg-saasstack-staging \
  bash deploy/scripts/setup-github-oidc.sh
bash deploy/scripts/sync-github-staging-secrets.sh
```

See [STAGING-SECRETS.md](STAGING-SECRETS.md).

1. Push to **`staging`** (auto deploy) **or** run **Deploy Staging** manually (`workflow_dispatch`). Merges to **`main`** do not deploy.
2. Workflow deploys API (GHCR image) + SWA frontend; runs migrations; ensures pg-demo + Goa pilot seeds.
3. Verify API: `https://saasstack-staging-api.azurewebsites.net/api/health/`
4. Run `bash deploy/scripts/smoke_unified_staging.sh` locally if needed.

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

## Goa pilot client demo (`sai-baba-school-bus`) — 15 minutes

**Setup (staging):** **Deploy Staging** seeds via Postgres from CI (`seed_goa_pilot_via_db.sh`) — no app restart. Verify **kamlesh** @ **sai-baba-school-bus** (≥15 students) in final smoke.

**Manual re-seed (database, preferred):** same env as migrate secrets:

```bash
cd backend
export DJANGO_SETTINGS_MODULE=config.settings.staging
# POSTGRES_* / DB_HOST from GitHub staging secrets or deploy/.secrets
python manage.py seed_kernel
python manage.py seed_goa_pilot --reset
```

**Fallback (slow — restarts API, blocks health):** `bash deploy/scripts/seed_staging_goa_pilot.sh` sets `SEED_GOA_PILOT_STAGING=true` on the web app.

**SSH fallback:** Portal → `saasstack-staging-api` → **SSH** → `python manage.py migrate --noinput && python manage.py seed_goa_pilot --reset`

**Daily trips (weekdays):** `python manage.py generate_today_trips` (or `--tenant=sai-baba-school-bus`)

**Setup (local Docker):**

```bash
docker compose up -d db redis backend
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py seed_goa_pilot --reset
```

Tenant slug **`sai-baba-school-bus`**. Three browser tabs: operator (desktop), driver (narrow/mobile), parent.

| User | Password | Role |
|------|----------|------|
| `kamlesh` | `admin` | Operator (owner) |
| `suresh` | `admin` | Driver |
| `priya` | `admin` | Parent (Rahul Naik) |

### Act 1 — Operator morning briefing (3 min)

1. Sign in as **kamlesh**, tenant **sai-baba-school-bus**.
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

**V1 out of scope:** payment gateway, WhatsApp/SMS, PDF reporting.

**Live GPS (staging V1):** driver shares location on HTTPS (~20s updates); operator **Live fleet** and parent map read `last_location`. Requires browser location permission. Driver must keep the **trip page open** with sharing on; locking the phone or backgrounding the browser pauses GPS (mobile web limitation). Native app or bus hardware needed for tracking with screen off.

**Ops:** `python manage.py generate_monthly_fees --tenant sb-demo` for monthly fee rows.

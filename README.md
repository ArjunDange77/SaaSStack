# SaaSStack

**SaaS operating system** — a metadata-driven, multi-tenant platform kernel for generating SaaS applications rapidly.

## Philosophy

Build the engine once, then generate unlimited SaaS products on top of it.

**Workflow:** create Django model → register resource → migrate → working SaaS screens (API + metadata + React renderer).

## Stack

- **Backend:** Django, DRF, PostgreSQL, JWT
- **Frontend:** React, TypeScript, Vite, React Router, TanStack Query

## Quick start (Docker)

```bash
cp .env.example .env   # if present; otherwise set POSTGRES_* in .env
docker compose up --build
```

- API: http://localhost:8000  
- Admin: http://localhost:8000/admin  
- Frontend (local): `cd frontend && npm install && npm run dev` → http://localhost:5173  

After first boot, the entrypoint runs migrations and `seed_kernel` (demo tenant + nav).

If you see `relation "registry_activitylog" does not exist` when creating records, apply pending migrations:

```bash
docker compose exec backend python manage.py migrate
```

### API headers

- `Authorization: Bearer <access_token>` (from `POST /api/auth/login/`)
- `X-Tenant: demo` (tenant slug for scoped resources)

## Kernel APIs

| Endpoint | Purpose |
|----------|---------|
| `GET /api/meta/catalog/` | Registered resource slugs |
| `GET /api/meta/schema/<slug>/` | Schema authority for React engine |
| `GET/POST /api/meta/resources/<slug>/` | Generic CRUD list/create |
| `GET/PATCH/DELETE /api/meta/resources/<slug>/<id>/` | Generic CRUD detail |
| `GET /api/cosmetix/nav-items/` | API-driven navigation |
| `GET /api/cosmetix/branding/resolve/` | Branding (global + tenant override) |

## Register a new resource

1. Create a model (use `tenant` FK for tenant-scoped data).
2. Add `ModelSerializer` + `KernelModelViewSet` subclass with `resource_slug`.
3. Call `register_resource("my-things", MyThingViewSet, title="My things")` in `resource_registration.py` (see `apps/demo`).
4. `makemigrations` / `migrate`.
5. Add a `NavBarItem` row in Django admin (optional).
6. Open `/r/my-things` in the React app.

## Frontend routes

- `/` — home + resource catalog  
- `/dashboard` — PG Management dashboard (V1 vertical)  
- `/r/:slug` — dynamic list (search + pagination)  
- `/r/:slug/:id` — dynamic detail + `@action` buttons + activity timeline  

## PG Management (V1)

```bash
python manage.py seed_pg
```

See `backend/apps/products/pg_management/README.md`. Use `X-Tenant: pg-demo` after seeding.

## Project layout

- `docs/` — **local documentation** (gitignored; contracts, pilot notes, demo scripts)
- `backend/apps/registry/` — registry, metadata engine, kernel base ViewSet  
- `backend/apps/demo/` — validation resource (`demo-items`)  
- `backend/apps/cosmetix/` — shell (branding, nav)  
- `frontend/src/components/engine/` — generic React renderer  

## Contracts and versioning

All kernel payloads include `schema_version` (currently **`1.0`**). See `docs/contracts/README.md` locally before changing APIs or UI behavior.

## Responsive UI (mobile-first)

Most operators use phones. The app uses a **hamburger drawer** below 768px, **card lists** on mobile (tables on desktop), bottom-sheet modals, and thumb-friendly toasts.

Before shipping UI changes, check **375px**, **768px**, and **1280px** in browser DevTools. See [`.cursor/rules/responsive-ui.mdc`](.cursor/rules/responsive-ui.mdc) for agent/author guidelines.

## Testing (TDD baseline)

**Contracts are the spec; tests prove the code matches.** New work is not done until touched behavior has a regression test. See [`.cursor/rules/testing.mdc`](.cursor/rules/testing.mdc) for the full policy.

```bash
# Backend (70% line coverage floor on apps/)
cd backend
pip install -r requirements-dev.txt
pytest --cov-fail-under=70

# Frontend (40% line coverage floor)
cd frontend
npm install
npm run test:coverage

# Both (from repo root)
bash scripts/test-all.sh
```

**Definition of done:** backend change → pytest in the owning app; frontend change → vitest for changed components/hooks; login/portal/booking flows → extend `deploy/scripts/smoke_test.py` or API integration tests. CI fails if coverage drops below configured floors.

### Kernel validation checklist (automated)

Green `pytest --cov-fail-under=70` + `npm run test:coverage` means:

- [ ] `schema_version` present on catalog and resource metadata  
- [ ] Registered resource appears in `/api/meta/catalog/`  
- [ ] `/api/meta/schema/<slug>/` exposes fields, list_display, actions  
- [ ] Tenant-scoped CRUD respects `X-Tenant` (fail closed without tenant)  
- [ ] `@action` endpoints (e.g. `archive`) work via metadata  
- [ ] `seed_kernel` creates demo tenant + nav + branding  
- [ ] React engine renders field types per `docs/contracts/rendering-expectations.md` (local)

### TDD workflow for a new resource

1. Update `docs/contracts/` locally if the contract changes.  
2. Copy `backend/apps/demo/tests/` patterns; add tests for your slug.  
3. Red → implement model + `register_resource` → migrate → green.  
4. Add optional `NavBarItem` in admin; verify `/r/<slug>` in the app.

## Deployment (Azure + CI/CD)

| Branch | CI | Deploy |
|--------|-----|--------|
| `feature/*` | lint, test, build | never |
| `staging` | on PR + path-filtered push | **PG** → `deploy-pg-staging.yml` · **School Bus** → `deploy-schoolbus-staging.yml` |
| `main` | on PR + path-filtered push | **PG** → `deploy-pg-production.yml` · **School Bus** → `deploy-schoolbus-production.yml` (slot swap) |

Kernel-only merges do not auto-deploy; use `workflow_dispatch` on the product workflow you need.

- Health: `GET /api/health/` (version, environment, DB/storage checks)
- **Azure staging (India):** operator guides live in `deploy/docs/` (**local only**, gitignored — not on GitHub). Start with `deploy/docs/india-staging-deploy.md` after copying `deploy/.secrets/azure-account.local.env.example` → `azure-account.local.env`.
- Scripts: `deploy/scripts/provision-staging-india.sh`, `deploy/scripts/cost-guardrails-setup.sh`
- Compose: `docker-compose.dev.yml` (dev), `docker-compose.prod.yml` (prod-like)
- Settings: `DJANGO_SETTINGS_MODULE=config.settings.local|staging|production`

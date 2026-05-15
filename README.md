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
- `/r/:slug` — dynamic list  
- `/r/:slug/:id` — dynamic detail + `@action` buttons from metadata  

## Project layout

- `docs/contracts/` — **platform contracts** (metadata, fields, actions, tenant rules, rendering)
- `backend/apps/registry/` — registry, metadata engine, kernel base ViewSet  
- `backend/apps/demo/` — validation resource (`demo-items`)  
- `backend/apps/cosmetix/` — shell (branding, nav)  
- `frontend/src/components/engine/` — generic React renderer  

## Contracts and versioning

All kernel payloads include `schema_version` (currently **`1.0`**). See [docs/contracts/README.md](docs/contracts/README.md) before changing APIs or UI behavior.

## Testing (TDD baseline)

**Contracts are the spec; tests prove the code matches.**

```bash
# Backend (SQLite in-memory for tests)
cd backend
pip install -r requirements-dev.txt
pytest

# Frontend
cd frontend
npm install
npm run test:run
```

### Kernel validation checklist (automated)

Green `pytest` + `npm run test:run` means:

- [ ] `schema_version` present on catalog and resource metadata  
- [ ] Registered resource appears in `/api/meta/catalog/`  
- [ ] `/api/meta/schema/<slug>/` exposes fields, list_display, actions  
- [ ] Tenant-scoped CRUD respects `X-Tenant` (fail closed without tenant)  
- [ ] `@action` endpoints (e.g. `archive`) work via metadata  
- [ ] `seed_kernel` creates demo tenant + nav + branding  
- [ ] React engine renders field types per [rendering-expectations.md](docs/contracts/rendering-expectations.md)  

### TDD workflow for a new resource

1. Update [docs/contracts/](docs/contracts/) if the contract changes.  
2. Copy `backend/apps/demo/tests/` patterns; add tests for your slug.  
3. Red → implement model + `register_resource` → migrate → green.  
4. Add optional `NavBarItem` in admin; verify `/r/<slug>` in the app.  

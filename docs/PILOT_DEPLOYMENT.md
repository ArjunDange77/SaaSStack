# PG Management — Pilot deployment guide

Deploy for **one real PG property** (~10 residents) to validate workflows before building more kernel features.

## Minimal stack

1. **VPS or Railway** with Docker
2. **Postgres** (managed or container)
3. **Backend** — Django on port 8000
4. **Frontend** — `npm run build` served by nginx or Vite preview behind reverse proxy
5. **Persistent volume** for `MEDIA_ROOT` (document uploads)

## Steps

```bash
# On server
git clone <repo> && cd SaaSStack
cp .env.example .env   # set POSTGRES_*, DJANGO_SECRET_KEY, superuser vars

docker compose up -d db
docker compose up -d backend

cd frontend && npm ci && npm run build
# Serve frontend/dist via nginx → proxy /api to backend:8000
```

## Seed real data

```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py seed_pg --username admin --password <strong>
# Add real rooms/residents via UI or import script
```

Login: tenant **`pg-demo`**, user from seed.

## 2-week observation log

Track in [`backend/apps/products/pg_management/README.md`](../backend/apps/products/pg_management/README.md) under **Pilot findings**:

| Date | Issue | Kernel vs product |
|------|--------|-------------------|
| | | |

**Success metrics:**

- Bed assign/vacate without wrong occupancy
- Rent marked paid weekly
- Documents uploaded per resident
- Complaints resolved with timeline visible

## Classify feedback

- **Kernel** — relation labels, file UX, pagination, permissions, activity
- **Product** — rent schedules, notifications, police register, per-bed inventory

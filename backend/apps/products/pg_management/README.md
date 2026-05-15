# PG Management (V1)

First vertical on the SaaSStack kernel: paying-guest (PG) property operations.

## Resources

| Slug | Model | Notes |
|------|-------|-------|
| `pg-residents` | Resident | Soft delete, onboarding/active badges |
| `pg-rooms` | Room | Occupancy counters |
| `pg-bed-assignments` | BedAssignment | `vacate` action updates room occupancy |
| `pg-documents` | Document | File upload, `verify` action |
| `pg-rent-records` | RentRecord | `mark-paid` action |
| `pg-complaints` | Complaint | `resolve` action |

## APIs

- CRUD via kernel: `/api/meta/resources/<slug>/`
- Dashboard: `GET /api/pg/dashboard/` (requires `X-Tenant` + tenant membership)
- Activity timeline: `GET /api/meta/resources/<slug>/<id>/timeline/`

## Seed

```bash
python manage.py seed_pg --username admin --password admin
```

Creates tenant `pg-demo`, owner membership, and tenant-scoped nav (including `/dashboard`).

## Frontend

- `/dashboard` — PG stats overview
- `/r/pg-residents` etc. — metadata-driven CRUD

Use header `X-Tenant: pg-demo` with a user that has `TenantMembership`.

## Pilot findings

Use this section during real-property pilot (see [docs/PILOT_DEPLOYMENT.md](../../../docs/PILOT_DEPLOYMENT.md)):

| Date | Observation | Kernel vs product |
|------|-------------|-------------------|
| | | |

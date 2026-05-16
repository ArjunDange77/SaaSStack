# PG Management (V1)

First vertical on the SaaSStack kernel: paying-guest (PG) property operations.

## Model convention

All PG domain models inherit **`TenantDomainModel`** (`apps.registry.models`): tenant FK, `created_at` / `updated_at`, `created_by` / `updated_by`, `is_active`, and `deleted_at` (soft delete). Engine list/detail querysets exclude deleted rows; services use `Model.objects.alive()`.

## Resources

| Slug | Model | Notes |
|------|-------|-------|
| `pg-residents` | Resident | Soft delete, onboarding/active badges |
| `pg-rooms` | Room | Occupancy display `current/limit` |
| `pg-bed-assignments` | BedAssignment | `vacate` / `transfer` actions |
| `pg-documents` | Document | File upload, `verify` / `reject` |
| `pg-rent-records` | RentRecord | Filters: unpaid, overdue; `mark-paid` |
| `pg-complaints` | Complaint | Filters: open, in progress; `resolve` |

## APIs

- CRUD via kernel: `/api/meta/resources/<slug>/`
- Dashboard: `GET /api/pg/dashboard/` (requires `X-Tenant` + tenant membership)
- Activity timeline: `GET /api/meta/resources/<slug>/<id>/timeline/`

## Seed

```bash
python manage.py seed_pg --username admin --password admin
python manage.py seed_pg --demo   # full demo dataset on pg-demo
```

Creates tenant `pg-demo`, owner membership, nav (including `/dashboard`), sample rooms/residents, overdue rent, and an open complaint.

## Frontend

- `/dashboard` — operational KPIs with deep links to filtered lists
- `/r/pg-residents` etc. — metadata-driven CRUD with filter chips and toasts

Use header `X-Tenant: pg-demo` with a user that has `TenantMembership`.

## Operator guide (daily loop)

1. **Sign in** — tenant slug `pg-demo` (or your property slug).
2. **Dashboard** — check occupancy, overdue rent, open complaints.
3. **Residents** — add new resident; note onboarding vs active status.
4. **Assignments** — assign room; use **Vacate** when they leave.
5. **Documents** — upload ID; **Verify** when checked.
6. **Rent** — use **Unpaid** / **Overdue** filters; **Mark paid** when collected.
7. **Complaints** — filter **Open**; **Mark in progress** → **Resolve**.

## Local docs (not in git)

Pilot log, deployment checklist, and demo script live under repo `docs/` (gitignored): `pilot-findings.md`, `PILOT_DEPLOYMENT.md`, `pg-demo-script.md`, `pg-overview.md`.

# SaaSStack platform contracts

**Contracts ARE the platform.** Backend metadata APIs and the React rendering engine must conform to these documents. Tests and fixtures in the repo are derived from here.

## Documents

| Contract | File | Governs |
|----------|------|---------|
| Resource metadata | [metadata-schema.md](metadata-schema.md) | `GET /api/meta/schema/<slug>/` |
| Fields | [field-schema.md](field-schema.md) | Items in `fields[]` |
| Actions | [action-schema.md](action-schema.md) | Items in `actions[]` |
| Tenancy | [tenant-rules.md](tenant-rules.md) | `X-Tenant`, queryset rules |
| UI engine | [rendering-expectations.md](rendering-expectations.md) | React behavior per contract |

## Contract versioning

Every resource metadata payload includes:

```json
{ "schema_version": "1.0" }
```

### Version format

`MAJOR.MINOR` (e.g. `1.0`, `1.1`, `2.0`).

### Bump policy

| Change | Version bump |
|--------|----------------|
| Add optional top-level or field property | Minor (`1.0` → `1.1`) |
| Add new `field.type` the UI must render | Minor + update [rendering-expectations.md](rendering-expectations.md) |
| Add optional action property | Minor + update [action-schema.md](action-schema.md) |
| Remove/rename required key | **Major** (`2.0`) |
| Change meaning of `field.type` or action HTTP semantics | **Major** |

### Consumer rules

- **Backend:** `REGISTRY_SCHEMA_VERSION` in `apps/registry/` must match docs.
- **Frontend:** Reject or warn when `schema_version` major ≠ supported major (currently `1`).

## Workflow (TDD)

1. Update the relevant contract doc + example JSON.
2. Update fixtures under `backend/tests/fixtures/` and `frontend/src/test/fixtures/`.
3. Write failing tests.
4. Implement until green.

## Catalog contract

`GET /api/meta/catalog/` returns an array of:

```json
{
  "slug": "demo-items",
  "title": "Demo catalog",
  "description": "Kernel validation resource",
  "schema_version": "1.0"
}
```

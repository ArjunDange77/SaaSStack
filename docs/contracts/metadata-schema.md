# Resource metadata schema contract (v1.0)

**Endpoint:** `GET /api/meta/schema/<slug>/`  
**Auth:** Required (JWT Bearer)  
**Tenant:** `X-Tenant` header affects tenant-scoped resources (see [tenant-rules.md](tenant-rules.md))

## Purpose

Single source of truth for the React rendering engine: forms, tables, search, ordering, and custom actions.

## Top-level shape

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `schema_version` | string | yes | Contract version, currently `"1.0"` |
| `resource` | string | yes | Registered slug |
| `title` | string | yes | Display title |
| `description` | string | no | Optional subtitle |
| `fields` | array | yes | [Field objects](field-schema.md) |
| `list_display` | string[] | yes | Table column field names |
| `search` | object | yes | `{ "fields": string[] }` |
| `filters` | object | yes | `{ "backends": string[] }` DRF filter class names |
| `ordering` | object | yes | `{ "default": string[] }` |
| `actions` | array | yes | [Action objects](action-schema.md) |
| `list_path` | string | yes | CRUD list URL path |
| `detail_path_template` | string | yes | Detail URL template with `{id}` |

## Path conventions (v1.0)

- `list_path`: `/api/meta/resources/<slug>/`
- `detail_path_template`: `/api/meta/resources/<slug>/{id}/`

## Example (demo-items)

See [fixtures/metadata_demo_items_v1.json](../../backend/tests/fixtures/metadata_demo_items_v1.json) for the canonical v1.0 payload used in tests.

## Errors

| Status | Body | When |
|--------|------|------|
| 404 | `{ "detail": "unknown_resource" }` | Slug not registered |
| 401 | DRF default | Missing/invalid JWT |

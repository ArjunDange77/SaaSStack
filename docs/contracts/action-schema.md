# Action schema contract (v1.0)

Describes each object in the `actions` array of [metadata-schema.md](metadata-schema.md). Actions map to DRF `@action` endpoints on the resource ViewSet.

## Required properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Python method name (e.g. `archive`) |
| `url_path` | string | URL segment (e.g. `archive`) |
| `detail` | boolean | `true` = per-row (`.../<id>/archive/`); `false` = collection |
| `methods` | string[] | HTTP verbs (lowercase), e.g. `["post"]` |

## URL construction

Base: `/api/meta/resources/<slug>/`

| `detail` | Pattern |
|----------|---------|
| `true` | `POST /api/meta/resources/<slug>/<id>/<url_path>/` |
| `false` | `POST /api/meta/resources/<slug>/<url_path>/` |

The React engine uses `methods[0]` by default for the request verb.

## Example (detail action)

```json
{
  "name": "archive",
  "url_path": "archive",
  "detail": true,
  "methods": ["post"]
}
```

## UI placement (see rendering-expectations)

- `detail: true` → show on resource detail view for a single record.
- `detail: false` → show on list view (toolbar).

## Non-breaking changes (v1.x)

- Add optional metadata (e.g. `label`, `confirm_message`) if documented and optional.

## Breaking changes (v2.0)

- Change URL pattern or required HTTP method semantics.

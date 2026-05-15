# Rendering expectations contract (v1.0)

The React engine **must** behave as follows when `schema_version` major is `1`. Custom entity-specific pages are out of scope unless metadata cannot express the UI.

## Routes

| Route | Component | Data |
|-------|-----------|------|
| `/` | Home | `GET /api/meta/catalog/` |
| `/r/:slug` | ResourceList | schema + list |
| `/r/:slug/:id` | ResourceDetail | schema + detail |
| `/login` | Login | JWT + tenant slug stored |

## Schema version handling

- If `schema_version` is missing → treat as error in dev; tests fail.
- If major version ≠ `1` → log warning; may refuse to render forms (implementation: console warn).

## Field rendering (`DynamicFieldRenderer`)

| `type` | Control |
|--------|---------|
| `string` | `<input type="text">` |
| `text` | `<textarea>` |
| `integer` | `<input type="number" step="1">` |
| `decimal` | `<input type="number" step="0.01">` |
| `boolean` | checkbox |
| `choice` | `<select>` with empty option + `choices` |
| `date` | `<input type="date">` (Phase 1 baseline) |
| `datetime` | `<input type="datetime-local">` (Phase 1 baseline) |
| `relation` | read-only text or id display (Phase 1) |

`read_only: true` → display text, no input on forms.

## Forms (`ResourceForm`)

- Include fields where `read_only === false` and `name !== "tenant"`.
- Submit via `POST` (create) or `PATCH` (edit) to `/api/meta/resources/<slug>/`.

## Tables (`DynamicTable`)

- Columns from `list_display`.
- Row click navigates to `/r/<slug>/<id>`.

## Actions (`DynamicActionRenderer`)

- Filter `actions` by `detail` matching current view (list vs detail).
- Call `/api/meta/resources/<slug>/[<id>/]<url_path>/` using `methods[0]`.
- Invalidate list/detail queries after success.

## Shell (`NavBar`)

- Load `GET /api/cosmetix/nav-items/`.
- If `resource_slug` set → link to `/r/<resource_slug>`.
- Else use `href`; external URLs or `open_in_new_tab` → `<a target="_blank">`.
- `icon` → icon registry with fallback.

## Branding

- `GET /api/cosmetix/branding/resolve/` → apply `css_vars` to `document.documentElement`.

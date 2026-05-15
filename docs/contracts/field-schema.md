# Field schema contract (v1.1)

Describes each object in the `fields` array of [metadata-schema.md](metadata-schema.md).

## Required properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Serializer field name |
| `label` | string | Human label for UI |
| `type` | string | Engine field type (see below) |
| `required` | boolean | Required on write |
| `read_only` | boolean | Omit from create/edit forms |
| `help_text` | string | Optional hint (may be empty) |

## Optional properties

| Property | Type | When present |
|----------|------|----------------|
| `choices` | array | `type === "choice"` |
| `related_resource` | string \| null | `type === "relation"` — registered resource slug |
| `relation_display_field` | string | `type === "relation"` — field on related model for labels (default `id`) |
| `ui` | object | Presentation hints (see below) |
| `drf_class` | string | Fallback/unmapped DRF types |

## Field types (`type`)

| Value | Meaning |
|-------|---------|
| `string` | Single-line text |
| `text` | Multi-line text |
| `integer` | Whole number |
| `decimal` | Decimal number |
| `boolean` | Checkbox |
| `choice` | Select from `choices` |
| `date` | Date (ISO date string) |
| `datetime` | Date-time (ISO 8601) |
| `relation` | Foreign key — select from related resource list API |
| `file` | File upload — multipart create/update |

## UI object (`ui`) — v1.1

```json
{
  "ui": {
    "variant": "badge",
    "badge_map": { "open": "warning", "resolved": "success" },
    "help_text": "Shown under the field label",
    "placeholder": "Optional placeholder",
    "section": "Personal details"
  }
}
```

Badge tones: `success`, `warning`, `danger`, `neutral`.

## Example

```json
{
  "name": "category",
  "label": "Category",
  "type": "choice",
  "required": true,
  "read_only": false,
  "help_text": "",
  "choices": ["parts", "kits", "services"]
}
```

## Non-breaking changes (v1.x)

- New optional property on field object.
- New `type` value (requires [rendering-expectations.md](rendering-expectations.md) update).

## Breaking changes (v2.0)

- Rename `type` values or remove a type.
- Make formerly optional properties required without defaults.

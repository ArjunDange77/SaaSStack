# Field schema contract (v1.0)

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
| `related_resource` | string \| null | `type === "relation"` |
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
| `relation` | Foreign key (Phase 1: display as read-only or stub) |

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

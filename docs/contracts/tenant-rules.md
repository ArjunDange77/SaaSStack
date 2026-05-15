# Tenant rules contract (v1.0)

## Resolution order

`TenantMiddleware` sets `request.tenant` from:

1. Header `X-Tenant: <slug>` (preferred in dev)
2. Host header matching `Tenant.domain`
3. `null` (no tenant)

## Tenant-scoped resources

Models with a `tenant` ForeignKey to `tenancy.Tenant` and ViewSets using `TenantScopedQuerysetMixin`:

| Rule | Behavior |
|------|----------|
| List/retrieve | Only rows where `tenant_id == request.tenant.id` |
| No tenant on request | **Empty queryset** (fail closed) |
| Create | `tenant` set automatically from `request.tenant` |
| Cross-tenant access | Must return 404 on detail, not leak other tenant data |

## Global vs tenant shell data

**Branding** and **NavBarItem** (cosmetix):

- If `request.tenant` is set and tenant-specific active rows exist → use those.
- Else → use global rows (`tenant IS NULL`).

## API requirements for kernel tests

| Request | Header |
|---------|--------|
| CRUD on `demo-items` | `Authorization: Bearer <token>` + `X-Tenant: demo` |
| Meta catalog/schema | JWT required; tenant header recommended for consistency |
| Nav items | JWT required |

## Example headers

```http
Authorization: Bearer eyJ...
X-Tenant: demo
Content-Type: application/json
```

## Non-breaking changes (v1.x)

- Document additional global resource types.

## Breaking changes (v2.0)

- Change fail-closed behavior (e.g. allow global reads without tenant).

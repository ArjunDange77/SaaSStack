# Multi-product Azure planning (committed reference)

Operator-specific notes (subscription IDs, live URLs) belong in gitignored `deploy/docs/`.

## PG Management staging (current — do not rename)

| Item | Value |
|------|--------|
| Resource group | `rg-saasstack-staging` |
| App Service plan | `saasstack-staging-plan` (B1 Linux) |
| API | `saasstack-staging-api` |
| Frontend | `saasstack-staging-web` (Static Web App, `eastasia`) |
| Postgres | `saasstack-staging-pg` / DB `saasstack_staging` (public + Azure services firewall) |
| Key Vault | Not enabled (`enableKeyVault=false`) |
| GitHub environment | `staging` |
| Deploy workflow | `deploy-pg-staging.yml` |

## School Bus staging (target)

| Item | Value |
|------|--------|
| Resource group | `rg-saasstack-sb-staging` |
| Shared network RG | `rg-saasstack-shared` |
| App Service plan | `saasstack-sb-staging-plan` (S1 Linux) |
| API | `saasstack-sb-staging-api` (+ slot `staging`) |
| Frontend | `saasstack-sb-staging-web` (+ slot `staging`, nginx static) |
| Postgres | `saasstack-sb-staging-pg` / DB `saasstack_sb_staging` (private endpoint only) |
| Key Vault | Per-product vault in SB RG |
| GitHub environment | `schoolbus-staging` |
| Deploy workflow | `deploy-schoolbus-staging.yml` |

## School Bus production

| Item | Value |
|------|--------|
| Resource group | `rg-saasstack-sb-prod` |
| GitHub environment | `schoolbus-production` (required reviewers) |
| Postgres HA | Zone-redundant when `environmentName=prod` |

## Network constants (shared VNet)

| Resource | CIDR / name |
|----------|-------------|
| VNet | `10.20.0.0/16` — `saasstack-shared-vnet` |
| App Service integration subnet | `10.20.1.0/24` — `apps-integration` |
| Private endpoints subnet | `10.20.2.0/24` — `private-endpoints` |
| Postgres delegated subnet (optional) | `10.20.3.0/24` — reserved |

## Regions (India pilot default)

| Layer | Region |
|-------|--------|
| Postgres / shared RG | `centralindia` |
| App Services | `southindia` |

Override via `AZURE_LOCATION`, `AZURE_APP_LOCATION` in provision scripts.

## GitHub environments & secrets checklist

### `schoolbus-staging`

- `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`
- `AZURE_WEBAPP_NAME` (API)
- `AZURE_WEBAPP_NAME_FRONTEND`
- `AZURE_RESOURCE_GROUP` = `rg-saasstack-sb-staging`
- `STAGING_API_URL`, `VITE_API_BASE`, `SMOKE_WEB_URL`
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DB_HOST`, `DB_PORT`
- `DJANGO_SECRET_KEY` (migrate job / validate)
- `SMOKE_USERNAME`, `SMOKE_PASSWORD` (optional)

### `schoolbus-production`

Same keys as staging with production values; add approval gate on environment.

## Cost estimate (order of magnitude)

| Stack | ~USD/month |
|-------|------------|
| PG pilot (B1 + B1ms PG + free SWA) | $25–35 |
| SB staging (S1 + 2 apps + NAT + private PG + KV) | $80–120 |

## Deploy triggers

- Push to `staging` deploys **one product** via path filters (see `.github/workflows/deploy-pg-staging.yml` and `deploy-schoolbus-staging.yml`).
- Kernel-only changes: manual `workflow_dispatch` per product.

# Multi-product Azure planning (committed reference)

Operator-specific notes (subscription IDs, live URLs) belong in gitignored `deploy/docs/`.

## Unified staging (Phase 1 — current)

**One resource group** hosts PG Management and School Bus via **multi-tenancy** (`X-Tenant`: `pg-demo`, `sai-baba-school-bus`).

| Item | Value |
|------|--------|
| Resource group | `rg-saasstack-staging` |
| App Service plan | `saasstack-staging-plan` (B1 Linux) |
| API | `saasstack-staging-api` |
| Frontend | `saasstack-staging-web` (Static Web App) |
| Postgres | `saasstack-staging-pg` / DB `saasstack_staging` (public) |
| GitHub environment | `staging` |
| Deploy workflow | [`.github/workflows/deploy-staging.yml`](../../.github/workflows/deploy-staging.yml) |
| Smoke | `deploy/scripts/smoke_unified_staging.sh` |

**~USD/month:** $25–35 (single stack).

### Retired staging stacks (delete after cutover verified)

| Resource group | Why remove |
|----------------|------------|
| `rg-saasstack-sb-staging` | Replaced by tenants on unified API |
| `rg-saasstack-shared` | VNet/NAT only for old private Postgres |
| `rg-saasstack-sb-prod` | Empty/test only until minimal prod provision |

```bash
bash deploy/scripts/teardown-schoolbus-staging.sh
```

### Deprecated IaC (reference only)

- [`schoolbus.bicep`](schoolbus.bicep) — heavy SB layout (private PG, VNet). **Do not provision for staging.**
- [`provision-schoolbus-staging.sh`](../scripts/provision-schoolbus-staging.sh) — retired for staging.

Use [`main.bicep`](main.bicep) for staging and future minimal production.

## Phase 2 — Production (later, per product)

When a product goes live, add a **dedicated production RG** with the **same minimal pattern** as unified staging (B1, public Postgres, SWA)—not the old SB VNet stack.

| Product | Suggested RG | Workflow | IaC |
|---------|--------------|----------|-----|
| PG Management | `rg-saasstack-prod` (existing) | `deploy-pg-production.yml` | `main.bicep` `environmentName=prod` |
| School Bus | `rg-saasstack-sb-prod` (re-provision minimal) | `deploy-schoolbus-production.yml` | `main.bicep` + `productSlug` or separate param file |

Staging remains **one shared RG** for cost and velocity.

## Regions (India pilot default)

| Layer | Region |
|-------|--------|
| Postgres | `centralindia` |
| App Services / SWA | `eastasia` (SWA) / `centralindia` or `southindia` (API) |

## GitHub `staging` environment secrets

See [STAGING-SECRETS.md](STAGING-SECRETS.md).

## Deploy triggers

- Push to **`main`** or **`staging`** → **Deploy Staging** (unified).
- `deploy-pg-staging.yml` and `deploy-schoolbus-staging.yml` are **retired** (manual dispatch shows error).
- Production: separate workflows on `main` per product (Phase 2).

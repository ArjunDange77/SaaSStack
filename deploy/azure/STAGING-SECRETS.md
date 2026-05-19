# GitHub `staging` environment secrets (unified)

Use a **single** GitHub Environment named `staging` for deploys to `rg-saasstack-staging`.

## Required

| Secret | Example value |
|--------|----------------|
| `AZURE_CLIENT_ID` | OIDC app registration |
| `AZURE_TENANT_ID` | Azure AD tenant |
| `AZURE_SUBSCRIPTION_ID` | Subscription GUID |
| `AZURE_WEBAPP_NAME` | `saasstack-staging-api` |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | SWA deploy token |
| `STAGING_API_URL` | `https://saasstack-staging-api.azurewebsites.net` |
| `VITE_API_BASE` | Same as `STAGING_API_URL` |
| `POSTGRES_DB` | `saasstack_staging` |
| `POSTGRES_USER` | (from Bicep output) |
| `POSTGRES_PASSWORD` | (from provision) |
| `DB_HOST` | `saasstack-staging-pg.postgres.database.azure.com` |
| `DB_PORT` | `5432` |
| `DJANGO_SECRET_KEY` | Random string |

## Optional (smoke / demo)

| Secret | Purpose |
|--------|---------|
| `SMOKE_USERNAME` / `SMOKE_PASSWORD` | PG operator smoke (`pg-demo`) |
| `SMOKE_SWA_URL` / `SMOKE_WEB_URL` | Frontend smoke URLs |

School Bus Goa pilot smoke uses workflow defaults: `kamlesh` / `admin` @ `sai-baba-school-bus`.

## OIDC setup

```bash
GITHUB_ENVIRONMENT=staging AZURE_RESOURCE_GROUP=rg-saasstack-staging \
  bash deploy/scripts/setup-github-oidc.sh
bash deploy/scripts/sync-github-staging-secrets.sh
```

## Retired: `schoolbus-staging` environment

After cutover, remove duplicate secrets from the `schoolbus-staging` GitHub Environment. All deploys use `staging` only.

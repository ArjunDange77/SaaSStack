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

## Smoke / demo (recommended)

| Secret | Purpose |
|--------|---------|
| `SMOKE_USERNAME` / `SMOKE_PASSWORD` | PG operator smoke (`pg-demo`) |
| `SMOKE_SWA_URL` | `https://saasstack-staging-web.azurestaticapps.net` — **required** for deploy to catch SWA 404 |
| `SMOKE_WEB_URL` | Alias for SWA URL (optional) |

School Bus Goa pilot smoke uses workflow defaults: `kamlesh` / `admin` @ `sai-baba-school-bus`.

## Fix SWA 404 / wrong `SMOKE_SWA_URL` (after cutover)

If CI passes but `saasstack-staging-web.azurestaticapps.net` shows Azure 404, refresh secrets from Azure:

```bash
az login
gh auth login
bash deploy/scripts/refresh-unified-staging-github-secrets.sh --push
```

This sets `SMOKE_SWA_URL`, `SMOKE_WEB_URL`, `VITE_API_BASE`, `STAGING_API_URL`, and a fresh `AZURE_STATIC_WEB_APPS_API_TOKEN` for **`saasstack-staging-web`** (not the legacy SB App Service URL).

## OIDC setup

```bash
GITHUB_ENVIRONMENT=staging AZURE_RESOURCE_GROUP=rg-saasstack-staging \
  bash deploy/scripts/setup-github-oidc.sh
bash deploy/scripts/refresh-unified-staging-github-secrets.sh --push
```

## Retired: `schoolbus-staging` environment

After cutover, remove duplicate secrets from the `schoolbus-staging` GitHub Environment. All deploys use `staging` only.

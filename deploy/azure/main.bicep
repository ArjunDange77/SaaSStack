@description('Environment suffix: staging or prod (PG / core product)')
param environmentName string = 'staging'

@description('Product slug: core = legacy PG naming (saasstack-staging-*)')
param productSlug string = 'core'

param location string = 'centralindia'

param appServiceLocation string = location

param staticWebAppLocation string = 'eastasia'

@secure()
param postgresPassword string

@secure()
param djangoSecretKey string

param enableMonitoring bool = false

param enableKeyVault bool = false

param useAzureStorage bool = false

var namePrefix = productSlug == 'core' ? 'saasstack-${environmentName}' : 'saasstack-${productSlug}-${environmentName}'
var isProd = environmentName == 'prod'
var deployEnv = isProd ? 'production' : 'staging'
var settingsModule = isProd ? 'config.settings.production' : 'config.settings.staging'
var postgresDbName = isProd ? 'saasstack_production' : 'saasstack_staging'
var apiHost = '${namePrefix}-api.azurewebsites.net'
var swaHost = '${namePrefix}-web.azurestaticapps.net'

module monitoring 'modules/monitoring.bicep' = if (enableMonitoring) {
  name: 'pg-monitoring'
  params: {
    namePrefix: namePrefix
    location: location
  }
}

module keyVault 'modules/key-vault.bicep' = if (enableKeyVault) {
  name: 'pg-keyvault'
  params: {
    name: take(replace('${namePrefix}-kv-${uniqueString(resourceGroup().id)}', '-', ''), 24)
    location: location
  }
}

module storage 'modules/storage.bicep' = if (useAzureStorage) {
  name: 'pg-storage'
  params: {
    name: take(replace('${namePrefix}media${uniqueString(resourceGroup().id)}', '-', ''), 24)
    location: location
  }
}

module postgres 'modules/postgres.bicep' = {
  name: 'pg-postgres'
  params: {
    name: '${namePrefix}-pg'
    location: location
    administratorPassword: postgresPassword
    databaseName: postgresDbName
    backupRetentionDays: 7
    publicNetworkAccess: 'Enabled'
  }
}

module appPlan 'modules/app-service-plan.bicep' = {
  name: 'pg-plan'
  params: {
    name: '${namePrefix}-plan'
    location: appServiceLocation
    skuName: 'B1'
    skuTier: 'Basic'
  }
}

var apiAppSettings = concat(
  [
    {
      name: 'DJANGO_SETTINGS_MODULE'
      value: settingsModule
    }
    {
      name: 'DEPLOY_ENV'
      value: deployEnv
    }
    {
      name: 'DJANGO_ENV'
      value: deployEnv
    }
    {
      name: 'DJANGO_DEBUG'
      value: 'False'
    }
    {
      name: 'DJANGO_SECRET_KEY'
      value: djangoSecretKey
    }
    {
      name: 'ALLOWED_HOSTS'
      value: apiHost
    }
    {
      name: 'CORS_ALLOWED_ORIGINS'
      value: 'https://${swaHost}'
    }
    {
      name: 'POSTGRES_DB'
      value: postgresDbName
    }
    {
      name: 'POSTGRES_USER'
      value: postgres.outputs.administratorLogin
    }
    {
      name: 'POSTGRES_PASSWORD'
      value: postgresPassword
    }
    {
      name: 'DB_HOST'
      value: postgres.outputs.fqdn
    }
    {
      name: 'DB_PORT'
      value: '5432'
    }
    {
      name: 'RUN_BOOTSTRAP'
      value: 'false'
    }
    {
      name: 'SEED_PG_DEMO'
      value: 'false'
    }
    {
      name: 'USE_AZURE_STORAGE'
      value: string(useAzureStorage)
    }
    {
      name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE'
      value: 'false'
    }
    {
      name: 'WEBSITES_PORT'
      value: '8000'
    }
  ],
  enableMonitoring
    ? [
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: monitoring.outputs.appInsightsConnectionString
        }
      ]
    : [],
  useAzureStorage
    ? [
        {
          name: 'AZURE_STORAGE_ACCOUNT_NAME'
          value: storage.outputs.name
        }
        {
          name: 'AZURE_STORAGE_CONTAINER'
          value: 'media'
        }
      ]
    : []
)

module webApp 'modules/app-service-api.bicep' = {
  name: 'pg-api'
  params: {
    name: '${namePrefix}-api'
    location: appServiceLocation
    planId: appPlan.outputs.planId
    appSettings: apiAppSettings
    enableStagingSlot: false
  }
}

module staticWebApp 'modules/static-web-app.bicep' = {
  name: 'pg-swa'
  params: {
    name: '${namePrefix}-web'
    location: staticWebAppLocation
  }
}

output apiAppName string = webApp.outputs.appName
output apiUrl string = 'https://${apiHost}'
output swaUrl string = 'https://${staticWebApp.outputs.defaultHostname}'
output swaDefaultHostname string = staticWebApp.outputs.defaultHostname
output staticWebAppName string = staticWebApp.outputs.name
output postgresHost string = postgres.outputs.fqdn
output postgresDb string = postgresDbName
output postgresUser string = postgres.outputs.administratorLogin
output storageAccountName string = useAzureStorage ? storage.outputs.name : ''
output appInsightsConnectionString string = enableMonitoring ? monitoring.outputs.appInsightsConnectionString : ''
output githubSecretsHint object = {
  AZURE_WEBAPP_NAME: webApp.outputs.appName
  STAGING_API_URL: 'https://${apiHost}'
  VITE_API_BASE: 'https://${apiHost}'
  POSTGRES_DB: postgresDbName
  POSTGRES_USER: postgres.outputs.administratorLogin
  DB_HOST: postgres.outputs.fqdn
  DB_PORT: '5432'
}

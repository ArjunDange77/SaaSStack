// DEPRECATED for staging — use main.bicep on rg-saasstack-staging (unified multi-tenant).
// Retained for reference / optional Phase 2 only if private Postgres is required.
targetScope = 'resourceGroup'

@description('Environment: staging or prod')
param environmentName string = 'staging'

param location string = 'centralindia'

param appServiceLocation string = location

@secure()
param postgresPassword string

@secure()
param djangoSecretKey string

@description('Shared VNet integration subnet resource ID')
param integrationSubnetId string

@description('Private endpoint subnet resource ID')
param privateEndpointSubnetId string

@description('Private DNS zone ID for Postgres')
param postgresPrivateDnsZoneId string

param enableMonitoring bool = true

param enableKeyVault bool = true

param enableDeploymentSlots bool = true

param appServicePlanSku string = 'S1'

param appServicePlanTier string = 'Standard'

param postgresBackupRetentionDays int = 14

param postgresHighAvailability bool = false

var namePrefix = 'saasstack-sb-${environmentName}'
var isProd = environmentName == 'prod'
var deployEnv = isProd ? 'production' : 'staging'
var settingsModule = isProd ? 'config.settings.production' : 'config.settings.staging'
var postgresDbName = isProd ? 'saasstack_sb_production' : 'saasstack_sb_staging'
var apiHost = '${namePrefix}-api.azurewebsites.net'
var feHost = '${namePrefix}-web.azurewebsites.net'
var kvName = take(replace('${namePrefix}kv${uniqueString(resourceGroup().id)}', '-', ''), 24)

module monitoring 'modules/monitoring.bicep' = if (enableMonitoring) {
  name: 'sb-monitoring'
  params: {
    namePrefix: namePrefix
    location: location
  }
}

module keyVault 'modules/key-vault.bicep' = if (enableKeyVault) {
  name: 'sb-keyvault'
  params: {
    name: kvName
    location: location
  }
}

module postgres 'modules/postgres.bicep' = {
  name: 'sb-postgres'
  params: {
    name: '${namePrefix}-pg'
    location: location
    administratorPassword: postgresPassword
    databaseName: postgresDbName
    backupRetentionDays: postgresBackupRetentionDays
    highAvailabilityEnabled: postgresHighAvailability
    publicNetworkAccess: 'Disabled'
  }
}

module postgresPe 'modules/postgres-private-endpoint.bicep' = {
  name: 'sb-postgres-pe'
  params: {
    name: '${namePrefix}-pg-pe'
    location: location
    postgresServerId: postgres.outputs.serverId
    subnetId: privateEndpointSubnetId
    privateDnsZoneId: postgresPrivateDnsZoneId
  }
}

module appPlan 'modules/app-service-plan.bicep' = {
  name: 'sb-plan'
  params: {
    name: '${namePrefix}-plan'
    location: appServiceLocation
    skuName: appServicePlanSku
    skuTier: appServicePlanTier
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
      value: '${apiHost},${namePrefix}-api-staging.azurewebsites.net'
    }
    {
      name: 'CORS_ALLOWED_ORIGINS'
      value: 'https://${feHost},https://${namePrefix}-web-staging.azurewebsites.net'
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
      name: 'PRODUCT_SLUG'
      value: 'school_bus'
    }
    {
      name: 'USE_AZURE_STORAGE'
      value: 'false'
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
    : []
)

module apiApp 'modules/app-service-api.bicep' = {
  name: 'sb-api'
  params: {
    name: '${namePrefix}-api'
    location: appServiceLocation
    planId: appPlan.outputs.planId
    appSettings: apiAppSettings
    integrationSubnetId: integrationSubnetId
    vnetRouteAllEnabled: true
    enableStagingSlot: enableDeploymentSlots
    stagingSlotAppSettings: apiAppSettings
  }
}

module frontendApp 'modules/app-service-frontend.bicep' = {
  name: 'sb-frontend'
  params: {
    name: '${namePrefix}-web'
    location: appServiceLocation
    planId: appPlan.outputs.planId
    integrationSubnetId: integrationSubnetId
    vnetRouteAllEnabled: true
    enableStagingSlot: enableDeploymentSlots
    corsApiHostname: apiHost
  }
}

module kvRbacApi 'modules/key-vault-rbac.bicep' = if (enableKeyVault) {
  name: 'sb-kv-rbac-api'
  params: {
    keyVaultName: keyVault.outputs.vaultName
    principalId: apiApp.outputs.principalId
  }
}

module kvRbacFe 'modules/key-vault-rbac.bicep' = if (enableKeyVault) {
  name: 'sb-kv-rbac-fe'
  params: {
    keyVaultName: keyVault.outputs.vaultName
    principalId: frontendApp.outputs.principalId
  }
}

module kvRbacApiSlot 'modules/key-vault-rbac.bicep' = if (enableKeyVault && enableDeploymentSlots) {
  name: 'sb-kv-rbac-api-slot'
  params: {
    keyVaultName: keyVault.outputs.vaultName
    principalId: apiApp.outputs.stagingSlotPrincipalId
  }
}

output apiAppName string = apiApp.outputs.appName
output frontendAppName string = frontendApp.outputs.appName
output apiUrl string = 'https://${apiHost}'
output frontendUrl string = 'https://${feHost}'
output postgresHost string = postgres.outputs.fqdn
output postgresDb string = postgresDbName
output postgresUser string = postgres.outputs.administratorLogin
output keyVaultName string = enableKeyVault ? keyVault.outputs.vaultName : ''
output keyVaultUri string = enableKeyVault ? keyVault.outputs.vaultUri : ''
output appInsightsConnectionString string = enableMonitoring ? monitoring.outputs.appInsightsConnectionString : ''
output githubSecretsHint object = {
  AZURE_WEBAPP_NAME: apiApp.outputs.appName
  AZURE_WEBAPP_NAME_FRONTEND: frontendApp.outputs.appName
  AZURE_RESOURCE_GROUP: resourceGroup().name
  STAGING_API_URL: 'https://${namePrefix}-api-staging.azurewebsites.net'
  VITE_API_BASE: 'https://${namePrefix}-api-staging.azurewebsites.net'
  SMOKE_WEB_URL: 'https://${namePrefix}-web-staging.azurewebsites.net'
  POSTGRES_DB: postgresDbName
  POSTGRES_USER: postgres.outputs.administratorLogin
  DB_HOST: postgres.outputs.fqdn
  DB_PORT: '5432'
}

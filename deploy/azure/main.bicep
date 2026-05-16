@description('Environment suffix: staging or prod')
param environmentName string = 'staging'

@description('Azure region — use centralindia or southindia for India pilots')
param location string = 'centralindia'

@description('App Service region (B1 Linux may be unavailable in some India regions on trial subs)')
param appServiceLocation string = location

@description('Static Web Apps region (SWA is not available in all regions; eastasia is nearest to India)')
param staticWebAppLocation string = 'eastasia'

@description('PostgreSQL admin password (min 8 chars, mixed case + numbers)')
@secure()
param postgresPassword string

@description('Django secret key')
@secure()
param djangoSecretKey string

@description('Enable Application Insights (small extra cost; disable for cheapest validation)')
param enableMonitoring bool = false

@description('Deploy Key Vault (optional V1 — App Service settings are enough for pilots)')
param enableKeyVault bool = false

@description('Use Azure Blob for uploads (disable to save complexity during first pilots)')
param useAzureStorage bool = false

var namePrefix = 'saasstack-${environmentName}'
var isProd = environmentName == 'prod'
var deployEnv = isProd ? 'production' : 'staging'
var settingsModule = isProd ? 'config.settings.production' : 'config.settings.staging'
var postgresDbName = isProd ? 'saasstack_production' : 'saasstack_staging'
var apiHost = '${namePrefix}-api.azurewebsites.net'
var swaHost = '${namePrefix}-web.azurestaticapps.net'

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = if (enableMonitoring) {
  name: '${namePrefix}-logs'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = if (enableMonitoring) {
  name: '${namePrefix}-insights'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: enableMonitoring ? logAnalytics.id : ''
  }
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = if (enableKeyVault) {
  name: take(replace('${namePrefix}-kv-${uniqueString(resourceGroup().id)}', '-', ''), 24)
  location: location
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    accessPolicies: []
    enableRbacAuthorization: true
  }
}

resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = if (useAzureStorage) {
  name: take(replace('${namePrefix}media${uniqueString(resourceGroup().id)}', '-', ''), 24)
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
}

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: '${namePrefix}-pg'
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '15'
    administratorLogin: 'saasadmin'
    administratorLoginPassword: postgresPassword
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
  }
}

resource postgresFirewallAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-06-01-preview' = {
  parent: postgres
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource postgresDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-06-01-preview' = {
  parent: postgres
  name: postgresDbName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

resource appPlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: '${namePrefix}-plan'
  location: appServiceLocation
  sku: {
    name: 'B1'
    tier: 'Basic'
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource webApp 'Microsoft.Web/sites@2023-01-01' = {
  name: '${namePrefix}-api'
  location: appServiceLocation
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appPlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOCKER|mcr.microsoft.com/appsvc/staticsite:latest'
      healthCheckPath: '/api/health/'
      appSettings: concat(
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
            value: postgres.properties.administratorLogin
          }
          {
            name: 'POSTGRES_PASSWORD'
            value: postgresPassword
          }
          {
            name: 'DB_HOST'
            value: postgres.properties.fullyQualifiedDomainName
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
                value: appInsights.properties.ConnectionString
              }
            ]
          : [],
        useAzureStorage
          ? [
              {
                name: 'AZURE_STORAGE_ACCOUNT_NAME'
                value: storage.name
              }
              {
                name: 'AZURE_STORAGE_CONTAINER'
                value: 'media'
              }
            ]
          : []
      )
    }
  }
}

resource staticWebApp 'Microsoft.Web/staticSites@2022-03-01' = {
  name: '${namePrefix}-web'
  location: staticWebAppLocation
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {}
}

output apiAppName string = webApp.name
output apiUrl string = 'https://${apiHost}'
output swaUrl string = 'https://${staticWebApp.properties.defaultHostname}'
output swaDefaultHostname string = staticWebApp.properties.defaultHostname
output staticWebAppName string = staticWebApp.name
output postgresHost string = postgres.properties.fullyQualifiedDomainName
output postgresDb string = postgresDbName
output postgresUser string = postgres.properties.administratorLogin
output storageAccountName string = useAzureStorage ? storage.name : ''
output appInsightsConnectionString string = enableMonitoring ? appInsights.properties.ConnectionString : ''
output githubSecretsHint object = {
  AZURE_WEBAPP_NAME: webApp.name
  STAGING_API_URL: 'https://${apiHost}'
  VITE_API_BASE: 'https://${apiHost}'
  POSTGRES_DB: postgresDbName
  POSTGRES_USER: postgres.properties.administratorLogin
  DB_HOST: postgres.properties.fullyQualifiedDomainName
  DB_PORT: '5432'
}

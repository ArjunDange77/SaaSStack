using './main.bicep'

param environmentName = 'staging'
param location = 'centralindia'
param appServiceLocation = 'southindia'
param staticWebAppLocation = 'eastasia'
param enableMonitoring = false
param enableKeyVault = false
param useAzureStorage = false
// Override at deploy time — do not commit real secrets:
// az deployment group create ... --parameters postgresPassword=<secret> djangoSecretKey=<secret>
param postgresPassword = 'REPLACE_AT_DEPLOY_TIME_abc123!'
param djangoSecretKey = 'REPLACE_AT_DEPLOY_TIME_change-me-64-chars-minimum________________'

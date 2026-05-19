using 'schoolbus.bicep'

param environmentName = 'staging'
param location = 'centralindia'
param appServiceLocation = 'southindia'
param enableMonitoring = true
param enableKeyVault = true
param enableDeploymentSlots = true
param appServicePlanSku = 'S1'
param appServicePlanTier = 'Standard'
param postgresBackupRetentionDays = 14
param postgresHighAvailability = false

// Populated by provision-schoolbus-staging.sh from shared deployment outputs + generated secrets
param integrationSubnetId = ''
param privateEndpointSubnetId = ''
param postgresPrivateDnsZoneId = ''
param postgresPassword = ''
param djangoSecretKey = ''

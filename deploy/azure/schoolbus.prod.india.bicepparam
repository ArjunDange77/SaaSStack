using 'schoolbus.bicep'

param environmentName = 'prod'
param location = 'centralindia'
param appServiceLocation = 'southindia'
param enableMonitoring = true
param enableKeyVault = true
param enableDeploymentSlots = true
param appServicePlanSku = 'S1'
param appServicePlanTier = 'Standard'
param postgresBackupRetentionDays = 35
param postgresHighAvailability = true

param integrationSubnetId = ''
param privateEndpointSubnetId = ''
param postgresPrivateDnsZoneId = ''
param postgresPassword = ''
param djangoSecretKey = ''

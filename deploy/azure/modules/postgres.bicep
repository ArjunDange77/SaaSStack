param name string
param location string

@secure()
param administratorPassword string

param databaseName string

param administratorLogin string = 'saasadmin'

param skuName string = 'Standard_B1ms'

param skuTier string = 'Burstable'

param backupRetentionDays int = 7

param highAvailabilityEnabled bool = false

@description('Enabled or Disabled')
param publicNetworkAccess string = 'Enabled'

param version string = '15'

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: name
  location: location
  sku: {
    name: skuName
    tier: skuTier
  }
  properties: {
    version: version
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorPassword
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: backupRetentionDays
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: highAvailabilityEnabled ? {
      mode: 'ZoneRedundant'
    } : null
    network: {
      publicNetworkAccess: publicNetworkAccess
    }
  }
}

resource postgresFirewallAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-06-01-preview' = if (publicNetworkAccess == 'Enabled') {
  parent: postgres
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource postgresDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-06-01-preview' = {
  parent: postgres
  name: databaseName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

output serverId string = postgres.id
output serverName string = postgres.name
output fqdn string = postgres.properties.fullyQualifiedDomainName
output administratorLogin string = postgres.properties.administratorLogin
output databaseName string = databaseName

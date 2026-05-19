targetScope = 'resourceGroup'

@description('Region for shared regional resources')
param location string = 'centralindia'

param vnetName string = 'saasstack-shared-vnet'

param enableMonitoring bool = true

param monitoringNamePrefix string = 'saasstack-shared'

module vnet '../modules/vnet.bicep' = {
  name: 'shared-vnet'
  params: {
    location: location
    vnetName: vnetName
  }
}

module monitoring '../modules/monitoring.bicep' = if (enableMonitoring) {
  name: 'shared-monitoring'
  params: {
    namePrefix: monitoringNamePrefix
    location: location
  }
}

output vnetId string = vnet.outputs.vnetId
output integrationSubnetId string = vnet.outputs.integrationSubnetId
output privateEndpointSubnetId string = vnet.outputs.privateEndpointSubnetId
output postgresPrivateDnsZoneId string = vnet.outputs.postgresPrivateDnsZoneId
output natGatewayPublicIp string = vnet.outputs.natGatewayPublicIp
output logAnalyticsWorkspaceId string = enableMonitoring ? monitoring.outputs.logAnalyticsWorkspaceId : ''
output appInsightsConnectionString string = enableMonitoring ? monitoring.outputs.appInsightsConnectionString : ''

param name string
param location string
param planId string

param linuxFxVersion string = 'DOCKER|mcr.microsoft.com/appsvc/staticsite:latest'

param healthCheckPath string = '/api/health/'

param appSettings array

param integrationSubnetId string = ''

param vnetRouteAllEnabled bool = false

param enableStagingSlot bool = false

param stagingSlotAppSettings array = appSettings

resource webApp 'Microsoft.Web/sites@2023-01-01' = {
  name: name
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: planId
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: linuxFxVersion
      healthCheckPath: healthCheckPath
      vnetRouteAllEnabled: vnetRouteAllEnabled
      appSettings: appSettings
    }
  }
}

resource vnetIntegration 'Microsoft.Web/sites/networkConfig@2023-01-01' = if (!empty(integrationSubnetId)) {
  parent: webApp
  name: 'virtualNetwork'
  properties: {
    subnetResourceId: integrationSubnetId
    swiftSupported: true
  }
}

resource stagingSlot 'Microsoft.Web/sites/slots@2023-01-01' = if (enableStagingSlot) {
  parent: webApp
  name: 'staging'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: planId
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: linuxFxVersion
      healthCheckPath: healthCheckPath
      vnetRouteAllEnabled: vnetRouteAllEnabled
      appSettings: stagingSlotAppSettings
    }
  }
}

resource stagingVnetIntegration 'Microsoft.Web/sites/slots/networkConfig@2023-01-01' = if (enableStagingSlot && !empty(integrationSubnetId)) {
  parent: stagingSlot
  name: 'virtualNetwork'
  properties: {
    subnetResourceId: integrationSubnetId
    swiftSupported: true
  }
}

output appId string = webApp.id
output appName string = webApp.name
output principalId string = webApp.identity.principalId
output defaultHostname string = webApp.properties.defaultHostName
output stagingSlotPrincipalId string = enableStagingSlot ? stagingSlot!.identity.principalId : ''

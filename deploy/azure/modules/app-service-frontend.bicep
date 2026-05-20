@description('Serves static SPA via nginx container')
param name string
param location string
param planId string

param appSettings array = []

param integrationSubnetId string = ''

param vnetRouteAllEnabled bool = false

param enableStagingSlot bool = false

param corsApiHostname string

var nginxImage = 'DOCKER|nginx:1.25-alpine'
var feAppSettings = concat(
  [
    {
      name: 'WEBSITES_PORT'
      value: '80'
    }
    {
      name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE'
      value: 'true'
    }
    {
      name: 'SAASSTACK_API_HOST'
      value: corsApiHostname
    }
  ],
  appSettings
)
// Startup script is included in the frontend zip at wwwroot/app-service-startup.sh
var nginxStartup = '/bin/sh /home/site/wwwroot/app-service-startup.sh'

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
      linuxFxVersion: nginxImage
      appCommandLine: nginxStartup
      alwaysOn: true
      vnetRouteAllEnabled: vnetRouteAllEnabled
      appSettings: feAppSettings
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
      linuxFxVersion: nginxImage
      appCommandLine: nginxStartup
      alwaysOn: true
      vnetRouteAllEnabled: vnetRouteAllEnabled
      appSettings: feAppSettings
    }
  }
}

output appName string = webApp.name
output principalId string = webApp.identity.principalId
output defaultHostname string = webApp.properties.defaultHostName
output stagingSlotPrincipalId string = enableStagingSlot ? stagingSlot.identity.principalId : ''

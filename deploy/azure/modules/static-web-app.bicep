param name string
param location string

param skuName string = 'Free'

param skuTier string = 'Free'

resource staticWebApp 'Microsoft.Web/staticSites@2022-03-01' = {
  name: name
  location: location
  sku: {
    name: skuName
    tier: skuTier
  }
  properties: {}
}

output name string = staticWebApp.name
output defaultHostname string = staticWebApp.properties.defaultHostname

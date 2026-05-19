param name string
param location string

param skuName string = 'B1'

param skuTier string = 'Basic'

param kind string = 'linux'

resource appPlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: name
  location: location
  sku: {
    name: skuName
    tier: skuTier
  }
  kind: kind
  properties: {
    reserved: true
  }
}

output planId string = appPlan.id
output planName string = appPlan.name

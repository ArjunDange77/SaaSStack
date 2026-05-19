param name string
param location string

param tenantId string = subscription().tenantId

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: name
  location: location
  properties: {
    tenantId: tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    enabledForTemplateDeployment: false
    softDeleteRetentionInDays: 7
    enablePurgeProtection: true
  }
}

output vaultId string = keyVault.id
output vaultUri string = keyVault.properties.vaultUri
output vaultName string = keyVault.name

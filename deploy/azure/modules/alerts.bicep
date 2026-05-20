@description('Optional Azure Monitor metric alerts for a product stack')
param namePrefix string

param location string

param appServicePlanId string

param actionGroupId string = ''

resource cpuAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = if (!empty(actionGroupId)) {
  name: '${namePrefix}-asp-cpu'
  location: 'global'
  properties: {
    description: 'App Service Plan CPU high'
    severity: 2
    enabled: true
    scopes: [
      appServicePlanId
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'CpuHigh'
          metricName: 'CpuPercentage'
          operator: 'GreaterThan'
          threshold: 80
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroupId
      }
    ]
  }
}

output cpuAlertId string = !empty(actionGroupId) ? cpuAlert.id : ''

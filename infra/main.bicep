@description('Location for all resources')
param location string = resourceGroup().location

@description('Application name used as prefix for resource names')
param appName string = 'kazikashi'

@description('Environment name (dev, staging, prod)')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'dev'

@description('NextAuth secret key')
@secure()
param authSecret string

@description('GitHub OAuth Client ID')
param githubClientId string = ''

@description('GitHub OAuth Client Secret')
@secure()
param githubClientSecret string = ''

@description('Google OAuth Client ID')
param googleClientId string = ''

@description('Google OAuth Client Secret')
@secure()
param googleClientSecret string = ''

@description('Container image tag')
param imageTag string = 'latest'

var resourcePrefix = '${appName}-${environment}'
var containerAppName = '${resourcePrefix}-app'
var containerRegistryName = replace('${resourcePrefix}acr', '-', '')
var logAnalyticsName = '${resourcePrefix}-logs'
var containerAppEnvName = '${resourcePrefix}-env'
var storageAccountName = replace('${resourcePrefix}st', '-', '')
var fileShareName = 'database'

// Log Analytics Workspace
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Container Registry
resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: containerRegistryName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

// Storage Account for SQLite persistent volume
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS'
  }
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
  }
}

resource fileService 'Microsoft.Storage/storageAccounts/fileServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
}

resource fileShare 'Microsoft.Storage/storageAccounts/fileServices/shares@2023-01-01' = {
  parent: fileService
  name: fileShareName
  properties: {
    shareQuota: 1
  }
}

// Container Apps Environment
resource containerAppEnvironment 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: containerAppEnvName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// Storage link for persistent SQLite
resource envStorage 'Microsoft.App/managedEnvironments/storages@2023-05-01' = {
  parent: containerAppEnvironment
  name: 'dbstorage'
  properties: {
    azureFile: {
      accountName: storageAccount.name
      accountKey: storageAccount.listKeys().keys[0].value
      shareName: fileShareName
      accessMode: 'ReadWrite'
    }
  }
}

// Container App
resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: containerAppName
  location: location
  properties: {
    managedEnvironmentId: containerAppEnvironment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        allowInsecure: false
      }
      registries: [
        {
          server: containerRegistry.properties.loginServer
          username: containerRegistry.listCredentials().username
          passwordSecretRef: 'registry-password'
        }
      ]
      secrets: [
        {
          name: 'registry-password'
          value: containerRegistry.listCredentials().passwords[0].value
        }
        {
          name: 'auth-secret'
          value: authSecret
        }
        {
          name: 'github-client-secret'
          value: githubClientSecret
        }
        {
          name: 'google-client-secret'
          value: googleClientSecret
        }
        {
          name: 'database-url'
          value: 'file:/data/prod.db'
        }
      ]
    }
    template: {
      volumes: [
        {
          name: 'dbvolume'
          storageName: 'dbstorage'
          storageType: 'AzureFile'
        }
      ]
      containers: [
        {
          name: 'kazikashi-app'
          image: '${containerRegistry.properties.loginServer}/kazikashi-ai:${imageTag}'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
            {
              name: 'AUTH_SECRET'
              secretRef: 'auth-secret'
            }
            {
              name: 'AUTH_GITHUB_ID'
              value: githubClientId
            }
            {
              name: 'AUTH_GITHUB_SECRET'
              secretRef: 'github-client-secret'
            }
            {
              name: 'AUTH_GOOGLE_ID'
              value: googleClientId
            }
            {
              name: 'AUTH_GOOGLE_SECRET'
              secretRef: 'google-client-secret'
            }
            {
              name: 'NEXTAUTH_URL'
              value: 'https://${containerAppName}.${containerAppEnvironment.properties.defaultDomain}'
            }
            {
              name: 'NODE_ENV'
              value: 'production'
            }
          ]
          volumeMounts: [
            {
              volumeName: 'dbvolume'
              mountPath: '/data'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
        rules: [
          {
            name: 'http-scaler'
            http: {
              metadata: {
                concurrentRequests: '100'
              }
            }
          }
        ]
      }
    }
  }
  dependsOn: [envStorage]
}

output containerAppUrl string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
output containerRegistryServer string = containerRegistry.properties.loginServer
output containerRegistryName string = containerRegistry.name

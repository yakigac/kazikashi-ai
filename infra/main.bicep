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

@description('PostgreSQL administrator login')
param pgAdminLogin string = 'kazikashiadmin'

@description('PostgreSQL administrator password')
@secure()
param pgAdminPassword string

var resourcePrefix = '${appName}-${environment}'
var containerAppName = '${resourcePrefix}-app'
var containerRegistryName = replace('${resourcePrefix}acr', '-', '')
var logAnalyticsName = '${resourcePrefix}-logs'
var containerAppEnvName = '${resourcePrefix}-env'
var pgServerName = '${resourcePrefix}-pg'
var pgDatabaseName = appName

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

// Azure Database for PostgreSQL Flexible Server (managed PostgreSQL)
resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: pgServerName
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: pgAdminLogin
    administratorLoginPassword: pgAdminPassword
    version: '17'
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    authConfig: {
      activeDirectoryAuth: 'Disabled'
      passwordAuth: 'Enabled'
    }
  }
}

// PostgreSQL database
resource postgresDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: postgresServer
  name: pgDatabaseName
}

// Allow Azure services (Container Apps) to connect to PostgreSQL.
// Note: 0.0.0.0 -> 0.0.0.0 is the Azure services range, not the open internet.
// For stronger isolation, consider VNet integration with a private endpoint.
resource postgresFirewallRule 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  parent: postgresServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
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

var databaseUrl = 'postgresql://${pgAdminLogin}:${pgAdminPassword}@${postgresServer.properties.fullyQualifiedDomainName}:5432/${pgDatabaseName}?sslmode=require'

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
          value: databaseUrl
        }
      ]
    }
    template: {
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
  dependsOn: [postgresDatabase, postgresFirewallRule]
}

output containerAppUrl string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
output containerRegistryServer string = containerRegistry.properties.loginServer
output containerRegistryName string = containerRegistry.name
output postgresServerName string = postgresServer.name
output postgresFqdn string = postgresServer.properties.fullyQualifiedDomainName

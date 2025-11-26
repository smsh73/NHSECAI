/**
 * Azure Configuration Service
 * 
 * Manages all Azure service configurations through environment variables
 * Supports: Databricks, PostgreSQL, CosmosDB, OpenAI PTU, OpenAI Embedding, AI Search
 * 
 * All configurations can be updated via environment variables without code changes
 */

import { activityLogger } from './activity-logger.js';

export interface AzureDatabricksConfig {
  serverHostname: string;
  httpPath: string;
  authToken?: string;
  usePrivateEndpoint?: boolean;
  privateEndpointUrl?: string;
}

export interface AzurePostgreSQLConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  privateEndpointUrl?: string;
}

export interface AzureCosmosDBConfig {
  endpoint: string;
  key: string;
  databaseId: string;
  privateEndpointUrl?: string;
}

export interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  deploymentName: string;
  modelName?: string; // Model name (e.g., gpt-4.1, gpt-4o)
  apiVersion?: string;
  isPTU?: boolean; // Provisioned Throughput Unit
  privateEndpointUrl?: string;
}

export interface AzureEmbeddingConfig {
  endpoint: string;
  apiKey: string;
  deploymentName: string;
  modelName?: string;
  apiVersion?: string;
  isEmbedding?: boolean;
  privateEndpointUrl?: string;
}

export interface AzureAISearchConfig {
  endpoint: string;
  apiKey?: string;
  indexName?: string;
  usePrivateEndpoint?: boolean;
  privateEndpointUrl?: string;
}

export class AzureConfigService {
  /**
   * Get Databricks configuration from environment variables
   * 
   * Supports both Microsoft standard and Azure-specific environment variables:
   * - Standard (recommended): DATABRICKS_SERVER_HOSTNAME, DATABRICKS_HTTP_PATH, DATABRICKS_TOKEN
   * - Azure-specific: AZURE_DATABRICKS_HOST, AZURE_DATABRICKS_HTTP_PATH, AZURE_DATABRICKS_TOKEN
   * 
   * Reference: https://learn.microsoft.com/ko-kr/azure/databricks/dev-tools/nodejs-sql-driver
   */
  static getDatabricksConfig(): AzureDatabricksConfig {
    const serverHostname = process.env.DATABRICKS_SERVER_HOSTNAME || process.env.AZURE_DATABRICKS_HOST || '';
    const httpPath = process.env.DATABRICKS_HTTP_PATH || process.env.AZURE_DATABRICKS_HTTP_PATH || '';
    const authToken = process.env.DATABRICKS_TOKEN || process.env.AZURE_DATABRICKS_TOKEN;
    const usePrivateEndpoint = process.env.AZURE_DATABRICKS_USE_PRIVATE_ENDPOINT === 'true';
    const privateEndpointUrl = process.env.AZURE_DATABRICKS_PRIVATE_ENDPOINT_URL;

    activityLogger.logConfigCheck('Databricks', 'DATABRICKS_SERVER_HOSTNAME', !!serverHostname, serverHostname);
    activityLogger.logConfigCheck('Databricks', 'DATABRICKS_HTTP_PATH', !!httpPath, httpPath);
    activityLogger.logConfigCheck('Databricks', 'DATABRICKS_TOKEN', !!authToken, authToken);
    
    return {
      serverHostname,
      httpPath,
      authToken,
      usePrivateEndpoint,
      privateEndpointUrl,
    };
  }

  /**
   * Get PostgreSQL configuration from environment variables
   */
  static getPostgreSQLConfig(): AzurePostgreSQLConfig {
    // Azure 환경에서는 DATABASE_URL 또는 개별 환경변수로부터 설정 가져오기
    // 기본값 제거 - 모든 값은 Azure App Service Application Settings에서 필수로 설정되어야 함
    
    // DATABASE_URL 우선 사용 (postgresql://user:pass@host:port/db 형식)
    let host: string | undefined;
    let port: number | undefined;
    let database: string | undefined;
    let username: string | undefined;
    let password: string | undefined;
    
    if (process.env.DATABASE_URL) {
      try {
        const url = new URL(process.env.DATABASE_URL);
        host = url.hostname;
        port = parseInt(url.port || '5432');
        database = url.pathname.slice(1); // Remove leading /
        username = url.username;
        password = decodeURIComponent(url.password);
      } catch (error) {
        console.warn('Failed to parse DATABASE_URL, falling back to individual env vars');
      }
    }
    
    // DATABASE_URL이 없거나 파싱 실패 시 개별 환경변수 사용
    host = host || process.env.AZURE_POSTGRES_HOST || process.env.PGHOST;
    port = port || parseInt(process.env.AZURE_POSTGRES_PORT || process.env.PGPORT || '5432');
    database = database || process.env.AZURE_POSTGRES_DATABASE || process.env.PGDATABASE;
    username = username || process.env.AZURE_POSTGRES_USERNAME || process.env.PGUSER;
    password = password || process.env.AZURE_POSTGRES_PASSWORD || process.env.PGPASSWORD;
    
    if (!host || !database || !username || !password) {
      throw new Error(
        'PostgreSQL configuration is incomplete. Set DATABASE_URL or ' +
        'AZURE_POSTGRES_HOST, AZURE_POSTGRES_DATABASE, AZURE_POSTGRES_USERNAME, AZURE_POSTGRES_PASSWORD ' +
        'in Azure App Service Application Settings.'
      );
    }
    
    // Azure PostgreSQL은 기본적으로 SSL 필요
    const ssl = process.env.AZURE_POSTGRES_SSL !== 'false'; // 기본값: true
    const privateEndpointUrl = process.env.AZURE_POSTGRES_PRIVATE_ENDPOINT_URL;

    activityLogger.logConfigCheck('PostgreSQL', 'PGHOST', !!host, host);
    activityLogger.logConfigCheck('PostgreSQL', 'PGDATABASE', !!database, database);
    activityLogger.logConfigCheck('PostgreSQL', 'PGUSER', !!username, username);
    activityLogger.logConfigCheck('PostgreSQL', 'PGPASSWORD', !!password, password);
    
    return {
      host,
      port,
      database,
      username,
      password,
      ssl,
      privateEndpointUrl,
    };
  }

  /**
   * Get CosmosDB configuration from environment variables
   */
  static getCosmosDBConfig(): AzureCosmosDBConfig {
    const endpoint = process.env.AZURE_COSMOS_ENDPOINT || '';
    const key = process.env.AZURE_COSMOS_KEY || '';
    const databaseId = process.env.AZURE_COSMOS_DATABASE_ID || 'nh-investment';
    const privateEndpointUrl = process.env.AZURE_COSMOS_PRIVATE_ENDPOINT_URL;

    activityLogger.logConfigCheck('CosmosDB', 'AZURE_COSMOS_ENDPOINT', !!endpoint, endpoint);
    activityLogger.logConfigCheck('CosmosDB', 'AZURE_COSMOS_KEY', !!key, key);
    activityLogger.logConfigCheck('CosmosDB', 'AZURE_COSMOS_DATABASE_ID', !!databaseId, databaseId);
    
    return {
      endpoint,
      key,
      databaseId,
      privateEndpointUrl,
    };
  }

  /**
   * Get OpenAI PTU configuration from environment variables
   */
  static getOpenAIPTUConfig(): AzureOpenAIConfig {
    const usePrivateEndpoint = process.env.AZURE_OPENAI_PTU_USE_PRIVATE_ENDPOINT === 'true';
    const endpoint = usePrivateEndpoint && process.env.AZURE_OPENAI_PTU_PRIVATE_ENDPOINT_URL
        ? process.env.AZURE_OPENAI_PTU_PRIVATE_ENDPOINT_URL
        : process.env.AZURE_OPENAI_PTU_ENDPOINT || '';
    const apiKey = process.env.AZURE_OPENAI_PTU_API_KEY || process.env.AZURE_OPENAI_PTU_KEY || '';
    const deploymentName = process.env.AZURE_OPENAI_PTU_DEPLOYMENT || 'gpt-4';
    const modelName = process.env.AZURE_OPENAI_PTU_MODEL || 'gpt-4.1';
    const apiVersion = process.env.AZURE_OPENAI_PTU_API_VERSION || '2024-10-21';
    const privateEndpointUrl = process.env.AZURE_OPENAI_PTU_PRIVATE_ENDPOINT_URL;

    activityLogger.logConfigCheck('OpenAI-PTU', 'AZURE_OPENAI_PTU_ENDPOINT', !!endpoint, endpoint);
    activityLogger.logConfigCheck('OpenAI-PTU', 'AZURE_OPENAI_PTU_API_KEY', !!apiKey, apiKey);
    activityLogger.logConfigCheck('OpenAI-PTU', 'AZURE_OPENAI_PTU_DEPLOYMENT', !!deploymentName, deploymentName);
    activityLogger.logConfigCheck('OpenAI-PTU', 'AZURE_OPENAI_PTU_API_VERSION', !!apiVersion, apiVersion);
    
    return {
      endpoint,
      apiKey,
      deploymentName,
      modelName,
      apiVersion,
      isPTU: true,
      privateEndpointUrl,
    };
  }

  /**
   * Get OpenAI Embedding configuration from environment variables
   */
  static getEmbeddingConfig(): AzureEmbeddingConfig {
    const usePrivateEndpoint = process.env.AZURE_OPENAI_EMBEDDING_USE_PRIVATE_ENDPOINT === 'true';
    const endpoint = usePrivateEndpoint && process.env.AZURE_OPENAI_EMBEDDING_PRIVATE_ENDPOINT_URL
        ? process.env.AZURE_OPENAI_EMBEDDING_PRIVATE_ENDPOINT_URL
        : process.env.AZURE_OPENAI_EMBEDDING_ENDPOINT || '';
    const apiKey = process.env.AZURE_OPENAI_EMBEDDING_KEY || '';
    const deploymentName = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-ada-002';
    const modelName = process.env.AZURE_OPENAI_EMBEDDING_MODEL || 'text-embedding-ada-002';
    const apiVersion = process.env.AZURE_OPENAI_EMBEDDING_API_VERSION || '2024-10-21';
    const privateEndpointUrl = process.env.AZURE_OPENAI_EMBEDDING_PRIVATE_ENDPOINT_URL;

    activityLogger.logConfigCheck('OpenAI-Embedding', 'AZURE_OPENAI_EMBEDDING_ENDPOINT', !!endpoint, endpoint);
    activityLogger.logConfigCheck('OpenAI-Embedding', 'AZURE_OPENAI_EMBEDDING_KEY', !!apiKey, apiKey);
    activityLogger.logConfigCheck('OpenAI-Embedding', 'AZURE_OPENAI_EMBEDDING_DEPLOYMENT', !!deploymentName, deploymentName);
    
    return {
      endpoint,
      apiKey,
      deploymentName,
      modelName,
      apiVersion,
      isEmbedding: true,
      privateEndpointUrl,
    };
  }

  /**
   * Get Azure AI Search configuration from environment variables
   */
  static getAISearchConfig(): AzureAISearchConfig {
    const usePrivateEndpoint = process.env.AZURE_SEARCH_USE_PRIVATE_ENDPOINT === 'true';
    
    return {
      endpoint: usePrivateEndpoint && process.env.AZURE_SEARCH_PRIVATE_ENDPOINT_URL
        ? process.env.AZURE_SEARCH_PRIVATE_ENDPOINT_URL
        : process.env.AZURE_SEARCH_ENDPOINT || '',
      apiKey: process.env.AZURE_SEARCH_KEY,
      indexName: process.env.AZURE_SEARCH_INDEX_NAME || 'nh-financial-index',
      usePrivateEndpoint,
      privateEndpointUrl: process.env.AZURE_SEARCH_PRIVATE_ENDPOINT_URL,
    };
  }

  /**
   * Validate all required Azure configurations
   */
  static validateConfigurations(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate Databricks
    const databricksConfig = this.getDatabricksConfig();
    if (!databricksConfig.serverHostname) {
      errors.push('DATABRICKS_SERVER_HOSTNAME or AZURE_DATABRICKS_HOST is required');
    }
    if (!databricksConfig.httpPath) {
      errors.push('DATABRICKS_HTTP_PATH or AZURE_DATABRICKS_HTTP_PATH is required');
    }
    if (!databricksConfig.authToken) {
      warnings.push('DATABRICKS_TOKEN or AZURE_DATABRICKS_TOKEN is not set - authentication may fail');
    }

    // Validate PostgreSQL
    const postgresConfig = this.getPostgreSQLConfig();
    if (!postgresConfig.password) {
      warnings.push('PostgreSQL password is not set');
    }

    // Validate CosmosDB
    const cosmosConfig = this.getCosmosDBConfig();
    if (!cosmosConfig.endpoint) {
      warnings.push('AZURE_COSMOS_ENDPOINT is not set');
    }
    if (!cosmosConfig.key) {
      warnings.push('AZURE_COSMOS_KEY is not set');
    }

    // Validate OpenAI PTU
    const openaiPTUConfig = this.getOpenAIPTUConfig();
    if (!openaiPTUConfig.endpoint) {
      warnings.push('AZURE_OPENAI_PTU_ENDPOINT is not set');
    }
    if (!openaiPTUConfig.apiKey) {
      warnings.push('AZURE_OPENAI_PTU_KEY is not set');
    }

    // Validate Embedding
    const embeddingConfig = this.getEmbeddingConfig();
    if (!embeddingConfig.endpoint) {
      warnings.push('AZURE_OPENAI_EMBEDDING_ENDPOINT is not set');
    }
    if (!embeddingConfig.apiKey) {
      warnings.push('AZURE_OPENAI_EMBEDDING_KEY is not set');
    }

    // Validate AI Search
    const aiSearchConfig = this.getAISearchConfig();
    if (!aiSearchConfig.endpoint) {
      warnings.push('AZURE_SEARCH_ENDPOINT is not set');
    }
    if (!aiSearchConfig.apiKey) {
      warnings.push('AZURE_SEARCH_KEY is not set');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get all configurations as a summary (without sensitive data)
   */
  static getConfigurationSummary() {
    const databricksConfig = this.getDatabricksConfig();
    const postgresConfig = this.getPostgreSQLConfig();
    const cosmosConfig = this.getCosmosDBConfig();
    const openaiPTUConfig = this.getOpenAIPTUConfig();
    const embeddingConfig = this.getEmbeddingConfig();
    const aiSearchConfig = this.getAISearchConfig();

    return {
      databricks: {
        serverHostname: databricksConfig.serverHostname,
        httpPath: databricksConfig.httpPath,
        hasAuthToken: !!databricksConfig.authToken,
        usePrivateEndpoint: databricksConfig.usePrivateEndpoint,
        hasPrivateEndpoint: !!databricksConfig.privateEndpointUrl,
      },
      postgresql: {
        host: postgresConfig.host,
        port: postgresConfig.port,
        database: postgresConfig.database,
        username: postgresConfig.username,
        hasPassword: !!postgresConfig.password,
        ssl: postgresConfig.ssl,
        hasPrivateEndpoint: !!postgresConfig.privateEndpointUrl,
      },
      cosmosdb: {
        endpoint: cosmosConfig.endpoint,
        databaseId: cosmosConfig.databaseId,
        hasKey: !!cosmosConfig.key,
        hasPrivateEndpoint: !!cosmosConfig.privateEndpointUrl,
      },
      openaiPTU: {
        endpoint: openaiPTUConfig.endpoint,
        deploymentName: openaiPTUConfig.deploymentName,
        modelName: openaiPTUConfig.modelName,
        apiVersion: openaiPTUConfig.apiVersion,
        hasApiKey: !!openaiPTUConfig.apiKey,
        isPTU: openaiPTUConfig.isPTU,
        hasPrivateEndpoint: !!openaiPTUConfig.privateEndpointUrl,
      },
      embedding: {
        endpoint: embeddingConfig.endpoint,
        deploymentName: embeddingConfig.deploymentName,
        modelName: embeddingConfig.modelName,
        apiVersion: embeddingConfig.apiVersion,
        hasApiKey: !!embeddingConfig.apiKey,
        //HIHI
        isEmbedding: embeddingConfig.isEmbedding,
        hasPrivateEndpoint: !!embeddingConfig.privateEndpointUrl,
      },
      aiSearch: {
        endpoint: aiSearchConfig.endpoint,
        indexName: aiSearchConfig.indexName,
        hasApiKey: !!aiSearchConfig.apiKey,
        usePrivateEndpoint: aiSearchConfig.usePrivateEndpoint,
        hasPrivateEndpoint: !!aiSearchConfig.privateEndpointUrl,
      },
    };
  }
}

// Export singleton instance
export const azureConfigService = AzureConfigService;

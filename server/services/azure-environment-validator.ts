import { Pool } from 'pg';
import { CosmosClient } from '@azure/cosmos';
import axios from 'axios';

export class AzureEnvironmentValidator {
  private config: any;

  constructor() {
    this.config = {
      // PostgreSQL 설정
      postgresql: {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      },
      
      // Azure OpenAI 설정
      openai: {
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
        apiVersion: process.env.AZURE_OPENAI_API_VERSION
      },
      
      // Databricks 설정
      databricks: {
        host: process.env.DATABRICKS_HOST,
        token: process.env.DATABRICKS_TOKEN,
        clusterId: process.env.DATABRICKS_CLUSTER_ID,
        workspaceId: process.env.DATABRICKS_WORKSPACE_ID
      },
      
      // AI Search 설정
      search: {
        endpoint: process.env.AZURE_SEARCH_ENDPOINT,
        apiKey: process.env.AZURE_SEARCH_KEY || process.env.AZURE_SEARCH_API_KEY,
        indexName: process.env.AZURE_SEARCH_INDEX_NAME
      },
      
      // CosmosDB 설정
      cosmosdb: {
        endpoint: process.env.COSMOSDB_ENDPOINT,
        key: process.env.COSMOSDB_KEY,
        databaseId: process.env.COSMOSDB_DATABASE_ID,
        containerId: process.env.COSMOSDB_CONTAINER_ID
      }
    };
  }

  async validatePostgreSQL(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      if (!this.config.postgresql.connectionString) {
        return { success: false, message: 'DATABASE_URL not configured' };
      }

      const pool = new Pool({
        connectionString: this.config.postgresql.connectionString,
        ssl: this.config.postgresql.ssl
      });

      const client = await pool.connect();
      const result = await client.query('SELECT version()');
      client.release();
      await pool.end();

      return { 
        success: true, 
        message: 'PostgreSQL connection successful',
        details: { version: result.rows[0].version }
      };
    } catch (error: any) {
      return { 
        success: false, 
        message: 'PostgreSQL connection failed',
        details: error.message
      };
    }
  }

  async validateAzureOpenAI(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      if (!this.config.openai.apiKey || !this.config.openai.endpoint) {
        return { success: false, message: 'Azure OpenAI configuration incomplete' };
      }

      const response = await axios.post(
        `${this.config.openai.endpoint}/openai/deployments/${this.config.openai.deploymentName}/chat/completions?api-version=${this.config.openai.apiVersion}`,
        {
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10
        },
        {
          headers: {
            'api-key': this.config.openai.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return { 
        success: true, 
        message: 'Azure OpenAI connection successful',
        details: { status: response.status }
      };
    } catch (error: any) {
      return { 
        success: false, 
        message: 'Azure OpenAI connection failed',
        details: error.response?.data?.error?.message || error.message
      };
    }
  }

  async validateDatabricks(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      if (!this.config.databricks.host || !this.config.databricks.token) {
        return { success: false, message: 'Databricks configuration incomplete' };
      }

      const response = await axios.get(
        `${this.config.databricks.host}/api/2.0/clusters/list`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.databricks.token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return { 
        success: true, 
        message: 'Databricks connection successful',
        details: { clusters: response.data.clusters?.length || 0 }
      };
    } catch (error: any) {
      return { 
        success: false, 
        message: 'Databricks connection failed',
        details: error.response?.data?.error_code || error.message
      };
    }
  }

  async validateAISearch(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      if (!this.config.search.endpoint || !this.config.search.apiKey) {
        return { success: false, message: 'AI Search configuration incomplete' };
      }

      const response = await axios.get(
        `${this.config.search.endpoint}/indexes?api-version=2023-11-01`,
        {
          headers: {
            'api-key': this.config.search.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return { 
        success: true, 
        message: 'AI Search connection successful',
        details: { indexes: response.data.value?.length || 0 }
      };
    } catch (error: any) {
      return { 
        success: false, 
        message: 'AI Search connection failed',
        details: error.response?.data?.error?.message || error.message
      };
    }
  }

  async validateCosmosDB(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      if (!this.config.cosmosdb.endpoint || !this.config.cosmosdb.key) {
        return { success: false, message: 'CosmosDB configuration incomplete' };
      }

      const client = new CosmosClient({
        endpoint: this.config.cosmosdb.endpoint,
        key: this.config.cosmosdb.key
      });

      const { database } = await client.databases.createIfNotExists({
        id: this.config.cosmosdb.databaseId
      });

      return { 
        success: true, 
        message: 'CosmosDB connection successful',
        details: { databaseId: database.id }
      };
    } catch (error: any) {
      return { 
        success: false, 
        message: 'CosmosDB connection failed',
        details: error.message
      };
    }
  }

  async validateAllServices(): Promise<{
    overall: boolean;
    services: {
      postgresql: any;
      openai: any;
      databricks: any;
      search: any;
      cosmosdb: any;
    };
    summary: string;
  }> {
    console.log('🔍 Azure 서비스 연결 상태 검증 시작...');

    const results = await Promise.allSettled([
      this.validatePostgreSQL(),
      this.validateAzureOpenAI(),
      this.validateDatabricks(),
      this.validateAISearch(),
      this.validateCosmosDB()
    ]);

    const services = {
      postgresql: results[0].status === 'fulfilled' ? results[0].value : { success: false, message: 'Validation failed' },
      openai: results[1].status === 'fulfilled' ? results[1].value : { success: false, message: 'Validation failed' },
      databricks: results[2].status === 'fulfilled' ? results[2].value : { success: false, message: 'Validation failed' },
      search: results[3].status === 'fulfilled' ? results[3].value : { success: false, message: 'Validation failed' },
      cosmosdb: results[4].status === 'fulfilled' ? results[4].value : { success: false, message: 'Validation failed' }
    };

    const successCount = Object.values(services).filter(s => s.success).length;
    const totalCount = Object.keys(services).length;
    const overall = successCount === totalCount;

    const summary = `${successCount}/${totalCount} 서비스 연결 성공`;

    console.log(`✅ Azure 서비스 검증 완료: ${summary}`);

    return {
      overall,
      services,
      summary
    };
  }

  getConfigurationSummary(): any {
    return {
      environment: process.env.NODE_ENV || 'development',
      configuredServices: {
        postgresql: !!this.config.postgresql.connectionString,
        openai: !!(this.config.openai.apiKey && this.config.openai.endpoint),
        databricks: !!(this.config.databricks.host && this.config.databricks.token),
        search: !!(this.config.search.endpoint && this.config.search.apiKey),
        cosmosdb: !!(this.config.cosmosdb.endpoint && this.config.cosmosdb.key)
      },
      missingConfigurations: Object.entries({
        'DATABASE_URL': !!this.config.postgresql.connectionString,
        'AZURE_OPENAI_API_KEY': !!this.config.openai.apiKey,
        'AZURE_OPENAI_ENDPOINT': !!this.config.openai.endpoint,
        'DATABRICKS_HOST': !!this.config.databricks.host,
        'DATABRICKS_TOKEN': !!this.config.databricks.token,
        'AZURE_SEARCH_ENDPOINT': !!this.config.search.endpoint,
        'AZURE_SEARCH_KEY': !!this.config.search.apiKey,
        'COSMOSDB_ENDPOINT': !!this.config.cosmosdb.endpoint,
        'COSMOSDB_KEY': !!this.config.cosmosdb.key
      }).filter(([key, configured]) => !configured).map(([key]) => key)
    };
  }
}

export const azureEnvironmentValidator = new AzureEnvironmentValidator();

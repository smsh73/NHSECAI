import { CosmosClient, Database, Container } from '@azure/cosmos';
import { azureConfigService } from './azure-config.js';

/**
 * Azure CosmosDB Schema Service
 * Provides database and collection schema inspection capabilities
 */

export interface CosmosDBSchemaInfo {
  databases: Array<{
    id: string;
    containers: Array<{
      id: string;
      partitionKey: string;
      sampleSchema?: Record<string, any>;
    }>;
  }>;
}

export interface ContainerSchemaInfo {
  id: string;
  partitionKey: string;
  indexingPolicy: any;
  sampleDocuments: any[];
  inferredSchema: Record<string, string>;
}

export class AzureCosmosDBService {
  private client: CosmosClient | null = null;
  private initialized = false;

  /**
   * Initialize connection to Azure CosmosDB
   */
  async initialize(): Promise<void> {
    if (this.initialized && this.client) return;

    try {
      const config = azureConfigService.getCosmosDBConfig();

      console.log("🔒 Connecting to Azure CosmosDB using environment configuration");

      this.client = new CosmosClient({
        endpoint: config.endpoint,
        key: config.key
      });

      // Test connection
      await this.client.getDatabaseAccount();

      this.initialized = true;
      console.log("✅ Azure CosmosDB connection established successfully");
    } catch (error) {
      console.error("❌ Failed to connect to Azure CosmosDB:", error);
      throw new Error(`CosmosDB connection failed: ${error}`);
    }
  }

  /**
   * Execute a query against a specific database and container
   */
  async queryItems(
    databaseId: string,
    containerId: string,
    query: string,
    options?: { maxItemCount?: number }
  ): Promise<any[]> {
    await this.initialize();

    if (!this.client) {
      throw new Error("CosmosDB client not initialized");
    }

    const container = this.client.database(databaseId).container(containerId);
    const { resources } = await container.items
      .query(query, { maxItemCount: options?.maxItemCount })
      .fetchAll();
    return resources;
  }

  /**
   * Get database and collection schema information
   */
  async getDatabaseSchema(): Promise<CosmosDBSchemaInfo> {
    await this.initialize();

    if (!this.client) {
      throw new Error("CosmosDB client not initialized");
    }

    try {
      console.log("🔄 Fetching CosmosDB database schema...");

      // Get all databases
      const { resources: databases } = await this.client.databases.readAll().fetchAll();

      const databaseSchemas = [];

      for (const database of databases) {
        const db = this.client.database(database.id);

        // Get all containers in database
        const { resources: containers } = await db.containers.readAll().fetchAll();

        const containerSchemas = [];

        for (const container of containers) {
          const containerDef = await db.container(container.id).read();
          
          // Get partition key
          const partitionKey = containerDef.resource?.partitionKey?.paths?.[0] || 'Unknown';

          // Try to get a sample document for schema inference
          let sampleSchema;
          try {
            const { resources: items } = await db.container(container.id)
              .items.query('SELECT TOP 1 * FROM c')
              .fetchAll();

            if (items.length > 0) {
              sampleSchema = this.inferSchemaFromDocument(items[0]);
            }
          } catch (error) {
            console.warn(`Failed to fetch sample document from ${container.id}:`, error);
          }

          containerSchemas.push({
            id: container.id,
            partitionKey,
            sampleSchema
          });
        }

        databaseSchemas.push({
          id: database.id,
          containers: containerSchemas
        });
      }

      console.log(`✅ Retrieved schema for ${databaseSchemas.length} databases`);
      return { databases: databaseSchemas };
    } catch (error) {
      console.error("❌ Failed to fetch CosmosDB schema:", error);
      throw new Error(`Schema fetch failed: ${error}`);
    }
  }

  /**
   * Get detailed container schema
   */
  async getContainerSchema(databaseId: string, containerId: string): Promise<ContainerSchemaInfo> {
    await this.initialize();

    if (!this.client) {
      throw new Error("CosmosDB client not initialized");
    }

    try {
      console.log(`🔄 Fetching schema for container: ${databaseId}.${containerId}`);

      const container = this.client.database(databaseId).container(containerId);

      // Get container definition
      const { resource: containerDef } = await container.read();

      const partitionKey = containerDef?.partitionKey?.paths?.[0] || 'Unknown';
      const indexingPolicy = containerDef?.indexingPolicy || {};

      // Get sample documents
      const { resources: sampleDocuments } = await container.items
        .query('SELECT TOP 5 * FROM c')
        .fetchAll();

      // Infer schema from sample documents
      const inferredSchema = this.inferSchemaFromDocuments(sampleDocuments);

      console.log(`✅ Retrieved schema for container ${containerId}`);

      return {
        id: containerId,
        partitionKey,
        indexingPolicy,
        sampleDocuments,
        inferredSchema
      };
    } catch (error) {
      console.error(`❌ Failed to fetch container schema for ${containerId}:`, error);
      throw new Error(`Container schema fetch failed: ${error}`);
    }
  }

  /**
   * Infer schema from a single document
   */
  private inferSchemaFromDocument(doc: any): Record<string, string> {
    const schema: Record<string, string> = {};

    for (const [key, value] of Object.entries(doc)) {
      schema[key] = this.getValueType(value);
    }

    return schema;
  }

  /**
   * Infer schema from multiple documents
   */
  private inferSchemaFromDocuments(docs: any[]): Record<string, string> {
    if (docs.length === 0) return {};

    const schema: Record<string, Set<string>> = {};

    // Collect all types for each field across all documents
    for (const doc of docs) {
      for (const [key, value] of Object.entries(doc)) {
        if (!schema[key]) {
          schema[key] = new Set<string>();
        }
        schema[key].add(this.getValueType(value));
      }
    }

    // Convert to final schema with combined types
    const finalSchema: Record<string, string> = {};
    for (const [key, types] of Object.entries(schema)) {
      finalSchema[key] = Array.from(types).join(' | ');
    }

    return finalSchema;
  }

  /**
   * Get value type as string
   */
  private getValueType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) {
      if (value.length === 0) return 'array<unknown>';
      const itemTypes = new Set(value.map(item => this.getValueType(item)));
      return `array<${Array.from(itemTypes).join(' | ')}>`;
    }
    if (typeof value === 'object') return 'object';
    return typeof value;
  }

  /**
   * Get database instance
   */
  async getDatabase(databaseId?: string): Promise<Database> {
    await this.initialize();

    if (!this.client) {
      throw new Error("CosmosDB client not initialized");
    }

    const config = azureConfigService.getCosmosDBConfig();
    const dbId = databaseId || config.databaseId;

    if (!dbId) {
      throw new Error("Database ID is required");
    }

    return this.client.database(dbId);
  }

  /**
   * Close client connection
   */
  async close(): Promise<void> {
    this.client = null;
    this.initialized = false;
    console.log("✅ Azure CosmosDB connection closed");
  }
}

// Create singleton instance
let cosmosdbService: AzureCosmosDBService | null = null;

export function getAzureCosmosDBService(): AzureCosmosDBService {
  if (!cosmosdbService) {
    cosmosdbService = new AzureCosmosDBService();
  }
  return cosmosdbService;
}

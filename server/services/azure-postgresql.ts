import { Client, ClientConfig } from 'pg';
import { azureConfigService } from './azure-config.js';

/**
 * Azure PostgreSQL Schema Service
 * Provides database schema inspection capabilities
 */

export interface PostgreSQLSchemaInfo {
  schemas: Array<{
    name: string;
    isSystem?: boolean;
    tables: Array<{
      name: string;
      type: string;
      rowCount?: number;
      isSystem?: boolean;
    }>;
  }>;
}

export interface TableSchemaInfo {
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    defaultValue?: string;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
    maxLength?: number;
    numericPrecision?: number;
    numericScale?: number;
  }>;
  indexes?: Array<{
    name: string;
    columns: string[];
    isUnique: boolean;
  }>;
  rowCount?: number;
}

export class AzurePostgreSQLService {
  private client: Client | null = null;
  private initialized = false;

  /**
   * Initialize connection to Azure PostgreSQL
   */
  async initialize(): Promise<void> {
    if (this.initialized && this.client) return;

    try {
      const config = azureConfigService.getPostgreSQLConfig();

      console.log("🔒 Connecting to Azure PostgreSQL using environment configuration");

      const clientConfig: ClientConfig = {
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
        // Azure PostgreSQL은 항상 SSL 사용
        ssl: { rejectUnauthorized: false },
      };

      this.client = new Client(clientConfig);
      await this.client.connect();

      this.initialized = true;
      console.log("✅ Azure PostgreSQL connection established successfully");
    } catch (error) {
      console.error("❌ Failed to connect to Azure PostgreSQL:", error);
      throw new Error(`PostgreSQL connection failed: ${error}`);
    }
  }

  /**
   * Test connection to Azure PostgreSQL
   */
  async testConnection(): Promise<{ connected: boolean; version?: string; database?: string }> {
    try {
      await this.initialize();

      if (!this.client) {
        throw new Error("PostgreSQL client not initialized");
      }

      // Test query to get PostgreSQL version
      const result = await this.client.query('SELECT version(), current_database()');
      const version = result.rows[0].version;
      const database = result.rows[0].current_database;

      console.log(`✅ PostgreSQL connection test successful - ${database}`);
      
      return {
        connected: true,
        version,
        database
      };
    } catch (error) {
      console.error("❌ PostgreSQL connection test failed:", error);
      throw error;
    }
  }

  /**
   * Get database schema information
   */
  async getDatabaseSchema(): Promise<PostgreSQLSchemaInfo> {
    await this.initialize();

    if (!this.client) {
      throw new Error("PostgreSQL client not initialized");
    }

    try {
      console.log("🔄 Fetching PostgreSQL database schema...");

      // Get all schemas (excluding system schemas for user view, but we'll mark them)
      const schemasResult = await this.client.query(`
        SELECT schema_name 
        FROM information_schema.schemata 
        ORDER BY schema_name
      `);

      // System schemas
      const systemSchemas = new Set(['information_schema', 'pg_catalog', 'pg_toast', 'pg_toast_temp_1', 'pg_temp_1', 'pg_catalog_1']);

      const schemas = [];

      for (const schemaRow of schemasResult.rows) {
        const schemaName = schemaRow.schema_name;
        const isSystemSchema = systemSchemas.has(schemaName);

        // Get tables in schema with row counts
        const tablesResult = await this.client.query(`
          SELECT 
            t.table_name,
            t.table_type,
            CASE 
              WHEN t.table_type = 'BASE TABLE' THEN 
                (SELECT n_live_tup 
                 FROM pg_stat_user_tables 
                 WHERE schemaname = $1 AND relname = t.table_name)
              ELSE NULL
            END as row_count
          FROM information_schema.tables t
          WHERE t.table_schema = $1
          ORDER BY t.table_name
        `, [schemaName]);

        const tables = await Promise.all(
          tablesResult.rows.map(async (row) => {
            let rowCount: number | undefined = row.row_count;
            const isSystemTable = row.table_name.startsWith('pg_') || 
                                  row.table_name.startsWith('sql_') ||
                                  isSystemSchema;

            // If row_count is not available from pg_stat_user_tables, try direct count
            if (rowCount === null && row.table_type === 'BASE TABLE') {
              try {
                const countResult = await this.client!.query(
                  `SELECT COUNT(*) as cnt FROM ${schemaName}.${row.table_name}`
                );
                rowCount = parseInt(countResult.rows[0]?.cnt || '0', 10);
              } catch (countError) {
                // Count may fail for system tables or views
                console.warn(`Failed to get row count for ${schemaName}.${row.table_name}:`, countError);
              }
            }

            return {
              name: row.table_name,
              type: row.table_type,
              rowCount: rowCount !== null ? rowCount : undefined,
              isSystem: isSystemTable
            };
          })
        );

        schemas.push({
          name: schemaName,
          tables,
          isSystem: isSystemSchema
        });
      }

      console.log(`✅ Retrieved schema for ${schemas.length} schemas`);
      return { schemas };
    } catch (error) {
      console.error("❌ Failed to fetch PostgreSQL schema:", error);
      throw new Error(`Schema fetch failed: ${error}`);
    }
  }

  /**
   * Get table schema details
   */
  async getTableSchema(schemaName: string, tableName: string): Promise<TableSchemaInfo> {
    await this.initialize();

    if (!this.client) {
      throw new Error("PostgreSQL client not initialized");
    }

    try {
      console.log(`🔄 Fetching schema for table: ${schemaName}.${tableName}`);

      // Get column information with detailed type info
      const columnsResult = await this.client.query(`
        SELECT 
          c.column_name,
          c.data_type,
          c.character_maximum_length,
          c.numeric_precision,
          c.numeric_scale,
          c.is_nullable,
          c.column_default,
          CASE 
            WHEN pk.column_name IS NOT NULL THEN true 
            ELSE false 
          END as is_primary_key,
          CASE 
            WHEN fk.column_name IS NOT NULL THEN true 
            ELSE false 
          END as is_foreign_key
        FROM information_schema.columns c
        LEFT JOIN (
          SELECT ku.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku
            ON tc.constraint_name = ku.constraint_name
            AND tc.table_schema = ku.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_schema = $1
            AND tc.table_name = $2
        ) pk ON c.column_name = pk.column_name
        LEFT JOIN (
          SELECT ku.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku
            ON tc.constraint_name = ku.constraint_name
            AND tc.table_schema = ku.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = $1
            AND tc.table_name = $2
        ) fk ON c.column_name = fk.column_name
        WHERE c.table_schema = $1
          AND c.table_name = $2
        ORDER BY c.ordinal_position
      `, [schemaName, tableName]);

      // Get row count
      let rowCount: number | undefined;
      try {
        const countResult = await this.client.query(
          `SELECT COUNT(*) as cnt FROM ${schemaName}.${tableName}`
        );
        rowCount = parseInt(countResult.rows[0]?.cnt || '0', 10);
      } catch (countError) {
        console.warn(`Failed to get row count for ${schemaName}.${tableName}:`, countError);
      }

      const columns = columnsResult.rows.map(row => ({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        defaultValue: row.column_default || undefined,
        isPrimaryKey: row.is_primary_key,
        isForeignKey: row.is_foreign_key,
        maxLength: row.character_maximum_length ? parseInt(row.character_maximum_length, 10) : undefined,
        numericPrecision: row.numeric_precision ? parseInt(row.numeric_precision, 10) : undefined,
        numericScale: row.numeric_scale ? parseInt(row.numeric_scale, 10) : undefined
      }));

      // Get indexes
      const indexesResult = await this.client.query(`
        SELECT
          i.relname as index_name,
          a.attname as column_name,
          ix.indisunique as is_unique
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE t.relname = $1
          AND n.nspname = $2
        ORDER BY i.relname, a.attnum
      `, [tableName, schemaName]);

      const indexesMap = new Map<string, { columns: string[]; isUnique: boolean }>();
      
      for (const row of indexesResult.rows) {
        if (!indexesMap.has(row.index_name)) {
          indexesMap.set(row.index_name, {
            columns: [],
            isUnique: row.is_unique
          });
        }
        indexesMap.get(row.index_name)!.columns.push(row.column_name);
      }

      const indexes = Array.from(indexesMap.entries()).map(([name, info]) => ({
        name,
        columns: info.columns,
        isUnique: info.isUnique
      }));

      console.log(`✅ Retrieved ${columns.length} columns and ${indexes.length} indexes for table ${tableName}`);

      return { columns, indexes, rowCount };
    } catch (error) {
      console.error(`❌ Failed to fetch table schema for ${tableName}:`, error);
      throw new Error(`Table schema fetch failed: ${error}`);
    }
  }

  /**
   * Execute SQL query
   */
  async executeQuery(sql: string, params?: any[]): Promise<{ rows: any[]; rowCount: number }> {
    await this.initialize();

    if (!this.client) {
      throw new Error("PostgreSQL client not initialized");
    }

    try {
      console.log(`🔄 Executing PostgreSQL query: ${sql.substring(0, 100)}...`);
      
      const result = await this.client.query(sql, params);
      
      console.log(`✅ Query executed successfully, returned ${result.rows.length} rows`);
      
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0
      };
    } catch (error) {
      console.error(`❌ PostgreSQL query failed:`, error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
      this.initialized = false;
      console.log("✅ Azure PostgreSQL connection closed");
    }
  }
}

// Create singleton instance
let postgresqlService: AzurePostgreSQLService | null = null;

export function getAzurePostgreSQLService(): AzurePostgreSQLService {
  if (!postgresqlService) {
    postgresqlService = new AzurePostgreSQLService();
  }
  return postgresqlService;
}

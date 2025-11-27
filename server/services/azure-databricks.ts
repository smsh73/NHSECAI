import { DBSQLClient, DBSQLSession, LogLevel } from "@databricks/sql";
import { getAzureAuthService } from "./azure-auth.js";
import { azureConfigService } from "./azure-config.js";

/**
 * Azure Databricks Service with Environment Variable Configuration
 *
 * Features:
 * - Environment variable-based configuration (no code changes needed)
 * - Zero Trust authentication via Azure AD integration
 * - Support for Mosaic AI Vector Search
 * - Private endpoint support
 * - Large-scale data processing capabilities
 * - Automatic connection management and retry logic
 * - Cost optimization and query performance monitoring
 */

export interface DatabricksConfig {
  serverHostname: string;
  httpPath: string;
  authToken?: string;
  useAzureAD?: boolean;
  maxRetries?: number;
  connectionTimeout?: number;
  queryTimeout?: number;
}

export interface QueryResult {
  data: Array<Record<string, unknown>>;
  schema: Array<{
    name: string;
    type: string;
  }>;
  rowCount: number;
  executionTime: number;
  cost?: {
    dbuUsed: number;
    estimatedCost: string;
  };
}

export interface VectorSearchIndex {
  name: string;
  endpointName: string;
  sourceTable: string;
  primaryKey: string;
  embeddingColumn?: string;
  embeddingModel?: string;
  vectorDimension?: number;
  status: "ONLINE" | "OFFLINE" | "PROVISIONING" | "FAILED";
}

export class AzureDatabricksService {
  private client: DBSQLClient;
  private session: DBSQLSession | null = null;
  private config: DatabricksConfig;
  private initialized = false;

  constructor(config: DatabricksConfig) {
    this.config = {
      maxRetries: 3,
      connectionTimeout: 30000,
      queryTimeout: 300000, // 5 minutes
      ...config,
    };

    this.client = new DBSQLClient();
  }

  /**
   * Initialize connection to Azure Databricks with Environment Variable Configuration
   *
   * Supports both Azure-specific and standard Databricks environment variables:
   * - Standard (recommended): DATABRICKS_SERVER_HOSTNAME, DATABRICKS_HTTP_PATH, DATABRICKS_TOKEN
   * - Azure-specific: AZURE_DATABRICKS_HOST, AZURE_DATABRICKS_HTTP_PATH, AZURE_DATABRICKS_TOKEN
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Get configuration from environment variables with fallback to standard names
      const databricksConfig = azureConfigService.getDatabricksConfig();

      console.log(
        "🔒 Connecting to Azure Databricks using environment configuration"
      );

      // Support both Azure-specific and standard environment variable names
      const serverHostname =
        databricksConfig.serverHostname ||
        process.env.DATABRICKS_SERVER_HOSTNAME ||
        "";

      const httpPath =
        databricksConfig.httpPath || process.env.DATABRICKS_HTTP_PATH || "";

      const token =
        databricksConfig.authToken || process.env.DATABRICKS_TOKEN || "";

      // Use private endpoint if configured
      const host =
        databricksConfig.usePrivateEndpoint &&
        databricksConfig.privateEndpointUrl
          ? databricksConfig.privateEndpointUrl
          : serverHostname;

      if (!host || !httpPath) {
        throw new Error(
          "Databricks configuration is incomplete. Please set one of:\n" +
            "  Standard: DATABRICKS_SERVER_HOSTNAME and DATABRICKS_HTTP_PATH\n" +
            "  Azure-specific: AZURE_DATABRICKS_HOST and AZURE_DATABRICKS_HTTP_PATH"
        );
      }

      if (!token) {
        console.warn(
          "⚠️  No authentication token provided. Set DATABRICKS_TOKEN or AZURE_DATABRICKS_TOKEN"
        );
      }

      // Connection options following Microsoft official documentation pattern
      // Disable Cloud Fetch to avoid Blob SAS downloads (for Cluster connections)
      const connectionOptions = {
        token: token,
        host: host,
        path: httpPath,
        useCloudFetch: false,
        useArrowNativeTypes: false,
      } as any;

      console.log(`📡 Connecting to: ${host}${httpPath}`);
      if (databricksConfig.usePrivateEndpoint) {
        console.log("🔐 Using private endpoint connection");
      }

      // Establish connection
      const connection = await this.client.connect(connectionOptions);

      // Open session with Cloud Fetch disabled
      this.session = await connection.openSession({
        initialCatalog: process.env.DATABRICKS_ALLOWED_CATALOGS?.split(',')[0] || 'nh_ai',
      });

      // Set session-level configuration to disable Cloud Fetch
      if (this.session) {
        try {
          await this.session.executeStatement("SET spark.databricks.sql.cloudFetch.enabled = false");
          console.log("🔧 Disabled Cloud Fetch at session level");
        } catch (configError) {
          console.warn("⚠️ Could not set Cloud Fetch config (may not be supported on Cluster):", configError);
        }
      }

      this.initialized = true;
      console.log("✅ Azure Databricks connection established successfully");

      // Validate connection with a test query
      await this.validateConnection();
    } catch (error) {
      console.error("❌ Failed to connect to Azure Databricks:", error);
      
      // Properly extract error message
      let errorMessage = "Databricks connection failed";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        // Handle various error object structures
        if ('message' in error) {
          errorMessage = String(error.message);
        } else if ('error' in error) {
          errorMessage = String(error.error);
        } else if ('detail' in error) {
          errorMessage = String(error.detail);
        } else if ('statusCode' in error || 'status' in error) {
          const statusCode = (error as any).statusCode || (error as any).status;
          errorMessage = `HTTP ${statusCode}: ${errorMessage}`;
        } else {
          // Try to get meaningful information from the error object
          try {
            const errorStr = JSON.stringify(error);
            errorMessage = `Databricks connection failed: ${errorStr}`;
          } catch {
            errorMessage = "Databricks connection failed: Unknown error";
          }
        }
      }
      
      // Provide specific error messages for common HTTP errors
      if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        errorMessage = `Databricks 접근 거부 (403 Forbidden): 인증 토큰이 유효하지 않거나 권한이 없습니다. DATABRICKS_TOKEN 또는 권한 설정을 확인하세요. 원본 에러: ${errorMessage}`;
      } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        errorMessage = `Databricks 인증 실패 (401 Unauthorized): 인증 토큰이 없거나 만료되었습니다. DATABRICKS_TOKEN을 확인하세요. 원본 에러: ${errorMessage}`;
      } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        errorMessage = `Databricks 리소스를 찾을 수 없음 (404 Not Found): HTTP 경로나 서버 호스트명을 확인하세요. 원본 에러: ${errorMessage}`;
      } else if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
        errorMessage = `Databricks 요청 한도 초과 (429 Too Many Requests): 잠시 후 다시 시도하세요. 원본 에러: ${errorMessage}`;
      } else if (errorMessage.includes('bad HTTP status') || errorMessage.includes('THTTPException')) {
        errorMessage = `Databricks HTTP 오류: ${errorMessage}. 인증 토큰, HTTP 경로, 서버 호스트명을 확인하세요.`;
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Execute SQL query on Databricks
   */
  async executeQuery(
    sql: string,
    parameters: Record<string, unknown> = {},
    options: {
      timeout?: number;
      maxRows?: number;
      trackCost?: boolean;
      retryCount?: number;
    } = {}
  ): Promise<QueryResult> {
    await this.initialize();

    if (!this.session) {
      throw new Error("Databricks session not available");
    }

    const startTime = Date.now();
    const maxRetries = options.retryCount || 3;
    let lastError: Error | unknown;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 Retrying Databricks query (attempt ${attempt + 1}/${maxRetries})...`);
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt), 10000)));
          // Reinitialize connection if needed
          if (attempt === 1) {
            try {
              await this.initialize();
            } catch (initError) {
              console.warn("Failed to reinitialize connection, continuing with existing session");
            }
          }
        }

        console.log(`🔄 Executing Databricks query: ${sql.substring(0, 100)}...`);

        // Set timeout for query execution
        // For sample data queries, use shorter timeout to prevent hanging
        const isSampleQuery = /LIMIT\s+\d+/i.test(sql) && /SELECT/i.test(sql);
        const timeoutMs = options.timeout || (isSampleQuery ? 60000 : 300000); // 1 minute for sample, 5 minutes default
        const queryPromise = (async () => {
          const operation = await this.session!.executeStatement(sql, {
            maxRows: options.maxRows || 10000,
          });

          // Fetch results with timeout
          const result = await Promise.race([
            operation.fetchAll(),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Query execution timeout')), timeoutMs)
            )
          ]) as Array<Record<string, unknown>>;

          const schemaResult = await operation.getSchema();

          return { result, schemaResult };
        })();

        const { result, schemaResult } = await queryPromise;

        const executionTime = Date.now() - startTime;

        console.log(
          `✅ Query executed successfully in ${executionTime}ms, returned ${result.length} rows`
        );

        // Extract schema information
        const schemaInfo = schemaResult
          ? Array.from(schemaResult).map((column: any) => ({
              name: column.columnName || "unknown",
              type: column.typeName || "unknown",
            }))
          : [];

        const queryResult: QueryResult = {
          data: result,
          schema: schemaInfo,
          rowCount: result.length,
          executionTime,
        };

        // Add cost tracking if requested
        if (options.trackCost) {
          queryResult.cost = await this.estimateQueryCost(sql, executionTime);
        }

        return queryResult;
      } catch (error) {
        lastError = error;
        const executionTime = Date.now() - startTime;
        
        // Check if error is retryable (network errors, timeouts)
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isInvalidSession = this.isInvalidSessionError(errorMessage);
        const isRetryable = 
          errorMessage.includes('timeout') ||
          errorMessage.includes('network') ||
          errorMessage.includes('ECONNRESET') ||
          errorMessage.includes('socket') ||
          errorMessage.includes('TLS') ||
          errorMessage.includes('connection') ||
          errorMessage.includes('ETIMEDOUT') ||
          errorMessage.includes('disconnected') ||
          errorMessage.includes('before secure TLS') ||
          errorMessage.includes('QUERY_REQUEST_WRITE_TO_CLOUD_STORE_FAILED') ||
          errorMessage.includes('WRITE_TO_CLOUD_STORE_FAILED');

        // Check for HTTP status code errors (403, 401, 404, etc.)
        const isHttpError = 
          errorMessage.includes('403') ||
          errorMessage.includes('401') ||
          errorMessage.includes('404') ||
          errorMessage.includes('429') ||
          errorMessage.includes('bad HTTP status') ||
          errorMessage.includes('THTTPException');

        console.error(`❌ Query failed after ${executionTime}ms (attempt ${attempt + 1}/${maxRetries}):`, errorMessage);

        if (isInvalidSession) {
          console.warn("⚠️ Databricks session invalid. Resetting session and retrying...");
          try {
            await this.resetSession();
            // Wait a bit for session to be fully ready
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (resetError) {
            console.error("❌ Failed to reset session:", resetError);
            // If reset fails, mark as not initialized and try to reinitialize
            this.initialized = false;
            this.session = null;
            try {
              await this.initialize();
            } catch (initError) {
              console.error("❌ Failed to reinitialize after session reset:", initError);
              throw new Error(`Session reset and reinitialization failed: ${initError instanceof Error ? initError.message : String(initError)}`);
            }
          }
          continue;
        }

        // Handle QUERY_RESULT_WRITE_TO_CLOUD_STORE_FAILED error specifically
        if (errorMessage.includes('QUERY_RESULT_WRITE_TO_CLOUD_STORE_FAILED') || 
            errorMessage.includes('QUERY_REQUEST_WRITE_TO_CLOUD_STORE_FAILED') || 
            errorMessage.includes('WRITE_TO_CLOUD_STORE_FAILED')) {
          // This error occurs when result set is too large
          // Check if LIMIT clause exists, if not suggest adding one
          const hasLimit = /LIMIT\s+\d+/i.test(sql);
          if (!hasLimit) {
            throw new Error(
              `쿼리 결과가 너무 커서 클라우드 스토어에 저장할 수 없습니다. ` +
              `LIMIT 절을 추가해주세요. ` +
              `예: SELECT * FROM table LIMIT 1000`
            );
          } else {
            // LIMIT exists but still too large, suggest smaller limit
            throw new Error(
              `쿼리 결과가 너무 커서 클라우드 스토어에 저장할 수 없습니다. ` +
              `LIMIT 값을 더 작게 설정해주세요 (예: LIMIT 100 또는 LIMIT 500). ` +
              `또는 WHERE 절을 추가하여 결과 범위를 줄여주세요.`
            );
          }
        }

        // If not retryable or last attempt, throw error
        if (!isRetryable || attempt === maxRetries - 1 || isHttpError) {
          // Properly extract error message
          let finalErrorMessage = "Query execution failed";
          if (error instanceof Error) {
            finalErrorMessage = error.message;
          } else if (typeof error === 'string') {
            finalErrorMessage = error;
          } else if (error && typeof error === 'object') {
            // Handle various error object structures
            if ('message' in error) {
              finalErrorMessage = String(error.message);
            } else if ('error' in error) {
              finalErrorMessage = String(error.error);
            } else if ('statusCode' in error || 'status' in error) {
              const statusCode = (error as any).statusCode || (error as any).status;
              finalErrorMessage = `HTTP ${statusCode}: ${finalErrorMessage}`;
            } else {
              finalErrorMessage = JSON.stringify(error);
            }
          }
          
          // Provide specific error messages for common HTTP errors
          if (isHttpError) {
            if (errorMessage.includes('403') || finalErrorMessage.includes('403')) {
              finalErrorMessage = `Databricks 접근 거부 (403 Forbidden): 인증 토큰이 유효하지 않거나 권한이 없습니다. DATABRICKS_TOKEN 또는 권한 설정을 확인하세요. 원본 에러: ${finalErrorMessage}`;
            } else if (errorMessage.includes('401') || finalErrorMessage.includes('401')) {
              finalErrorMessage = `Databricks 인증 실패 (401 Unauthorized): 인증 토큰이 없거나 만료되었습니다. DATABRICKS_TOKEN을 확인하세요. 원본 에러: ${finalErrorMessage}`;
            } else if (errorMessage.includes('404') || finalErrorMessage.includes('404')) {
              finalErrorMessage = `Databricks 리소스를 찾을 수 없음 (404 Not Found): HTTP 경로나 서버 호스트명을 확인하세요. 원본 에러: ${finalErrorMessage}`;
            } else if (errorMessage.includes('429') || finalErrorMessage.includes('429')) {
              finalErrorMessage = `Databricks 요청 한도 초과 (429 Too Many Requests): 잠시 후 다시 시도하세요. 원본 에러: ${finalErrorMessage}`;
            }
          }
          
          throw new Error(`Query execution failed: ${finalErrorMessage}`);
        }
        
        // Continue to next retry attempt
      }
    }
    
    // Should not reach here, but throw last error if we do
    throw lastError || new Error('Query execution failed after all retries');
  }

  private isInvalidSessionError(message: string): boolean {
    if (!message) return false;
    const normalized = message.toLowerCase();
    return normalized.includes("invalid sessionhandle") || normalized.includes("session not found");
  }

  private async resetSession(): Promise<void> {
    try {
      await this.close();
    } catch (closeError) {
      console.warn("⚠️ Error closing session during reset:", closeError);
      // Continue with reset even if close fails
    }
    
    // Reset initialization state
    this.initialized = false;
    this.session = null;
    
    // Reinitialize connection
    await this.initialize();
  }

  /**
   * Create vector search index using Mosaic AI Vector Search
   */
  async createVectorSearchIndex(
    indexName: string,
    config: {
      endpointName: string;
      sourceTableName: string;
      primaryKey: string;
      embeddingSourceColumn?: string;
      embeddingVectorColumn?: string;
      embeddingModelEndpoint?: string;
      syncMode?: "TRIGGERED" | "CONTINUOUS";
    }
  ): Promise<VectorSearchIndex> {
    await this.initialize();

    try {
      console.log(`🔄 Creating vector search index: ${indexName}`);

      // Create vector search index using SQL API
      const createIndexSQL = `
        CREATE OR REPLACE INDEX ${indexName}
        ON TABLE ${config.sourceTableName}
        USING VECTOR_SEARCH (
          PRIMARY_KEY ${config.primaryKey}
          ${
            config.embeddingSourceColumn
              ? `, EMBEDDING_SOURCE_COLUMN ${config.embeddingSourceColumn}`
              : ""
          }
          ${
            config.embeddingVectorColumn
              ? `, EMBEDDING_VECTOR_COLUMN ${config.embeddingVectorColumn}`
              : ""
          }
          ${
            config.embeddingModelEndpoint
              ? `, EMBEDDING_MODEL_ENDPOINT ${config.embeddingModelEndpoint}`
              : ""
          }
        )
        OPTIONS (
          'sync_mode' = '${config.syncMode || "TRIGGERED"}'
        )
      `;

      await this.executeQuery(createIndexSQL);

      console.log(`✅ Vector search index ${indexName} created successfully`);

      return {
        name: indexName,
        endpointName: config.endpointName,
        sourceTable: config.sourceTableName,
        primaryKey: config.primaryKey,
        embeddingColumn:
          config.embeddingSourceColumn || config.embeddingVectorColumn,
        embeddingModel: config.embeddingModelEndpoint,
        status: "PROVISIONING",
      };
    } catch (error) {
      console.error(
        `❌ Failed to create vector search index ${indexName}:`,
        error
      );
      throw new Error(`Vector index creation failed: ${error}`);
    }
  }

  /**
   * Get database schema information (catalogs, schemas, tables)
   */
  async getDatabaseSchema(): Promise<{
    catalogs: Array<{
      name: string;
      schemas: Array<{
        name: string;
        isSystem: boolean;
        tables: Array<{
          name: string;
          type: string;
          rowCount?: number;
          isSystem: boolean;
        }>;
      }>;
    }>;
  }> {
    await this.initialize();

    try {
      console.log("🔄 Fetching Databricks database schema...");

      // Get catalogs and filter to allowed ones (default: nh_ai)
      const catalogsResult = await this.executeQuery("SHOW CATALOGS");
      const allCatalogs: string[] = catalogsResult.data.map(
        (row: any) => row.catalog || row.name
      );
      const allowedEnv = (process.env.DATABRICKS_ALLOWED_CATALOGS || 'nh_ai')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      // Include nh_ai catalog explicitly if it exists
      const catalogs = allCatalogs.filter(c => {
        const catalogLower = String(c).toLowerCase();
        return allowedEnv.includes(catalogLower) || catalogLower === 'nh_ai';
      });

      const schemaInfo = [];

      // System catalogs (typically: hive_metastore, system, information_schema)
      const systemCatalogs = new Set(['hive_metastore', 'system', 'information_schema', 'sys']);

      for (const catalog of catalogs.slice(0, 10)) {
        // Limit to first 10 catalogs
        const isSystemCatalog = systemCatalogs.has(catalog.toLowerCase());
        try {
          // Get schemas in catalog
          const schemasResult = await this.executeQuery(
            `SHOW SCHEMAS IN ${catalog}`
          );
          const schemas = schemasResult.data.map(
            (row: any) => row.databaseName || row.namespace || row.schemaName
          );

          const catalogSchemas = [];

          // System schemas (typically: information_schema, sys)
          // Note: 'default' is not filtered as it may contain user data in nh_ai catalog
          const systemSchemas = new Set(['information_schema', 'sys']);

          for (const schema of schemas.slice(0, 20)) {
            // Limit to first 20 schemas
            const isSystemSchema = systemSchemas.has(schema.toLowerCase());
            try {
              // Get tables in schema
              const tablesResult = await this.executeQuery(
                `SHOW TABLES IN ${catalog}.${schema}`
              );
              
              const tables = await Promise.all(
                tablesResult.data.map(async (row: any) => {
                  const tableName = row.tableName;
                  const tableType = row.isTemporary ? "TEMPORARY" : "TABLE";
                  const isSystemTable = tableName.startsWith('__') || 
                                       tableName.toLowerCase().includes('system') ||
                                       tableName.toLowerCase().includes('metadata');
                  
                  // Get row count (with error handling)
                  let rowCount: number | undefined;
                  try {
                    const countResult = await this.executeQuery(
                      `SELECT COUNT(*) as cnt FROM ${catalog}.${schema}.${tableName}`
                    );
                    rowCount = parseInt(countResult.data[0]?.cnt || countResult.data[0]?.CNT || '0', 10);
                  } catch (countError) {
                    // Row count query may fail for system tables or views
                    console.warn(`Failed to get row count for ${catalog}.${schema}.${tableName}:`, countError);
                  }

                  return {
                    name: tableName,
                    type: tableType,
                    rowCount,
                    isSystem: isSystemTable || isSystemSchema || isSystemCatalog,
                  };
                })
              );

              catalogSchemas.push({
                name: schema,
                isSystem: isSystemSchema || isSystemCatalog,
                tables,
              });
            } catch (error) {
              console.warn(
                `Failed to fetch tables for ${catalog}.${schema}:`,
                error
              );
              catalogSchemas.push({
                name: schema,
                isSystem: isSystemSchema || isSystemCatalog,
                tables: [],
              });
            }
          }

          schemaInfo.push({
            name: catalog,
            schemas: catalogSchemas,
          });
        } catch (error) {
          console.warn(
            `Failed to fetch schemas for catalog ${catalog}:`,
            error
          );
        }
      }

      console.log(`✅ Retrieved schema for ${schemaInfo.length} catalogs`);
      return { catalogs: schemaInfo };
    } catch (error) {
      console.error("❌ Failed to fetch database schema:", error);
      throw new Error(`Schema fetch failed: ${error}`);
    }
  }

  /**
   * Get table schema details (columns, types, etc.)
   */
  async getTableSchema(
    catalogName: string,
    schemaName: string,
    tableName: string
  ): Promise<{
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
      comment?: string;
      isPrimaryKey?: boolean;
      isPartitionColumn?: boolean;
      maxLength?: number;
    }>;
    primaryKeys?: string[];
    rowCount?: number;
  }> {
    await this.initialize();

    try {
      console.log(
        `🔄 Fetching schema for table: ${catalogName}.${schemaName}.${tableName}`
      );

      const describeResult = await this.executeQuery(
        `DESCRIBE TABLE EXTENDED ${catalogName}.${schemaName}.${tableName}`
      );

      // Get partition columns
      let partitionColumns: string[] = [];
      try {
        const partResult = await this.executeQuery(
          `SHOW PARTITIONS ${catalogName}.${schemaName}.${tableName}`
        );
        // Extract partition columns from partition spec
        if (partResult.data && partResult.data.length > 0) {
          const firstPartition = partResult.data[0];
          if (firstPartition.partition) {
            partitionColumns = Object.keys(firstPartition.partition || {});
          }
        }
      } catch (err) {
        // Table may not be partitioned, ignore error
      }

      // Get table properties to find primary keys
      let primaryKeys: string[] = [];
      try {
        const tableInfo = await this.executeQuery(
          `DESCRIBE EXTENDED ${catalogName}.${schemaName}.${tableName}`
        );
        // Parse table properties for primary key info
        for (const row of tableInfo.data || []) {
          if (row.col_name && row.data_type) {
            // Check if column is marked as primary key in comments or metadata
            if (row.comment && row.comment.toLowerCase().includes('primary key')) {
              primaryKeys.push(row.col_name);
            }
          }
        }
      } catch (err) {
        // Primary key info may not be available
      }

      // Get row count
      let rowCount: number | undefined;
      try {
        const countResult = await this.executeQuery(
          `SELECT COUNT(*) as cnt FROM ${catalogName}.${schemaName}.${tableName}`
        );
        rowCount = parseInt(countResult.data[0]?.cnt || countResult.data[0]?.CNT || '0', 10);
      } catch (countError) {
        console.warn(`Failed to get row count for ${tableName}:`, countError);
      }

      const columns = describeResult.data
        .filter((row: any) => row.col_name && !row.col_name.startsWith("#"))
        .map((row: any) => {
          const colType = row.data_type || '';
          // Extract max length from type string (e.g., "VARCHAR(255)" -> 255)
          const lengthMatch = colType.match(/\((\d+)\)/);
          const maxLength = lengthMatch ? parseInt(lengthMatch[1], 10) : undefined;

          return {
            name: row.col_name,
            type: colType,
            nullable: !colType.includes("NOT NULL"),
            comment: row.comment || undefined,
            isPrimaryKey: primaryKeys.includes(row.col_name),
            isPartitionColumn: partitionColumns.includes(row.col_name),
            maxLength,
          };
        });

      console.log(
        `✅ Retrieved ${columns.length} columns for table ${tableName}`
      );

      return { 
        columns, 
        primaryKeys: primaryKeys.length > 0 ? primaryKeys : undefined,
        rowCount 
      };
    } catch (error) {
      console.error(`❌ Failed to fetch table schema for ${tableName}:`, error);
      throw new Error(`Table schema fetch failed: ${error}`);
    }
  }

  /**
   * Search vector index for similar items
   */
  async vectorSearch(
    indexName: string,
    queryText: string,
    options: {
      numResults?: number;
      columns?: string[];
      filters?: Record<string, any>;
    } = {}
  ): Promise<any[]> {
    await this.initialize();

    const { numResults = 10, columns = ["*"], filters = {} } = options;

    try {
      console.log(
        `🔍 Performing vector search on ${indexName} for: ${queryText.substring(
          0,
          50
        )}...`
      );

      // Build vector search SQL query
      const columnsStr = columns.join(", ");
      const filterConditions = Object.entries(filters)
        .map(([key, value]) => `${key} = '${value}'`)
        .join(" AND ");

      const searchSQL = `
        SELECT ${columnsStr}
        FROM VECTOR_SEARCH(
          index => '${indexName}',
          query => '${queryText}',
          num_results => ${numResults}
          ${filterConditions ? `, filters => '${filterConditions}'` : ""}
        )
      `;

      const result = await this.executeQuery(searchSQL);

      console.log(
        `✅ Vector search completed, found ${result.rowCount} results`
      );

      return result.data;
    } catch (error) {
      console.error(`❌ Vector search failed on ${indexName}:`, error);
      throw new Error(`Vector search failed: ${error}`);
    }
  }

  /**
   * Load data from current system to Databricks for processing
   */
  async loadDataFromSystem(
    tableName: string,
    data: any[],
    options: {
      mode?: "OVERWRITE" | "APPEND" | "MERGE";
      partitionBy?: string[];
      clusteredBy?: string[];
    } = {}
  ): Promise<void> {
    await this.initialize();

    if (!data || data.length === 0) {
      throw new Error("No data provided for loading");
    }

    try {
      console.log(
        `🔄 Loading ${data.length} records to Databricks table: ${tableName}`
      );

      // Convert data to SQL INSERT statements
      const sampleRecord = data[0];
      const columns = Object.keys(sampleRecord);
      const columnsStr = columns.map((col) => `\`${col}\``).join(", ");

      // Create table if not exists (infer schema from first record)
      const createTableSQL = this.generateCreateTableSQL(
        tableName,
        sampleRecord,
        options
      );
      await this.executeQuery(createTableSQL);

      // Insert data in batches
      const batchSize = 1000;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);

        const valuesStr = batch
          .map((record) => {
            const values = columns
              .map((col) => {
                const value = record[col];
                if (value === null || value === undefined) return "NULL";
                if (typeof value === "string")
                  return `'${value.replace(/'/g, "''")}'`;
                if (typeof value === "object")
                  return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
                return String(value);
              })
              .join(", ");
            return `(${values})`;
          })
          .join(", ");

        const insertSQL = `
          INSERT INTO ${tableName} (${columnsStr})
          VALUES ${valuesStr}
        `;

        await this.executeQuery(insertSQL);

        console.log(
          `📤 Loaded batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
            data.length / batchSize
          )}`
        );
      }

      console.log(
        `✅ Successfully loaded ${data.length} records to ${tableName}`
      );
    } catch (error) {
      console.error(`❌ Failed to load data to ${tableName}:`, error);
      throw new Error(`Data loading failed: ${error}`);
    }
  }

  /**
   * Generate embeddings for data using Databricks ML models
   */
  async generateEmbeddingsWithDatabricks(
    data: string[],
    options: {
      modelEndpoint?: string;
      batchSize?: number;
    } = {}
  ): Promise<number[][]> {
    await this.initialize();

    const { modelEndpoint = "databricks-bge-large-en", batchSize = 100 } =
      options;

    try {
      console.log(
        `🔄 Generating embeddings for ${data.length} texts using ${modelEndpoint}`
      );

      const embeddings: number[][] = [];

      // Process in batches
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);

        // Use Databricks SQL to generate embeddings
        const embeddingSQL = `
          SELECT 
            input_text,
            ai_generate_embeddings('${modelEndpoint}', input_text) as embedding
          FROM VALUES ${batch
            .map((text, idx) => `('${text.replace(/'/g, "''")}')`)
            .join(", ")} AS t(input_text)
        `;

        const result = await this.executeQuery(embeddingSQL);

        const batchEmbeddings = result.data.map((row: any) =>
          JSON.parse(row.embedding)
        );
        embeddings.push(...batchEmbeddings);

        console.log(
          `📊 Generated embeddings for batch ${
            Math.floor(i / batchSize) + 1
          }/${Math.ceil(data.length / batchSize)}`
        );
      }

      console.log(`✅ Generated ${embeddings.length} embeddings successfully`);
      return embeddings;
    } catch (error) {
      console.error("❌ Failed to generate embeddings:", error);
      throw new Error(`Embedding generation failed: ${error}`);
    }
  }

  /**
   * Validate connection with a test query
   */
  private async validateConnection(): Promise<void> {
    try {
      await this.executeQuery("SELECT 1 as test");
      console.log("✅ Databricks connection validated");
    } catch (error) {
      console.error("❌ Connection validation failed:", error);
      throw error;
    }
  }

  /**
   * Generate CREATE TABLE SQL from sample data
   */
  private generateCreateTableSQL(
    tableName: string,
    sampleRecord: any,
    options: {
      partitionBy?: string[];
      clusteredBy?: string[];
    }
  ): string {
    const columns = Object.entries(sampleRecord)
      .map(([key, value]) => {
        let type = "STRING";

        if (typeof value === "number") {
          type = Number.isInteger(value) ? "BIGINT" : "DOUBLE";
        } else if (typeof value === "boolean") {
          type = "BOOLEAN";
        } else if (value instanceof Date) {
          type = "TIMESTAMP";
        } else if (typeof value === "object" && value !== null) {
          type = "STRING"; // Store as JSON string
        }

        return `\`${key}\` ${type}`;
      })
      .join(", ");

    let sql = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`;

    if (options.partitionBy && options.partitionBy.length > 0) {
      sql += ` PARTITIONED BY (${options.partitionBy.join(", ")})`;
    }

    if (options.clusteredBy && options.clusteredBy.length > 0) {
      sql += ` CLUSTERED BY (${options.clusteredBy.join(", ")})`;
    }

    return sql;
  }

  /**
   * Estimate query cost (simplified calculation)
   */
  private async estimateQueryCost(
    sql: string,
    executionTime: number
  ): Promise<{ dbuUsed: number; estimatedCost: string }> {
    // Simplified cost estimation based on execution time and query complexity
    const baseDBUPerSecond = 0.1;
    const complexityMultiplier = sql.toLowerCase().includes("join") ? 1.5 : 1.0;

    const dbuUsed =
      (executionTime / 1000) * baseDBUPerSecond * complexityMultiplier;
    const estimatedCost = `$${(dbuUsed * 0.15).toFixed(4)}`; // Assuming $0.15 per DBU

    return { dbuUsed, estimatedCost };
  }

  /**
   * Get service health and connection status
   */
  async getServiceHealth(): Promise<{
    status: "healthy" | "unhealthy";
    initialized: boolean;
    connected: boolean;
    config: Partial<DatabricksConfig>;
    lastError?: string;
  }> {
    try {
      const connected = this.session !== null;

      return {
        status: this.initialized && connected ? "healthy" : "unhealthy",
        initialized: this.initialized,
        connected,
        config: {
          serverHostname: this.config.serverHostname,
          httpPath: this.config.httpPath,
          useAzureAD: this.config.useAzureAD,
        },
      };
    } catch (error) {
      return {
        status: "unhealthy",
        initialized: false,
        connected: false,
        config: {},
        lastError: (error as Error).message,
      };
    }
  }

  /**
   * Get available databases/catalogs in Unity Catalog
   */
  async getDatabases(): Promise<string[]> {
    await this.initialize();
    try {
      // Use SHOW CATALOGS for Unity Catalog (modern Databricks)
      const catalogsResult = await this.executeQuery("SHOW CATALOGS");
      const allCatalogs: string[] = catalogsResult.data.map(
        (row: any) => row.catalog || row.name || row
      );
      
      // Filter to allowed catalogs and include nh_ai explicitly
      const allowedEnv = (process.env.DATABRICKS_ALLOWED_CATALOGS || 'nh_ai')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      
      // Include nh_ai catalog explicitly if it exists, plus any allowed catalogs
      const catalogs = allCatalogs.filter(c => {
        const catalogLower = String(c).toLowerCase();
        return allowedEnv.includes(catalogLower) || catalogLower === 'nh_ai';
      });
      
      // If no catalogs found, try fallback to SHOW DATABASES (legacy mode)
      if (catalogs.length === 0) {
        try {
          const databasesResult = await this.executeQuery("SHOW DATABASES");
          return databasesResult.data.map((row: any) => row.databaseName || row.name || row);
        } catch {
          // Return empty array if both fail
          return [];
        }
      }
      
      return catalogs;
    } catch (error) {
      console.error("Failed to get databases/catalogs:", error);
      // Fallback to SHOW DATABASES for legacy mode
      try {
        const result = await this.executeQuery("SHOW DATABASES");
        return result.data.map((row: any) => row.databaseName || row.name || row);
      } catch {
        return [];
      }
    }
  }

  /**
   * Get tables from a specific database
   */
  async getTables(
    database?: string
  ): Promise<Array<{ name: string; database: string }>> {
    const sql = database ? `SHOW TABLES IN ${database}` : "SHOW TABLES";
    const result = await this.executeQuery(sql);
    return result.data.map((row: any) => ({
      name: row.tableName,
      database: row.database || database || "default",
    }));
  }

  /**
   * Get complete schema tree (databases -> tables -> columns)
   */
  async getSchemaTree(): Promise<{
    databases: Array<{
      name: string;
      tables: Array<{
        name: string;
        columns: Array<{
          name: string;
          type: string;
          nullable: boolean;
          comment?: string;
        }>;
      }>;
    }>;
  }> {
    const databases = await this.getDatabases();
    const schemaTree = await Promise.all(
      databases.map(async (dbName) => {
        const tables = await this.getTables(dbName);
        const tablesWithSchema = await Promise.all(
          tables.slice(0, 100).map(async (table) => {
            // Limit to first 20 tables per database
            const columns = await this.getTableSchema(table.name, dbName);
            return {
              name: table.name,
              columns,
            };
          })
        );
        return {
          name: dbName,
          tables: tablesWithSchema,
        };
      })
    );
    return { databases: schemaTree };
  }

  /**
   * Get recent news data from Databricks
   */
  async getRecentNews(options: {
    limit?: number;
    startDate?: Date;
    endDate?: Date;
    category?: string;
    sentiment?: string;
    isHighQuality?: boolean;
  } = {}): Promise<any[]> {
    await this.initialize();

    try {
      const limit = options.limit || 100;
      const conditions: string[] = [];

      // Build WHERE conditions based on source columns of n_news_mm_silver
      if (options.startDate) {
        conditions.push(`to_timestamp(concat(N_DATE, N_TIME), 'yyyyMMddHHmmss') >= '${options.startDate.toISOString()}'`);
      }
      if (options.endDate) {
        conditions.push(`to_timestamp(concat(N_DATE, N_TIME), 'yyyyMMddHHmmss') <= '${options.endDate.toISOString()}'`);
      }
      // category/sentiment/isHighQuality are not native in this source; ignore or map later if defined

      // Fully-qualified table name (configurable via env var)
      const tableName = process.env.DATABRICKS_NEWS_TABLE || 'nh_ai.silver.n_news_mm_silver';

      const whereClause = conditions.length > 0 
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      const query = `
        SELECT 
          N_ID                                     AS nid,
          N_TITLE                                  AS title,
          N_CONTENT                                AS content,
          N_SOURCE                                 AS source,
          N_CODE                                   AS symbol,
          to_timestamp(concat(N_DATE, N_TIME), 'yyyyMMddHHmmss') AS published_at,
          GPT02_ECO_POST_SCORE                     AS economic_score,
          GPT03_MARKET_POST_SCORE                  AS market_score,
          GPT01_AD_POST_SCORE                      AS advertisement_score,
          GPT04_CONTENT_QUALITY_SCORE              AS content_quality_score,
          _INGEST_TS                               AS crawled_at,
          _INGEST_TS                               AS processed_at,
          array(N_CODE)                            AS relevant_symbols,
          array()                                  AS relevant_indices,
          array()                                  AS relevant_themes,
          array()                                  AS keywords,
          array()                                  AS entities,
          array()                                  AS market_events,
          array()                                  AS event_categories,
          CAST(NULL AS STRING)                     AS reporter,
          CAST(NULL AS STRING)                     AS category,
          CAST(NULL AS STRING)                     AS subcategory,
          CAST(NULL AS STRING)                     AS sentiment,
          CAST(NULL AS DOUBLE)                     AS sentiment_score,
          FALSE                                    AS is_processed,
          FALSE                                    AS is_filtered,
          FALSE                                    AS is_high_quality
        FROM ${tableName}
        ${whereClause}
        ORDER BY published_at DESC
        LIMIT ${limit}
      `;

      console.log(`🔄 Querying news data from ${tableName}...`);
      const result = await this.executeQuery(query);
      
      if (result.data && result.data.length > 0) {
        console.log(`✅ Retrieved ${result.data.length} news items from ${tableName}`);
        return result.data.map((row: any) => ({
              id: row.nid || row.NID || row.id || row.ID, // Use nid as primary id
              nid: row.nid || row.NID,
              title: row.title || row.TITLE,
              content: row.content || row.CONTENT,
              summary: row.summary || row.SUMMARY,
              source: row.source || row.SOURCE,
              reporter: row.reporter || row.REPORTER,
              category: row.category || row.CATEGORY,
              subcategory: row.subcategory || row.SUBCATEGORY,
              sentiment: row.sentiment || row.SENTIMENT,
              sentimentScore: row.sentiment_score || row.SENTIMENT_SCORE,
              economicScore: row.economic_score || row.ECONOMIC_SCORE,
              marketScore: row.market_score || row.MARKET_SCORE,
              importanceScore: row.importance_score || row.IMPORTANCE_SCORE,
              relevantSymbols: row.relevant_symbols || row.RELEVANT_SYMBOLS || [],
              relevantIndices: row.relevant_indices || row.RELEVANT_INDICES || [],
              relevantThemes: row.relevant_themes || row.RELEVANT_THEMES || [],
              keywords: row.keywords || row.KEYWORDS || [],
              entities: row.entities || row.ENTITIES || [],
              marketEvents: row.market_events || row.MARKET_EVENTS || [],
              eventCategories: row.event_categories || row.EVENT_CATEGORIES || [],
              publishedAt: row.published_at || row.PUBLISHED_AT,
              crawledAt: row.crawled_at || row.CRAWLED_AT,
              processedAt: row.processed_at || row.PROCESSED_AT,
              isProcessed: row.is_processed || row.IS_PROCESSED || false,
              isFiltered: row.is_filtered || row.IS_FILTERED || false,
              isHighQuality: row.is_high_quality || row.IS_HIGH_QUALITY || false
            }));
      }

      // If no data found, return empty array
      console.warn('⚠️  No news data found in the specified Databricks table');
      return [];
    } catch (error) {
      console.error('❌ Failed to get recent news from Databricks:', error);
      throw new Error(`News data fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all news data from Databricks with pagination
   */
  async getAllNews(options: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
    category?: string;
    sentiment?: string;
    searchQuery?: string;
    isHighQuality?: boolean;
  } = {}): Promise<{ data: any[]; total: number; hasMore: boolean }> {
    await this.initialize();

    try {
      const limit = options.limit || 50;
      const offset = options.offset || 0;
      const conditions: string[] = [];

      // Build WHERE conditions based on source columns
      if (options.startDate) {
        conditions.push(`to_timestamp(concat(N_DATE, N_TIME), 'yyyyMMddHHmmss') >= '${options.startDate.toISOString()}'`);
      }
      if (options.endDate) {
        conditions.push(`to_timestamp(concat(N_DATE, N_TIME), 'yyyyMMddHHmmss') <= '${options.endDate.toISOString()}'`);
      }
      if (options.searchQuery) {
        const escapedQuery = options.searchQuery.replace(/'/g, "''");
        conditions.push(`(N_TITLE LIKE '%${escapedQuery}%' OR N_CONTENT LIKE '%${escapedQuery}%')`);
      }

      // Fully-qualified table name (configurable via env var)
      const tableName = process.env.DATABRICKS_NEWS_TABLE || 'nh_ai.silver.n_news_mm_silver';

      const whereClause = conditions.length > 0 
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      // Count total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM ${tableName}
        ${whereClause}
      `;

      // Get data page
      const dataQuery = `
        SELECT 
          N_ID                                     AS nid,
          N_TITLE                                  AS title,
          N_CONTENT                                AS content,
          N_SOURCE                                 AS source,
          N_CODE                                   AS symbol,
          to_timestamp(concat(N_DATE, N_TIME), 'yyyyMMddHHmmss') AS published_at,
          GPT02_ECO_POST_SCORE                     AS economic_score,
          GPT03_MARKET_POST_SCORE                  AS market_score,
          GPT01_AD_POST_SCORE                      AS advertisement_score,
          GPT04_CONTENT_QUALITY_SCORE              AS content_quality_score,
          _INGEST_TS                               AS crawled_at,
          _INGEST_TS                               AS processed_at,
          array(N_CODE)                            AS relevant_symbols,
          array()                                  AS relevant_indices,
          array()                                  AS relevant_themes,
          array()                                  AS keywords,
          array()                                  AS entities,
          array()                                  AS market_events,
          array()                                  AS event_categories,
          CAST(NULL AS STRING)                     AS reporter,
          CAST(NULL AS STRING)                     AS category,
          CAST(NULL AS STRING)                     AS subcategory,
          CAST(NULL AS STRING)                     AS sentiment,
          CAST(NULL AS DOUBLE)                     AS sentiment_score,
          FALSE                                    AS is_processed,
          FALSE                                    AS is_filtered,
          FALSE                                    AS is_high_quality
        FROM ${tableName}
        ${whereClause}
        ORDER BY published_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      console.log(`🔄 Querying all news data from ${tableName}...`);
      const [countResult, dataResult] = await Promise.all([
        this.executeQuery(countQuery),
        this.executeQuery(dataQuery)
      ]);
      
      const total = countResult.data[0]?.total || countResult.data[0]?.TOTAL || 0;
        const data = (dataResult.data || []).map((row: any) => ({
          id: row.nid || row.NID || row.id || row.ID, // Use nid as primary id
          nid: row.nid || row.NID,
        title: row.title || row.TITLE,
        content: row.content || row.CONTENT,
        summary: row.summary || row.SUMMARY,
        source: row.source || row.SOURCE,
        reporter: row.reporter || row.REPORTER,
        category: row.category || row.CATEGORY,
        subcategory: row.subcategory || row.SUBCATEGORY,
        sentiment: row.sentiment || row.SENTIMENT,
        sentimentScore: row.sentiment_score || row.SENTIMENT_SCORE,
        economicScore: row.economic_score || row.ECONOMIC_SCORE,
        marketScore: row.market_score || row.MARKET_SCORE,
        importanceScore: row.importance_score || row.IMPORTANCE_SCORE,
        relevantSymbols: row.relevant_symbols || row.RELEVANT_SYMBOLS || [],
        relevantIndices: row.relevant_indices || row.RELEVANT_INDICES || [],
        relevantThemes: row.relevant_themes || row.RELEVANT_THEMES || [],
        keywords: row.keywords || row.KEYWORDS || [],
        entities: row.entities || row.ENTITIES || [],
        marketEvents: row.market_events || row.MARKET_EVENTS || [],
        eventCategories: row.event_categories || row.EVENT_CATEGORIES || [],
        publishedAt: row.published_at || row.PUBLISHED_AT,
        crawledAt: row.crawled_at || row.CRAWLED_AT,
        processedAt: row.processed_at || row.PROCESSED_AT,
        isProcessed: row.is_processed || row.IS_PROCESSED || false,
        isFiltered: row.is_filtered || row.IS_FILTERED || false,
        isHighQuality: row.is_high_quality || row.IS_HIGH_QUALITY || false
      }));

      console.log(`✅ Retrieved ${data.length} news items from ${tableName} (total: ${total})`);
      return {
        data,
        total: Number(total),
        hasMore: offset + data.length < total
      };
    } catch (error) {
      console.error('❌ Failed to get all news from Databricks:', error);
      throw new Error(`News data fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Close connection and cleanup resources
   */
  async close(): Promise<void> {
    try {
      if (this.session) {
        await this.session.close();
        this.session = null;
      }

      if (this.client) {
        await this.client.close();
      }

      this.initialized = false;
      console.log("✅ Databricks connection closed");
    } catch (error) {
      console.error("❌ Error closing Databricks connection:", error);
    }
  }
}

// Factory function with environment-based configuration
// Supports both standard and Azure-specific environment variables
export function createAzureDatabricksService(): AzureDatabricksService {
  const config: DatabricksConfig = {
    // Standard Databricks environment variables (recommended by Microsoft)
    serverHostname:
      process.env.DATABRICKS_SERVER_HOSTNAME ||
      process.env.AZURE_DATABRICKS_HOST ||
      "",
    httpPath:
      process.env.DATABRICKS_HTTP_PATH ||
      process.env.AZURE_DATABRICKS_HTTP_PATH ||
      "",
    authToken:
      process.env.DATABRICKS_TOKEN || process.env.AZURE_DATABRICKS_TOKEN,
    useAzureAD: process.env.DATABRICKS_USE_AZURE_AD === "true",
    maxRetries: parseInt(process.env.DATABRICKS_MAX_RETRIES || "3"),
    connectionTimeout: parseInt(
      process.env.DATABRICKS_CONNECTION_TIMEOUT || "30000"
    ),
    queryTimeout: parseInt(process.env.DATABRICKS_QUERY_TIMEOUT || "300000"),
  };

  return new AzureDatabricksService(config);
}

// Singleton instance
let databricksInstance: AzureDatabricksService | null = null;

export function getAzureDatabricksService(): AzureDatabricksService {
  if (!databricksInstance) {
    databricksInstance = createAzureDatabricksService();
  }
  return databricksInstance;
}

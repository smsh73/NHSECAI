// Azure CosmosDB Gremlin Service
// 현재 사용되지 않음 - 주석 처리된 상태
// 필요 시 gremlin 패키지 설치 후 활성화 가능

// import { createRequire } from 'module';
// import { AzureConfigService } from './azure-config.js';

// const require = createRequire(import.meta.url);
// try {
//   const gremlin = require('gremlin');
// } catch (error) {
//   console.warn('Gremlin package not installed. Install with: npm install gremlin');
//   // 에러 발생 시 빈 객체 반환하여 애플리케이션 크래시 방지
// }

// /**
//  * Azure CosmosDB Gremlin Service
//  * Provides Gremlin graph database operations for CosmosDB
//  */

// export interface GremlinConfig {
//   endpoint: string;
//   key: string;
//   database: string;
//   collection: string;
// }

// export interface GremlinQueryResult {
//   success: boolean;
//   data?: any[];
//   error?: string;
//   executionTime?: number;
// }

// export class AzureCosmosDBGremlinService {
//   private client: any | null = null;
//   private initialized = false;
//   private config: GremlinConfig;

//   constructor() {
//     const cosmosConfig = azureConfigService.getCosmosDBConfig();
//     this.config = {
//       endpoint: cosmosConfig.endpoint,
//       key: cosmosConfig.key,
//       database: cosmosConfig.databaseId || 'graph_db',
//       collection: 'default'
//     };
//   }

//   /**
//    * Initialize Gremlin client connection
//    */
//   async initialize(): Promise<void> {
//     if (this.initialized && this.client) return;

//     try {
//       console.log("🔒 Connecting to Azure CosmosDB Gremlin using environment configuration");

//       // Create Gremlin client
//       this.client = new gremlin.driver.Client(
//         `wss://${this.config.endpoint.replace('https://', '')}/gremlin`,
//         {
//           username: `/dbs/${this.config.database}/colls/${this.config.collection}`,
//           password: this.config.key,
//           mimeType: 'application/vnd.gremlin-v2.0+json'
//         }
//       );

//       // Test connection with a simple query (with timeout)
//       const testPromise = this.executeQuery('g.V().limit(1)');
//       const timeoutPromise = new Promise((_, reject) =>
//         setTimeout(() => reject(new Error('Connection timeout')), 5000)
//       );

//       await Promise.race([testPromise, timeoutPromise]);

//       this.initialized = true;
//       console.log("✅ Azure CosmosDB Gremlin connection established successfully");
//     } catch (error) {
//       console.error("❌ Failed to connect to Azure CosmosDB Gremlin:", error);
//       // Don't throw error to prevent infinite recursion
//       this.initialized = false;
//       this.client = null;
//     }
//   }

//   /**
//    * Execute Gremlin query
//    */
//   async executeQuery(query: string): Promise<GremlinQueryResult> {
//     await this.initialize();

//     if (!this.client) {
//       throw new Error("Gremlin client not initialized");
//     }

//     const startTime = Date.now();

//     try {
//       console.log(`🔄 Executing Gremlin query: ${query}`);

//       const result = await this.client.submit(query);
//       const executionTime = Date.now() - startTime;

//       console.log(`✅ Query executed successfully in ${executionTime}ms`);

//       return {
//         success: true,
//         data: result._items || [],
//         executionTime
//       };
//     } catch (error) {
//       const executionTime = Date.now() - startTime;
//       console.error(`❌ Gremlin query failed:`, error);

//       return {
//         success: false,
//         error: error instanceof Error ? error.message : 'Unknown error',
//         executionTime
//       };
//     }
//   }

//   /**
//    * Get graph statistics
//    */
//   async getGraphStatistics(): Promise<{
//     vertexCount: number;
//     edgeCount: number;
//     properties: string[];
//   }> {
//     await this.initialize();

//     try {
//       // Get vertex count
//       const vertexResult = await this.executeQuery('g.V().count()');
//       const vertexCount = vertexResult.success && vertexResult.data?.[0] ? vertexResult.data[0] : 0;

//       // Get edge count
//       const edgeResult = await this.executeQuery('g.E().count()');
//       const edgeCount = edgeResult.success && edgeResult.data?.[0] ? edgeResult.data[0] : 0;

//       // Get sample properties
//       const propertiesResult = await this.executeQuery('g.V().properties().key().dedup().limit(10)');
//       const properties = propertiesResult.success ? propertiesResult.data || [] : [];

//       return {
//         vertexCount,
//         edgeCount,
//         properties
//       };
//     } catch (error) {
//       console.error("❌ Failed to get graph statistics:", error);
//       throw new Error(`Graph statistics retrieval failed: ${error}`);
//     }
//   }

//   /**
//    * Test connection with basic operations
//    */
//   async testConnection(): Promise<{
//     success: boolean;
//     message: string;
//     data?: any;
//   }> {
//     try {
//       // For local development, return mock success
//       if (process.env.NODE_ENV === 'development') {
//         return {
//           success: true,
//           message: 'CosmosDB Gremlin 연결 테스트 (로컬 모드)',
//           data: {
//             connectionStatus: 'mock',
//             graphStatistics: {
//               vertexCount: 0,
//               edgeCount: 0,
//               properties: []
//             },
//             config: {
//               endpoint: this.config.endpoint,
//               database: this.config.database,
//               collection: this.config.collection
//             },
//             note: '로컬 개발 환경에서는 실제 연결 없이 Mock 데이터를 반환합니다.'
//           }
//         };
//       }

//       await this.initialize();

//       if (!this.initialized || !this.client) {
//         return {
//           success: false,
//           message: 'CosmosDB Gremlin 클라이언트 초기화 실패'
//         };
//       }

//       // Test basic connectivity with timeout
//       const testPromise = this.executeQuery('g.V().limit(1)');
//       const timeoutPromise = new Promise<GremlinQueryResult>((_, reject) =>
//         setTimeout(() => reject(new Error('Connection timeout')), 10000)
//       );

//       const testResult = await Promise.race([testPromise, timeoutPromise]);

//       if (testResult.success) {
//         const stats = await this.getGraphStatistics();

//         return {
//           success: true,
//           message: 'CosmosDB Gremlin 연결 테스트 성공',
//           data: {
//             connectionStatus: 'connected',
//             graphStatistics: stats,
//             config: {
//               endpoint: this.config.endpoint,
//               database: this.config.database,
//               collection: this.config.collection
//             }
//           }
//         };
//       } else {
//         return {
//           success: false,
//           message: `CosmosDB Gremlin 연결 테스트 실패: ${testResult.error}`
//         };
//       }
//     } catch (error) {
//       return {
//         success: false,
//         message: `CosmosDB Gremlin 연결 테스트 실패: ${error instanceof Error ? error.message : 'Unknown error'}`
//       };
//     }
//   }

//   /**
//    * Close client connection
//    */
//   async close(): Promise<void> {
//     if (this.client) {
//       await this.client.close();
//       this.client = null;
//     }
//     this.initialized = false;
//     console.log("✅ Azure CosmosDB Gremlin connection closed");
//   }
// }

// // Create singleton instance
// let cosmosdbGremlinService: AzureCosmosDBGremlinService | null = null;

// export function getAzureCosmosDBGremlinService(): AzureCosmosDBGremlinService {
//   if (!cosmosdbGremlinService) {
//     cosmosdbGremlinService = new AzureCosmosDBGremlinService();
//   }
//   return cosmosdbGremlinService;
// }
import { createRequire } from "module";
import { azureConfigService } from "./azure-config.js";

const require = createRequire(import.meta.url);
const gremlin = require("gremlin");

export interface GremlinConfig {
  endpoint: string;
  key: string;
  database: string;
  collection: string;
}

export interface GremlinQueryResult {
  success: boolean;
  data?: any[];
  error?: string;
  executionTime?: number;
}

export class AzureCosmosDBGremlinService {
  private client: any | null = null;
  private initialized = false;
  private initializing = false;
  private initializationError: Error | null = null;
  private config: GremlinConfig;

  constructor() {
    const cosmosConfig = azureConfigService.getCosmosDBConfig();
    this.config = {
      endpoint: cosmosConfig.endpoint,
      key: cosmosConfig.key,
      database: cosmosConfig.databaseId || "graph_db",
      collection: "testGraph",
    };
  }

  /**
   * 엔드포인트를 Gremlin WebSocket 형식으로 변환
   */
  private getGremlinEndpoint(): string {
    let baseEndpoint = this.config.endpoint.trim();

    // 1. 프로토콜 제거 (https:// 또는 http://)
    baseEndpoint = baseEndpoint.replace(/^https?:\/\//, "");

    // 2. 포트 번호 제거 (:443 등)
    baseEndpoint = baseEndpoint.replace(/:\d+/, "");

    // 3. 끝 슬래시 제거
    baseEndpoint = baseEndpoint.replace(/\/+$/, "");

    // 4. .documents를 .gremlin.cosmos로 변경
    baseEndpoint = baseEndpoint.replace(".documents.", ".gremlin.cosmos.");

    // 5. wss:// 프로토콜과 /gremlin 경로 추가
    return `wss://${baseEndpoint}/gremlin`;
  }

  /**
   * Initialize Gremlin client connection (idempotent)
   */
  async initialize(): Promise<void> {
    if (this.initialized && this.client) {
      console.log("✅ Gremlin client already initialized");
      return;
    }

    if (this.initializing) {
      console.log("⏳ Waiting for ongoing initialization...");
      while (this.initializing) {
        await new Promise((r) => setTimeout(r, 100));
      }
      if (this.initialized) return;
      if (this.initializationError) throw this.initializationError;
      return;
    }

    this.initializing = true;
    this.initializationError = null;

    try {
      console.log("🔒 Initializing Azure CosmosDB Gremlin connection...");
      console.log(`📍 Original endpoint: ${this.config.endpoint}`);

      const gremlinEndpoint = this.getGremlinEndpoint();
      console.log(`🌐 Converted Gremlin endpoint: ${gremlinEndpoint}`);

      const username = `/dbs/${this.config.database}/colls/${this.config.collection}`;
      console.log(`👤 Username: ${username}`);

      // Gremlin 클라이언트 생성
      this.client = new gremlin.driver.Client(gremlinEndpoint, {
        authenticator: new gremlin.driver.auth.PlainTextSaslAuthenticator(
          username,
          this.config.key
        ),
        traversalsource: "g",
        rejectUnauthorized: true,
        mimeType: "application/vnd.gremlin-v2.0+json",
      });

      console.log("🔄 Testing connection with simple query...");

      // 연결 테스트 (타임아웃 15초)
      const testQuery = this.client.submit("g.V().limit(1)");
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Connection timeout after 15s")),
          15000
        )
      );

      await Promise.race([testQuery, timeoutPromise]);

      this.initialized = true;
      console.log(
        "✅ Azure CosmosDB Gremlin connection established successfully"
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.initializationError = err;
      this.initialized = false;
      this.client = null;

      console.error("❌ Failed to initialize Gremlin client:", {
        message: err.message,
        stack: err.stack,
        endpoint: this.config.endpoint,
        database: this.config.database,
        collection: this.config.collection,
      });

      throw err;
    } finally {
      this.initializing = false;
    }
  }

  /**
   * Execute Gremlin query
   */
  async executeQuery(query: string): Promise<GremlinQueryResult> {
    await this.initialize();

    if (!this.client || !this.initialized) {
      throw new Error("Gremlin client not initialized");
    }

    const startTime = Date.now();

    try {
      console.log(`🔄 Executing Gremlin query: ${query}`);

      const result = await this.client.submit(query);
      const executionTime = Date.now() - startTime;

      console.log(`✅ Query executed successfully in ${executionTime}ms`);

      return {
        success: true,
        data: result._items || [],
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ Gremlin query failed:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        executionTime,
      };
    }
  }

  /**
   * Get graph statistics
   */
  async getGraphStatistics(): Promise<{
    vertexCount: number;
    edgeCount: number;
    properties: string[];
  }> {
    const vertexResult = await this.executeQuery("g.V().count()");
    const vertexCount =
      vertexResult.success && vertexResult.data?.[0] ? vertexResult.data[0] : 0;

    const edgeResult = await this.executeQuery("g.E().count()");
    const edgeCount =
      edgeResult.success && edgeResult.data?.[0] ? edgeResult.data[0] : 0;

    const propertiesResult = await this.executeQuery(
      "g.V().properties().key().dedup().limit(10)"
    );
    const properties = propertiesResult.success
      ? propertiesResult.data || []
      : [];

    return {
      vertexCount,
      edgeCount,
      properties,
    };
  }

  /**
   * Test connection with basic operations
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      // 로컬 개발 모드
      if (process.env.NODE_ENV === "development") {
        console.log("🏠 Running in development mode - using mock data");
        return {
          success: true,
          message: "CosmosDB Gremlin 연결 테스트 (로컬 모드)",
          data: {
            connectionStatus: "mock",
            graphStatistics: {
              vertexCount: 0,
              edgeCount: 0,
              properties: [],
            },
            config: {
              endpoint: this.config.endpoint,
              database: this.config.database,
              collection: this.config.collection,
            },
            note: "로컬 개발 환경에서는 실제 연결 없이 Mock 데이터를 반환합니다.",
          },
        };
      }

      console.log("🧪 Starting CosmosDB Gremlin connection test...");

      // 초기화 시도
      await this.initialize();

      if (!this.initialized || !this.client) {
        const errorMsg = this.initializationError
          ? this.initializationError.message
          : "Unknown initialization error";

        console.error("❌ Initialization failed:", errorMsg);

        return {
          success: false,
          message: `CosmosDB Gremlin 클라이언트 초기화 실패: ${errorMsg}`,
          data: {
            endpoint: this.config.endpoint,
            database: this.config.database,
            collection: this.config.collection,
            error: errorMsg,
          },
        };
      }

      // 기본 쿼리 테스트
      console.log("🔍 Running test query...");
      const testPromise = this.client.submit("g.V().limit(1)");
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Test query timeout")), 10000)
      );

      await Promise.race([testPromise, timeoutPromise]);

      // 그래프 통계 수집
      console.log("📊 Collecting graph statistics...");
      const stats = await this.getGraphStatistics();

      return {
        success: true,
        message: "CosmosDB Gremlin 연결 테스트 성공",
        data: {
          connectionStatus: "connected",
          graphStatistics: stats,
          config: {
            endpoint: this.config.endpoint,
            database: this.config.database,
            collection: this.config.collection,
          },
        },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("❌ Connection test failed:", error);

      return {
        success: false,
        message: `CosmosDB Gremlin 연결 테스트 실패: ${errorMsg}`,
        data: {
          endpoint: this.config.endpoint,
          error: errorMsg,
          stack: error instanceof Error ? error.stack : undefined,
        },
      };
    }
  }

  /**
   * Close client connection
   */
  async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
        console.log("✅ Azure CosmosDB Gremlin connection closed");
      } catch (error) {
        console.error("⚠️ Error closing Gremlin connection:", error);
      }
      this.client = null;
    }
    this.initialized = false;
    this.initializationError = null;
  }

  /**
   * Get initialization status
   */
  getStatus(): {
    initialized: boolean;
    initializing: boolean;
    hasError: boolean;
    error?: string;
  } {
    return {
      initialized: this.initialized,
      initializing: this.initializing,
      hasError: this.initializationError !== null,
      error: this.initializationError?.message,
    };
  }
}

// Singleton
let cosmosdbGremlinService: AzureCosmosDBGremlinService | null = null;

export function getAzureCosmosDBGremlinService(): AzureCosmosDBGremlinService {
  if (!cosmosdbGremlinService) {
    cosmosdbGremlinService = new AzureCosmosDBGremlinService();
  }
  return cosmosdbGremlinService;
}

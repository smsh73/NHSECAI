import { getAzureSearchService } from "./azure-search.js";
import { azureConfigService } from "./azure-config.js";

/**
 * RAG Connection Manager Service
 * 
 * AI Search 연결 상태를 확인하고 관리하는 서비스
 */

export interface ConnectionStatus {
  status: "connected" | "disconnected" | "error";
  endpoint?: string;
  indexName?: string;
  hasApiKey: boolean;
  hasEndpoint: boolean;
  lastChecked: Date;
  error?: string;
  indexExists?: boolean;
  documentCount?: number;
}

export interface ConnectionConfig {
  endpoint: string;
  apiKey: string;
  indexName: string;
  usePrivateEndpoint: boolean;
  privateEndpointUrl?: string;
}

export class RAGConnectionManager {
  /**
   * AI Search 연결 상태 확인
   */
  async getConnectionStatus(): Promise<ConnectionStatus> {
    try {
      const searchConfig = azureConfigService.getAISearchConfig();
      
      const hasEndpoint = !!searchConfig.endpoint;
      const hasApiKey = !!searchConfig.apiKey;
      const indexName = searchConfig.indexName || "default-index";

      if (!hasEndpoint || !hasApiKey) {
        return {
          status: "disconnected",
          hasEndpoint,
          hasApiKey,
          lastChecked: new Date(),
          error: !hasEndpoint 
            ? "AZURE_SEARCH_ENDPOINT가 설정되지 않았습니다"
            : "AZURE_SEARCH_KEY가 설정되지 않았습니다",
        };
      }

      try {
        const searchService = getAzureSearchService(indexName);
        const health = await searchService.getServiceHealth();

        return {
          status: health.status === "healthy" ? "connected" : "error",
          endpoint: searchConfig.endpoint,
          indexName,
          hasEndpoint: true,
          hasApiKey: true,
          lastChecked: new Date(),
          indexExists: health.indexExists,
          documentCount: health.documentCount,
          error: health.lastError,
        };
      } catch (error: any) {
        return {
          status: "error",
          endpoint: searchConfig.endpoint,
          indexName,
          hasEndpoint: true,
          hasApiKey: true,
          lastChecked: new Date(),
          error: error.message || "연결 테스트 중 오류가 발생했습니다",
        };
      }
    } catch (error: any) {
      return {
        status: "error",
        hasEndpoint: false,
        hasApiKey: false,
        lastChecked: new Date(),
        error: error.message || "연결 상태 확인 중 오류가 발생했습니다",
      };
    }
  }

  /**
   * 연결 테스트
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      const status = await this.getConnectionStatus();

      if (status.status === "connected") {
        return {
          success: true,
          message: "AI Search 연결이 정상적으로 작동합니다",
          details: {
            endpoint: status.endpoint,
            indexName: status.indexName,
            documentCount: status.documentCount,
          },
        };
      } else {
        return {
          success: false,
          message: status.error || "연결에 실패했습니다",
          details: {
            hasEndpoint: status.hasEndpoint,
            hasApiKey: status.hasApiKey,
          },
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "연결 테스트 중 오류가 발생했습니다",
      };
    }
  }

  /**
   * 현재 설정 조회
   */
  getConnectionConfig(): ConnectionConfig | null {
    try {
      const searchConfig = azureConfigService.getAISearchConfig();

      if (!searchConfig.endpoint || !searchConfig.apiKey) {
        return null;
      }

      return {
        endpoint: searchConfig.endpoint,
        apiKey: searchConfig.apiKey ? "***" : "", // 보안을 위해 마스킹
        indexName: searchConfig.indexName || "default-index",
        usePrivateEndpoint: searchConfig.usePrivateEndpoint || false,
        privateEndpointUrl: searchConfig.privateEndpointUrl,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 필요한 환경변수 목록 조회
   */
  getRequiredEnvironmentVariables(): Array<{
    name: string;
    description: string;
    isSet: boolean;
    isRequired: boolean;
  }> {
    const searchConfig = azureConfigService.getAISearchConfig();

    return [
      {
        name: "AZURE_SEARCH_ENDPOINT",
        description: "Azure AI Search 서비스 엔드포인트 URL",
        isSet: !!searchConfig.endpoint,
        isRequired: true,
      },
      {
        name: "AZURE_SEARCH_KEY",
        description: "Azure AI Search API 키",
        isSet: !!searchConfig.apiKey,
        isRequired: true,
      },
      {
        name: "AZURE_SEARCH_INDEX_NAME",
        description: "기본 검색 인덱스 이름 (선택적)",
        isSet: !!searchConfig.indexName,
        isRequired: false,
      },
      {
        name: "AZURE_SEARCH_USE_PRIVATE_ENDPOINT",
        description: "Private Endpoint 사용 여부 (선택적)",
        isSet: searchConfig.usePrivateEndpoint !== undefined,
        isRequired: false,
      },
      {
        name: "AZURE_SEARCH_PRIVATE_ENDPOINT_URL",
        description: "Private Endpoint URL (선택적)",
        isSet: !!searchConfig.privateEndpointUrl,
        isRequired: false,
      },
    ];
  }

  /**
   * 인덱스 목록 조회
   */
  async listIndexes(): Promise<Array<{ name: string; fields: any[] }>> {
    try {
      const searchConfig = azureConfigService.getAISearchConfig();
      const indexName = searchConfig.indexName || "default-index";
      
      const searchService = getAzureSearchService(indexName);
      await searchService.initialize();
      
      return await searchService.listIndexes();
    } catch (error: any) {
      console.error("인덱스 목록 조회 실패:", error);
      throw new Error(`인덱스 목록 조회 실패: ${error.message}`);
    }
  }
}

export const ragConnectionManager = new RAGConnectionManager();


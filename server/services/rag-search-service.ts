import { getAzureSearchService } from "./azure-search.js";
import { ragService } from "./rag.js";
import { ragMetadataExtractor } from "./rag-metadata-extractor.js";

/**
 * RAG Search Service
 * 
 * 하이브리드 검색 (벡터 + 키워드) 및 메타데이터 필터링
 */

export interface RAGSearchRequest {
  query: string;
  indexName: string;
  topK?: number;
  filters?: {
    symbol?: string;
    dateFrom?: string;
    dateTo?: string;
    category?: string;
    tags?: string[];
  };
  searchMode?: "vector" | "keyword" | "hybrid";
}

export interface RAGSearchResult {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
  highlights?: Record<string, string[]>;
}

export class RAGSearchService {
  /**
   * RAG 검색 실행
   */
  async search(request: RAGSearchRequest): Promise<{
    results: RAGSearchResult[];
    totalCount?: number;
    queryVector?: number[];
  }> {
    try {
      const searchService = getAzureSearchService(request.indexName);
      await searchService.initialize();

      const topK = request.topK || 10;
      const searchMode = request.searchMode || "hybrid";

      // 쿼리 벡터 생성
      const queryVector = await ragService.generateEmbedding(request.query);

      if (queryVector.length === 0) {
        throw new Error("임베딩 생성 실패");
      }

      // 필터 구성
      const filter = this.buildFilter(request.filters);

      let searchResults: any;

      if (searchMode === "vector") {
        // 벡터 검색만
        searchResults = await searchService.vectorSearch(queryVector, {
          k: topK,
          filter,
          includeScore: true,
        });
      } else if (searchMode === "keyword") {
        // 키워드 검색만
        searchResults = await searchService.textSearch(request.query, {
          filter,
          top: topK,
        });
      } else {
        // 하이브리드 검색 (벡터 + 키워드)
        searchResults = await searchService.hybridSearch(
          request.query,
          queryVector,
          {
            k: topK,
            filter,
          }
        );
      }

      // 결과 변환
      const results: RAGSearchResult[] = searchResults.results.map((result: any) => ({
        id: result.document.id || result.document.documentId || "",
        content: result.document.content || result.document.text || "",
        score: result.score || 0,
        metadata: this.extractMetadataFromDocument(result.document),
        highlights: result.highlights,
      }));

      return {
        results,
        totalCount: searchResults.count,
        queryVector,
      };
    } catch (error: any) {
      console.error("RAG 검색 실패:", error);
      throw new Error(`RAG 검색 실패: ${error.message}`);
    }
  }

  /**
   * 필터 구성
   */
  private buildFilter(filters?: RAGSearchRequest["filters"]): string | undefined {
    if (!filters) {
      return undefined;
    }

    const conditions: string[] = [];

    if (filters.symbol) {
      conditions.push(`symbol eq '${filters.symbol}'`);
    }

    if (filters.dateFrom && filters.dateTo) {
      conditions.push(`date ge '${filters.dateFrom}' and date le '${filters.dateTo}'`);
    } else if (filters.dateFrom) {
      conditions.push(`date ge '${filters.dateFrom}'`);
    } else if (filters.dateTo) {
      conditions.push(`date le '${filters.dateTo}'`);
    }

    if (filters.category) {
      conditions.push(`category eq '${filters.category}'`);
    }

    if (filters.tags && filters.tags.length > 0) {
      const tagConditions = filters.tags.map(tag => `tags/any(t: t eq '${tag}')`);
      conditions.push(`(${tagConditions.join(" or ")})`);
    }

    return conditions.length > 0 ? conditions.join(" and ") : undefined;
  }

  /**
   * 문서에서 메타데이터 추출
   */
  private extractMetadataFromDocument(document: any): Record<string, unknown> {
    const metadata: Record<string, unknown> = {};

    // 일반적인 메타데이터 필드 추출
    const metadataFields = ["symbol", "date", "category", "source", "tags"];
    
    for (const field of metadataFields) {
      if (document[field] !== undefined) {
        metadata[field] = document[field];
      }
    }

    return metadata;
  }

  /**
   * 메타데이터 기반 검색
   */
  async searchByMetadata(filters: {
    schemaId?: string;
    symbol?: string;
    dateFrom?: string;
    dateTo?: string;
    category?: string;
    tags?: string[];
    limit?: number;
  }): Promise<Array<{ documentId: string; metadata: Record<string, unknown> }>> {
    return await ragMetadataExtractor.searchMetadata(filters);
  }
}

export const ragSearchService = new RAGSearchService();


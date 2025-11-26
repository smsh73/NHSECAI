import { Container } from "@azure/cosmos";
import { getAzureCosmosDBService } from "./azure-cosmosdb.js";
import { db } from "../db.js";
import { ragMetadata, type InsertRagMetadata } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * RAG Metadata Extractor Service
 * 
 * 시황정보에서 메타데이터를 추출하여 CosmosDB에 저장
 */

export interface ExtractedMetadata {
  symbol?: string;
  date?: string;
  category?: string;
  source?: string;
  tags?: string[];
  [key: string]: unknown;
}

export class RAGMetadataExtractor {
  private cosmosContainer: Container | null = null;

  /**
   * CosmosDB 컨테이너 초기화
   */
  private async getContainer(): Promise<Container> {
    if (this.cosmosContainer) {
      return this.cosmosContainer;
    }

    const cosmosService = getAzureCosmosDBService();
    const database = await cosmosService.getDatabase();
    this.cosmosContainer = database.container("rag-metadata");
    
    return this.cosmosContainer;
  }

  /**
   * 메타데이터 추출
   */
  extractMetadata(record: Record<string, unknown>): ExtractedMetadata {
    const metadata: ExtractedMetadata = {};

    // 일반적인 필드 추출
    if (record.symbol) metadata.symbol = String(record.symbol);
    if (record.code) metadata.symbol = String(record.code);
    if (record.date) metadata.date = String(record.date);
    if (record.timestamp) {
      const ts = record.timestamp instanceof Date 
        ? record.timestamp 
        : new Date(String(record.timestamp));
      metadata.date = ts.toISOString().split('T')[0];
    }
    if (record.category) metadata.category = String(record.category);
    if (record.source) metadata.source = String(record.source);

    // 태그 추출
    const tags: string[] = [];
    if (record.symbol) tags.push(String(record.symbol));
    if (record.category) tags.push(String(record.category));
    if (record.keywords) {
      const keywords = Array.isArray(record.keywords) 
        ? record.keywords 
        : String(record.keywords).split(',');
      tags.push(...keywords.map(k => String(k).trim()));
    }
    if (tags.length > 0) {
      metadata.tags = [...new Set(tags)]; // 중복 제거
    }

    return metadata;
  }

  /**
   * 메타데이터를 CosmosDB에 저장
   */
  async saveMetadata(
    schemaId: string,
    documentId: string,
    sourceRecordId: string,
    metadata: ExtractedMetadata
  ): Promise<string> {
    try {
      const container = await this.getContainer();

      const cosmosDocument = {
        id: documentId,
        schemaId,
        sourceRecordId,
        metadata,
        createdAt: new Date().toISOString(),
      };

      // CosmosDB에 저장
      const { resource } = await container.items.upsert(cosmosDocument);
      const cosmosDbDocumentId = resource?.id || documentId;

      // PostgreSQL에도 저장 (검색용)
      await db.insert(ragMetadata).values({
        schemaId,
        documentId,
        sourceRecordId,
        metadata: metadata as any,
        cosmosDbDocumentId,
        cosmosDbContainerId: "rag-metadata",
      } as InsertRagMetadata);

      return cosmosDbDocumentId;
    } catch (error: any) {
      console.error("메타데이터 저장 실패:", error);
      throw new Error(`메타데이터 저장 실패: ${error.message}`);
    }
  }

  /**
   * 메타데이터 검색
   */
  async searchMetadata(filters: {
    schemaId?: string;
    symbol?: string;
    dateFrom?: string;
    dateTo?: string;
    category?: string;
    tags?: string[];
    limit?: number;
  }): Promise<Array<{ documentId: string; metadata: ExtractedMetadata }>> {
    try {
      let query = db.select().from(ragMetadata);

      const conditions = [];
      if (filters.schemaId) {
        conditions.push(eq(ragMetadata.schemaId, filters.schemaId));
      }

      if (conditions.length > 0) {
        query = query.where(conditions[0]);
      }

      const results = await query.limit(filters.limit || 100);

      // 메타데이터 필터링
      return results
        .map(r => ({
          documentId: r.documentId,
          metadata: r.metadata as ExtractedMetadata,
        }))
        .filter(r => {
          if (filters.symbol && r.metadata.symbol !== filters.symbol) return false;
          if (filters.category && r.metadata.category !== filters.category) return false;
          if (filters.dateFrom && r.metadata.date && r.metadata.date < filters.dateFrom) return false;
          if (filters.dateTo && r.metadata.date && r.metadata.date > filters.dateTo) return false;
          if (filters.tags && filters.tags.length > 0) {
            const hasTag = filters.tags.some(tag => 
              r.metadata.tags?.includes(tag)
            );
            if (!hasTag) return false;
          }
          return true;
        });
    } catch (error: any) {
      console.error("메타데이터 검색 실패:", error);
      throw new Error(`메타데이터 검색 실패: ${error.message}`);
    }
  }
}

export const ragMetadataExtractor = new RAGMetadataExtractor();


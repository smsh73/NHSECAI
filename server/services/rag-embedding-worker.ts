import { getAzureDatabricksService } from "./azure-databricks.js";
import { getAzureSearchService } from "./azure-search.js";
import { ragEmbeddingManager } from "./rag-embedding-manager.js";
import { ragService } from "./rag.js";
import type { RagEmbeddingSchema, RagEmbeddingJob } from "@shared/schema";

/**
 * RAG Embedding Worker
 * 
 * Databricks 데이터를 조회하여 벡터 임베딩을 생성하고 AI Search에 업로드하는 워커
 */

export interface EmbeddingWorkerOptions {
  batchSize?: number;
  onProgress?: (progress: {
    processed: number;
    total: number;
    percentage: number;
  }) => void;
}

export class RAGEmbeddingWorker {
  /**
   * 임베딩 작업 실행
   */
  async executeJob(
    job: RagEmbeddingJob,
    schema: RagEmbeddingSchema,
    options?: EmbeddingWorkerOptions
  ): Promise<void> {
    const batchSize = options?.batchSize || job.batchSize || 1000;
    
    try {
      // 작업 상태를 RUNNING으로 업데이트
      await ragEmbeddingManager.updateJobStatus(job.id, "RUNNING", {
        startTime: new Date(),
      });

      // Databricks에서 데이터 조회
      const databricksService = getAzureDatabricksService();
      await databricksService.initialize();

      // 쿼리 구성
      const query = this.buildQuery(schema, job);
      
      console.log(`🔄 [Job ${job.id}] Databricks 쿼리 실행: ${query.substring(0, 100)}...`);
      
      // 전체 데이터 개수 조회
      const countQuery = this.buildCountQuery(schema, job);
      const countResult = await databricksService.executeQuery(countQuery);
      const totalRecords = countResult.rowCount || 0;

      console.log(`📊 [Job ${job.id}] 전체 레코드 수: ${totalRecords}`);

      // 작업 업데이트
      await ragEmbeddingManager.updateJobStatus(job.id, "RUNNING", {
        totalRecords,
      });

      // 배치 단위로 처리
      let processedRecords = 0;
      let failedRecords = 0;
      let offset = 0;

      while (offset < totalRecords) {
        // 취소 확인
        const currentJob = await ragEmbeddingManager.getJob(job.id);
        if (currentJob?.jobStatus === "CANCELLED") {
          console.log(`⚠️ [Job ${job.id}] 작업이 취소되었습니다`);
          return;
        }

        // 배치 데이터 조회
        const batchQuery = this.buildQuery(schema, job, offset, batchSize);
        const batchResult = await databricksService.executeQuery(batchQuery);
        const batchData = batchResult.data || [];

        if (batchData.length === 0) {
          break;
        }

        console.log(`📦 [Job ${job.id}] 배치 처리: ${offset + 1}~${offset + batchData.length} / ${totalRecords}`);

        // 배치 임베딩 처리
        const batchResults = await this.processBatch(
          batchData,
          schema,
          job
        );

        // 성공/실패 카운트
        const batchProcessed = batchResults.filter(r => r.success).length;
        const batchFailed = batchResults.filter(r => !r.success).length;

        processedRecords += batchProcessed;
        failedRecords += batchFailed;

        // 진행률 계산
        const progressPercentage = Math.floor((processedRecords / totalRecords) * 100);

        // 진행률 업데이트
        await ragEmbeddingManager.updateJobStatus(job.id, "RUNNING", {
          processedRecords,
          failedRecords,
          progressPercentage,
        });

        // 콜백 호출
        if (options?.onProgress) {
          options.onProgress({
            processed: processedRecords,
            total: totalRecords,
            percentage: progressPercentage,
          });
        }

        offset += batchSize;

        // 배치 간 짧은 대기 (Rate limiting 방지)
        if (offset < totalRecords) {
          await this.delay(100);
        }
      }

      // 작업 완료
      await ragEmbeddingManager.updateJobStatus(job.id, "COMPLETED", {
        endTime: new Date(),
        processedRecords,
        failedRecords,
        progressPercentage: 100,
      });

      // 스키마 상태 업데이트
      await this.updateSchemaStatus(schema.id, job, processedRecords);

      console.log(`✅ [Job ${job.id}] 작업 완료: ${processedRecords}건 처리, ${failedRecords}건 실패`);
    } catch (error: any) {
      console.error(`❌ [Job ${job.id}] 작업 실패:`, error);
      
      await ragEmbeddingManager.updateJobStatus(job.id, "FAILED", {
        endTime: new Date(),
        errorMessage: error.message || "알 수 없는 오류",
        errorDetails: {
          stack: error.stack,
          name: error.name,
        },
      });

      throw error;
    }
  }

  /**
   * 배치 데이터 처리
   */
  private async processBatch(
    batchData: Array<Record<string, unknown>>,
    schema: RagEmbeddingSchema,
    job: RagEmbeddingJob
  ): Promise<Array<{ success: boolean; error?: string }>> {
    const results: Array<{ success: boolean; error?: string }> = [];
    const documents: any[] = [];

    // 각 레코드 처리
    for (const record of batchData) {
      try {
        // 텍스트 변환
        const content = this.recordToText(record, schema);
        
        // 벡터 임베딩 생성
        const embedding = await ragService.generateEmbedding(content);
        
        if (embedding.length === 0) {
          results.push({ success: false, error: "임베딩 생성 실패" });
          continue;
        }

        // 메타데이터 추출
        const metadata = this.extractMetadata(record, schema);

        // 문서 ID 생성
        const documentId = this.generateDocumentId(record, schema);

        // AI Search 문서 구성
        const document: any = {
          id: documentId,
          [schema.contentFieldName || "content"]: content,
          [schema.vectorFieldName || "content_vector"]: embedding,
        };

        // 메타데이터 필드 추가
        if (metadata) {
          Object.assign(document, metadata);
        }

        documents.push(document);
        results.push({ success: true });
      } catch (error: any) {
        console.error(`레코드 처리 실패:`, error);
        results.push({ success: false, error: error.message });
      }
    }

    // AI Search에 배치 업로드
    if (documents.length > 0) {
      try {
        const searchService = getAzureSearchService(schema.searchIndexName);
        await searchService.initialize();
        await searchService.uploadDocuments(documents, {
          batchSize: 100,
          mergeOrUpload: true,
        });
      } catch (error: any) {
        console.error(`AI Search 업로드 실패:`, error);
        // 업로드 실패 시 모든 문서를 실패로 표시
        return documents.map(() => ({ success: false, error: "AI Search 업로드 실패" }));
      }
    }

    return results;
  }

  /**
   * Databricks 쿼리 구성
   */
  private buildQuery(
    schema: RagEmbeddingSchema,
    job: RagEmbeddingJob,
    offset?: number,
    limit?: number
  ): string {
    let query = "";

    // 커스텀 쿼리가 있으면 사용
    if (schema.databricksQuery) {
      query = schema.databricksQuery;
    } else {
      // 기본 쿼리 구성
      const catalog = schema.databricksCatalog ? `${schema.databricksCatalog}.` : "";
      const schemaName = schema.databricksSchema ? `${schema.databricksSchema}.` : "";
      const table = schema.databricksTable;
      
      query = `SELECT * FROM ${catalog}${schemaName}${table}`;
      
      // 날짜 필터 (과거 데이터 임베딩 시)
      if (job.jobType === "INCREMENTAL_HISTORICAL" && job.startDate && job.endDate) {
        // 날짜 필드가 있다고 가정 (실제로는 스키마에서 지정 필요)
        query += ` WHERE date >= '${job.startDate.toISOString().split('T')[0]}' AND date <= '${job.endDate.toISOString().split('T')[0]}'`;
      }
      
      // 최신 데이터는 최신순으로 정렬
      if (job.jobType === "INCREMENTAL_NEW") {
        query += ` ORDER BY date DESC, timestamp DESC`;
      } else if (job.jobType === "INCREMENTAL_HISTORICAL") {
        query += ` ORDER BY date ASC, timestamp ASC`;
      }
    }

    // 페이징
    if (limit) {
      query += ` LIMIT ${limit}`;
    }
    if (offset) {
      query += ` OFFSET ${offset}`;
    }

    return query;
  }

  /**
   * 카운트 쿼리 구성
   */
  private buildCountQuery(
    schema: RagEmbeddingSchema,
    job: RagEmbeddingJob
  ): string {
    if (schema.databricksQuery) {
      // 커스텀 쿼리의 경우 서브쿼리로 감싸기
      return `SELECT COUNT(*) as count FROM (${schema.databricksQuery}) as subquery`;
    }

    const catalog = schema.databricksCatalog ? `${schema.databricksCatalog}.` : "";
    const schemaName = schema.databricksSchema ? `${schema.databricksSchema}.` : "";
    const table = schema.databricksTable;
    
    let query = `SELECT COUNT(*) as count FROM ${catalog}${schemaName}${table}`;
    
    if (job.jobType === "INCREMENTAL_HISTORICAL" && job.startDate && job.endDate) {
      query += ` WHERE date >= '${job.startDate.toISOString().split('T')[0]}' AND date <= '${job.endDate.toISOString().split('T')[0]}'`;
    }

    return query;
  }

  /**
   * 레코드를 텍스트로 변환
   */
  private recordToText(record: Record<string, unknown>, schema: RagEmbeddingSchema): string {
    // 임베딩 필드가 지정되어 있으면 해당 필드 사용
    if (schema.embeddingField && record[schema.embeddingField]) {
      return String(record[schema.embeddingField]);
    }

    // 기본적으로 모든 필드를 텍스트로 변환
    const parts: string[] = [];
    
    for (const [key, value] of Object.entries(record)) {
      if (value !== null && value !== undefined) {
        if (typeof value === "object") {
          parts.push(`${key}: ${JSON.stringify(value)}`);
        } else {
          parts.push(`${key}: ${value}`);
        }
      }
    }

    return parts.join(" ");
  }

  /**
   * 메타데이터 추출
   */
  private extractMetadata(
    record: Record<string, unknown>,
    schema: RagEmbeddingSchema
  ): Record<string, unknown> | null {
    if (!schema.metadataFields) {
      return null;
    }

    try {
      const metadataFields = JSON.parse(schema.metadataFields as string) as string[];
      const metadata: Record<string, unknown> = {};

      for (const field of metadataFields) {
        if (record[field] !== undefined) {
          metadata[field] = record[field];
        }
      }

      return Object.keys(metadata).length > 0 ? metadata : null;
    } catch (error) {
      console.warn("메타데이터 필드 파싱 실패:", error);
      return null;
    }
  }

  /**
   * 문서 ID 생성
   */
  private generateDocumentId(
    record: Record<string, unknown>,
    schema: RagEmbeddingSchema
  ): string {
    // ID 필드가 있으면 사용
    if (record.id) {
      return `${schema.id}-${record.id}`;
    }
    
    // 고유한 키 조합으로 ID 생성
    const keyFields = ["symbol", "date", "timestamp", "code"];
    const keyParts: string[] = [schema.id];
    
    for (const field of keyFields) {
      if (record[field] !== undefined) {
        keyParts.push(String(record[field]));
      }
    }

    return keyParts.join("-");
  }

  /**
   * 스키마 상태 업데이트
   */
  private async updateSchemaStatus(
    schemaId: string,
    job: RagEmbeddingJob,
    processedRecords: number
  ): Promise<void> {
    const status = await ragEmbeddingManager.getSchemaStatus(schemaId);
    
    if (!status) {
      return;
    }

    const updates: any = {
      totalEmbeddedRecords: (status.totalEmbeddedRecords || 0) + processedRecords,
      currentJobId: null,
    };

    if (job.jobType === "INCREMENTAL_NEW") {
      updates.latestDataEmbeddedAt = new Date();
      updates.latestDataEmbeddedCount = processedRecords;
    } else if (job.jobType === "INCREMENTAL_HISTORICAL") {
      updates.historicalDataEmbeddedRecords = (status.historicalDataEmbeddedRecords || 0) + processedRecords;
      
      if (status.historicalDataTotalRecords) {
        const progress = Math.floor(
          ((status.historicalDataEmbeddedRecords || 0) + processedRecords) /
          status.historicalDataTotalRecords *
          100
        );
        updates.historicalDataProgressPercentage = progress;
        
        if (progress >= 100) {
          updates.historicalDataEmbeddingStatus = "COMPLETED";
        } else {
          updates.historicalDataEmbeddingStatus = "IN_PROGRESS";
        }
      }
    }

    await ragEmbeddingManager.updateSchemaStatus(schemaId, updates);
  }

  /**
   * 지연 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const ragEmbeddingWorker = new RAGEmbeddingWorker();


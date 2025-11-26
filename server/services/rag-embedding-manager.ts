import { db } from "../db.js";
import {
  ragEmbeddingSchemas,
  ragEmbeddingJobs,
  ragEmbeddingStatus,
  type RagEmbeddingSchema,
  type InsertRagEmbeddingSchema,
  type RagEmbeddingJob,
  type InsertRagEmbeddingJob,
  type RagEmbeddingStatus,
  type InsertRagEmbeddingStatus,
} from "@shared/schema";
import { eq, and, desc, asc } from "drizzle-orm";

/**
 * RAG Embedding Manager Service
 * 
 * 벡터 임베딩 스키마 관리 및 증분식 임베딩 작업 관리
 */

export interface EmbeddingSchemaCreateInput {
  name: string;
  description?: string;
  databricksCatalog?: string;
  databricksSchema?: string;
  databricksTable: string;
  databricksQuery?: string;
  embeddingModel?: string;
  embeddingDimensions?: number;
  embeddingField?: string;
  searchIndexName: string;
  vectorFieldName?: string;
  contentFieldName?: string;
  metadataFields?: string[];
  createdBy?: string;
}

export interface EmbeddingSchemaUpdateInput {
  name?: string;
  description?: string;
  databricksCatalog?: string;
  databricksSchema?: string;
  databricksTable?: string;
  databricksQuery?: string;
  embeddingModel?: string;
  embeddingDimensions?: number;
  embeddingField?: string;
  searchIndexName?: string;
  vectorFieldName?: string;
  contentFieldName?: string;
  metadataFields?: string[];
  isActive?: boolean;
}

export type JobType = "INCREMENTAL_NEW" | "INCREMENTAL_HISTORICAL" | "FULL" | "MANUAL";
export type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export class RAGEmbeddingManager {
  /**
   * 스키마 목록 조회
   */
  async getSchemas(filters?: {
    isActive?: boolean;
    limit?: number;
  }): Promise<RagEmbeddingSchema[]> {
    let query = db.select().from(ragEmbeddingSchemas);

    const conditions = [];
    if (filters?.isActive !== undefined) {
      conditions.push(eq(ragEmbeddingSchemas.isActive, filters.isActive));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.orderBy(desc(ragEmbeddingSchemas.createdAt));

    if (filters?.limit) {
      return results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * 스키마 조회
   */
  async getSchema(id: string): Promise<RagEmbeddingSchema | undefined> {
    const [schema] = await db
      .select()
      .from(ragEmbeddingSchemas)
      .where(eq(ragEmbeddingSchemas.id, id));

    return schema;
  }

  /**
   * 스키마 생성
   */
  async createSchema(input: EmbeddingSchemaCreateInput): Promise<RagEmbeddingSchema> {
    const [schema] = await db
      .insert(ragEmbeddingSchemas)
      .values({
        name: input.name,
        description: input.description,
        databricksCatalog: input.databricksCatalog,
        databricksSchema: input.databricksSchema,
        databricksTable: input.databricksTable,
        databricksQuery: input.databricksQuery,
        embeddingModel: input.embeddingModel || "text-embedding-3-large",
        embeddingDimensions: input.embeddingDimensions || 3072,
        embeddingField: input.embeddingField,
        searchIndexName: input.searchIndexName,
        vectorFieldName: input.vectorFieldName || "content_vector",
        contentFieldName: input.contentFieldName || "content",
        metadataFields: input.metadataFields ? JSON.stringify(input.metadataFields) : null,
        isActive: true,
        createdBy: input.createdBy,
      } as InsertRagEmbeddingSchema)
      .returning();

    // 스키마 생성 시 상태 레코드도 생성
    await db
      .insert(ragEmbeddingStatus)
      .values({
        schemaId: schema.id,
        historicalDataEmbeddingStatus: "NOT_STARTED",
      } as InsertRagEmbeddingStatus);

    return schema;
  }

  /**
   * 스키마 수정
   */
  async updateSchema(
    id: string,
    input: EmbeddingSchemaUpdateInput
  ): Promise<RagEmbeddingSchema> {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.databricksCatalog !== undefined) updateData.databricksCatalog = input.databricksCatalog;
    if (input.databricksSchema !== undefined) updateData.databricksSchema = input.databricksSchema;
    if (input.databricksTable !== undefined) updateData.databricksTable = input.databricksTable;
    if (input.databricksQuery !== undefined) updateData.databricksQuery = input.databricksQuery;
    if (input.embeddingModel !== undefined) updateData.embeddingModel = input.embeddingModel;
    if (input.embeddingDimensions !== undefined) updateData.embeddingDimensions = input.embeddingDimensions;
    if (input.embeddingField !== undefined) updateData.embeddingField = input.embeddingField;
    if (input.searchIndexName !== undefined) updateData.searchIndexName = input.searchIndexName;
    if (input.vectorFieldName !== undefined) updateData.vectorFieldName = input.vectorFieldName;
    if (input.contentFieldName !== undefined) updateData.contentFieldName = input.contentFieldName;
    if (input.metadataFields !== undefined) {
      updateData.metadataFields = input.metadataFields ? JSON.stringify(input.metadataFields) : null;
    }
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    const [schema] = await db
      .update(ragEmbeddingSchemas)
      .set(updateData)
      .where(eq(ragEmbeddingSchemas.id, id))
      .returning();

    if (!schema) {
      throw new Error(`스키마를 찾을 수 없습니다: ${id}`);
    }

    return schema;
  }

  /**
   * 스키마 삭제
   */
  async deleteSchema(id: string): Promise<void> {
    // 관련 상태 및 작업 확인
    const [status] = await db
      .select()
      .from(ragEmbeddingStatus)
      .where(eq(ragEmbeddingStatus.schemaId, id));

    if (status?.currentJobId) {
      // 실행 중인 작업이 있으면 취소
      await db
        .update(ragEmbeddingJobs)
        .set({
          jobStatus: "CANCELLED",
          endTime: new Date(),
        })
        .where(eq(ragEmbeddingJobs.id, status.currentJobId));
    }

    // 상태 삭제
    if (status) {
      await db.delete(ragEmbeddingStatus).where(eq(ragEmbeddingStatus.schemaId, id));
    }

    // 스키마 삭제
    await db.delete(ragEmbeddingSchemas).where(eq(ragEmbeddingSchemas.id, id));
  }

  /**
   * 스키마별 임베딩 상태 조회
   */
  async getSchemaStatus(schemaId: string): Promise<RagEmbeddingStatus | undefined> {
    const [status] = await db
      .select()
      .from(ragEmbeddingStatus)
      .where(eq(ragEmbeddingStatus.schemaId, schemaId));

    return status;
  }

  /**
   * 임베딩 작업 생성
   */
  async createJob(
    schemaId: string,
    jobType: JobType,
    options?: {
      batchSize?: number;
      startDate?: Date;
      endDate?: Date;
      createdBy?: string;
    }
  ): Promise<RagEmbeddingJob> {
    const [job] = await db
      .insert(ragEmbeddingJobs)
      .values({
        schemaId,
        jobType,
        jobStatus: "PENDING",
        batchSize: options?.batchSize || 1000,
        startDate: options?.startDate,
        endDate: options?.endDate,
        createdBy: options?.createdBy,
      } as InsertRagEmbeddingJob)
      .returning();

    // 상태 업데이트
    await db
      .update(ragEmbeddingStatus)
      .set({
        currentJobId: job.id,
        lastUpdatedAt: new Date(),
      })
      .where(eq(ragEmbeddingStatus.schemaId, schemaId));

    return job;
  }

  /**
   * 작업 목록 조회
   */
  async getJobs(filters?: {
    schemaId?: string;
    jobStatus?: JobStatus;
    jobType?: JobType;
    limit?: number;
  }): Promise<RagEmbeddingJob[]> {
    let query = db.select().from(ragEmbeddingJobs);

    const conditions = [];
    if (filters?.schemaId) {
      conditions.push(eq(ragEmbeddingJobs.schemaId, filters.schemaId));
    }
    if (filters?.jobStatus) {
      conditions.push(eq(ragEmbeddingJobs.jobStatus, filters.jobStatus));
    }
    if (filters?.jobType) {
      conditions.push(eq(ragEmbeddingJobs.jobType, filters.jobType));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.orderBy(desc(ragEmbeddingJobs.createdAt));

    if (filters?.limit) {
      return results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * 작업 조회
   */
  async getJob(id: string): Promise<RagEmbeddingJob | undefined> {
    const [job] = await db
      .select()
      .from(ragEmbeddingJobs)
      .where(eq(ragEmbeddingJobs.id, id));

    return job;
  }

  /**
   * 작업 상태 업데이트
   */
  async updateJobStatus(
    id: string,
    status: JobStatus,
    updates?: {
      totalRecords?: number;
      processedRecords?: number;
      failedRecords?: number;
      progressPercentage?: number;
      errorMessage?: string;
      errorDetails?: any;
      startTime?: Date;
      endTime?: Date;
      estimatedCompletionTime?: Date;
    }
  ): Promise<void> {
    const updateData: any = {
      jobStatus: status,
    };

    if (updates?.totalRecords !== undefined) updateData.totalRecords = updates.totalRecords;
    if (updates?.processedRecords !== undefined) updateData.processedRecords = updates.processedRecords;
    if (updates?.failedRecords !== undefined) updateData.failedRecords = updates.failedRecords;
    if (updates?.progressPercentage !== undefined) updateData.progressPercentage = updates.progressPercentage;
    if (updates?.errorMessage !== undefined) updateData.errorMessage = updates.errorMessage;
    if (updates?.errorDetails !== undefined) updateData.errorDetails = JSON.stringify(updates.errorDetails);
    if (updates?.startTime !== undefined) updateData.startTime = updates.startTime;
    if (updates?.endTime !== undefined) updateData.endTime = updates.endTime;
    if (updates?.estimatedCompletionTime !== undefined) updateData.estimatedCompletionTime = updates.estimatedCompletionTime;

    await db
      .update(ragEmbeddingJobs)
      .set(updateData)
      .where(eq(ragEmbeddingJobs.id, id));
  }

  /**
   * 스키마 상태 업데이트
   */
  async updateSchemaStatus(
    schemaId: string,
    updates: {
      latestDataEmbeddedAt?: Date;
      latestDataEmbeddedCount?: number;
      historicalDataEmbeddingStatus?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
      historicalDataStartDate?: Date;
      historicalDataEndDate?: Date;
      historicalDataTotalRecords?: number;
      historicalDataEmbeddedRecords?: number;
      historicalDataProgressPercentage?: number;
      totalRecordsInSource?: number;
      totalEmbeddedRecords?: number;
      totalFailedRecords?: number;
      currentJobId?: string | null;
    }
  ): Promise<void> {
    const updateData: any = {
      lastUpdatedAt: new Date(),
    };

    Object.keys(updates).forEach((key) => {
      if (updates[key as keyof typeof updates] !== undefined) {
        updateData[key] = updates[key as keyof typeof updates];
      }
    });

    await db
      .update(ragEmbeddingStatus)
      .set(updateData)
      .where(eq(ragEmbeddingStatus.schemaId, schemaId));
  }

  /**
   * 실행 중인 작업 취소
   */
  async cancelJob(jobId: string): Promise<void> {
    await this.updateJobStatus(jobId, "CANCELLED", {
      endTime: new Date(),
    });

    // 상태에서 현재 작업 제거
    const [job] = await db
      .select()
      .from(ragEmbeddingJobs)
      .where(eq(ragEmbeddingJobs.id, jobId));

    if (job) {
      await db
        .update(ragEmbeddingStatus)
        .set({
          currentJobId: null,
          lastUpdatedAt: new Date(),
        })
        .where(eq(ragEmbeddingStatus.schemaId, job.schemaId));
    }
  }
}

export const ragEmbeddingManager = new RAGEmbeddingManager();


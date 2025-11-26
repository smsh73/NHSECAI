import { db } from "../db.js";
import {
  ragDataVersionControl,
  ragDataTamperingDetection,
  ragDataAnomalyDetection,
  ragDataProcessingLogs,
  type RagDataVersionControl,
  type InsertRagDataVersionControl,
  type RagDataTamperingDetection,
  type InsertRagDataTamperingDetection,
  type RagDataAnomalyDetection,
  type InsertRagDataAnomalyDetection,
  type RagDataProcessingLog,
  type InsertRagDataProcessingLog,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

/**
 * RAG Version Control Service
 * 
 * RAG 데이터의 형상관리 및 위변조 방지
 */

export interface VersionInfo {
  versionNumber: number;
  dataHash: string;
  changedAt: Date;
  changedBy?: string;
  changeType: string;
  changeDescription?: string;
}

export interface TamperingDetectionResult {
  isTampered: boolean;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  detectionType: string;
  details: any;
}

export class RAGVersionControlService {
  /**
   * 데이터 해시 생성 (SHA-256)
   */
  generateDataHash(data: any): string {
    const dataString = typeof data === "string" ? data : JSON.stringify(data);
    return crypto.createHash("sha256").update(dataString).digest("hex");
  }

  /**
   * 버전 생성
   */
  async createVersion(
    documentId: string,
    data: any,
    options: {
      schemaId?: string;
      changeType: "CREATE" | "UPDATE" | "DELETE";
      changeDescription?: string;
      changedBy?: string;
      changedByUsername?: string;
      previousVersionId?: string;
    }
  ): Promise<RagDataVersionControl> {
    const dataHash = this.generateDataHash(data);
    
    // 이전 버전 조회
    let previousVersion: RagDataVersionControl | undefined;
    let versionNumber = 1;

    if (options.previousVersionId) {
      const [prev] = await db
        .select()
        .from(ragDataVersionControl)
        .where(eq(ragDataVersionControl.id, options.previousVersionId));
      previousVersion = prev;
    } else {
      // 최신 버전 조회
      const versions = await db
        .select()
        .from(ragDataVersionControl)
        .where(eq(ragDataVersionControl.documentId, documentId))
        .orderBy(desc(ragDataVersionControl.versionNumber))
        .limit(1);
      
      if (versions.length > 0) {
        previousVersion = versions[0];
      }
    }

    if (previousVersion) {
      versionNumber = previousVersion.versionNumber + 1;
      
      // 해시 불일치 검증
      if (options.changeType === "UPDATE" && previousVersion.dataHash) {
        const hashMatch = dataHash === previousVersion.dataHash;
        if (!hashMatch) {
          // 위변조 탐지
          await this.detectTampering(
            documentId,
            options.schemaId,
            "HASH_MISMATCH",
            {
              expectedHash: previousVersion.dataHash,
              actualHash: dataHash,
              previousVersionId: previousVersion.id,
            }
          );
        }
      }
    }

    // 변경된 필드 추출
    const changedFields = previousVersion && previousVersion.dataSnapshot
      ? this.extractChangedFields(previousVersion.dataSnapshot as any, data)
      : null;

    // 버전 생성
    const [version] = await db
      .insert(ragDataVersionControl)
      .values({
        documentId,
        schemaId: options.schemaId,
        versionNumber,
        previousVersionId: previousVersion?.id,
        dataHash,
        previousDataHash: previousVersion?.dataHash,
        changeType: options.changeType,
        changeDescription: options.changeDescription,
        changedFields,
        changedBy: options.changedBy,
        changedByUsername: options.changedByUsername,
        dataSnapshot: data,
      } as InsertRagDataVersionControl)
      .returning();

    return version;
  }

  /**
   * 버전 이력 조회
   */
  async getVersionHistory(
    documentId: string,
    limit?: number
  ): Promise<RagDataVersionControl[]> {
    let query = db
      .select()
      .from(ragDataVersionControl)
      .where(eq(ragDataVersionControl.documentId, documentId))
      .orderBy(desc(ragDataVersionControl.versionNumber));

    const results = await query;

    if (limit) {
      return results.slice(0, limit);
    }

    return results;
  }

  /**
   * 특정 버전 조회
   */
  async getVersion(versionId: string): Promise<RagDataVersionControl | undefined> {
    const [version] = await db
      .select()
      .from(ragDataVersionControl)
      .where(eq(ragDataVersionControl.id, versionId));

    return version;
  }

  /**
   * 위변조 탐지
   */
  async detectTampering(
    documentId: string,
    schemaId: string | undefined,
    detectionType: "HASH_MISMATCH" | "UNEXPECTED_CHANGE" | "UNAUTHORIZED_MODIFICATION",
    details: any
  ): Promise<RagDataTamperingDetection> {
    const severity = detectionType === "HASH_MISMATCH" ? "CRITICAL" :
                     detectionType === "UNAUTHORIZED_MODIFICATION" ? "HIGH" : "MEDIUM";

    const [detection] = await db
      .insert(ragDataTamperingDetection)
      .values({
        documentId,
        schemaId,
        detectionType,
        detectionSeverity: severity,
        detectionDetails: details,
        expectedHash: details.expectedHash,
        actualHash: details.actualHash,
        detectedBy: "SYSTEM",
        mitigationAction: "ALERT",
        mitigationStatus: "PENDING",
      } as InsertRagDataTamperingDetection)
      .returning();

    // 보안 이벤트 기록
    await db.insert(require("@shared/schema").securityEvents).values({
      eventType: "DATA_TAMPERING",
      threatLevel: severity,
      description: `데이터 위변조 탐지: ${detectionType}`,
      source: "RAG_VERSION_CONTROL",
      affectedResource: documentId,
      mitigationAction: "ALERT",
      autoRemediated: false,
      details: {
        documentId,
        detectionType,
        details,
      },
    });

    return detection;
  }

  /**
   * 위변조 탐지 목록 조회
   */
  async getTamperingDetections(filters?: {
    documentId?: string;
    schemaId?: string;
    detectionType?: string;
    mitigationStatus?: string;
    limit?: number;
  }): Promise<RagDataTamperingDetection[]> {
    let query = db.select().from(ragDataTamperingDetection);

    const conditions = [];
    if (filters?.documentId) {
      conditions.push(eq(ragDataTamperingDetection.documentId, filters.documentId));
    }
    if (filters?.schemaId) {
      conditions.push(eq(ragDataTamperingDetection.schemaId, filters.schemaId));
    }
    if (filters?.detectionType) {
      conditions.push(eq(ragDataTamperingDetection.detectionType, filters.detectionType));
    }
    if (filters?.mitigationStatus) {
      conditions.push(eq(ragDataTamperingDetection.mitigationStatus, filters.mitigationStatus));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.orderBy(desc(ragDataTamperingDetection.detectedAt));

    if (filters?.limit) {
      return results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * 이상치 탐지
   */
  async detectAnomaly(
    documentId: string,
    schemaId: string | undefined,
    anomalyType: "STATISTICAL_OUTLIER" | "PATTERN_ANOMALY" | "CONTENT_ANOMALY" | "STRUCTURE_ANOMALY",
    anomalyScore: number,
    anomalyDescription: string,
    anomalyDetails: any,
    detectionMethod?: string
  ): Promise<RagDataAnomalyDetection> {
    const [detection] = await db
      .insert(ragDataAnomalyDetection)
      .values({
        documentId,
        schemaId,
        anomalyType,
        anomalyScore,
        anomalyDescription,
        anomalyDetails,
        detectionMethod: detectionMethod || "STATISTICAL",
        detectedBy: "SYSTEM",
      } as InsertRagDataAnomalyDetection)
      .returning();

    return detection;
  }

  /**
   * 이상치 탐지 목록 조회
   */
  async getAnomalyDetections(filters?: {
    documentId?: string;
    schemaId?: string;
    anomalyType?: string;
    verified?: boolean;
    minScore?: number;
    limit?: number;
  }): Promise<RagDataAnomalyDetection[]> {
    let query = db.select().from(ragDataAnomalyDetection);

    const conditions = [];
    if (filters?.documentId) {
      conditions.push(eq(ragDataAnomalyDetection.documentId, filters.documentId));
    }
    if (filters?.schemaId) {
      conditions.push(eq(ragDataAnomalyDetection.schemaId, filters.schemaId));
    }
    if (filters?.anomalyType) {
      conditions.push(eq(ragDataAnomalyDetection.anomalyType, filters.anomalyType));
    }
    if (filters?.verified !== undefined) {
      conditions.push(eq(ragDataAnomalyDetection.verified, filters.verified));
    }
    if (filters?.minScore !== undefined) {
      // minScore는 애플리케이션 레벨에서 필터링
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.orderBy(desc(ragDataAnomalyDetection.detectedAt));

    let filtered = results;
    if (filters?.minScore !== undefined) {
      filtered = filtered.filter(d => (d.anomalyScore || 0) >= filters.minScore!);
    }

    if (filters?.limit) {
      return filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  /**
   * 데이터 가공 처리 로그 기록
   */
  async logDataProcessing(
    schemaId: string | undefined,
    documentId: string | undefined,
    processingType: "EXTRACTION" | "TRANSFORMATION" | "VALIDATION" | "EMBEDDING" | "INDEXING",
    options: {
      processingStep?: string;
      inputData?: any;
      outputData?: any;
      processingResult?: any;
      errorMessage?: string;
      processedBy?: string;
    }
  ): Promise<RagDataProcessingLog> {
    const inputDataHash = options.inputData ? this.generateDataHash(options.inputData) : null;
    const outputDataHash = options.outputData ? this.generateDataHash(options.outputData) : null;

    const processingStatus = options.errorMessage ? "FAILED" : "COMPLETED";

    const [log] = await db
      .insert(ragDataProcessingLogs)
      .values({
        schemaId,
        documentId,
        processingType,
        processingStep: options.processingStep,
        processingStatus,
        inputDataHash,
        outputDataHash,
        inputDataSnapshot: options.inputData ? JSON.parse(JSON.stringify(options.inputData)) : null,
        outputDataSnapshot: options.outputData ? JSON.parse(JSON.stringify(options.outputData)) : null,
        processingResult: options.processingResult,
        errorMessage: options.errorMessage,
        processedBy: options.processedBy || "SYSTEM",
      } as InsertRagDataProcessingLog)
      .returning();

    return log;
  }

  /**
   * 데이터 가공 처리 로그 조회
   */
  async getDataProcessingLogs(filters?: {
    schemaId?: string;
    documentId?: string;
    processingType?: string;
    processingStatus?: string;
    limit?: number;
  }): Promise<RagDataProcessingLog[]> {
    let query = db.select().from(ragDataProcessingLogs);

    const conditions = [];
    if (filters?.schemaId) {
      conditions.push(eq(ragDataProcessingLogs.schemaId, filters.schemaId));
    }
    if (filters?.documentId) {
      conditions.push(eq(ragDataProcessingLogs.documentId, filters.documentId));
    }
    if (filters?.processingType) {
      conditions.push(eq(ragDataProcessingLogs.processingType, filters.processingType));
    }
    if (filters?.processingStatus) {
      conditions.push(eq(ragDataProcessingLogs.processingStatus, filters.processingStatus));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.orderBy(desc(ragDataProcessingLogs.processedAt));

    if (filters?.limit) {
      return results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * 변경된 필드 추출
   */
  private extractChangedFields(oldData: any, newData: any): string[] {
    const changedFields: string[] = [];

    if (!oldData || !newData) {
      return changedFields;
    }

    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    for (const key of allKeys) {
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        changedFields.push(key);
      }
    }

    return changedFields;
  }

  /**
   * 데이터 무결성 검증
   */
  async verifyDataIntegrity(
    documentId: string,
    currentData: any
  ): Promise<{
    isValid: boolean;
    mismatchedVersions?: Array<{
      versionId: string;
      versionNumber: number;
      expectedHash: string;
      actualHash: string;
    }>;
  }> {
    const currentHash = this.generateDataHash(currentData);
    const versions = await this.getVersionHistory(documentId);

    const mismatchedVersions: Array<{
      versionId: string;
      versionNumber: number;
      expectedHash: string;
      actualHash: string;
    }> = [];

    for (const version of versions) {
      if (version.dataHash !== currentHash) {
        mismatchedVersions.push({
          versionId: version.id,
          versionNumber: version.versionNumber,
          expectedHash: version.dataHash,
          actualHash: currentHash,
        });
      }
    }

    return {
      isValid: mismatchedVersions.length === 0,
      mismatchedVersions: mismatchedVersions.length > 0 ? mismatchedVersions : undefined,
    };
  }
}

export const ragVersionControlService = new RAGVersionControlService();


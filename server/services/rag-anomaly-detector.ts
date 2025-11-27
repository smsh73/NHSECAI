import { db } from "../db.js";
import { ragDataAnomalyDetection, ragEmbeddingSchemas } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * RAG 데이터 이상치 탐지 서비스
 * 
 * RAG 참조데이터의 이상치를 탐지하고 분석
 */

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  anomalyType: "STATISTICAL" | "PATTERN_BASED" | "CONTENT_ANOMALY" | "EMBEDDING_ANOMALY";
  anomalyScore: number; // 0-1 사이의 이상치 점수
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  details: {
    detectedFields?: string[];
    expectedRange?: { min: number; max: number };
    actualValue?: any;
    statisticalMetrics?: {
      mean?: number;
      stdDev?: number;
      zScore?: number;
    };
  };
}

export class RAGAnomalyDetector {
  /**
   * 통계적 이상치 탐지
   */
  async detectStatisticalAnomaly(
    documentId: string,
    data: any,
    schemaId?: string
  ): Promise<AnomalyDetectionResult> {
    try {
      // 스키마 정보 조회
      let schema = null;
      if (schemaId) {
        const [schemaResult] = await db
          .select()
          .from(ragEmbeddingSchemas)
          .where(eq(ragEmbeddingSchemas.id, schemaId));
        schema = schemaResult;
      }

      // 숫자 필드에 대한 통계적 분석
      const numericFields: string[] = [];
      const numericValues: Record<string, number[]> = {};

      // 데이터에서 숫자 필드 추출
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === "number") {
          numericFields.push(key);
          numericValues[key] = [value];
        }
      }

      // 각 숫자 필드에 대해 통계 계산
      const anomalies: Array<{
        field: string;
        zScore: number;
        value: number;
      }> = [];

      for (const field of numericFields) {
        const values = numericValues[field];
        if (values.length === 0) continue;

        // 평균 및 표준편차 계산 (단일 값이므로 임시로 처리)
        const mean = values[0];
        const stdDev = 1; // 기본값

        // Z-score 계산
        const zScore = Math.abs((values[0] - mean) / (stdDev || 1));

        // Z-score가 3 이상이면 이상치로 간주
        if (zScore >= 3) {
          anomalies.push({
            field,
            zScore,
            value: values[0],
          });
        }
      }

      if (anomalies.length > 0) {
        const maxZScore = Math.max(...anomalies.map(a => a.zScore));
        const severity = maxZScore >= 5 ? "CRITICAL" : maxZScore >= 3 ? "HIGH" : "MEDIUM";

        await this.recordAnomalyDetection(
          documentId,
          schemaId,
          "STATISTICAL",
          severity,
          maxZScore / 10, // 정규화된 점수
          {
            detectedFields: anomalies.map(a => a.field),
            statisticalMetrics: {
              zScore: maxZScore,
            },
          }
        );

        return {
          isAnomaly: true,
          anomalyType: "STATISTICAL",
          anomalyScore: Math.min(maxZScore / 10, 1),
          severity,
          details: {
            detectedFields: anomalies.map(a => a.field),
            statisticalMetrics: {
              zScore: maxZScore,
            },
          },
        };
      }

      return {
        isAnomaly: false,
        anomalyType: "STATISTICAL",
        anomalyScore: 0,
        severity: "LOW",
        details: {},
      };
    } catch (error: any) {
      console.error("통계적 이상치 탐지 실패:", error);
      throw error;
    }
  }

  /**
   * 패턴 기반 이상치 탐지
   */
  async detectPatternAnomaly(
    documentId: string,
    data: any,
    schemaId?: string
  ): Promise<AnomalyDetectionResult> {
    try {
      // 텍스트 필드에서 이상 패턴 탐지
      const textFields: string[] = [];
      const anomalies: string[] = [];

      for (const [key, value] of Object.entries(data)) {
        if (typeof value === "string" && value.length > 0) {
          textFields.push(key);

          // 이상 패턴 검사
          const suspiciousPatterns = [
            /[^\x00-\x7F]{100,}/g, // 매우 긴 비ASCII 문자
            /(.)\1{20,}/g, // 반복되는 문자
            /<script|javascript:|onerror=/gi, // 스크립트 인젝션 시도
            /eval\(|exec\(/gi, // 코드 실행 시도
          ];

          for (const pattern of suspiciousPatterns) {
            if (pattern.test(value)) {
              anomalies.push(key);
              break;
            }
          }
        }
      }

      if (anomalies.length > 0) {
        const severity = anomalies.length >= 3 ? "HIGH" : "MEDIUM";

        await this.recordAnomalyDetection(
          documentId,
          schemaId,
          "PATTERN_BASED",
          severity,
          0.7, // 기본 이상치 점수
          {
            detectedFields: anomalies,
          }
        );

        return {
          isAnomaly: true,
          anomalyType: "PATTERN_BASED",
          anomalyScore: 0.7,
          severity,
          details: {
            detectedFields: anomalies,
          },
        };
      }

      return {
        isAnomaly: false,
        anomalyType: "PATTERN_BASED",
        anomalyScore: 0,
        severity: "LOW",
        details: {},
      };
    } catch (error: any) {
      console.error("패턴 기반 이상치 탐지 실패:", error);
      throw error;
    }
  }

  /**
   * 이상치 탐지 기록
   */
  async recordAnomalyDetection(
    documentId: string,
    schemaId: string | undefined,
    anomalyType: "STATISTICAL" | "PATTERN_BASED" | "CONTENT_ANOMALY" | "EMBEDDING_ANOMALY",
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
    anomalyScore: number,
    details: {
      detectedFields?: string[];
      expectedRange?: { min: number; max: number };
      actualValue?: any;
      statisticalMetrics?: {
        mean?: number;
        stdDev?: number;
        zScore?: number;
      };
      detectedBy?: string;
    }
  ): Promise<void> {
    try {
      await db.insert(ragDataAnomalyDetection).values({
        documentId,
        schemaId: schemaId || null,
        anomalyType,
        anomalySeverity: severity,
        anomalyScore,
        anomalyDetails: details,
        detectedBy: details.detectedBy || "SYSTEM",
        verificationStatus: "PENDING",
        metadata: {
          detectedFields: details.detectedFields,
          statisticalMetrics: details.statisticalMetrics,
        },
      });
    } catch (error: any) {
      console.error("이상치 탐지 기록 실패:", error);
      throw error;
    }
  }

  /**
   * 이상치 탐지 목록 조회
   */
  async getAnomalyDetections(filters?: {
    documentId?: string;
    schemaId?: string;
    anomalyType?: string;
    severity?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<any[]> {
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
    if (filters?.severity) {
      conditions.push(eq(ragDataAnomalyDetection.anomalySeverity, filters.severity));
    }

    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }

    const results = await query
      .orderBy(desc(ragDataAnomalyDetection.detectedAt))
      .limit(filters?.limit || 100);

    return results;
  }

  /**
   * 이상치 검증
   */
  async verifyAnomaly(
    detectionId: string,
    isAnomaly: boolean,
    verifiedBy?: string,
    verificationNotes?: string
  ): Promise<void> {
    try {
      await db
        .update(ragDataAnomalyDetection)
        .set({
          verificationStatus: isAnomaly ? "VERIFIED" : "FALSE_POSITIVE",
          verifiedAt: new Date(),
          verifiedBy: verifiedBy || null,
          verificationNotes: verificationNotes || null,
        })
        .where(eq(ragDataAnomalyDetection.id, detectionId));
    } catch (error: any) {
      console.error("이상치 검증 실패:", error);
      throw error;
    }
  }
}

export const ragAnomalyDetector = new RAGAnomalyDetector();


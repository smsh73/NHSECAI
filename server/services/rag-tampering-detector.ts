import { db } from "../db.js";
import { ragDataTamperingDetection, ragDataVersionControl } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { ragVersionControlService } from "./rag-version-control.js";
import crypto from "crypto";

/**
 * RAG 데이터 위변조 탐지 서비스
 * 
 * RAG 참조데이터의 위변조를 탐지하고 대응
 */

export interface TamperingDetectionResult {
  isTampered: boolean;
  detectionType: "HASH_MISMATCH" | "UNEXPECTED_CHANGE" | "UNAUTHORIZED_MODIFICATION";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  details: {
    expectedHash?: string;
    actualHash?: string;
    changedFields?: string[];
    previousVersionId?: string;
    currentVersionId?: string;
  };
}

export class RAGTamperingDetector {
  /**
   * 데이터 해시 검증
   */
  async verifyDataHash(
    documentId: string,
    currentData: any
  ): Promise<TamperingDetectionResult> {
    try {
      // 현재 데이터 해시 생성
      const currentHash = ragVersionControlService.generateDataHash(currentData);

      // 최신 버전 조회
      const versions = await db
        .select()
        .from(ragDataVersionControl)
        .where(eq(ragDataVersionControl.documentId, documentId))
        .orderBy(desc(ragDataVersionControl.versionNumber))
        .limit(1);

      if (versions.length === 0) {
        // 버전 이력이 없으면 새로 생성
        return {
          isTampered: false,
          detectionType: "HASH_MISMATCH",
          severity: "LOW",
          details: {
            actualHash: currentHash,
          },
        };
      }

      const latestVersion = versions[0];

      // 해시 비교
      if (latestVersion.dataHash !== currentHash) {
        // 위변조 탐지
        await this.recordTamperingDetection(
          documentId,
          latestVersion.schemaId || undefined,
          "HASH_MISMATCH",
          "CRITICAL",
          {
            expectedHash: latestVersion.dataHash,
            actualHash: currentHash,
            previousVersionId: latestVersion.id,
          }
        );

        return {
          isTampered: true,
          detectionType: "HASH_MISMATCH",
          severity: "CRITICAL",
          details: {
            expectedHash: latestVersion.dataHash,
            actualHash: currentHash,
            previousVersionId: latestVersion.id,
          },
        };
      }

      return {
        isTampered: false,
        detectionType: "HASH_MISMATCH",
        severity: "LOW",
        details: {
          expectedHash: latestVersion.dataHash,
          actualHash: currentHash,
          previousVersionId: latestVersion.id,
        },
      };
    } catch (error: any) {
      console.error("데이터 해시 검증 실패:", error);
      throw error;
    }
  }

  /**
   * 예상치 못한 변경 탐지
   */
  async detectUnexpectedChange(
    documentId: string,
    currentData: any,
    expectedFields?: string[]
  ): Promise<TamperingDetectionResult> {
    try {
      // 최신 버전 조회
      const versions = await db
        .select()
        .from(ragDataVersionControl)
        .where(eq(ragDataVersionControl.documentId, documentId))
        .orderBy(desc(ragDataVersionControl.versionNumber))
        .limit(1);

      if (versions.length === 0) {
        return {
          isTampered: false,
          detectionType: "UNEXPECTED_CHANGE",
          severity: "LOW",
          details: {},
        };
      }

      const latestVersion = versions[0];
      const previousData = latestVersion.dataSnapshot as any;

      if (!previousData) {
        return {
          isTampered: false,
          detectionType: "UNEXPECTED_CHANGE",
          severity: "LOW",
          details: {},
        };
      }

      // 변경된 필드 추출
      const changedFields = this.extractChangedFields(previousData, currentData);

      // 예상치 못한 필드 변경 확인
      if (expectedFields && changedFields.length > 0) {
        const unexpectedFields = changedFields.filter(
          field => !expectedFields.includes(field)
        );

        if (unexpectedFields.length > 0) {
          await this.recordTamperingDetection(
            documentId,
            latestVersion.schemaId || undefined,
            "UNEXPECTED_CHANGE",
            "HIGH",
            {
              changedFields: unexpectedFields,
              previousVersionId: latestVersion.id,
            }
          );

          return {
            isTampered: true,
            detectionType: "UNEXPECTED_CHANGE",
            severity: "HIGH",
            details: {
              changedFields: unexpectedFields,
              previousVersionId: latestVersion.id,
            },
          };
        }
      }

      return {
        isTampered: false,
        detectionType: "UNEXPECTED_CHANGE",
        severity: "LOW",
        details: {
          changedFields,
          previousVersionId: latestVersion.id,
        },
      };
    } catch (error: any) {
      console.error("예상치 못한 변경 탐지 실패:", error);
      throw error;
    }
  }

  /**
   * 위변조 탐지 기록
   */
  async recordTamperingDetection(
    documentId: string,
    schemaId: string | undefined,
    detectionType: "HASH_MISMATCH" | "UNEXPECTED_CHANGE" | "UNAUTHORIZED_MODIFICATION",
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
    details: {
      expectedHash?: string;
      actualHash?: string;
      changedFields?: string[];
      previousVersionId?: string;
      detectedBy?: string;
    }
  ): Promise<void> {
    try {
      await db.insert(ragDataTamperingDetection).values({
        documentId,
        schemaId: schemaId || null,
        detectionType,
        detectionSeverity: severity,
        detectionDetails: details,
        expectedHash: details.expectedHash || null,
        actualHash: details.actualHash || null,
        detectedBy: details.detectedBy || "SYSTEM",
        mitigationStatus: "PENDING",
        metadata: {
          previousVersionId: details.previousVersionId,
          changedFields: details.changedFields,
        },
      });
    } catch (error: any) {
      console.error("위변조 탐지 기록 실패:", error);
      throw error;
    }
  }

  /**
   * 변경된 필드 추출
   */
  private extractChangedFields(oldData: any, newData: any): string[] {
    const changedFields: string[] = [];

    if (!oldData || !newData) {
      return changedFields;
    }

    // 모든 키 확인
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    for (const key of allKeys) {
      const oldValue = oldData[key];
      const newValue = newData[key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changedFields.push(key);
      }
    }

    return changedFields;
  }

  /**
   * 위변조 탐지 목록 조회
   */
  async getTamperingDetections(filters?: {
    documentId?: string;
    schemaId?: string;
    detectionType?: string;
    severity?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<any[]> {
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
    if (filters?.severity) {
      conditions.push(eq(ragDataTamperingDetection.detectionSeverity, filters.severity));
    }

    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }

    const results = await query
      .orderBy(desc(ragDataTamperingDetection.detectedAt))
      .limit(filters?.limit || 100);

    return results;
  }

  /**
   * 위변조 대응 조치
   */
  async mitigateTampering(
    detectionId: string,
    action: "ROLLBACK" | "ALERT" | "BLOCK" | "INVESTIGATE",
    mitigatedBy?: string
  ): Promise<void> {
    try {
      await db
        .update(ragDataTamperingDetection)
        .set({
          mitigationAction: action,
          mitigationStatus: "IN_PROGRESS",
          mitigatedAt: new Date(),
          mitigatedBy: mitigatedBy || null,
        })
        .where(eq(ragDataTamperingDetection.id, detectionId));
    } catch (error: any) {
      console.error("위변조 대응 조치 실패:", error);
      throw error;
    }
  }
}

export const ragTamperingDetector = new RAGTamperingDetector();


import { db } from "../db.js";
import {
  auditLogs,
  auditLogsArchive,
  type InsertAuditLog,
} from "@shared/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

/**
 * Enhanced Audit Logger Service
 * 
 * 개선된 감사 로깅 서비스
 * - 사용자별 구분 가능한 로깅
 * - 가드레일 탐지 로깅 구분
 * - 1년 이상 로그 저장 및 아카이브
 */

export interface AuditLogContext {
  userId?: string;
  username?: string;
  userRole?: string;
  userIp?: string;
  userAgent?: string;
  sessionId?: string;
  userIdentifier?: string; // 사용자 구분자 (추가)
}

export interface GuardrailDetectionContext {
  guardrailDetected: boolean;
  guardrailType?: string; // INPUT_GUARDRAIL, OUTPUT_GUARDRAIL, PROMPT_INJECTION 등
  detectionDetails?: any;
}

export interface AuditLogOptions {
  eventType: string;
  eventCategory: string;
  severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  action: string;
  actionDescription?: string;
  resourceType?: string;
  resourceId?: string;
  success?: boolean;
  errorCode?: string;
  errorMessage?: string;
  executionTimeMs?: number;
  requestData?: any;
  responseData?: any;
  metadata?: any;
  tags?: string[];
  context: AuditLogContext;
  guardrailContext?: GuardrailDetectionContext;
}

export class EnhancedAuditLogger {
  // 로그 보관 기간 (일) - 1년 = 365일
  private readonly RETENTION_PERIOD_DAYS = 365;

  /**
   * 감사 로그 기록
   */
  async log(options: AuditLogOptions): Promise<void> {
    try {
      // 사용자 구분자 생성 (우선순위: userId > username > userIp > "unknown")
      const userIdentifier = options.context.userIdentifier ||
        options.context.userId ||
        options.context.username ||
        options.context.userIp ||
        "unknown";

      // 가드레일 탐지 정보
      const guardrailDetected = options.guardrailContext?.guardrailDetected || false;
      const guardrailType = options.guardrailContext?.guardrailType;

      await db.insert(auditLogs).values({
        eventType: options.eventType,
        eventCategory: options.eventCategory,
        severity: options.severity || "INFO",
        action: options.action,
        actionDescription: options.actionDescription,
        resourceType: options.resourceType,
        resourceId: options.resourceId,
        userId: options.context.userId,
        username: options.context.username,
        userRole: options.context.userRole,
        userIp: options.context.userIp,
        userAgent: options.context.userAgent,
        sessionId: options.context.sessionId,
        userIdentifier, // 사용자 구분자 추가
        success: options.success !== undefined ? options.success : true,
        errorCode: options.errorCode,
        errorMessage: options.errorMessage,
        executionTimeMs: options.executionTimeMs,
        requestData: options.requestData ? JSON.parse(JSON.stringify(options.requestData)) : null,
        responseData: options.responseData ? JSON.parse(JSON.stringify(options.responseData)) : null,
        metadata: options.metadata ? JSON.parse(JSON.stringify(options.metadata)) : null,
        tags: options.tags,
        guardrailDetected, // 가드레일 탐지 여부
        guardrailType, // 가드레일 유형
        complianceFlag: options.severity === "CRITICAL" || options.severity === "HIGH",
        retentionPeriod: this.RETENTION_PERIOD_DAYS,
      } as InsertAuditLog);
    } catch (error) {
      console.error("감사 로그 기록 실패:", error);
      // 로그 기록 실패는 시스템에 치명적이지 않으므로 에러를 던지지 않음
    }
  }

  /**
   * 가드레일 탐지 로그 기록
   */
  async logGuardrailDetection(
    type: "INPUT" | "OUTPUT",
    detections: Array<{
      type: string;
      severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      message: string;
      details?: any;
    }>,
    originalContent: string,
    sanitizedContent: string,
    context: AuditLogContext
  ): Promise<void> {
    const maxSeverity = detections.reduce((max, d) => {
      const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return severityOrder[d.severity] > severityOrder[max] ? d.severity : max;
    }, "LOW" as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL");

    await this.log({
      eventType: "SECURITY_EVENT",
      eventCategory: "SECURITY",
      severity: maxSeverity,
      action: `${type}_GUARDRAIL_DETECTED`,
      actionDescription: `가드레일 탐지: ${detections.map(d => d.type).join(", ")}`,
      resourceType: "RAG_SYSTEM",
      success: false,
      errorMessage: `${detections.length}개의 가드레일 위반이 탐지되었습니다`,
      requestData: {
        type,
        originalContent: originalContent.substring(0, 1000),
        detections: detections.map(d => ({
          type: d.type,
          severity: d.severity,
          message: d.message,
        })),
      },
      responseData: {
        sanitizedContent: sanitizedContent.substring(0, 1000),
      },
      context,
      guardrailContext: {
        guardrailDetected: true,
        guardrailType: `${type}_GUARDRAIL`,
        detectionDetails: {
          detectionCount: detections.length,
          detectionTypes: detections.map(d => d.type),
        },
      },
    });
  }

  /**
   * 오래된 로그 아카이브 (1년 이상 된 로그)
   */
  async archiveOldLogs(): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_PERIOD_DAYS);

      // 아카이브할 로그 조회
      const logsToArchive = await db
        .select()
        .from(auditLogs)
        .where(lte(auditLogs.createdAt, cutoffDate));

      if (logsToArchive.length === 0) {
        return 0;
      }

      // 아카이브 테이블에 복사
      for (const log of logsToArchive) {
        await db.insert(auditLogsArchive).values({
          ...log,
          id: log.id, // ID 유지
        });
      }

      // 원본 로그 삭제
      await db
        .delete(auditLogs)
        .where(lte(auditLogs.createdAt, cutoffDate));

      return logsToArchive.length;
    } catch (error) {
      console.error("로그 아카이브 실패:", error);
      return 0;
    }
  }

  /**
   * 아카이브된 로그 조회
   */
  async getArchivedLogs(filters?: {
    userId?: string;
    userIdentifier?: string;
    eventType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<any[]> {
    let query = db.select().from(auditLogsArchive);

    const conditions = [];
    if (filters?.userId) {
      conditions.push(eq(auditLogsArchive.userId, filters.userId));
    }
    if (filters?.userIdentifier) {
      conditions.push(eq(auditLogsArchive.userIdentifier, filters.userIdentifier));
    }
    if (filters?.eventType) {
      conditions.push(eq(auditLogsArchive.eventType, filters.eventType));
    }
    if (filters?.startDate) {
      conditions.push(gte(auditLogsArchive.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(auditLogsArchive.createdAt, filters.endDate));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.orderBy(desc(auditLogsArchive.createdAt));

    if (filters?.limit) {
      return results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * 사용자별 로그 조회
   */
  async getLogsByUser(
    userIdentifier: string,
    filters?: {
      eventType?: string;
      guardrailDetected?: boolean;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<any[]> {
    let query = db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userIdentifier, userIdentifier));

    const conditions = [eq(auditLogs.userIdentifier, userIdentifier)];

    if (filters?.eventType) {
      conditions.push(eq(auditLogs.eventType, filters.eventType));
    }
    if (filters?.guardrailDetected !== undefined) {
      conditions.push(eq(auditLogs.guardrailDetected, filters.guardrailDetected));
    }
    if (filters?.startDate) {
      conditions.push(gte(auditLogs.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(auditLogs.createdAt, filters.endDate));
    }

    query = query.where(and(...conditions));

    const results = await query.orderBy(desc(auditLogs.createdAt));

    if (filters?.limit) {
      return results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * 가드레일 탐지 로그 조회
   */
  async getGuardrailLogs(filters?: {
    guardrailType?: string;
    severity?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<any[]> {
    let query = db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.guardrailDetected, true));

    const conditions = [eq(auditLogs.guardrailDetected, true)];

    if (filters?.guardrailType) {
      conditions.push(eq(auditLogs.guardrailType, filters.guardrailType));
    }
    if (filters?.severity) {
      conditions.push(eq(auditLogs.severity, filters.severity));
    }
    if (filters?.startDate) {
      conditions.push(gte(auditLogs.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(auditLogs.createdAt, filters.endDate));
    }

    query = query.where(and(...conditions));

    const results = await query.orderBy(desc(auditLogs.createdAt));

    if (filters?.limit) {
      return results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * 로그 통계 조회
   */
  async getLogStatistics(filters?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalLogs: number;
    logsByEventType: Record<string, number>;
    logsBySeverity: Record<string, number>;
    guardrailDetections: number;
    logsByUser: Record<string, number>;
  }> {
    let query = db.select().from(auditLogs);

    const conditions = [];
    if (filters?.startDate) {
      conditions.push(gte(auditLogs.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(auditLogs.createdAt, filters.endDate));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const allLogs = await query;

    const logsByEventType: Record<string, number> = {};
    const logsBySeverity: Record<string, number> = {};
    const logsByUser: Record<string, number> = {};
    let guardrailDetections = 0;

    for (const log of allLogs) {
      logsByEventType[log.eventType] = (logsByEventType[log.eventType] || 0) + 1;
      logsBySeverity[log.severity] = (logsBySeverity[log.severity] || 0) + 1;
      
      if (log.guardrailDetected) {
        guardrailDetections++;
      }

      const userKey = log.userIdentifier || log.userId || log.username || "unknown";
      logsByUser[userKey] = (logsByUser[userKey] || 0) + 1;
    }

    return {
      totalLogs: allLogs.length,
      logsByEventType,
      logsBySeverity,
      guardrailDetections,
      logsByUser,
    };
  }
}

export const enhancedAuditLogger = new EnhancedAuditLogger();


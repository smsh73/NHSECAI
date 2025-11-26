import { db } from "../db.js";
import {
  adversarialAttackEvents,
  securityEvents,
  type AdversarialAttackEvent,
  type InsertAdversarialAttackEvent,
} from "@shared/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { ragGuardrailsService } from "./rag-guardrails.js";

/**
 * RAG Adversarial Attack Monitor Service
 * 
 * 적대적 공격 모니터링 및 대응
 */

export interface AttackPattern {
  type: string;
  pattern: RegExp;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
}

export interface AttackStatistics {
  totalAttacks: number;
  attacksByType: Record<string, number>;
  attacksBySeverity: Record<string, number>;
  recentAttacks: AdversarialAttackEvent[];
  topAttackers: Array<{
    userId?: string;
    username?: string;
    userIp?: string;
    attackCount: number;
  }>;
}

export class RAGAdversarialMonitor {
  // 공격 패턴 정의
  private readonly attackPatterns: AttackPattern[] = [
    {
      type: "PROMPT_INJECTION",
      pattern: /ignore.*previous|forget.*previous|disregard.*previous/gi,
      severity: "CRITICAL",
      description: "프롬프트 인젝션 공격",
    },
    {
      type: "JAILBREAK",
      pattern: /you.*are.*now|pretend.*you.*are|act.*as.*if/gi,
      severity: "HIGH",
      description: "Jailbreak 공격",
    },
    {
      type: "DATA_POISONING",
      pattern: /inject.*data|poison.*data|corrupt.*data/gi,
      severity: "HIGH",
      description: "데이터 포이즈닝 공격",
    },
    {
      type: "INFORMATION_EXTRACTION",
      pattern: /show.*me.*your|what.*is.*your|reveal.*your|api.*key|secret/gi,
      severity: "HIGH",
      description: "정보 추출 시도",
    },
    {
      type: "CODE_INJECTION",
      pattern: /execute.*code|run.*command|eval\(|<script/gi,
      severity: "CRITICAL",
      description: "코드 인젝션 공격",
    },
  ];

  /**
   * 프롬프트 분석 및 공격 탐지
   */
  async analyzePrompt(
    prompt: string,
    context?: {
      userId?: string;
      username?: string;
      userIp?: string;
      sessionId?: string;
    }
  ): Promise<{
    isAttack: boolean;
    attackType?: string;
    severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    confidence: number;
    details?: any;
  }> {
    const detectedAttacks: Array<{
      type: string;
      severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      confidence: number;
      matchedText?: string;
    }> = [];

    // 공격 패턴 검사
    for (const attackPattern of this.attackPatterns) {
      const matches = prompt.match(attackPattern.pattern);
      if (matches && matches.length > 0) {
        detectedAttacks.push({
          type: attackPattern.type,
          severity: attackPattern.severity,
          confidence: Math.min(0.7 + (matches.length * 0.1), 1.0),
          matchedText: matches[0],
        });
      }
    }

    if (detectedAttacks.length === 0) {
      return {
        isAttack: false,
        confidence: 0,
      };
    }

    // 가장 심각한 공격 선택
    const maxSeverity = detectedAttacks.reduce((max, attack) => {
      const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return severityOrder[attack.severity] > severityOrder[max.severity] ? attack : max;
    }, detectedAttacks[0]);

    // 공격 이벤트 기록
    if (context) {
      await this.logAttackEvent(
        maxSeverity.type,
        maxSeverity.severity,
        prompt,
        maxSeverity.confidence,
        context
      );
    }

    return {
      isAttack: true,
      attackType: maxSeverity.type,
      severity: maxSeverity.severity,
      confidence: maxSeverity.confidence,
      details: {
        allDetections: detectedAttacks,
        primaryAttack: maxSeverity,
      },
    };
  }

  /**
   * 공격 이벤트 기록
   */
  private async logAttackEvent(
    attackType: string,
    attackSeverity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    attemptedPrompt: string,
    confidence: number,
    context: {
      userId?: string;
      username?: string;
      userIp?: string;
      sessionId?: string;
    }
  ): Promise<void> {
    try {
      await db.insert(adversarialAttackEvents).values({
        attackType,
        attackSeverity,
        attackPattern: attemptedPrompt.substring(0, 500),
        detectionMethod: "PATTERN_MATCHING",
        detectionConfidence: confidence,
        attemptedPrompt: attemptedPrompt.substring(0, 2000),
        userId: context.userId,
        username: context.username,
        userIp: context.userIp,
        sessionId: context.sessionId,
        mitigationAction: "BLOCKED",
        mitigationStatus: "COMPLETED",
        mitigatedAt: new Date(),
        metadata: {
          confidence,
          detectionTime: new Date().toISOString(),
        },
      } as InsertAdversarialAttackEvent);

      // 보안 이벤트도 기록
      await db.insert(securityEvents).values({
        eventType: "ADVERSARIAL_ATTACK",
        threatLevel: attackSeverity,
        userId: context.userId,
        username: context.username,
        userIp: context.userIp || "",
        description: `적대적 공격 탐지: ${attackType}`,
        source: "RAG_ADVERSARIAL_MONITOR",
        affectedResource: "RAG_SYSTEM",
        mitigationAction: "BLOCKED",
        autoRemediated: true,
        details: {
          attackType,
          confidence,
        },
      });
    } catch (error) {
      console.error("공격 이벤트 기록 실패:", error);
    }
  }

  /**
   * 공격 이벤트 조회
   */
  async getAttackEvents(filters?: {
    attackType?: string;
    attackSeverity?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AdversarialAttackEvent[]> {
    let query = db.select().from(adversarialAttackEvents);

    const conditions = [];
    if (filters?.attackType) {
      conditions.push(eq(adversarialAttackEvents.attackType, filters.attackType));
    }
    if (filters?.attackSeverity) {
      conditions.push(eq(adversarialAttackEvents.attackSeverity, filters.attackSeverity));
    }
    if (filters?.userId) {
      conditions.push(eq(adversarialAttackEvents.userId, filters.userId));
    }
    if (filters?.startDate) {
      conditions.push(gte(adversarialAttackEvents.detectedAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(adversarialAttackEvents.detectedAt, filters.endDate));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.orderBy(desc(adversarialAttackEvents.detectedAt));

    if (filters?.limit) {
      return results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * 공격 통계 조회
   */
  async getAttackStatistics(filters?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<AttackStatistics> {
    let query = db.select().from(adversarialAttackEvents);

    const conditions = [];
    if (filters?.startDate) {
      conditions.push(gte(adversarialAttackEvents.detectedAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(adversarialAttackEvents.detectedAt, filters.endDate));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const allAttacks = await query.orderBy(desc(adversarialAttackEvents.detectedAt));

    // 타입별 통계
    const attacksByType: Record<string, number> = {};
    const attacksBySeverity: Record<string, number> = {};
    const attackerCounts: Record<string, number> = {};

    for (const attack of allAttacks) {
      attacksByType[attack.attackType] = (attacksByType[attack.attackType] || 0) + 1;
      attacksBySeverity[attack.attackSeverity] = (attacksBySeverity[attack.attackSeverity] || 0) + 1;

      const attackerKey = attack.userId || attack.username || attack.userIp || "unknown";
      attackerCounts[attackerKey] = (attackerCounts[attackerKey] || 0) + 1;
    }

    // 상위 공격자
    const topAttackers = Object.entries(attackerCounts)
      .map(([key, count]) => {
        const attack = allAttacks.find(a => 
          a.userId === key || a.username === key || a.userIp === key
        );
        return {
          userId: attack?.userId,
          username: attack?.username,
          userIp: attack?.userIp,
          attackCount: count,
        };
      })
      .sort((a, b) => b.attackCount - a.attackCount)
      .slice(0, 10);

    return {
      totalAttacks: allAttacks.length,
      attacksByType,
      attacksBySeverity,
      recentAttacks: allAttacks.slice(0, 20),
      topAttackers,
    };
  }

  /**
   * 실시간 모니터링 (최근 공격 확인)
   */
  async getRecentAttacks(limit: number = 10): Promise<AdversarialAttackEvent[]> {
    const attacks = await db
      .select()
      .from(adversarialAttackEvents)
      .orderBy(desc(adversarialAttackEvents.detectedAt))
      .limit(limit);

    return attacks;
  }

  /**
   * 공격 패턴 분석
   */
  async analyzeAttackPatterns(filters?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    commonPatterns: Array<{
      pattern: string;
      count: number;
      severity: string;
    }>;
    attackTrends: Array<{
      date: string;
      count: number;
    }>;
  }> {
    const attacks = await this.getAttackEvents(filters);

    // 공통 패턴 추출
    const patternCounts: Record<string, number> = {};
    for (const attack of attacks) {
      if (attack.attackPattern) {
        const pattern = attack.attackPattern.substring(0, 50);
        patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
      }
    }

    const commonPatterns = Object.entries(patternCounts)
      .map(([pattern, count]) => {
        const attack = attacks.find(a => a.attackPattern?.startsWith(pattern));
        return {
          pattern,
          count,
          severity: attack?.attackSeverity || "MEDIUM",
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 공격 트렌드 (일별)
    const trendMap: Record<string, number> = {};
    for (const attack of attacks) {
      const date = new Date(attack.detectedAt).toISOString().split('T')[0];
      trendMap[date] = (trendMap[date] || 0) + 1;
    }

    const attackTrends = Object.entries(trendMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      commonPatterns,
      attackTrends,
    };
  }
}

export const ragAdversarialMonitor = new RAGAdversarialMonitor();


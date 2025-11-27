import { guardrailsService } from "./guardrails.js";
import { db } from "../db.js";
import { auditLogs, securityEvents, adversarialAttackEvents } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

/**
 * RAG Guardrails Service
 * 
 * RAG 시스템을 위한 입력/출력 프롬프트 가드레일 및 적대적 공격 탐지
 */

export interface GuardrailDetection {
  detected: boolean;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  type: string;
  message: string;
  details?: any;
  suggestedAction?: string;
}

export interface PromptValidationResult {
  isValid: boolean;
  detections: GuardrailDetection[];
  sanitizedPrompt?: string;
  shouldBlock: boolean;
}

export class RAGGuardrailsService {
  // 프롬프트 인젝션 패턴
  private readonly promptInjectionPatterns = [
    // 시스템 프롬프트 무시 시도
    /ignore.*previous.*instructions?/gi,
    /forget.*previous.*instructions?/gi,
    /disregard.*previous.*instructions?/gi,
    /system.*prompt/gi,
    /you.*are.*now/gi,
    
    // 역할 변경 시도
    /you.*are.*a.*different/gi,
    /pretend.*you.*are/gi,
    /act.*as.*if/gi,
    
    // 지시문 우회 시도
    /new.*instructions?/gi,
    /override/gi,
    /bypass/gi,
    /hack/gi,
    
    // 정보 추출 시도
    /show.*me.*your/gi,
    /what.*is.*your/gi,
    /reveal.*your/gi,
    /tell.*me.*your/gi,
    /api.*key/gi,
    /secret/gi,
    /password/gi,
    
    // 코드 실행 시도
    /execute.*code/gi,
    /run.*command/gi,
    /eval\(/gi,
    /<script/gi,
    
    // 특수 문자 패턴
    /\[INST\]/gi,
    /\[SYSTEM\]/gi,
    /<\|im_start\|>/gi,
    /<\|im_end\|>/gi,
  ];

  // 개인정보 패턴
  private readonly piiPatterns = [
    /\d{3}-\d{4}-\d{4}/g, // 전화번호
    /\d{6}-\d{7}/g, // 주민등록번호
    /\d{4}\.\d{2}\.\d{2}/g, // 생년월일
    /[가-힣]{2,4}\s*님/g, // 이름
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // 이메일
  ];

  // 중요정보 패턴
  private readonly sensitiveInfoPatterns = [
    /계좌번호/gi,
    /카드번호/gi,
    /비밀번호/gi,
    /인증번호/gi,
    /api.*key/gi,
    /access.*token/gi,
    /secret.*key/gi,
  ];

  /**
   * 입력 프롬프트 검증
   */
  async validateInputPrompt(
    prompt: string,
    context?: {
      userId?: string;
      username?: string;
      userIp?: string;
      sessionId?: string;
    }
  ): Promise<PromptValidationResult> {
    const detections: GuardrailDetection[] = [];
    let sanitizedPrompt = prompt;

    // 프롬프트 인젝션 탐지
    for (const pattern of this.promptInjectionPatterns) {
      if (pattern.test(prompt)) {
        detections.push({
          detected: true,
          severity: "CRITICAL",
          type: "PROMPT_INJECTION",
          message: "프롬프트 인젝션 공격이 탐지되었습니다",
          details: {
            pattern: pattern.toString(),
            matchedText: prompt.match(pattern)?.[0],
          },
          suggestedAction: "요청을 차단하고 보안 팀에 알림",
        });
      }
    }

    // 개인정보 탐지
    for (const pattern of this.piiPatterns) {
      const matches = prompt.match(pattern);
      if (matches && matches.length > 0) {
        detections.push({
          detected: true,
          severity: "HIGH",
          type: "PII_DETECTED",
          message: "개인정보가 포함되어 있습니다",
          details: {
            pattern: pattern.toString(),
            matches: matches.slice(0, 3), // 처음 3개만 기록
          },
          suggestedAction: "개인정보를 제거하고 재요청",
        });
        
        // 개인정보 마스킹
        sanitizedPrompt = sanitizedPrompt.replace(pattern, "[개인정보 제거됨]");
      }
    }

    // 중요정보 탐지
    for (const pattern of this.sensitiveInfoPatterns) {
      if (pattern.test(prompt)) {
        detections.push({
          detected: true,
          severity: "HIGH",
          type: "SENSITIVE_INFO_DETECTED",
          message: "중요정보가 포함되어 있습니다",
          details: {
            pattern: pattern.toString(),
          },
          suggestedAction: "중요정보를 제거하고 재요청",
        });
      }
    }

    // 감사 로그 기록
    if (detections.length > 0 && context) {
      await this.logGuardrailDetection("INPUT", detections, prompt, sanitizedPrompt, context);
    }

    // 적대적 공격 이벤트 기록
    const criticalDetections = detections.filter(d => d.severity === "CRITICAL" || d.severity === "HIGH");
    if (criticalDetections.length > 0 && context) {
      await this.logAdversarialAttack(criticalDetections, prompt, context);
    }

    const shouldBlock = detections.some(d => d.severity === "CRITICAL" || d.severity === "HIGH");

    return {
      isValid: detections.length === 0,
      detections,
      sanitizedPrompt: detections.length > 0 ? sanitizedPrompt : undefined,
      shouldBlock,
    };
  }

  /**
   * 출력 프롬프트 검증
   */
  async validateOutputPrompt(
    output: string,
    context?: {
      userId?: string;
      username?: string;
      userIp?: string;
      sessionId?: string;
      originalPrompt?: string;
    }
  ): Promise<PromptValidationResult> {
    const detections: GuardrailDetection[] = [];
    let sanitizedOutput = output;

    // 시스템 정보 노출 탐지
    const systemInfoPatterns = [
      /api.*key.*:.*[a-zA-Z0-9]+/gi,
      /endpoint.*:.*https?:\/\//gi,
      /database.*password/gi,
      /secret.*:.*[a-zA-Z0-9]+/gi,
      /internal.*error/gi,
      /stack.*trace/gi,
    ];

    for (const pattern of systemInfoPatterns) {
      if (pattern.test(output)) {
        detections.push({
          detected: true,
          severity: "CRITICAL",
          type: "SYSTEM_INFO_EXPOSURE",
          message: "시스템 정보가 노출되었습니다",
          details: {
            pattern: pattern.toString(),
          },
          suggestedAction: "응답을 차단하고 재생성",
        });
        
        // 시스템 정보 마스킹
        sanitizedOutput = sanitizedOutput.replace(pattern, "[시스템 정보 제거됨]");
      }
    }

    // AI 모델 정보 노출 탐지
    const modelInfoPatterns = [
      /gpt-[\d.]+/gi,
      /text-embedding/gi,
      /model.*version/gi,
      /deployment.*name/gi,
    ];

    for (const pattern of modelInfoPatterns) {
      if (pattern.test(output)) {
        detections.push({
          detected: true,
          severity: "MEDIUM",
          type: "MODEL_INFO_EXPOSURE",
          message: "AI 모델 정보가 노출되었습니다",
          details: {
            pattern: pattern.toString(),
          },
          suggestedAction: "모델 정보를 제거",
        });
        
        sanitizedOutput = sanitizedOutput.replace(pattern, "[모델 정보 제거됨]");
      }
    }

    // 금융 규정 위반 탐지
    const financialViolationPatterns = [
      /반드시.*수익/gi,
      /확실한.*이익/gi,
      /보장.*수익률/gi,
      /무위험.*투자/gi,
      /지금.*당장.*사야/gi,
    ];

    for (const pattern of financialViolationPatterns) {
      if (pattern.test(output)) {
        detections.push({
          detected: true,
          severity: "HIGH",
          type: "FINANCIAL_REGULATION_VIOLATION",
          message: "금융 규정 위반 내용이 포함되어 있습니다",
          details: {
            pattern: pattern.toString(),
          },
          suggestedAction: "응답을 수정하거나 차단",
        });
      }
    }

    // 감사 로그 기록
    if (detections.length > 0 && context) {
      await this.logGuardrailDetection("OUTPUT", detections, output, sanitizedOutput, context);
    }

    const shouldBlock = detections.some(d => d.severity === "CRITICAL");

    return {
      isValid: detections.length === 0,
      detections,
      sanitizedOutput: detections.length > 0 ? sanitizedOutput : undefined,
      shouldBlock,
    };
  }

  /**
   * 가드레일 탐지 로그 기록
   */
  private async logGuardrailDetection(
    type: "INPUT" | "OUTPUT",
    detections: GuardrailDetection[],
    originalContent: string,
    sanitizedContent: string,
    context: {
      userId?: string;
      username?: string;
      userIp?: string;
      sessionId?: string;
    }
  ): Promise<void> {
    try {
      const maxSeverity = detections.reduce((max, d) => {
        const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return severityOrder[d.severity] > severityOrder[max] ? d.severity : max;
      }, "LOW" as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL");

      await db.insert(auditLogs).values({
        eventType: "SECURITY_EVENT",
        eventCategory: "SECURITY",
        severity: maxSeverity,
        action: `${type}_GUARDRAIL_DETECTED`,
        actionDescription: `가드레일 탐지: ${detections.map(d => d.type).join(", ")}`,
        resourceType: "RAG_SYSTEM",
        userId: context.userId,
        username: context.username,
        userIp: context.userIp,
        sessionId: context.sessionId,
        success: false,
        errorMessage: `${detections.length}개의 가드레일 위반이 탐지되었습니다`,
        requestData: {
          type,
          originalContent: originalContent.substring(0, 1000), // 최대 1000자만 저장
          detections: detections.map(d => ({
            type: d.type,
            severity: d.severity,
            message: d.message,
          })),
        },
        responseData: {
          sanitizedContent: sanitizedContent.substring(0, 1000),
        },
        guardrailDetected: true,
        guardrailType: detections[0]?.type,
        userIdentifier: context.userId || context.username || context.userIp || "unknown",
        metadata: {
          detectionCount: detections.length,
          detectionTypes: detections.map(d => d.type),
        },
      });
    } catch (error) {
      console.error("가드레일 탐지 로그 기록 실패:", error);
    }
  }

  /**
   * 적대적 공격 이벤트 기록
   */
  private async logAdversarialAttack(
    detections: GuardrailDetection[],
    attemptedPrompt: string,
    context: {
      userId?: string;
      username?: string;
      userIp?: string;
      sessionId?: string;
    }
  ): Promise<void> {
    try {
      const attackType = detections.find(d => d.type === "PROMPT_INJECTION") 
        ? "PROMPT_INJECTION" 
        : detections[0]?.type || "UNKNOWN";

      const maxSeverity = detections.reduce((max, d) => {
        const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return severityOrder[d.severity] > severityOrder[max] ? d.severity : max;
      }, "LOW" as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL");

      await db.insert(adversarialAttackEvents).values({
        attackType,
        attackSeverity: maxSeverity,
        attackPattern: attemptedPrompt.substring(0, 500),
        detectionMethod: "RULE_BASED",
        detectionConfidence: 0.9,
        attemptedPrompt: attemptedPrompt.substring(0, 2000),
        userId: context.userId,
        username: context.username,
        userIp: context.userIp,
        userAgent: context.sessionId, // 임시로 sessionId 사용
        sessionId: context.sessionId,
        mitigationAction: "BLOCKED",
        mitigationStatus: "COMPLETED",
        mitigatedAt: new Date(),
        metadata: {
          detections: detections.map(d => ({
            type: d.type,
            severity: d.severity,
            message: d.message,
          })),
        },
      });

      // 보안 이벤트도 기록
      await db.insert(securityEvents).values({
        eventType: "ADVERSARIAL_ATTACK",
        threatLevel: maxSeverity,
        userId: context.userId,
        username: context.username,
        userIp: context.userIp || "",
        description: `적대적 공격 탐지: ${attackType}`,
        source: "RAG_GUARDRAILS",
        affectedResource: "RAG_SYSTEM",
        mitigationAction: "BLOCKED",
        autoRemediated: true,
        details: {
          attackType,
          detections: detections.length,
        },
      });
    } catch (error) {
      console.error("적대적 공격 이벤트 기록 실패:", error);
    }
  }

  /**
   * 프롬프트 정리 (안전한 버전으로 변환)
   */
  sanitizePrompt(prompt: string): string {
    let sanitized = prompt;

    // 프롬프트 인젝션 패턴 제거
    for (const pattern of this.promptInjectionPatterns) {
      sanitized = sanitized.replace(pattern, "");
    }

    // 개인정보 마스킹
    for (const pattern of this.piiPatterns) {
      sanitized = sanitized.replace(pattern, "[개인정보 제거됨]");
    }

    // 중요정보 마스킹
    for (const pattern of this.sensitiveInfoPatterns) {
      sanitized = sanitized.replace(pattern, "[중요정보 제거됨]");
    }

    return sanitized.trim();
  }

  /**
   * 에러 메시지 필터링 (중요정보/AI모델 정보 노출 방지)
   */
  sanitizeErrorMessage(errorMessage: string): string {
    let sanitized = errorMessage;

    // 시스템 정보 패턴 제거
    const systemInfoPatterns = [
      /api.*key.*:.*[a-zA-Z0-9]+/gi,
      /endpoint.*:.*https?:\/\//gi,
      /database.*password/gi,
      /secret.*:.*[a-zA-Z0-9]+/gi,
      /connection.*string/gi,
      /connectionString/gi,
    ];

    for (const pattern of systemInfoPatterns) {
      sanitized = sanitized.replace(pattern, "[시스템 정보 제거됨]");
    }

    // AI 모델 정보 패턴 제거
    const modelInfoPatterns = [
      /gpt-[\d.]+/gi,
      /text-embedding-[\d.]+/gi,
      /model.*version.*:.*[\d.]+/gi,
      /deployment.*name.*:.*[a-zA-Z0-9-]+/gi,
      /azure.*openai/gi,
      /openai.*api/gi,
    ];

    for (const pattern of modelInfoPatterns) {
      sanitized = sanitized.replace(pattern, "[모델 정보 제거됨]");
    }

    // 스택 트레이스 제거
    sanitized = sanitized.replace(/at\s+.*\(.*\)/g, "");
    sanitized = sanitized.replace(/Error:\s*/gi, "오류: ");
    sanitized = sanitized.replace(/Exception:\s*/gi, "예외: ");

    // 개인정보 패턴 제거
    for (const pattern of this.piiPatterns) {
      sanitized = sanitized.replace(pattern, "[개인정보 제거됨]");
    }

    // 중요정보 패턴 제거
    for (const pattern of this.sensitiveInfoPatterns) {
      sanitized = sanitized.replace(pattern, "[중요정보 제거됨]");
    }

    return sanitized.trim() || "오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }
}

export const ragGuardrailsService = new RAGGuardrailsService();


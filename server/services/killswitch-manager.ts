import { db } from "../db.js";
import {
  systemKillswitch,
  auditLogs,
  securityEvents,
  type SystemKillswitch,
  type InsertSystemKillswitch,
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

/**
 * Killswitch Manager Service
 * 
 * 시스템 긴급 중단 기능 관리
 */

export interface KillswitchStatus {
  isActive: boolean;
  activationReason?: string;
  activatedAt?: Date;
  activatedBy?: string;
  affectedServices?: string[];
  affectedEndpoints?: string[];
}

export class KillswitchManager {
  private static instance: KillswitchManager;
  private killswitchStatus: KillswitchStatus | null = null;
  private lastCheck: Date = new Date();

  private constructor() {
    // 싱글톤 패턴
  }

  static getInstance(): KillswitchManager {
    if (!KillswitchManager.instance) {
      KillswitchManager.instance = new KillswitchManager();
    }
    return KillswitchManager.instance;
  }

  /**
   * 킬스위치 상태 확인 (캐시된 값 사용)
   */
  async getStatus(useCache: boolean = true): Promise<KillswitchStatus> {
    // 캐시가 5초 이내면 캐시 사용
    if (useCache && this.killswitchStatus && (Date.now() - this.lastCheck.getTime()) < 5000) {
      return this.killswitchStatus;
    }

    // 데이터베이스에서 최신 상태 조회
    const [latest] = await db
      .select()
      .from(systemKillswitch)
      .orderBy(desc(systemKillswitch.updatedAt))
      .limit(1);

    if (latest) {
      this.killswitchStatus = {
        isActive: latest.isActive,
        activationReason: latest.activationReason || undefined,
        activatedAt: latest.activatedAt || undefined,
        activatedBy: latest.activatedByUsername || undefined,
        affectedServices: latest.affectedServices || undefined,
        affectedEndpoints: latest.affectedEndpoints || undefined,
      };
    } else {
      this.killswitchStatus = {
        isActive: false,
      };
    }

    this.lastCheck = new Date();
    return this.killswitchStatus;
  }

  /**
   * 킬스위치 활성화
   */
  async activate(
    reason: string,
    options: {
      activatedBy?: string;
      activatedByUsername?: string;
      affectedServices?: string[];
      affectedEndpoints?: string[];
      details?: any;
    }
  ): Promise<SystemKillswitch> {
    // 기존 활성화된 킬스위치가 있는지 확인
    const [existing] = await db
      .select()
      .from(systemKillswitch)
      .where(eq(systemKillswitch.isActive, true))
      .limit(1);

    if (existing) {
      throw new Error("이미 활성화된 킬스위치가 있습니다. 먼저 비활성화하세요.");
    }

    // 킬스위치 활성화
    const [killswitch] = await db
      .insert(systemKillswitch)
      .values({
        isActive: true,
        activationReason: reason,
        activationDetails: options.details,
        activatedBy: options.activatedBy,
        activatedByUsername: options.activatedByUsername,
        activatedAt: new Date(),
        affectedServices: options.affectedServices,
        affectedEndpoints: options.affectedEndpoints,
      } as InsertSystemKillswitch)
      .returning();

    // 상태 캐시 업데이트
    this.killswitchStatus = {
      isActive: true,
      activationReason: reason,
      activatedAt: killswitch.activatedAt || undefined,
      activatedBy: options.activatedByUsername,
      affectedServices: options.affectedServices,
      affectedEndpoints: options.affectedEndpoints,
    };
    this.lastCheck = new Date();

    // 감사 로그 기록
    await db.insert(auditLogs).values({
      eventType: "SECURITY_EVENT",
      eventCategory: "SECURITY",
      severity: "CRITICAL",
      action: "KILLSWITCH_ACTIVATED",
      actionDescription: `킬스위치 활성화: ${reason}`,
      resourceType: "SYSTEM",
      userId: options.activatedBy,
      username: options.activatedByUsername,
      success: true,
      requestData: {
        reason,
        affectedServices: options.affectedServices,
        affectedEndpoints: options.affectedEndpoints,
      },
      userIdentifier: options.activatedBy || options.activatedByUsername || "system",
      metadata: {
        killswitchId: killswitch.id,
      },
    });

    // 보안 이벤트 기록
    await db.insert(securityEvents).values({
      eventType: "KILLSWITCH_ACTIVATED",
      threatLevel: "CRITICAL",
      userId: options.activatedBy,
      username: options.activatedByUsername,
      userIp: "",
      description: `킬스위치 활성화: ${reason}`,
      source: "KILLSWITCH_MANAGER",
      affectedResource: "SYSTEM",
      mitigationAction: "SERVICE_DISABLED",
      autoRemediated: false,
      details: {
        reason,
        affectedServices: options.affectedServices,
        affectedEndpoints: options.affectedEndpoints,
      },
    });

    return killswitch;
  }

  /**
   * 킬스위치 비활성화
   */
  async deactivate(
    reason: string,
    options: {
      deactivatedBy?: string;
      deactivatedByUsername?: string;
    }
  ): Promise<SystemKillswitch> {
    // 활성화된 킬스위치 조회
    const [active] = await db
      .select()
      .from(systemKillswitch)
      .where(eq(systemKillswitch.isActive, true))
      .limit(1);

    if (!active) {
      throw new Error("활성화된 킬스위치가 없습니다.");
    }

    // 킬스위치 비활성화
    const [updated] = await db
      .update(systemKillswitch)
      .set({
        isActive: false,
        deactivatedBy: options.deactivatedBy,
        deactivatedByUsername: options.deactivatedByUsername,
        deactivatedAt: new Date(),
        deactivationReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(systemKillswitch.id, active.id))
      .returning();

    // 상태 캐시 업데이트
    this.killswitchStatus = {
      isActive: false,
    };
    this.lastCheck = new Date();

    // 감사 로그 기록
    await db.insert(auditLogs).values({
      eventType: "SECURITY_EVENT",
      eventCategory: "SECURITY",
      severity: "HIGH",
      action: "KILLSWITCH_DEACTIVATED",
      actionDescription: `킬스위치 비활성화: ${reason}`,
      resourceType: "SYSTEM",
      userId: options.deactivatedBy,
      username: options.deactivatedByUsername,
      success: true,
      requestData: {
        reason,
        previousActivationReason: active.activationReason,
      },
      userIdentifier: options.deactivatedBy || options.deactivatedByUsername || "system",
      metadata: {
        killswitchId: updated.id,
      },
    });

    return updated;
  }

  /**
   * 킬스위치 이력 조회
   */
  async getHistory(limit?: number): Promise<SystemKillswitch[]> {
    let query = db
      .select()
      .from(systemKillswitch)
      .orderBy(desc(systemKillswitch.activatedAt));

    const results = await query;

    if (limit) {
      return results.slice(0, limit);
    }

    return results;
  }

  /**
   * 서비스 접근 허용 여부 확인
   */
  async isServiceAllowed(serviceName?: string, endpoint?: string): Promise<boolean> {
    const status = await this.getStatus();
    
    if (!status.isActive) {
      return true; // 킬스위치가 비활성화되어 있으면 허용
    }

    // 특정 서비스/엔드포인트가 영향받는지 확인
    if (serviceName && status.affectedServices) {
      if (status.affectedServices.length === 0) {
        return false; // 모든 서비스 차단
      }
      return !status.affectedServices.includes(serviceName);
    }

    if (endpoint && status.affectedEndpoints) {
      if (status.affectedEndpoints.length === 0) {
        return false; // 모든 엔드포인트 차단
      }
      return !status.affectedEndpoints.some(ep => endpoint.includes(ep));
    }

    // 영향받는 서비스/엔드포인트가 지정되지 않았으면 모든 접근 차단
    return false;
  }

  /**
   * 미들웨어용 체크 함수
   */
  async checkAndThrow(serviceName?: string, endpoint?: string): Promise<void> {
    const isAllowed = await this.isServiceAllowed(serviceName, endpoint);
    
    if (!isAllowed) {
      const status = await this.getStatus();
      throw new Error(
        `서비스가 킬스위치로 인해 중단되었습니다. 사유: ${status.activationReason || "알 수 없음"}`
      );
    }
  }
}

export const killswitchManager = KillswitchManager.getInstance();


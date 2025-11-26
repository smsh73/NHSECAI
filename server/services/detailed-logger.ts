/**
 * AI 시황 생성 상세 로그 서비스
 * 에러 발생 시 자세한 로그를 기록하고 즉시 확인할 수 있는 기능 제공
 */

import { activityLogger } from './activity-logger.js';

export interface DetailedErrorLog {
  id: string;
  timestamp: Date;
  service: string;
  operation: string;
  error: {
    message: string;
    stack?: string;
    code?: string;
    details?: any;
  };
  context: {
    requestId?: string;
    userId?: string;
    parameters?: any;
    environment?: string;
  };
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export class DetailedLoggerService {
  private static instance: DetailedLoggerService;
  private errorLogs: DetailedErrorLog[] = [];
  private maxLogs = 1000; // 최대 로그 수

  private constructor() {}

  static getInstance(): DetailedLoggerService {
    if (!DetailedLoggerService.instance) {
      DetailedLoggerService.instance = new DetailedLoggerService();
    }
    return DetailedLoggerService.instance;
  }

  /**
   * 상세 에러 로그 기록
   */
  logError(
    service: string,
    operation: string,
    error: Error | any,
    context: any = {},
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM'
  ): DetailedErrorLog {
    const errorLog: DetailedErrorLog = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      service,
      operation,
      error: {
        message: error.message || String(error),
        stack: error.stack,
        code: error.code,
        details: this.extractErrorDetails(error)
      },
      context: {
        requestId: context.requestId || this.generateRequestId(),
        userId: context.userId,
        parameters: context.parameters,
        environment: process.env.NODE_ENV || 'development'
      },
      severity,
      resolved: false
    };

    // 로그 저장
    this.errorLogs.unshift(errorLog);
    
    // 최대 로그 수 제한
    if (this.errorLogs.length > this.maxLogs) {
      this.errorLogs = this.errorLogs.slice(0, this.maxLogs);
    }

    // Activity Logger에도 기록
    activityLogger.log('api', operation, {
      serviceName: service,
      status: 'ERROR',
      error: errorLog.error.message,
      errorId: errorLog.id,
      severity
    });

    // 콘솔에 상세 로그 출력
    this.printDetailedLog(errorLog);

    return errorLog;
  }

  /**
   * 에러 상세 정보 추출
   */
  private extractErrorDetails(error: any): any {
    const details: any = {};

    if (error.response) {
      details.response = {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      };
    }

    if (error.config) {
      details.request = {
        url: error.config.url,
        method: error.config.method,
        headers: error.config.headers
      };
    }

    if (error.code) {
      details.code = error.code;
    }

    if (error.errno) {
      details.errno = error.errno;
    }

    if (error.syscall) {
      details.syscall = error.syscall;
    }

    if (error.address) {
      details.address = error.address;
    }

    if (error.port) {
      details.port = error.port;
    }

    return details;
  }

  /**
   * 상세 로그 콘솔 출력
   */
  private printDetailedLog(errorLog: DetailedErrorLog): void {
    console.log('\n🚨 ===== AI 시황 생성 상세 에러 로그 =====');
    console.log(`📋 에러 ID: ${errorLog.id}`);
    console.log(`⏰ 시간: ${errorLog.timestamp.toISOString()}`);
    console.log(`🔧 서비스: ${errorLog.service}`);
    console.log(`⚙️  작업: ${errorLog.operation}`);
    console.log(`🚨 심각도: ${errorLog.severity}`);
    console.log(`🌍 환경: ${errorLog.context.environment}`);
    console.log(`📝 요청 ID: ${errorLog.context.requestId}`);
    
    console.log('\n❌ 에러 정보:');
    console.log(`   메시지: ${errorLog.error.message}`);
    if (errorLog.error.code) {
      console.log(`   코드: ${errorLog.error.code}`);
    }
    if (errorLog.error.errno) {
      console.log(`   에러 번호: ${errorLog.error.errno}`);
    }
    if (errorLog.error.syscall) {
      console.log(`   시스템 호출: ${errorLog.error.syscall}`);
    }
    if (errorLog.error.address) {
      console.log(`   주소: ${errorLog.error.address}`);
    }
    if (errorLog.error.port) {
      console.log(`   포트: ${errorLog.error.port}`);
    }

    if (errorLog.error.details) {
      console.log('\n🔍 상세 정보:');
      if (errorLog.error.details.response) {
        console.log(`   응답 상태: ${errorLog.error.details.response.status}`);
        console.log(`   응답 메시지: ${errorLog.error.details.response.statusText}`);
      }
      if (errorLog.error.details.request) {
        console.log(`   요청 URL: ${errorLog.error.details.request.url}`);
        console.log(`   요청 방법: ${errorLog.error.details.request.method}`);
      }
    }

    if (errorLog.error.stack) {
      console.log('\n📚 스택 트레이스:');
      console.log(errorLog.error.stack);
    }

    if (errorLog.context.parameters) {
      console.log('\n📊 요청 파라미터:');
      console.log(JSON.stringify(errorLog.context.parameters, null, 2));
    }

    console.log('\n==========================================\n');
  }

  /**
   * 에러 로그 조회
   */
  getErrorLogs(
    filters: {
      service?: string;
      operation?: string;
      severity?: string;
      resolved?: boolean;
      limit?: number;
    } = {}
  ): DetailedErrorLog[] {
    let logs = [...this.errorLogs];

    if (filters.service) {
      logs = logs.filter(log => log.service === filters.service);
    }

    if (filters.operation) {
      logs = logs.filter(log => log.operation === filters.operation);
    }

    if (filters.severity) {
      logs = logs.filter(log => log.severity === filters.severity);
    }

    if (filters.resolved !== undefined) {
      logs = logs.filter(log => log.resolved === filters.resolved);
    }

    if (filters.limit) {
      logs = logs.slice(0, filters.limit);
    }

    return logs;
  }

  /**
   * 특정 에러 로그 조회
   */
  getErrorLog(errorId: string): DetailedErrorLog | undefined {
    return this.errorLogs.find(log => log.id === errorId);
  }

  /**
   * 에러 해결 처리
   */
  resolveError(errorId: string, resolvedBy: string): boolean {
    const errorLog = this.getErrorLog(errorId);
    if (errorLog) {
      errorLog.resolved = true;
      errorLog.resolvedAt = new Date();
      errorLog.resolvedBy = resolvedBy;
      
      console.log(`✅ 에러 해결됨: ${errorId} (해결자: ${resolvedBy})`);
      return true;
    }
    return false;
  }

  /**
   * 요청 ID 생성
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 로그 통계
   */
  getLogStatistics(): {
    total: number;
    byService: Record<string, number>;
    bySeverity: Record<string, number>;
    resolved: number;
    unresolved: number;
  } {
    const stats = {
      total: this.errorLogs.length,
      byService: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      resolved: 0,
      unresolved: 0
    };

    this.errorLogs.forEach(log => {
      // 서비스별 통계
      stats.byService[log.service] = (stats.byService[log.service] || 0) + 1;
      
      // 심각도별 통계
      stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;
      
      // 해결 상태 통계
      if (log.resolved) {
        stats.resolved++;
      } else {
        stats.unresolved++;
      }
    });

    return stats;
  }

  /**
   * 최근 에러 로그 즉시 확인
   */
  getRecentErrors(count: number = 10): DetailedErrorLog[] {
    return this.errorLogs.slice(0, count);
  }

  /**
   * 심각한 에러만 조회
   */
  getCriticalErrors(): DetailedErrorLog[] {
    return this.errorLogs.filter(log => 
      log.severity === 'CRITICAL' || log.severity === 'HIGH'
    );
  }

  /**
   * 해결되지 않은 에러 조회
   */
  getUnresolvedErrors(): DetailedErrorLog[] {
    return this.errorLogs.filter(log => !log.resolved);
  }

  /**
   * 정보 로그 기록 (info 레벨)
   */
  info(data: {
    service: string;
    task: string;
    message: string;
    metadata?: any;
  }): void {
    activityLogger.log('api', data.task, {
      serviceName: data.service,
      status: 'INFO',
      message: data.message,
      metadata: data.metadata
    });
    console.log(`[INFO] ${data.service}/${data.task}: ${data.message}`, data.metadata || '');
  }

  /**
   * 에러 로그 기록 (error 레벨)
   */
  error(data: {
    service: string;
    task: string;
    message: string;
    error?: Error | any;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    metadata?: any;
  }): void {
    const severity = data.severity || 'MEDIUM';
    if (data.error) {
      this.logError(data.service, data.task, data.error, data.metadata || {}, severity);
    } else {
      // Error 객체가 없으면 메시지만으로 에러 로그 생성
      const errorObj = new Error(data.message);
      this.logError(data.service, data.task, errorObj, data.metadata || {}, severity);
    }
  }

  /**
   * 경고 로그 기록 (warn 레벨)
   */
  warn(data: {
    service: string;
    task: string;
    message: string;
    metadata?: any;
  }): void {
    activityLogger.log('api', data.task, {
      serviceName: data.service,
      status: 'WARN',
      message: data.message,
      metadata: data.metadata
    });
    console.warn(`[WARN] ${data.service}/${data.task}: ${data.message}`, data.metadata || '');
  }

  /**
   * 디버그 로그 기록 (debug 레벨) - 상세한 디버깅 정보
   */
  async debug(data: {
    service: string;
    task: string;
    message: string;
    metadata?: any;
    caller?: string;
    callee?: string;
    workflowId?: string;
    nodeId?: string;
    sessionId?: string;
  }): Promise<void> {
    // applicationLogs 테이블에 저장
    await this.saveApplicationLog({
      logLevel: 'debug',
      logCategory: 'workflow',
      logType: 'execution',
      caller: data.caller || data.service,
      callee: data.callee || data.task,
      apiName: `${data.service}/${data.task}`,
      status: 'success',
      successMessage: data.message,
      workflowId: data.workflowId,
      nodeId: data.nodeId,
      sessionId: data.sessionId,
      metadata: {
        ...data.metadata,
        service: data.service,
        task: data.task
      }
    });

    // 콘솔에도 출력 (개발 환경에서만)
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
      console.debug(`[DEBUG] ${data.service}/${data.task}: ${data.message}`, data.metadata || '');
    }
  }

  /**
   * 트레이스 로그 기록 (trace 레벨) - 매우 상세한 실행 추적 정보
   */
  async trace(data: {
    service: string;
    task: string;
    message: string;
    metadata?: any;
    caller?: string;
    callee?: string;
    callerFile?: string;
    calleeFile?: string;
    workflowId?: string;
    nodeId?: string;
    sessionId?: string;
    requestData?: any;
    responseData?: any;
  }): Promise<void> {
    // applicationLogs 테이블에 저장
    await this.saveApplicationLog({
      logLevel: 'trace',
      logCategory: 'workflow',
      logType: 'execution',
      caller: data.caller || data.service,
      callee: data.callee || data.task,
      callerFile: data.callerFile,
      calleeFile: data.calleeFile,
      apiName: `${data.service}/${data.task}`,
      status: 'success',
      successMessage: data.message,
      requestData: data.requestData,
      responseData: data.responseData,
      workflowId: data.workflowId,
      nodeId: data.nodeId,
      sessionId: data.sessionId,
      metadata: {
        ...data.metadata,
        service: data.service,
        task: data.task
      }
    });

    // 콘솔에도 출력 (개발 환경에서만)
    if (process.env.NODE_ENV === 'development' || process.env.TRACE === 'true') {
      console.trace(`[TRACE] ${data.service}/${data.task}: ${data.message}`, data.metadata || '');
    }
  }

  /**
   * applicationLogs 테이블에 로그 저장
   */
  private async saveApplicationLog(logData: {
    logLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error';
    logCategory?: string;
    logType?: string;
    caller?: string;
    callee?: string;
    callerFile?: string;
    calleeFile?: string;
    endpoint?: string;
    method?: string;
    apiName?: string;
    requestData?: any;
    responseData?: any;
    requestHeaders?: any;
    responseHeaders?: any;
    status?: string;
    httpStatusCode?: number;
    executionTimeMs?: number;
    responseSize?: number;
    errorType?: string;
    errorMessage?: string;
    errorStack?: string;
    errorCode?: string;
    successMessage?: string;
    successCode?: string;
    userId?: string;
    username?: string;
    userRole?: string;
    sessionId?: string;
    userIp?: string;
    userAgent?: string;
    workflowId?: string;
    workflowExecutionId?: string;
    nodeId?: string;
    resourceType?: string;
    resourceId?: string;
    metadata?: any;
    tags?: string[];
  }): Promise<void> {
    try {
      const { db } = await import('../db.js');
      const { applicationLogs } = await import('../../shared/schema.js');
      
      await db.insert(applicationLogs).values({
        logLevel: logData.logLevel,
        logCategory: logData.logCategory || 'workflow',
        logType: logData.logType || 'execution',
        caller: logData.caller,
        callee: logData.callee,
        callerFile: logData.callerFile,
        calleeFile: logData.calleeFile,
        endpoint: logData.endpoint,
        method: logData.method,
        apiName: logData.apiName,
        requestData: logData.requestData,
        responseData: logData.responseData,
        requestHeaders: logData.requestHeaders,
        responseHeaders: logData.responseHeaders,
        status: logData.status,
        httpStatusCode: logData.httpStatusCode,
        executionTimeMs: logData.executionTimeMs,
        responseSize: logData.responseSize,
        errorType: logData.errorType,
        errorMessage: logData.errorMessage,
        errorStack: logData.errorStack,
        errorCode: logData.errorCode,
        successMessage: logData.successMessage,
        successCode: logData.successCode,
        userId: logData.userId,
        username: logData.username,
        userRole: logData.userRole,
        sessionId: logData.sessionId,
        userIp: logData.userIp,
        userAgent: logData.userAgent,
        workflowId: logData.workflowId,
        workflowExecutionId: logData.workflowExecutionId,
        nodeId: logData.nodeId,
        resourceType: logData.resourceType,
        resourceId: logData.resourceId,
        metadata: logData.metadata,
        tags: logData.tags,
        timestamp: new Date(),
        createdAt: new Date()
      });
    } catch (error: any) {
      // 로그 저장 실패해도 앱이 중단되지 않도록 에러는 무시 (콘솔에만 출력)
      console.error('Failed to save application log:', error);
    }
  }
}

export const detailedLogger = DetailedLoggerService.getInstance();

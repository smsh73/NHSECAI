import { db } from "../db.js";
import { applicationLogs, loggingSettings, type InsertApplicationLog } from "../../shared/schema.js";
import { eq, and, desc, gte, lte, ilike, or } from "drizzle-orm";
import { storage } from "../storage.js";

export interface LogEntry {
  logLevel?: "info" | "warn" | "error" | "debug";
  logCategory?: string;
  logType?: "request" | "response" | "error" | "success" | "execution";
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
  status?: "success" | "failed" | "error" | "timeout";
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
}

export class Logger {
  private static async isLoggingEnabled(key: string = "enable_logging"): Promise<boolean> {
    try {
      const setting = await db
        .select()
        .from(loggingSettings)
        .where(and(eq(loggingSettings.settingKey, key), eq(loggingSettings.isActive, true)))
        .limit(1);

      if (setting.length === 0) {
        // Default to enabled if setting doesn't exist
        return true;
      }

      const value = setting[0].settingValue;
      return typeof value === "boolean" ? value : value === "true" || value === true;
    } catch (error) {
      console.error("Failed to check logging setting:", error);
      // Default to enabled on error
      return true;
    }
  }

  /**
   * Write log entry to database
   */
  static async writeLog(entry: LogEntry): Promise<void> {
    try {
      // Check if logging is enabled
      const isEnabled = await this.isLoggingEnabled("enable_logging");
      if (!isEnabled) {
        return;
      }

      // Check category-specific logging settings
      if (entry.logCategory) {
        const categoryKey = `enable_${entry.logCategory}_logging`;
        const categoryEnabled = await this.isLoggingEnabled(categoryKey);
        if (!categoryEnabled) {
          return;
        }
      }

      const logData: InsertApplicationLog = {
        logLevel: entry.logLevel || "info",
        logCategory: entry.logCategory || null,
        logType: entry.logType || null,
        caller: entry.caller || null,
        callee: entry.callee || null,
        callerFile: entry.callerFile || null,
        calleeFile: entry.calleeFile || null,
        endpoint: entry.endpoint || null,
        method: entry.method || null,
        apiName: entry.apiName || null,
        requestData: entry.requestData || null,
        responseData: entry.responseData || null,
        requestHeaders: entry.requestHeaders || null,
        responseHeaders: entry.responseHeaders || null,
        status: entry.status || null,
        httpStatusCode: entry.httpStatusCode || null,
        executionTimeMs: entry.executionTimeMs || null,
        responseSize: entry.responseSize || null,
        errorType: entry.errorType || null,
        errorMessage: entry.errorMessage || null,
        errorStack: entry.errorStack || null,
        errorCode: entry.errorCode || null,
        successMessage: entry.successMessage || null,
        successCode: entry.successCode || null,
        userId: entry.userId || null,
        username: entry.username || null,
        userRole: entry.userRole || null,
        sessionId: entry.sessionId || null,
        userIp: entry.userIp || null,
        userAgent: entry.userAgent || null,
        workflowId: entry.workflowId || null,
        workflowExecutionId: entry.workflowExecutionId || null,
        nodeId: entry.nodeId || null,
        resourceType: entry.resourceType || null,
        resourceId: entry.resourceId || null,
        metadata: entry.metadata || null,
        tags: entry.tags || null,
        timestamp: new Date(),
      };

      await db.insert(applicationLogs).values(logData);
    } catch (error) {
      // Don't throw error to prevent breaking application flow
      console.error("Failed to write log:", error);
    }
  }

  /**
   * Log API request
   */
  static async logApiRequest(
    req: any,
    endpoint: string,
    method: string,
    requestData?: any,
    caller?: string
  ): Promise<void> {
    const startTime = Date.now();

    // Store start time in request object for response logging
    (req as any).__logStartTime = startTime;
    (req as any).__logCaller = caller;

    await this.writeLog({
      logLevel: "info",
      logCategory: "api",
      logType: "request",
      caller: caller || req.path || "unknown",
      callee: endpoint,
      endpoint: endpoint,
      method: method,
      requestData: requestData,
      requestHeaders: req.headers ? {
        "content-type": req.headers["content-type"],
        "user-agent": req.headers["user-agent"],
        authorization: req.headers.authorization ? "[REDACTED]" : undefined,
      } : null,
      userId: req.user?.id,
      username: req.user?.username,
      userRole: req.user?.role,
      userIp: req.ip || req.headers?.["x-forwarded-for"] || req.connection?.remoteAddress,
      userAgent: req.headers?.["user-agent"],
      sessionId: req.sessionID,
    });
  }

  /**
   * Log API response
   */
  static async logApiResponse(
    req: any,
    res: any,
    endpoint: string,
    method: string,
    responseData?: any,
    status?: "success" | "failed" | "error" | "timeout",
    error?: any
  ): Promise<void> {
    const startTime = (req as any).__logStartTime || Date.now();
    const executionTime = Date.now() - startTime;
    const caller = (req as any).__logCaller || endpoint;

    const logLevel = error ? "error" : status === "failed" ? "warn" : "info";

    // Extract error information from error object or responseData
    const extractedError = error || 
      (responseData?.error ? new Error(responseData.error.message || responseData.error) : null) ||
      (res.statusCode >= 400 && responseData ? responseData : null);
    
    // Extract error message from multiple sources
    const errorMessage = extractedError?.message || 
      responseData?.error?.message || 
      responseData?.errorMessage ||
      responseData?.error ||
      (extractedError ? String(extractedError) : null);
    
    // Extract error code from multiple sources
    const errorCode = extractedError?.code ||
      responseData?.code ||
      responseData?.errorCode ||
      responseData?.error?.code ||
      null;
    
    // Extract success message from responseData
    const successMessage = !extractedError && status === "success" && responseData
      ? (responseData.message || 
         responseData.successMessage || 
         responseData.msg ||
         responseData.success ||
         "Request completed successfully")
      : null;
    
    // Extract success code from responseData
    const successCode = !extractedError && status === "success" && responseData
      ? (responseData.successCode ||
         responseData.code ||
         null)
      : null;

    await this.writeLog({
      logLevel,
      logCategory: "api",
      logType: extractedError ? "error" : "response",
      caller: caller,
      callee: endpoint,
      endpoint: endpoint,
      method: method,
      responseData: responseData,
      responseHeaders: res.headers ? {
        "content-type": res.headers["content-type"],
        "content-length": res.headers["content-length"],
      } : null,
      status: status || (extractedError ? "error" : "success"),
      httpStatusCode: res.statusCode || (extractedError ? 500 : 200),
      executionTimeMs: executionTime,
      responseSize: responseData ? JSON.stringify(responseData).length : null,
      errorType: extractedError?.name || (extractedError ? "Error" : null),
      errorMessage: errorMessage,
      errorStack: extractedError?.stack || null,
      errorCode: errorCode,
      successMessage: successMessage,
      successCode: successCode,
      userId: req.user?.id,
      username: req.user?.username,
      userRole: req.user?.role,
      userIp: req.ip || req.headers?.["x-forwarded-for"] || req.connection?.remoteAddress,
      userAgent: req.headers?.["user-agent"],
      sessionId: req.sessionID,
    });
  }

  /**
   * Log error
   */
  static async logError(
    error: Error | any,
    context: {
      caller?: string;
      callee?: string;
      endpoint?: string;
      method?: string;
      userId?: string;
      username?: string;
      workflowId?: string;
      workflowExecutionId?: string;
      nodeId?: string;
      metadata?: any;
      responseData?: any;
    } = {}
  ): Promise<void> {
    // Extract error code from multiple sources
    const errorCode = error?.code ||
      context.responseData?.code ||
      context.responseData?.errorCode ||
      context.responseData?.error?.code ||
      context.metadata?.errorCode ||
      null;
    
    // Extract error message from multiple sources
    const errorMessage = error?.message ||
      context.responseData?.error?.message ||
      context.responseData?.errorMessage ||
      context.responseData?.error ||
      (error ? String(error) : null);

    await this.writeLog({
      logLevel: "error",
      logCategory: context.endpoint ? "api" : "application",
      logType: "error",
      caller: context.caller || "unknown",
      callee: context.callee || "unknown",
      endpoint: context.endpoint || null,
      method: context.method || null,
      status: "error",
      httpStatusCode: 500,
      errorType: error?.name || "Error",
      errorMessage: errorMessage,
      errorStack: error?.stack || null,
      errorCode: errorCode,
      userId: context.userId,
      username: context.username,
      workflowId: context.workflowId,
      workflowExecutionId: context.workflowExecutionId,
      nodeId: context.nodeId,
      metadata: context.metadata || null,
    });
  }

  /**
   * Log workflow execution
   */
  static async logWorkflowExecution(
    workflowId: string,
    workflowExecutionId: string,
    nodeId: string,
    status: "success" | "failed" | "error",
    executionTime: number,
    inputData?: any,
    outputData?: any,
    error?: any
  ): Promise<void> {
    // Extract error code from multiple sources
    const errorCode = error?.code ||
      outputData?.errorCode ||
      outputData?.error?.code ||
      null;
    
    // Extract error message from multiple sources
    const errorMessage = error?.message ||
      outputData?.error?.message ||
      outputData?.errorMessage ||
      outputData?.error ||
      null;
    
    // Extract success message from outputData
    const successMessage = !error && status === "success" && outputData
      ? (outputData.message ||
         outputData.successMessage ||
         outputData.msg ||
         outputData.success ||
         "Node executed successfully")
      : null;
    
    // Extract success code from outputData
    const successCode = !error && status === "success" && outputData
      ? (outputData.successCode ||
         outputData.code ||
         null)
      : null;

    await this.writeLog({
      logLevel: error ? "error" : status === "failed" ? "warn" : "info",
      logCategory: "workflow",
      logType: "execution",
      caller: `workflow:${workflowId}`,
      callee: `node:${nodeId}`,
      status: status,
      executionTimeMs: executionTime,
      requestData: inputData,
      responseData: outputData,
      errorType: error?.name || null,
      errorMessage: errorMessage,
      errorStack: error?.stack || null,
      errorCode: errorCode,
      successMessage: successMessage,
      successCode: successCode,
      workflowId: workflowId,
      workflowExecutionId: workflowExecutionId,
      nodeId: nodeId,
      resourceType: "workflow_node",
      resourceId: nodeId,
    });
  }

  /**
   * Log database operation
   */
  static async logDatabaseOperation(
    operation: string,
    table: string,
    status: "success" | "failed" | "error",
    executionTime: number,
    error?: any,
    metadata?: any,
    resultData?: any
  ): Promise<void> {
    // Extract error code from multiple sources
    const errorCode = error?.code ||
      resultData?.errorCode ||
      resultData?.error?.code ||
      metadata?.errorCode ||
      null;
    
    // Extract error message from multiple sources
    const errorMessage = error?.message ||
      resultData?.error?.message ||
      resultData?.errorMessage ||
      resultData?.error ||
      null;
    
    // Extract success message from resultData
    const successMessage = !error && status === "success" && resultData
      ? (resultData.message ||
         resultData.successMessage ||
         resultData.msg ||
         `Database operation ${operation} completed successfully`)
      : (!error && status === "success" ? `Database operation ${operation} completed successfully` : null);
    
    // Extract success code from resultData
    const successCode = !error && status === "success" && resultData
      ? (resultData.successCode ||
         resultData.code ||
         null)
      : null;

    await this.writeLog({
      logLevel: error ? "error" : "info",
      logCategory: "database",
      logType: "execution",
      caller: `database:${operation}`,
      callee: `table:${table}`,
      status: status,
      executionTimeMs: executionTime,
      errorType: error?.name || null,
      errorMessage: errorMessage,
      errorStack: error?.stack || null,
      errorCode: errorCode,
      successMessage: successMessage,
      successCode: successCode,
      metadata: {
        operation,
        table,
        ...metadata,
      },
    });
  }

  /**
   * Get logs with filters
   */
  static async getLogs(filters: {
    logLevel?: string;
    logCategory?: string;
    logType?: string;
    endpoint?: string;
    userId?: string;
    workflowId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}) {
    const conditions: any[] = [];

    if (filters.logLevel && filters.logLevel !== "all") {
      conditions.push(eq(applicationLogs.logLevel, filters.logLevel));
    }
    if (filters.logCategory && filters.logCategory !== "all") {
      conditions.push(eq(applicationLogs.logCategory, filters.logCategory));
    }
    if (filters.logType && filters.logType !== "all") {
      conditions.push(eq(applicationLogs.logType, filters.logType));
    }
    if (filters.endpoint) {
      conditions.push(ilike(applicationLogs.endpoint, `%${filters.endpoint}%`));
    }
    if (filters.userId) {
      conditions.push(eq(applicationLogs.userId, filters.userId));
    }
    if (filters.workflowId) {
      conditions.push(eq(applicationLogs.workflowId, filters.workflowId));
    }
    if (filters.startDate) {
      conditions.push(gte(applicationLogs.timestamp, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(applicationLogs.timestamp, filters.endDate));
    }

    let query = db.select().from(applicationLogs);

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(desc(applicationLogs.timestamp));

    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    return await query;
  }

  /**
   * Get logging settings
   */
  static async getLoggingSettings() {
    return await db.select().from(loggingSettings).where(eq(loggingSettings.isActive, true));
  }

  /**
   * Update logging setting
   */
  static async updateLoggingSetting(
    key: string,
    value: any,
    userId?: string,
    description?: string
  ): Promise<void> {
    // userId가 제공된 경우 사용자 존재 여부 확인
    let validUserId: string | null = null;
    if (userId) {
      try {
        const user = await storage.getUser(userId);
        if (user) {
          validUserId = userId;
        } else {
          console.warn(`User ${userId} not found for logging setting update. Setting updatedBy to null.`);
        }
      } catch (error) {
        console.error(`Error checking user ${userId} for logging setting:`, error);
      }
    }

    const existing = await db
      .select()
      .from(loggingSettings)
      .where(eq(loggingSettings.settingKey, key))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(loggingSettings)
        .set({
          settingValue: value,
          description: description || existing[0].description,
          updatedBy: validUserId,
          updatedAt: new Date(),
        })
        .where(eq(loggingSettings.settingKey, key));
    } else {
      await db.insert(loggingSettings).values({
        settingKey: key,
        settingValue: value,
        description: description || null,
        updatedBy: validUserId,
      });
    }
  }
}

export const logger = Logger;


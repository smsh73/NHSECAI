import fs from 'fs';
import path from 'path';

export type ActivityType = 
  | 'env_var' 
  | 'workflow' 
  | 'api' 
  | 'api_call'
  | 'prompt' 
  | 'init' 
  | 'page_load' 
  | 'menu_click' 
  | 'button_click'
  | 'config_check'
  | 'form_submit'
  | 'search'
  | 'tab_change'
  | 'frontend_event';

export interface ActivityLogDetails {
  envVarName?: string;
  envVarValue?: string;
  envVarExists?: boolean;
  
  workflowId?: string;
  workflowName?: string;
  executionId?: string;
  status?: string;
  
  endpoint?: string;
  method?: string;
  statusCode?: number;
  
  promptId?: string;
  promptName?: string;
  
  pagePath?: string;
  menuItem?: string;
  buttonId?: string;
  componentName?: string;
  
  serviceName?: string;
  configKey?: string;
  
  error?: string;
  duration?: number;
  result?: any;
  metadata?: Record<string, any>;
}

export interface ActivityLog {
  timestamp: string;
  type: ActivityType;
  action: string;
  details: ActivityLogDetails;
}

class ActivityLogger {
  private logDir: string;
  private logFile: string;
  private recentLogs: Map<string, number> = new Map();
  private deduplicationWindow = 1000; // 1 second

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.logFile = path.join(this.logDir, 'activity.log');
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private generateLogKey(type: ActivityType, action: string, details: ActivityLogDetails): string {
    const keyParts = [type, action];
    
    if (details.envVarName) keyParts.push(details.envVarName);
    if (details.workflowId) keyParts.push(details.workflowId);
    if (details.endpoint) keyParts.push(details.endpoint);
    if (details.promptId) keyParts.push(details.promptId);
    if (details.buttonId) keyParts.push(details.buttonId);
    if (details.menuItem) keyParts.push(details.menuItem);
    if (details.pagePath) keyParts.push(details.pagePath);
    if (details.componentName) keyParts.push(details.componentName);
    
    // For frontend events with metadata, include a hash to distinguish different events
    if (details.metadata && Object.keys(details.metadata).length > 0) {
      const metadataStr = JSON.stringify(details.metadata);
      const metadataHash = this.simpleHash(metadataStr);
      keyParts.push(metadataHash);
    }
    
    return keyParts.join(':');
  }
  
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private isDuplicate(logKey: string): boolean {
    const now = Date.now();
    const lastLogTime = this.recentLogs.get(logKey);
    
    if (lastLogTime && (now - lastLogTime) < this.deduplicationWindow) {
      return true;
    }
    
    this.recentLogs.set(logKey, now);
    
    this.cleanupOldEntries(now);
    
    return false;
  }

  private cleanupOldEntries(currentTime: number): void {
    for (const [key, timestamp] of this.recentLogs.entries()) {
      if (currentTime - timestamp > this.deduplicationWindow * 2) {
        this.recentLogs.delete(key);
      }
    }
  }

  private maskSensitiveValue(value: string | undefined, varName: string): string {
    if (!value) return 'undefined';
    
    const sensitivePatterns = ['key', 'token', 'password', 'secret', 'credential'];
    const isSensitive = sensitivePatterns.some(pattern => 
      varName.toLowerCase().includes(pattern)
    );
    
    if (isSensitive && value.length > 8) {
      return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
    }
    
    return value.length > 50 ? `${value.substring(0, 47)}...` : value;
  }

  log(type: ActivityType, action: string, details: ActivityLogDetails = {}): void {
    const logKey = this.generateLogKey(type, action, details);
    
    if (this.isDuplicate(logKey)) {
      return;
    }

    const processedDetails = { ...details };
    if (processedDetails.envVarName && processedDetails.envVarValue) {
      processedDetails.envVarValue = this.maskSensitiveValue(
        processedDetails.envVarValue,
        processedDetails.envVarName
      );
    }

    const logEntry: ActivityLog = {
      timestamp: new Date().toISOString(),
      type,
      action,
      details: processedDetails,
    };

    const logLine = JSON.stringify(logEntry) + '\n';

    try {
      fs.appendFileSync(this.logFile, logLine, 'utf8');
    } catch (error) {
      console.error('Failed to write activity log:', error);
    }
  }

  logEnvVar(varName: string, exists: boolean, value?: string): void {
    this.log('env_var', 'check', {
      envVarName: varName,
      envVarExists: exists,
      envVarValue: value,
    });
  }

  logWorkflow(action: string, workflowId: string, workflowName: string, details: Partial<ActivityLogDetails> = {}): void {
    this.log('workflow', action, {
      workflowId,
      workflowName,
      ...details,
    });
  }

  logApi(method: string, endpoint: string, statusCode: number, duration?: number, error?: string): void {
    this.log('api', `${method} ${endpoint}`, {
      method,
      endpoint,
      statusCode,
      duration,
      error,
    });
  }

  logPrompt(action: string, promptId: string, promptName: string, details: Partial<ActivityLogDetails> = {}): void {
    this.log('prompt', action, {
      promptId,
      promptName,
      ...details,
    });
  }

  logInit(serviceName: string, success: boolean, error?: string): void {
    this.log('init', `initialize_${serviceName}`, {
      serviceName,
      status: success ? 'success' : 'failed',
      error,
    });
  }

  logConfigCheck(serviceName: string, configKey: string, exists: boolean, value?: string): void {
    this.log('config_check', `${serviceName}_${configKey}`, {
      serviceName,
      configKey,
      envVarExists: exists,
      envVarValue: value,
    });
  }

  getRecentLogs(limit: number = 100): ActivityLog[] {
    try {
      if (!fs.existsSync(this.logFile)) {
        return [];
      }

      const content = fs.readFileSync(this.logFile, 'utf8');
      const lines = content.trim().split('\n').filter(line => line.length > 0);
      
      const logs = lines
        .slice(-limit)
        .map(line => {
          try {
            return JSON.parse(line) as ActivityLog;
          } catch {
            return null;
          }
        })
        .filter((log): log is ActivityLog => log !== null);

      return logs.reverse();
    } catch (error) {
      console.error('Failed to read activity logs:', error);
      return [];
    }
  }

  clearLogs(): void {
    try {
      if (fs.existsSync(this.logFile)) {
        fs.unlinkSync(this.logFile);
      }
      this.recentLogs.clear();
    } catch (error) {
      console.error('Failed to clear activity logs:', error);
    }
  }

  logPageLoad(pageName: string, metadata?: Record<string, any>): void {
    this.log('page_load', pageName, {
      pagePath: pageName,
      metadata,
    });
  }

  logMenuClick(menuItem: string, section?: string): void {
    this.log('menu_click', menuItem, {
      menuItem,
      componentName: section,
    });
  }

  logButtonClick(buttonId: string, details: Partial<ActivityLogDetails> = {}): void {
    this.log('button_click', buttonId, {
      buttonId,
      ...details,
    });
  }

  logApiCall(endpoint: string, method: string, statusCode?: number, duration?: number, metadata?: Record<string, any>): void {
    this.log('api', `${method} ${endpoint}`, {
      endpoint,
      method,
      statusCode,
      duration,
      metadata,
    });
  }

  logFrontendEvent(eventType: string, data: any): void {
    this.log(eventType as ActivityType, 'frontend_event', {
      metadata: data,
    });
  }

  getLogFileContent(filename: string): string {
    try {
      const filePath = path.join(this.logDir, filename);
      
      if (!filePath.startsWith(this.logDir)) {
        throw new Error('Invalid filename');
      }
      
      if (!fs.existsSync(filePath)) {
        throw new Error('Log file not found');
      }
      
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      throw error;
    }
  }
}

export const activityLogger = new ActivityLogger();

import { promises as fs } from 'fs';
import path from 'path';

export interface ErrorLogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  
  // Context information
  menu?: string;          // Menu name
  page?: string;          // Page title
  button?: string;        // Button name
  workflow?: string;      // Workflow name
  api?: string;           // API name
  endpoint?: string;      // API endpoint URL
  prompt?: string;        // Prompt name
  envVar?: string;        // Environment variable name
  
  // Error details
  error: string;          // Error message
  stack?: string;         // Stack trace
  userId?: string;        // User ID if available
  
  // Additional context
  method?: string;        // HTTP method
  statusCode?: number;    // HTTP status code
  metadata?: Record<string, any>; // Any additional context
}

class ErrorLogger {
  private logDir: string;
  private maxLogSize: number = 10 * 1024 * 1024; // 10MB
  private maxLogFiles: number = 5;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDirectory();
  }

  private async ensureLogDirectory(): Promise<void> {
    try {
      await fs.access(this.logDir);
    } catch {
      await fs.mkdir(this.logDir, { recursive: true });
    }
  }

  private getLogFilePath(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `error-${date}.log`);
  }

  private formatLogEntry(entry: ErrorLogEntry): string {
    const contextParts: string[] = [];
    
    if (entry.menu) contextParts.push(`Menu: ${entry.menu}`);
    if (entry.page) contextParts.push(`Page: ${entry.page}`);
    if (entry.button) contextParts.push(`Button: ${entry.button}`);
    if (entry.workflow) contextParts.push(`Workflow: ${entry.workflow}`);
    if (entry.api) contextParts.push(`API: ${entry.api}`);
    if (entry.endpoint) contextParts.push(`Endpoint: ${entry.endpoint}`);
    if (entry.prompt) contextParts.push(`Prompt: ${entry.prompt}`);
    if (entry.envVar) contextParts.push(`EnvVar: ${entry.envVar}`);
    if (entry.method) contextParts.push(`Method: ${entry.method}`);
    if (entry.statusCode) contextParts.push(`Status: ${entry.statusCode}`);
    
    const context = contextParts.length > 0 ? ` | ${contextParts.join(' > ')}` : '';
    
    let logLine = `[${entry.timestamp}] ${entry.level.toUpperCase()}${context}\n`;
    logLine += `Error: ${entry.error}\n`;
    
    if (entry.stack) {
      logLine += `Stack: ${entry.stack}\n`;
    }
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      logLine += `Metadata: ${JSON.stringify(entry.metadata)}\n`;
    }
    
    logLine += '---\n';
    
    return logLine;
  }

  async log(entry: Omit<ErrorLogEntry, 'timestamp'>): Promise<void> {
    const fullEntry: ErrorLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    const logLine = this.formatLogEntry(fullEntry);
    const logPath = this.getLogFilePath();

    try {
      await this.ensureLogDirectory();
      await fs.appendFile(logPath, logLine, 'utf8');
      
      // Check log file size and rotate if needed
      await this.rotateLogsIfNeeded(logPath);
      
      // Also log to console for development
      console.error(`[ERROR LOG] ${fullEntry.error}`, {
        context: { 
          menu: entry.menu, 
          page: entry.page, 
          endpoint: entry.endpoint,
          workflow: entry.workflow,
          prompt: entry.prompt
        }
      });
    } catch (error) {
      console.error('Failed to write to error log:', error);
    }
  }

  private async rotateLogsIfNeeded(currentLogPath: string): Promise<void> {
    try {
      const stats = await fs.stat(currentLogPath);
      
      if (stats.size > this.maxLogSize) {
        const timestamp = Date.now();
        const rotatedPath = currentLogPath.replace('.log', `.${timestamp}.log`);
        await fs.rename(currentLogPath, rotatedPath);
        
        // Clean up old log files
        await this.cleanupOldLogs();
      }
    } catch (error) {
      // If file doesn't exist yet, that's fine
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Error rotating logs:', error);
      }
    }
  }

  private async cleanupOldLogs(): Promise<void> {
    try {
      const files = await fs.readdir(this.logDir);
      const logFiles = files
        .filter(f => f.startsWith('error-') && f.endsWith('.log'))
        .map(f => ({
          name: f,
          path: path.join(this.logDir, f),
        }));

      if (logFiles.length > this.maxLogFiles) {
        // Sort by modification time
        const filesWithStats = await Promise.all(
          logFiles.map(async (file) => ({
            ...file,
            stats: await fs.stat(file.path),
          }))
        );

        filesWithStats.sort((a, b) => 
          b.stats.mtime.getTime() - a.stats.mtime.getTime()
        );

        // Delete oldest files
        const filesToDelete = filesWithStats.slice(this.maxLogFiles);
        await Promise.all(
          filesToDelete.map(file => fs.unlink(file.path))
        );
      }
    } catch (error) {
      console.error('Error cleaning up old logs:', error);
    }
  }

  async getRecentLogs(limit: number = 100): Promise<string[]> {
    const logPath = this.getLogFilePath();
    
    try {
      const content = await fs.readFile(logPath, 'utf8');
      const entries = content.split('---\n').filter(e => e.trim());
      return entries.slice(-limit);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async getAllLogFiles(): Promise<string[]> {
    try {
      await this.ensureLogDirectory();
      const files = await fs.readdir(this.logDir);
      return files
        .filter(f => f.startsWith('error-') && f.endsWith('.log'))
        .sort()
        .reverse();
    } catch (error) {
      console.error('Error listing log files:', error);
      return [];
    }
  }

  async getLogFileContent(filename: string): Promise<string> {
    // Validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new Error('Invalid filename');
    }

    const filePath = path.join(this.logDir, filename);
    
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error('Log file not found');
      }
      throw error;
    }
  }

  // Helper method for logging API errors
  async logApiError(params: {
    endpoint: string;
    method: string;
    statusCode?: number;
    error: Error | string;
    api?: string;
    userId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const error = typeof params.error === 'string' ? params.error : params.error.message;
    const stack = typeof params.error === 'object' && 'stack' in params.error 
      ? params.error.stack 
      : undefined;

    await this.log({
      level: 'error',
      endpoint: params.endpoint,
      method: params.method,
      statusCode: params.statusCode,
      api: params.api,
      error,
      stack,
      userId: params.userId,
      metadata: params.metadata,
    });
  }

  // Helper method for logging workflow errors
  async logWorkflowError(params: {
    workflow: string;
    error: Error | string;
    nodeId?: string;
    nodeType?: string;
    userId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const error = typeof params.error === 'string' ? params.error : params.error.message;
    const stack = typeof params.error === 'object' && 'stack' in params.error 
      ? params.error.stack 
      : undefined;

    await this.log({
      level: 'error',
      workflow: params.workflow,
      error,
      stack,
      userId: params.userId,
      metadata: {
        ...params.metadata,
        nodeId: params.nodeId,
        nodeType: params.nodeType,
      },
    });
  }

  // Helper method for logging prompt errors
  async logPromptError(params: {
    prompt: string;
    error: Error | string;
    model?: string;
    userId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const error = typeof params.error === 'string' ? params.error : params.error.message;
    const stack = typeof params.error === 'object' && 'stack' in params.error 
      ? params.error.stack 
      : undefined;

    await this.log({
      level: 'error',
      prompt: params.prompt,
      error,
      stack,
      userId: params.userId,
      metadata: {
        ...params.metadata,
        model: params.model,
      },
    });
  }

  // Helper method for logging UI errors
  async logUIError(params: {
    menu?: string;
    page: string;
    button?: string;
    error: Error | string;
    userId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const error = typeof params.error === 'string' ? params.error : params.error.message;
    const stack = typeof params.error === 'object' && 'stack' in params.error 
      ? params.error.stack 
      : undefined;

    await this.log({
      level: 'error',
      menu: params.menu,
      page: params.page,
      button: params.button,
      error,
      stack,
      userId: params.userId,
      metadata: params.metadata,
    });
  }
}

export const errorLogger = new ErrorLogger();

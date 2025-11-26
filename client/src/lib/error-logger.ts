import { apiRequest } from './queryClient';

export interface ErrorContext {
  menu?: string;
  page?: string;
  button?: string;
  workflow?: string;
  api?: string;
  endpoint?: string;
  prompt?: string;
  metadata?: Record<string, any>;
}

class FrontendErrorLogger {
  async logError(error: Error | string, context: ErrorContext = {}): Promise<void> {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const stack = typeof error === 'object' && 'stack' in error ? error.stack : undefined;

    try {
      await apiRequest('POST', '/api/logs/error', {
        menu: context.menu,
        page: context.page,
        button: context.button,
        workflow: context.workflow,
        api: context.api,
        endpoint: context.endpoint,
        prompt: context.prompt,
        error: errorMessage,
        stack,
        metadata: {
          ...context.metadata,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (logError) {
      // Failed to log error - just console.error it
      console.error('Failed to log error to backend:', logError);
      console.error('Original error:', errorMessage, stack);
    }
  }

  async logUIError(params: {
    menu?: string;
    page: string;
    button?: string;
    error: Error | string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.logError(params.error, {
      menu: params.menu,
      page: params.page,
      button: params.button,
      metadata: params.metadata,
    });
  }

  async logWorkflowError(params: {
    workflow: string;
    error: Error | string;
    nodeId?: string;
    nodeType?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.logError(params.error, {
      workflow: params.workflow,
      metadata: {
        ...params.metadata,
        nodeId: params.nodeId,
        nodeType: params.nodeType,
      },
    });
  }

  async logPromptError(params: {
    prompt: string;
    error: Error | string;
    model?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.logError(params.error, {
      prompt: params.prompt,
      metadata: {
        ...params.metadata,
        model: params.model,
      },
    });
  }

  async logApiError(params: {
    api: string;
    endpoint: string;
    error: Error | string;
    method?: string;
    statusCode?: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.logError(params.error, {
      api: params.api,
      endpoint: params.endpoint,
      metadata: {
        ...params.metadata,
        method: params.method,
        statusCode: params.statusCode,
      },
    });
  }
}

export const frontendErrorLogger = new FrontendErrorLogger();

// Global error handler setup
export function setupGlobalErrorHandler(): void {
  // Handle unhandled errors
  window.addEventListener('error', (event) => {
    frontendErrorLogger.logError(event.error || event.message, {
      page: document.title,
      metadata: {
        type: 'unhandled_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    frontendErrorLogger.logError(
      event.reason instanceof Error ? event.reason : String(event.reason),
      {
        page: document.title,
        metadata: {
          type: 'unhandled_rejection',
        },
      }
    );
  });

  console.log('Global error handler initialized');
}

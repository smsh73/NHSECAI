/**
 * Frontend Activity Logger
 * 
 * Logs user interactions and page loads to backend for comprehensive activity tracking
 */

interface ActivityLogOptions {
  action?: string;
  category?: string;
  label?: string;
  metadata?: Record<string, any>;
}

class FrontendActivityLogger {
  private baseUrl = '/api/activity-logs';
  private recentLogs: Set<string> = new Set();
  private dedupWindow = 1000; // 1 second deduplication window

  /**
   * Generate a fingerprint for deduplication (excludes volatile fields)
   */
  private getFingerprint(type: string, data: any): string {
    // Remove timestamp and other volatile fields for stable fingerprinting
    const { timestamp, ...stableData } = data.metadata || {};
    const fingerprint = {
      type,
      ...data,
      metadata: stableData
    };
    return `${type}:${JSON.stringify(fingerprint)}`;
  }

  /**
   * Send activity log to backend
   */
  private async sendLog(eventType: string, data: any): Promise<void> {
    const fingerprint = this.getFingerprint(eventType, data);
    
    // Skip if recently logged
    if (this.recentLogs.has(fingerprint)) {
      return;
    }

    this.recentLogs.add(fingerprint);
    setTimeout(() => this.recentLogs.delete(fingerprint), this.dedupWindow);

    try {
      await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType, data })
      });
    } catch (error) {
      // Silent fail - don't interrupt user experience
      console.debug('Activity log failed:', error);
    }
  }

  /**
   * Log page load
   */
  logPageLoad(pageName: string, metadata?: Record<string, any>): void {
    this.sendLog('page_load', {
      page: pageName,
      metadata: {
        ...metadata,
        url: window.location.href,
        referrer: document.referrer,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log menu click
   */
  logMenuClick(menuItem: string, section?: string): void {
    this.sendLog('menu_click', {
      menu: menuItem,
      section,
      metadata: {
        currentPage: window.location.pathname,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log button click
   */
  logButtonClick(buttonName: string, options: ActivityLogOptions = {}): void {
    this.sendLog('button_click', {
      button: buttonName,
      action: options.action,
      category: options.category,
      label: options.label,
      metadata: {
        ...options.metadata,
        currentPage: window.location.pathname,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log API call from frontend
   */
  logApiCall(endpoint: string, method: string, status?: number, duration?: number): void {
    this.sendLog('api_call', {
      endpoint,
      method,
      status,
      duration,
      metadata: {
        currentPage: window.location.pathname,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log form submission
   */
  logFormSubmit(formName: string, success: boolean, metadata?: Record<string, any>): void {
    this.sendLog('form_submit', {
      form: formName,
      success,
      metadata: {
        ...metadata,
        currentPage: window.location.pathname,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log search query
   */
  logSearch(query: string, resultsCount?: number, metadata?: Record<string, any>): void {
    this.sendLog('search', {
      query,
      resultsCount,
      metadata: {
        ...metadata,
        currentPage: window.location.pathname,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log tab change
   */
  logTabChange(fromTab: string, toTab: string, section?: string): void {
    this.sendLog('tab_change', {
      from: fromTab,
      to: toTab,
      section,
      metadata: {
        currentPage: window.location.pathname,
        timestamp: new Date().toISOString()
      }
    });
  }
}

// Export singleton instance
export const activityLogger = new FrontendActivityLogger();

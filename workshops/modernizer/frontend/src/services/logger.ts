/**
 * Production-ready logging service
 * Replaces console.log with proper logging that can be configured per environment
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  data?: any;
  error?: Error | undefined;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private isProduction: boolean;

  private constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.logLevel = this.isProduction ? LogLevel.WARN : LogLevel.DEBUG;
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    let formatted = `[${timestamp}] ${levelName}: ${message}`;
    
    if (data && !this.isProduction) {
      formatted += ` | Data: ${JSON.stringify(data, null, 2)}`;
    }
    
    return formatted;
  }

  private logToConsole(level: LogLevel, message: string, data?: any, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const formatted = this.formatMessage(level, message, data);

    // In production, only log errors and warnings to console
    // All other logs should go to monitoring service only
    switch (level) {
      case LogLevel.DEBUG:
        if (!this.isProduction) {
          console.debug(formatted, data);
        }
        // In production, debug logs are completely suppressed from console
        break;
      case LogLevel.INFO:
        if (!this.isProduction) {
          console.info(formatted, data);
        }
        // In production, info logs are completely suppressed from console
        break;
      case LogLevel.WARN:
        // Warnings are logged in both dev and production
        console.warn(formatted, data);
        break;
      case LogLevel.ERROR:
        // Errors are always logged to console
        console.error(formatted, error || data);
        break;
    }
  }

  private sendToMonitoring(entry: LogEntry): void {
    // In production, send all logs to monitoring service
    // In development, only send errors and warnings
    const shouldSendToMonitoring = this.isProduction || entry.level >= LogLevel.WARN;
    
    if (shouldSendToMonitoring) {
      try {
        // TODO: Implement monitoring service integration
        // This could be Sentry, LogRocket, DataDog, or custom monitoring
        
        // Example implementation for different monitoring services:
        // 
        // For Sentry:
        // if (entry.error) {
        //   Sentry.captureException(entry.error, {
        //     extra: entry.data,
        //     level: LogLevel[entry.level].toLowerCase() as SeverityLevel,
        //     tags: {
        //       component: 'frontend',
        //       environment: process.env.NODE_ENV
        //     }
        //   });
        // } else {
        //   Sentry.captureMessage(entry.message, {
        //     level: LogLevel[entry.level].toLowerCase() as SeverityLevel,
        //     extra: entry.data
        //   });
        // }
        //
        // For custom monitoring API:
        // fetch('/api/logs', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     level: LogLevel[entry.level],
        //     message: entry.message,
        //     timestamp: entry.timestamp.toISOString(),
        //     data: entry.data,
        //     error: entry.error ? {
        //       name: entry.error.name,
        //       message: entry.error.message,
        //       stack: entry.error.stack
        //     } : undefined,
        //     userAgent: navigator.userAgent,
        //     url: window.location.href
        //   })
        // }).catch(err => {
        //   // Fallback logging if monitoring service fails
        //   console.error('Failed to send log to monitoring service:', err);
        // });
        
        // For now, we'll store logs in a way that can be collected later
        this.storeLogForCollection(entry);
        
      } catch (monitoringError) {
        // Fallback to console if monitoring fails
        // Only in development or for critical errors
        if (!this.isProduction || entry.level === LogLevel.ERROR) {
          console.error('Failed to send log to monitoring service:', monitoringError);
        }
      }
    }
  }

  // Store logs for later collection by monitoring service
  private storeLogForCollection(entry: LogEntry): void {
    try {
      // Store in sessionStorage for collection by monitoring service
      const logs = JSON.parse(sessionStorage.getItem('app_logs') || '[]');
      logs.push({
        ...entry,
        timestamp: entry.timestamp.toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });
      
      // Keep only last 100 logs to prevent storage overflow
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      sessionStorage.setItem('app_logs', JSON.stringify(logs));
    } catch (storageError) {
      // If storage fails, we can't do much more
      // This prevents infinite loops if storage is the issue
    }
  }

  public debug(message: string, data?: any): void {
    const entry: LogEntry = {
      level: LogLevel.DEBUG,
      message,
      timestamp: new Date(),
      data
    };

    this.logToConsole(LogLevel.DEBUG, message, data);
    this.sendToMonitoring(entry);
  }

  public info(message: string, data?: any): void {
    const entry: LogEntry = {
      level: LogLevel.INFO,
      message,
      timestamp: new Date(),
      data
    };

    this.logToConsole(LogLevel.INFO, message, data);
    this.sendToMonitoring(entry);
  }

  public warn(message: string, data?: any): void {
    const entry: LogEntry = {
      level: LogLevel.WARN,
      message,
      timestamp: new Date(),
      data
    };

    this.logToConsole(LogLevel.WARN, message, data);
    this.sendToMonitoring(entry);
  }

  public error(message: string, error?: Error, data?: any): void {
    const entry: LogEntry = {
      level: LogLevel.ERROR,
      message,
      timestamp: new Date(),
      error,
      data
    };

    this.logToConsole(LogLevel.ERROR, message, data, error);
    this.sendToMonitoring(entry);
  }

  // Security-specific logging methods
  public securityEvent(event: string, details?: any): void {
    const securityEntry: LogEntry = {
      level: LogLevel.WARN,
      message: `SECURITY EVENT: ${event}`,
      timestamp: new Date(),
      data: {
        ...details,
        securityEvent: true,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      }
    };

    // Always log security events to console in development
    if (!this.isProduction) {
      console.warn(`🔒 ${securityEntry.message}`, securityEntry.data);
    }

    // Send to monitoring with high priority
    this.sendToMonitoring(securityEntry);
  }

  public authenticationFailure(username: string, reason: string): void {
    const authEntry: LogEntry = {
      level: LogLevel.WARN,
      message: `Authentication failure for user: ${username}`,
      timestamp: new Date(),
      data: { 
        reason, 
        username,
        authenticationFailure: true,
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    };

    this.logToConsole(LogLevel.WARN, authEntry.message, authEntry.data);
    this.sendToMonitoring(authEntry);
  }

  public suspiciousActivity(activity: string, details?: any): void {
    const suspiciousEntry: LogEntry = {
      level: LogLevel.ERROR,
      message: `SUSPICIOUS ACTIVITY: ${activity}`,
      timestamp: new Date(),
      data: {
        ...details,
        suspiciousActivity: true,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      }
    };

    // Always log suspicious activity
    console.error(`🚨 ${suspiciousEntry.message}`, suspiciousEntry.data);
    this.sendToMonitoring(suspiciousEntry);
  }

  // Rate limiting event logging
  public rateLimitExceeded(endpoint: string, details?: any): void {
    this.securityEvent('Rate limit exceeded', {
      endpoint,
      ...details
    });
  }

  // Input validation failure logging
  public inputValidationFailure(field: string, value: string, reason: string): void {
    this.securityEvent('Input validation failure', {
      field,
      value: value.substring(0, 50), // Limit logged value
      reason
    });
  }

  // XSS attempt logging
  public xssAttemptDetected(input: string, context?: string): void {
    this.suspiciousActivity('XSS attempt detected', {
      input: input.substring(0, 100), // Limit logged input
      context
    });
  }

  // Clear stored logs (for privacy/security)
  public clearStoredLogs(): void {
    try {
      sessionStorage.removeItem('app_logs');
      this.info('Stored logs cleared');
    } catch (error) {
      this.error('Failed to clear stored logs', error as Error);
    }
  }

  // Get stored logs for monitoring service collection
  public getStoredLogs(): any[] {
    try {
      return JSON.parse(sessionStorage.getItem('app_logs') || '[]');
    } catch (error) {
      this.error('Failed to retrieve stored logs', error as Error);
      return [];
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Convenience exports for common use cases
export const logDebug = (message: string, data?: any) => logger.debug(message, data);
export const logInfo = (message: string, data?: any) => logger.info(message, data);
export const logWarn = (message: string, data?: any) => logger.warn(message, data);
export const logError = (message: string, error?: Error, data?: any) => logger.error(message, error, data);

// Security logging exports
export const logSecurityEvent = (event: string, details?: any) => logger.securityEvent(event, details);
export const logAuthFailure = (username: string, reason: string) => logger.authenticationFailure(username, reason);
export const logSuspiciousActivity = (activity: string, details?: any) => logger.suspiciousActivity(activity, details);
export const logRateLimitExceeded = (endpoint: string, details?: any) => logger.rateLimitExceeded(endpoint, details);
export const logInputValidationFailure = (field: string, value: string, reason: string) => logger.inputValidationFailure(field, value, reason);
export const logXssAttempt = (input: string, context?: string) => logger.xssAttemptDetected(input, context);

export default logger;
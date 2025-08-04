import { logger, logSecurityEvent, logError, logWarn } from './logger';

// Error types for better categorization
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  SECURITY_ERROR = 'SECURITY_ERROR',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  INJECTION_ATTEMPT = 'INJECTION_ATTEMPT'
}

// Security event types
export enum SecurityEventType {
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  INJECTION_ATTEMPT = 'INJECTION_ATTEMPT',
  SUSPICIOUS_INPUT = 'SUSPICIOUS_INPUT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  TOKEN_MANIPULATION = 'TOKEN_MANIPULATION',
  CSRF_ATTEMPT = 'CSRF_ATTEMPT'
}

export interface SecurityEvent {
  type: SecurityEventType;
  message: string;
  details?: any;
  userAgent?: string;
  url?: string;
  timestamp: string;
  userId?: string;
  sessionId?: string;
}

export interface AppError {
  type: ErrorType;
  message: string;
  statusCode?: number;
  details?: any;
  timestamp: string;
  sanitizedMessage?: string;
  isSecurityRelated?: boolean;
}

export interface UserFriendlyError {
  message: string;
  canRetry: boolean;
  actionRequired?: string | undefined;
}

export class ErrorService {
  // Parse API error responses with security awareness
  static parseApiError(error: any): AppError {
    const timestamp = new Date().toISOString();

    // Network errors (no response)
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        return {
          type: ErrorType.TIMEOUT_ERROR,
          message: 'Request timed out. Please check your connection and try again.',
          timestamp,
          sanitizedMessage: 'Request timed out. Please try again.'
        };
      }
      
      return {
        type: ErrorType.NETWORK_ERROR,
        message: 'Network error. Please check your internet connection.',
        timestamp,
        sanitizedMessage: 'Network connection issue. Please try again.'
      };
    }

    const { status, data } = error.response;
    const errorMessage = data?.error?.message || data?.message || 'An error occurred';
    const errorDetails = data?.error?.details || data?.details;

    // Check if this might be a security-related error
    const isSecurityRelated = this.isSecurityRelatedError(status, errorMessage, errorDetails);

    // Categorize by status code
    switch (status) {
      case 400:
        return {
          type: ErrorType.VALIDATION_ERROR,
          message: errorMessage,
          statusCode: status,
          details: errorDetails,
          timestamp,
          isSecurityRelated,
          sanitizedMessage: isSecurityRelated 
            ? 'Invalid request. Please check your input.' 
            : errorMessage
        };

      case 401:
        // Log authentication failure
        logWarn('Authentication failure', { status, url: window.location.href });
        return {
          type: ErrorType.AUTHENTICATION_ERROR,
          message: 'Please log in to continue.',
          statusCode: status,
          timestamp,
          isSecurityRelated: true,
          sanitizedMessage: 'Authentication required. Please log in.'
        };

      case 403:
        // Log authorization failure
        logWarn('Authorization failure', { status, url: window.location.href });
        return {
          type: ErrorType.AUTHORIZATION_ERROR,
          message: 'You do not have permission to perform this action.',
          statusCode: status,
          timestamp,
          isSecurityRelated: true,
          sanitizedMessage: 'Access denied. You do not have permission.'
        };

      case 404:
        return {
          type: ErrorType.NOT_FOUND_ERROR,
          message: 'The requested resource was not found.',
          statusCode: status,
          timestamp,
          sanitizedMessage: 'Resource not found.'
        };

      case 429:
        // Log rate limiting event
        logSecurityEvent('Rate limit exceeded', { 
          status, 
          url: window.location.href,
          userAgent: navigator.userAgent 
        });
        return {
          type: ErrorType.NETWORK_ERROR,
          message: 'Too many requests. Please wait a moment and try again.',
          statusCode: status,
          timestamp,
          isSecurityRelated: true,
          sanitizedMessage: 'Too many requests. Please wait and try again.'
        };

      case 500:
      case 502:
      case 503:
      case 504:
        return {
          type: ErrorType.SERVER_ERROR,
          message: 'Server error. Please try again later.',
          statusCode: status,
          timestamp,
          sanitizedMessage: 'Server temporarily unavailable. Please try again later.'
        };

      default:
        return {
          type: ErrorType.UNKNOWN_ERROR,
          message: errorMessage,
          statusCode: status,
          details: errorDetails,
          timestamp,
          isSecurityRelated,
          sanitizedMessage: isSecurityRelated 
            ? 'An error occurred. Please try again or contact support.' 
            : errorMessage
        };
    }
  }

  // Check if an error is security-related
  private static isSecurityRelatedError(status: number, message: string, details: any): boolean {
    // Security-related status codes
    const securityStatusCodes = [401, 403, 429];
    if (securityStatusCodes.includes(status)) {
      return true;
    }

    // Security-related keywords in error messages
    const securityKeywords = [
      'unauthorized', 'forbidden', 'token', 'authentication', 
      'authorization', 'permission', 'access denied', 'security',
      'blocked', 'suspicious', 'violation', 'threat'
    ];

    const messageText = (message || '').toLowerCase();
    const detailsText = details ? JSON.stringify(details).toLowerCase() : '';

    return securityKeywords.some(keyword => 
      messageText.includes(keyword) || detailsText.includes(keyword)
    );
  }

  // Get user-friendly error messages
  static getUserFriendlyMessage(error: AppError): string {
    switch (error.type) {
      case ErrorType.NETWORK_ERROR:
        return 'Connection problem. Please check your internet and try again.';
      
      case ErrorType.AUTHENTICATION_ERROR:
        return 'Please log in to continue.';
      
      case ErrorType.AUTHORIZATION_ERROR:
        return 'You don\'t have permission to do that.';
      
      case ErrorType.VALIDATION_ERROR:
        if (error.details && Array.isArray(error.details)) {
          return error.details.map((detail: any) => detail.msg).join(', ');
        }
        return error.message || 'Please check your input and try again.';
      
      case ErrorType.NOT_FOUND_ERROR:
        return 'The item you\'re looking for wasn\'t found.';
      
      case ErrorType.SERVER_ERROR:
        return 'Something went wrong on our end. Please try again later.';
      
      case ErrorType.TIMEOUT_ERROR:
        return 'Request took too long. Please try again.';
      
      default:
        return error.message || 'Something went wrong. Please try again.';
    }
  }

  // Log errors for debugging using production logger
  static logError(error: AppError, context?: string): void {
    const logData = {
      ...error,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Use production logger instead of console.error
    if (error.isSecurityRelated) {
      logSecurityEvent(`Security-related error: ${error.type}`, logData);
    } else {
      logError('Application Error', new Error(error.message), logData);
    }
  }

  // Handle security events
  static handleSecurityEvent(event: SecurityEvent): void {
    // Log security event using logger instance
    logger.securityEvent(`${event.type}: ${event.message}`, {
      details: event.details,
      userAgent: event.userAgent,
      url: event.url,
      userId: event.userId,
      sessionId: event.sessionId,
      timestamp: event.timestamp
    });

    // In production, immediately report to security monitoring
    if (process.env.NODE_ENV === 'production') {
      // Send to security monitoring service
      this.reportSecurityIncident(event);
    }
  }

  // Report security incidents to monitoring service
  private static reportSecurityIncident(event: SecurityEvent): void {
    try {
      // TODO: Implement security monitoring service integration
      // This could be a SIEM, security dashboard, or alert system
      // securityMonitoringService.reportIncident(event);
      
      // For now, use high-priority logging
      logger.error(`SECURITY INCIDENT: ${event.type}`, undefined, event);
    } catch (error) {
      // Fallback logging if security service fails
      logger.error('Failed to report security incident', error as Error, event);
    }
  }

  // Sanitize error messages for user display
  static sanitizeErrorForUser(error: AppError): UserFriendlyError {
    // Never expose sensitive information to users
    const sensitivePatterns = [
      /password/i,
      /token/i,
      /key/i,
      /secret/i,
      /database/i,
      /sql/i,
      /query/i,
      /internal/i,
      /system/i,
      /server/i,
      /stack trace/i,
      /file path/i
    ];

    let sanitizedMessage = error.message;
    let canRetry = true;
    let actionRequired: string | undefined;

    // Check if message contains sensitive information
    const containsSensitiveInfo = sensitivePatterns.some(pattern => 
      pattern.test(error.message) || 
      (error.details && pattern.test(JSON.stringify(error.details)))
    );

    if (containsSensitiveInfo || error.isSecurityRelated) {
      // Use generic message for security-related or sensitive errors
      sanitizedMessage = this.getGenericErrorMessage(error.type);
      canRetry = false;
      actionRequired = 'Please contact support if this issue persists';
    } else {
      // Use the user-friendly message for non-sensitive errors
      sanitizedMessage = this.getUserFriendlyMessage(error);
    }

    // Determine retry capability based on error type
    switch (error.type) {
      case ErrorType.AUTHENTICATION_ERROR:
      case ErrorType.AUTHORIZATION_ERROR:
      case ErrorType.SECURITY_ERROR:
      case ErrorType.XSS_ATTEMPT:
      case ErrorType.INJECTION_ATTEMPT:
        canRetry = false;
        actionRequired = error.type === ErrorType.AUTHENTICATION_ERROR 
          ? 'Please log in again' 
          : 'Please contact support if this issue persists';
        break;
      
      case ErrorType.VALIDATION_ERROR:
        canRetry = true;
        actionRequired = 'Please check your input and try again';
        break;
      
      case ErrorType.NETWORK_ERROR:
      case ErrorType.TIMEOUT_ERROR:
        canRetry = true;
        actionRequired = 'Please check your connection and try again';
        break;
    }

    return {
      message: sanitizedMessage,
      canRetry,
      actionRequired
    };
  }

  // Get generic error messages that don't expose system details
  private static getGenericErrorMessage(errorType: ErrorType): string {
    switch (errorType) {
      case ErrorType.SECURITY_ERROR:
      case ErrorType.XSS_ATTEMPT:
      case ErrorType.INJECTION_ATTEMPT:
        return 'A security issue was detected. Please try again or contact support.';
      
      case ErrorType.AUTHENTICATION_ERROR:
        return 'Authentication failed. Please log in again.';
      
      case ErrorType.AUTHORIZATION_ERROR:
        return 'You do not have permission to perform this action.';
      
      case ErrorType.SERVER_ERROR:
        return 'A server error occurred. Please try again later.';
      
      case ErrorType.NETWORK_ERROR:
        return 'Network connection issue. Please check your connection.';
      
      case ErrorType.VALIDATION_ERROR:
        return 'Please check your input and try again.';
      
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  // Detect potential security threats in input
  static detectSecurityThreats(input: string, context?: string): SecurityEvent | null {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi,
      /eval\s*\(/gi,
      /expression\s*\(/gi
    ];

    const injectionPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
      /(';|";|--|\*\/)/g,
      /(<script|<iframe|<object|<embed)/gi
    ];

    // Check for XSS attempts
    for (const pattern of xssPatterns) {
      if (pattern.test(input)) {
        return {
          type: SecurityEventType.XSS_ATTEMPT,
          message: 'Potential XSS attempt detected in user input',
          details: {
            input: input.substring(0, 100), // Limit logged input
            context,
            pattern: pattern.source
          },
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString()
        };
      }
    }

    // Check for injection attempts
    for (const pattern of injectionPatterns) {
      if (pattern.test(input)) {
        return {
          type: SecurityEventType.INJECTION_ATTEMPT,
          message: 'Potential injection attempt detected in user input',
          details: {
            input: input.substring(0, 100), // Limit logged input
            context,
            pattern: pattern.source
          },
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString()
        };
      }
    }

    return null;
  }

  // Check if a JavaScript error might be security-related
  static isErrorSecurityRelated(error: Error): boolean {
    const securityIndicators = [
      'unauthorized', 'forbidden', 'access denied',
      'security', 'xss', 'injection', 'csrf',
      'eval', 'document.write', 'innerHTML',
      'insertAdjacentHTML', 'createContextualFragment',
      'postMessage'
    ];

    const errorMessage = error.message.toLowerCase();
    const errorStack = (error.stack || '').toLowerCase();

    return securityIndicators.some(indicator => 
      errorMessage.includes(indicator) || errorStack.includes(indicator)
    );
  }

  // Handle specific error scenarios
  static handleAuthenticationError(): void {
    // Log authentication error handling
    logWarn('Handling authentication error - clearing session and redirecting');
    
    // Clear auth data (should use secure storage service)
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (error) {
      logError('Failed to clear authentication data', error as Error);
    }
    
    // Redirect to login
    window.location.href = '/login';
  }

  // Retry logic for failed requests
  static async retryRequest<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        const parsedError = this.parseApiError(error);
        
        // Don't retry certain error types
        if ([
          ErrorType.AUTHENTICATION_ERROR,
          ErrorType.AUTHORIZATION_ERROR,
          ErrorType.VALIDATION_ERROR,
          ErrorType.NOT_FOUND_ERROR
        ].includes(parsedError.type)) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }

    throw lastError;
  }

  // Validate form data
  static validateForm(data: Record<string, any>, rules: Record<string, any>): string[] {
    const errors: string[] = [];

    for (const [field, value] of Object.entries(data)) {
      const rule = rules[field];
      if (!rule) continue;

      // Required validation
      if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
        errors.push(`${rule.label || field} is required`);
        continue;
      }

      // Skip other validations if field is empty and not required
      if (!value && !rule.required) continue;

      // String length validation
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(`${rule.label || field} must be at least ${rule.minLength} characters`);
      }

      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(`${rule.label || field} must be no more than ${rule.maxLength} characters`);
      }

      // Email validation
      if (rule.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.push(`${rule.label || field} must be a valid email address`);
      }

      // Number validation
      if (rule.min !== undefined && Number(value) < rule.min) {
        errors.push(`${rule.label || field} must be at least ${rule.min}`);
      }

      if (rule.max !== undefined && Number(value) > rule.max) {
        errors.push(`${rule.label || field} must be no more than ${rule.max}`);
      }

      // Pattern validation
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(rule.patternMessage || `${rule.label || field} format is invalid`);
      }

      // Custom validation
      if (rule.custom && typeof rule.custom === 'function') {
        const customError = rule.custom(value, data);
        if (customError) {
          errors.push(customError);
        }
      }
    }

    return errors;
  }
}

// Form validation rules
export const ValidationRules = {
  required: (label: string) => ({ required: true, label }),
  
  email: (label: string = 'Email') => ({
    required: true,
    email: true,
    label
  }),

  password: (label: string = 'Password') => ({
    required: true,
    minLength: 6,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    patternMessage: 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
    label
  }),

  username: (label: string = 'Username') => ({
    required: true,
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_]+$/,
    patternMessage: 'Username can only contain letters, numbers, and underscores',
    label
  }),

  productName: (label: string = 'Product Name') => ({
    required: true,
    minLength: 1,
    maxLength: 255,
    label
  }),

  price: (label: string = 'Price') => ({
    required: true,
    min: 0.01,
    max: 999999.99,
    label
  }),

  quantity: (label: string = 'Quantity') => ({
    required: true,
    min: 1,
    max: 100,
    label
  }),

  cardNumber: (label: string = 'Card Number') => ({
    required: true,
    pattern: /^\d{16}$/,
    patternMessage: 'Card number must be 16 digits',
    label
  }),

  expiryDate: (label: string = 'Expiry Date') => ({
    required: true,
    pattern: /^(0[1-9]|1[0-2])\/\d{2}$/,
    patternMessage: 'Expiry date must be in MM/YY format',
    label
  }),

  cvv: (label: string = 'CVV') => ({
    required: true,
    pattern: /^\d{3,4}$/,
    patternMessage: 'CVV must be 3 or 4 digits',
    label
  })
};
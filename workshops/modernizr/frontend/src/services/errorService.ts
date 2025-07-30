// Error types for better categorization
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface AppError {
  type: ErrorType;
  message: string;
  statusCode?: number;
  details?: any;
  timestamp: string;
}

export class ErrorService {
  // Parse API error responses
  static parseApiError(error: any): AppError {
    const timestamp = new Date().toISOString();

    // Network errors (no response)
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        return {
          type: ErrorType.TIMEOUT_ERROR,
          message: 'Request timed out. Please check your connection and try again.',
          timestamp
        };
      }
      
      return {
        type: ErrorType.NETWORK_ERROR,
        message: 'Network error. Please check your internet connection.',
        timestamp
      };
    }

    const { status, data } = error.response;
    const errorMessage = data?.error?.message || data?.message || 'An error occurred';
    const errorDetails = data?.error?.details || data?.details;

    // Categorize by status code
    switch (status) {
      case 400:
        return {
          type: ErrorType.VALIDATION_ERROR,
          message: errorMessage,
          statusCode: status,
          details: errorDetails,
          timestamp
        };

      case 401:
        return {
          type: ErrorType.AUTHENTICATION_ERROR,
          message: 'Please log in to continue.',
          statusCode: status,
          timestamp
        };

      case 403:
        return {
          type: ErrorType.AUTHORIZATION_ERROR,
          message: 'You do not have permission to perform this action.',
          statusCode: status,
          timestamp
        };

      case 404:
        return {
          type: ErrorType.NOT_FOUND_ERROR,
          message: 'The requested resource was not found.',
          statusCode: status,
          timestamp
        };

      case 429:
        return {
          type: ErrorType.NETWORK_ERROR,
          message: 'Too many requests. Please wait a moment and try again.',
          statusCode: status,
          timestamp
        };

      case 500:
      case 502:
      case 503:
      case 504:
        return {
          type: ErrorType.SERVER_ERROR,
          message: 'Server error. Please try again later.',
          statusCode: status,
          timestamp
        };

      default:
        return {
          type: ErrorType.UNKNOWN_ERROR,
          message: errorMessage,
          statusCode: status,
          details: errorDetails,
          timestamp
        };
    }
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

  // Log errors for debugging
  static logError(error: AppError, context?: string): void {
    const logData = {
      ...error,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.error('Application Error:', logData);

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: sendToErrorTrackingService(logData);
    }
  }

  // Handle specific error scenarios
  static handleAuthenticationError(): void {
    // Clear auth data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
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
import { ErrorService, ErrorType, SecurityEventType } from '../errorService';
import { logger } from '../logger';

// Mock the logger
jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    securityEvent: jest.fn(),
    authenticationFailure: jest.fn(),
    suspiciousActivity: jest.fn()
  },
  logSecurityEvent: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn()
}));

describe('Enhanced ErrorService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.location and navigator
    Object.defineProperty(window, 'location', {
      value: { href: 'https://example.com/test' },
      writable: true
    });
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Test User Agent',
      writable: true
    });
  });

  describe('sanitizeErrorForUser', () => {
    it('should sanitize sensitive error messages', () => {
      const sensitiveError = {
        type: ErrorType.SERVER_ERROR,
        message: 'Database connection failed: password incorrect for user admin',
        timestamp: new Date().toISOString(),
        isSecurityRelated: true
      };

      const result = ErrorService.sanitizeErrorForUser(sensitiveError);

      expect(result.message).toBe('A server error occurred. Please try again later.');
      expect(result.canRetry).toBe(false);
      expect(result.actionRequired).toBe('Please contact support if this issue persists');
    });

    it('should allow non-sensitive error messages through', () => {
      const normalError = {
        type: ErrorType.VALIDATION_ERROR,
        message: 'Email format is invalid',
        timestamp: new Date().toISOString(),
        isSecurityRelated: false
      };

      const result = ErrorService.sanitizeErrorForUser(normalError);

      expect(result.message).toBe('Email format is invalid');
      expect(result.canRetry).toBe(true);
      expect(result.actionRequired).toBe('Please check your input and try again');
    });

    it('should handle security-related errors appropriately', () => {
      const securityError = {
        type: ErrorType.XSS_ATTEMPT,
        message: 'Potential XSS detected',
        timestamp: new Date().toISOString(),
        isSecurityRelated: true
      };

      const result = ErrorService.sanitizeErrorForUser(securityError);

      expect(result.message).toBe('A security issue was detected. Please try again or contact support.');
      expect(result.canRetry).toBe(false);
      expect(result.actionRequired).toBe('Please contact support if this issue persists');
    });
  });

  describe('detectSecurityThreats', () => {
    it('should detect XSS attempts', () => {
      const xssInput = '<script>alert("xss")</script>';
      const result = ErrorService.detectSecurityThreats(xssInput, 'user-input');

      expect(result).not.toBeNull();
      expect(result?.type).toBe(SecurityEventType.XSS_ATTEMPT);
      expect(result?.message).toBe('Potential XSS attempt detected in user input');
      expect(result?.details.context).toBe('user-input');
    });

    it('should detect injection attempts', () => {
      const injectionInput = "'; DROP TABLE users; --";
      const result = ErrorService.detectSecurityThreats(injectionInput, 'search-query');

      expect(result).not.toBeNull();
      expect(result?.type).toBe(SecurityEventType.INJECTION_ATTEMPT);
      expect(result?.message).toBe('Potential injection attempt detected in user input');
    });

    it('should return null for safe input', () => {
      const safeInput = 'This is a normal user input';
      const result = ErrorService.detectSecurityThreats(safeInput);

      expect(result).toBeNull();
    });
  });

  describe('isErrorSecurityRelated', () => {
    it('should identify security-related errors', () => {
      const securityError = new Error('Unauthorized access to localStorage');
      const result = ErrorService.isErrorSecurityRelated(securityError);

      expect(result).toBe(true);
    });

    it('should identify non-security errors', () => {
      const normalError = new Error('Failed to fetch data from API');
      const result = ErrorService.isErrorSecurityRelated(normalError);

      expect(result).toBe(false);
    });
  });

  describe('handleSecurityEvent', () => {
    it('should log security events properly', () => {
      const securityEvent = {
        type: SecurityEventType.XSS_ATTEMPT,
        message: 'XSS attempt detected',
        details: { input: '<script>alert(1)</script>' },
        userAgent: 'Test Agent',
        url: 'https://example.com',
        timestamp: new Date().toISOString()
      };

      ErrorService.handleSecurityEvent(securityEvent);

      expect(logger.securityEvent).toHaveBeenCalledWith(
        'XSS_ATTEMPT: XSS attempt detected',
        expect.objectContaining({
          details: securityEvent.details,
          userAgent: securityEvent.userAgent,
          url: securityEvent.url
        })
      );
    });
  });

  describe('parseApiError with security awareness', () => {
    it('should mark 401 errors as security-related', () => {
      const mockError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' }
        }
      };

      const result = ErrorService.parseApiError(mockError);

      expect(result.type).toBe(ErrorType.AUTHENTICATION_ERROR);
      expect(result.isSecurityRelated).toBe(true);
      expect(result.sanitizedMessage).toBe('Authentication required. Please log in.');
    });

    it('should mark 403 errors as security-related', () => {
      const mockError = {
        response: {
          status: 403,
          data: { message: 'Forbidden' }
        }
      };

      const result = ErrorService.parseApiError(mockError);

      expect(result.type).toBe(ErrorType.AUTHORIZATION_ERROR);
      expect(result.isSecurityRelated).toBe(true);
      expect(result.sanitizedMessage).toBe('Access denied. You do not have permission.');
    });

    it('should mark 429 errors as security-related', () => {
      const mockError = {
        response: {
          status: 429,
          data: { message: 'Too Many Requests' }
        }
      };

      const result = ErrorService.parseApiError(mockError);

      expect(result.type).toBe(ErrorType.NETWORK_ERROR);
      expect(result.isSecurityRelated).toBe(true);
      expect(result.sanitizedMessage).toBe('Too many requests. Please wait and try again.');
    });

    it('should handle regular errors without security marking', () => {
      const mockError = {
        response: {
          status: 404,
          data: { message: 'Not Found' }
        }
      };

      const result = ErrorService.parseApiError(mockError);

      expect(result.type).toBe(ErrorType.NOT_FOUND_ERROR);
      expect(result.isSecurityRelated).toBeFalsy();
      expect(result.sanitizedMessage).toBe('Resource not found.');
    });
  });
});
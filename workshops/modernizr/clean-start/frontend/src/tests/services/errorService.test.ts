import { ErrorService, ValidationRules, ErrorType } from '../../services/errorService';

describe('ErrorService', () => {
  describe('parseApiError', () => {
    test('should parse API error with validation details', () => {
      const apiError = {
        response: {
          data: {
            error: {
              type: 'VALIDATION_ERROR',
              message: 'Validation failed',
              details: [
                { path: 'email', msg: 'Invalid email format' }
              ]
            }
          },
          status: 400
        }
      };

      const result = ErrorService.parseApiError(apiError);

      expect(result.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(result.message).toBe('Validation failed');
      expect(result.statusCode).toBe(400);
    });

    test('should handle network errors', () => {
      const networkError = {
        code: 'NETWORK_ERROR',
        message: 'Network Error'
      };

      const result = ErrorService.parseApiError(networkError);

      expect(result.type).toBe(ErrorType.NETWORK_ERROR);
      expect(result.message).toBe('Network error. Please check your internet connection.');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('getUserFriendlyMessage', () => {
    test('should return user-friendly message for different error types', () => {
      const networkError = { type: ErrorType.NETWORK_ERROR, message: 'Network failed', timestamp: new Date().toISOString() };
      expect(ErrorService.getUserFriendlyMessage(networkError)).toBe('Connection problem. Please check your internet and try again.');

      const authError = { type: ErrorType.AUTHENTICATION_ERROR, message: 'Auth failed', timestamp: new Date().toISOString() };
      expect(ErrorService.getUserFriendlyMessage(authError)).toBe('Please log in to continue.');

      const validationError = { type: ErrorType.VALIDATION_ERROR, message: 'Invalid email format', timestamp: new Date().toISOString() };
      expect(ErrorService.getUserFriendlyMessage(validationError)).toBe('Invalid email format');
    });
  });

  describe('validateForm', () => {
    test('should validate form with no errors', () => {
      const formData = {
        email: 'test@example.com',
        password: 'ValidPass123'
      };

      const rules = {
        email: ValidationRules.email(),
        password: ValidationRules.password()
      };

      const errors = ErrorService.validateForm(formData, rules);
      expect(errors).toEqual([]);
    });

    test('should validate form with errors', () => {
      const formData = {
        email: 'invalid-email',
        password: '123'
      };

      const rules = {
        email: ValidationRules.email(),
        password: ValidationRules.password()
      };

      const errors = ErrorService.validateForm(formData, rules);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('Email must be a valid email address');
      expect(errors).toContain('Password must be at least 6 characters');
    });
  });

  describe('logError', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test('should log error with context using production logger', () => {
      const error = { type: ErrorType.NETWORK_ERROR, message: 'Test error', timestamp: new Date().toISOString() };
      const context = 'test-context';

      ErrorService.logError(error, context);

      // The new implementation uses the production logger with formatted output
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Application Error'),
        expect.any(Error)
      );
    });
  });
});

describe('ValidationRules', () => {
  test('should return correct validation rule objects', () => {
    expect(ValidationRules.required('Username')).toEqual({
      required: true,
      label: 'Username'
    });

    expect(ValidationRules.email()).toEqual({
      required: true,
      email: true,
      label: 'Email'
    });

    expect(ValidationRules.password()).toEqual({
      required: true,
      minLength: 6,
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      patternMessage: 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
      label: 'Password'
    });

    expect(ValidationRules.username()).toEqual({
      required: true,
      minLength: 3,
      maxLength: 50,
      pattern: /^[a-zA-Z0-9_]+$/,
      patternMessage: 'Username can only contain letters, numbers, and underscores',
      label: 'Username'
    });
  });
});
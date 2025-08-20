import { DualReadErrorHandler, ValidationError, ValidationReport } from '../../../../database/wrappers/DualReadErrorHandler';

describe('DualReadErrorHandler', () => {
  describe('createValidationError', () => {
    it('should create validation error with default message', () => {
      const error = DualReadErrorHandler.createValidationError('username', 'user1', 'user2');
      
      expect(error).toEqual({
        attribute: 'username',
        mysqlValue: 'user1',
        dynamodbValue: 'user2',
        message: 'username mismatch: MySQL="user1", DynamoDB="user2"'
      });
    });

    it('should create validation error with custom message', () => {
      const customMessage = 'Custom validation error for username';
      const error = DualReadErrorHandler.createValidationError('username', 'user1', 'user2', customMessage);
      
      expect(error).toEqual({
        attribute: 'username',
        mysqlValue: 'user1',
        dynamodbValue: 'user2',
        message: customMessage
      });
    });

    it('should handle complex object values', () => {
      const mysqlValue = { id: 1, name: 'test' };
      const dynamodbValue = { id: 2, name: 'test2' };
      
      const error = DualReadErrorHandler.createValidationError('data', mysqlValue, dynamodbValue);
      
      expect(error.mysqlValue).toEqual(mysqlValue);
      expect(error.dynamodbValue).toEqual(dynamodbValue);
      expect(error.message).toContain('data mismatch');
    });
  });

  describe('createValidationReport', () => {
    it('should create validation report with all fields', () => {
      const errors: ValidationError[] = [
        DualReadErrorHandler.createValidationError('username', 'user1', 'user2')
      ];
      
      const mysqlData = { id: 1, username: 'user1' };
      const dynamodbData = { id: 1, username: 'user2' };
      
      const report = DualReadErrorHandler.createValidationReport(
        'User',
        'findById',
        'corr-123',
        mysqlData,
        dynamodbData,
        errors,
        1
      );
      
      expect(report.entityType).toBe('User');
      expect(report.entityId).toBe(1);
      expect(report.operationType).toBe('findById');
      expect(report.correlationId).toBe('corr-123');
      expect(report.validationPassed).toBe(false);
      expect(report.errors).toEqual(errors);
      expect(report.mysqlData).toEqual(mysqlData);
      expect(report.dynamodbData).toEqual(dynamodbData);
      expect(report.timestamp).toBeDefined();
    });

    it('should mark validation as passed when no errors', () => {
      const report = DualReadErrorHandler.createValidationReport(
        'User',
        'findById',
        'corr-123',
        { id: 1 },
        { id: 1 },
        []
      );
      
      expect(report.validationPassed).toBe(true);
      expect(report.errors).toEqual([]);
    });
  });

  describe('createActionableErrorMessage', () => {
    it('should create actionable message for single error', () => {
      const errors: ValidationError[] = [
        DualReadErrorHandler.createValidationError('username', 'user1', 'user2')
      ];
      
      const message = DualReadErrorHandler.createActionableErrorMessage('User', 'findById', 1, errors);
      
      expect(message).toContain('Data validation failed for User ID 1');
      expect(message).toContain('username mismatch');
    });

    it('should create actionable message for multiple errors', () => {
      const errors: ValidationError[] = [
        DualReadErrorHandler.createValidationError('username', 'user1', 'user2'),
        DualReadErrorHandler.createValidationError('email', 'email1', 'email2')
      ];
      
      const message = DualReadErrorHandler.createActionableErrorMessage('User', 'findById', 1, errors);
      
      expect(message).toContain('username mismatch');
      expect(message).toContain('email mismatch');
    });

    it('should add ID mapping suggestion for ID mismatches', () => {
      const errors: ValidationError[] = [
        DualReadErrorHandler.createValidationError('id', 1, 2)
      ];
      
      const message = DualReadErrorHandler.createActionableErrorMessage('User', 'findById', 1, errors);
      
      expect(message).toContain('Check ID mapping between MySQL and DynamoDB');
    });

    it('should add timestamp suggestion for date mismatches', () => {
      const errors: ValidationError[] = [
        DualReadErrorHandler.createValidationError('created_at', '2023-01-01', '2023-01-02')
      ];
      
      const message = DualReadErrorHandler.createActionableErrorMessage('User', 'findById', 1, errors);
      
      expect(message).toContain('Verify timestamp synchronization between databases');
    });

    it('should add password suggestion for password_hash mismatches', () => {
      const errors: ValidationError[] = [
        DualReadErrorHandler.createValidationError('password_hash', 'hash1', 'hash2')
      ];
      
      const message = DualReadErrorHandler.createActionableErrorMessage('User', 'findById', 1, errors);
      
      expect(message).toContain('Check password hashing consistency');
    });

    it('should suggest resynchronization for many errors', () => {
      const errors: ValidationError[] = [
        DualReadErrorHandler.createValidationError('username', 'user1', 'user2'),
        DualReadErrorHandler.createValidationError('email', 'email1', 'email2'),
        DualReadErrorHandler.createValidationError('first_name', 'first1', 'first2'),
        DualReadErrorHandler.createValidationError('last_name', 'last1', 'last2')
      ];
      
      const message = DualReadErrorHandler.createActionableErrorMessage('User', 'findById', 1, errors);
      
      expect(message).toContain('Consider full data resynchronization for this entity');
    });

    it('should handle entity without ID', () => {
      const errors: ValidationError[] = [
        DualReadErrorHandler.createValidationError('username', 'user1', 'user2')
      ];
      
      const message = DualReadErrorHandler.createActionableErrorMessage('User', 'findByUsername', undefined, errors);
      
      expect(message).toContain('Data validation failed for User findByUsername');
    });
  });

  describe('formatErrorsForThrow', () => {
    it('should format single error', () => {
      const errors: ValidationError[] = [
        DualReadErrorHandler.createValidationError('username', 'user1', 'user2')
      ];
      
      const formatted = DualReadErrorHandler.formatErrorsForThrow(errors);
      
      expect(formatted).toBe('username mismatch: MySQL="user1", DynamoDB="user2"');
    });

    it('should format multiple errors with numbering', () => {
      const errors: ValidationError[] = [
        DualReadErrorHandler.createValidationError('username', 'user1', 'user2'),
        DualReadErrorHandler.createValidationError('email', 'email1', 'email2')
      ];
      
      const formatted = DualReadErrorHandler.formatErrorsForThrow(errors);
      
      expect(formatted).toContain('1. username mismatch');
      expect(formatted).toContain('2. email mismatch');
      expect(formatted).toContain(';');
    });
  });

  describe('logValidationReport', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      jest.restoreAllMocks();
    });

    it('should log success message for passed validation', () => {
      const report: ValidationReport = {
        entityType: 'User',
        operationType: 'findById',
        correlationId: 'corr-123',
        validationPassed: true,
        errors: [],
        mysqlData: {},
        dynamodbData: {},
        timestamp: '2023-01-01T00:00:00Z'
      };
      
      DualReadErrorHandler.logValidationReport(report);
      
      expect(console.log).toHaveBeenCalledWith('[corr-123] Validation passed for User findById');
    });

    it('should log detailed error information for failed validation', () => {
      const errors: ValidationError[] = [
        DualReadErrorHandler.createValidationError('username', 'user1', 'user2')
      ];
      
      const report: ValidationReport = {
        entityType: 'User',
        entityId: 1,
        operationType: 'findById',
        correlationId: 'corr-123',
        validationPassed: false,
        errors,
        mysqlData: { username: 'user1' },
        dynamodbData: { username: 'user2' },
        timestamp: '2023-01-01T00:00:00Z'
      };
      
      DualReadErrorHandler.logValidationReport(report);
      
      expect(console.error).toHaveBeenCalledWith('[corr-123] VALIDATION FAILED for User findById');
      expect(console.error).toHaveBeenCalledWith('[corr-123] Entity ID: 1');
      expect(console.error).toHaveBeenCalledWith('[corr-123] Total errors: 1');
    });
  });
});

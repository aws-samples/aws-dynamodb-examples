import { DualReadWrapper, DualReadOperation } from '../../../../database/wrappers/DualReadWrapper';
import { FeatureFlagService } from '../../../../services/FeatureFlagService';

// Test implementation of DualReadWrapper
class TestDualReadWrapper extends DualReadWrapper<{ id: number; name: string }> {
  protected entityType = 'TestEntity';

  protected compareAttributes(mysqlResult: { id: number; name: string }, dynamodbResult: { id: number; name: string }): string[] {
    const errors: string[] = [];
    
    if (mysqlResult.id !== dynamodbResult.id) {
      errors.push(`ID mismatch: MySQL=${mysqlResult.id}, DynamoDB=${dynamodbResult.id}`);
    }
    
    if (mysqlResult.name !== dynamodbResult.name) {
      errors.push(`Name mismatch: MySQL="${mysqlResult.name}", DynamoDB="${dynamodbResult.name}"`);
    }
    
    return errors;
  }
}

describe('DualReadWrapper', () => {
  let wrapper: TestDualReadWrapper;
  let featureFlagService: FeatureFlagService;

  beforeEach(() => {
    featureFlagService = new FeatureFlagService();
    wrapper = new TestDualReadWrapper(featureFlagService);
    FeatureFlagService.reset();
  });

  describe('MySQL only read (Phase 1, 2)', () => {
    it('should read from MySQL when dual_read_enabled=false and read_from_dynamodb=false', async () => {
      // Arrange
      FeatureFlagService.setFlag('dual_read_enabled', false);
      FeatureFlagService.setFlag('read_from_dynamodb', false);
      
      const mysqlData = { id: 1, name: 'test' };
      const operation: DualReadOperation<{ id: number; name: string }> = {
        mysqlOperation: jest.fn().mockResolvedValue(mysqlData),
        dynamodbOperation: jest.fn().mockResolvedValue({ id: 1, name: 'test' })
      };

      // Act
      const result = await wrapper.executeDualRead(operation, 'findById');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mysqlData);
      expect(result.mysqlResult).toEqual(mysqlData);
      expect(result.dynamodbResult).toBeUndefined();
      expect(operation.mysqlOperation).toHaveBeenCalled();
      expect(operation.dynamodbOperation).not.toHaveBeenCalled();
    });
  });

  describe('DynamoDB only read (Phase 4, 5)', () => {
    it('should read from DynamoDB when dual_read_enabled=false and read_from_dynamodb=true', async () => {
      // Arrange
      FeatureFlagService.setFlag('dual_read_enabled', false);
      FeatureFlagService.setFlag('read_from_dynamodb', true);
      
      const dynamodbData = { id: 1, name: 'test' };
      const operation: DualReadOperation<{ id: number; name: string }> = {
        mysqlOperation: jest.fn().mockResolvedValue({ id: 1, name: 'test' }),
        dynamodbOperation: jest.fn().mockResolvedValue(dynamodbData)
      };

      // Act
      const result = await wrapper.executeDualRead(operation, 'findById');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(dynamodbData);
      expect(result.dynamodbResult).toEqual(dynamodbData);
      expect(result.mysqlResult).toBeUndefined();
      expect(operation.dynamodbOperation).toHaveBeenCalled();
      expect(operation.mysqlOperation).not.toHaveBeenCalled();
    });
  });

  describe('Dual read with validation (Phase 3)', () => {
    it('should read from both databases and validate when dual_read_enabled=true', async () => {
      // Arrange
      FeatureFlagService.setFlag('dual_read_enabled', true);
      FeatureFlagService.setFlag('validation_enabled', true);
      
      const mysqlData = { id: 1, name: 'test' };
      const dynamodbData = { id: 1, name: 'test' };
      const operation: DualReadOperation<{ id: number; name: string }> = {
        mysqlOperation: jest.fn().mockResolvedValue(mysqlData),
        dynamodbOperation: jest.fn().mockResolvedValue(dynamodbData)
      };

      // Act
      const result = await wrapper.executeDualRead(operation, 'findById');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mysqlData); // MySQL is primary
      expect(result.mysqlResult).toEqual(mysqlData);
      expect(result.dynamodbResult).toEqual(dynamodbData);
      expect(result.validationPassed).toBe(true);
      expect(result.validationErrors).toBeUndefined();
      expect(operation.mysqlOperation).toHaveBeenCalled();
      expect(operation.dynamodbOperation).toHaveBeenCalled();
    });

    it('should detect validation errors when data differs', async () => {
      // Arrange
      FeatureFlagService.setFlag('dual_read_enabled', true);
      FeatureFlagService.setFlag('validation_enabled', true);
      
      const mysqlData = { id: 1, name: 'mysql_name' };
      const dynamodbData = { id: 1, name: 'dynamodb_name' };
      const operation: DualReadOperation<{ id: number; name: string }> = {
        mysqlOperation: jest.fn().mockResolvedValue(mysqlData),
        dynamodbOperation: jest.fn().mockResolvedValue(dynamodbData)
      };

      // Act
      const result = await wrapper.executeDualRead(operation, 'findById');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mysqlData); // MySQL is still primary
      expect(result.validationPassed).toBe(false);
      expect(result.validationErrors).toContain('Name mismatch: MySQL="mysql_name", DynamoDB="dynamodb_name"');
    });

    it('should handle null result validation', async () => {
      // Arrange
      FeatureFlagService.setFlag('dual_read_enabled', true);
      FeatureFlagService.setFlag('validation_enabled', true);
      
      const operation: DualReadOperation<{ id: number; name: string }> = {
        mysqlOperation: jest.fn().mockResolvedValue(null),
        dynamodbOperation: jest.fn().mockResolvedValue({ id: 1, name: 'test' })
      };

      // Act
      const result = await wrapper.executeDualRead(operation, 'findById');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(result.validationPassed).toBe(false);
      expect(result.validationErrors).toContain('MySQL result is null but DynamoDB result is not null');
    });
  });

  describe('Error handling', () => {
    it('should handle MySQL read errors', async () => {
      // Arrange
      FeatureFlagService.setFlag('dual_read_enabled', false);
      FeatureFlagService.setFlag('read_from_dynamodb', false);
      
      const error = new Error('MySQL connection failed');
      const operation: DualReadOperation<{ id: number; name: string }> = {
        mysqlOperation: jest.fn().mockRejectedValue(error),
        dynamodbOperation: jest.fn().mockResolvedValue({ id: 1, name: 'test' })
      };

      // Act
      const result = await wrapper.executeDualRead(operation, 'findById');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.data).toBeUndefined();
    });

    it('should handle DynamoDB read errors', async () => {
      // Arrange
      FeatureFlagService.setFlag('dual_read_enabled', false);
      FeatureFlagService.setFlag('read_from_dynamodb', true);
      
      const error = new Error('DynamoDB connection failed');
      const operation: DualReadOperation<{ id: number; name: string }> = {
        mysqlOperation: jest.fn().mockResolvedValue({ id: 1, name: 'test' }),
        dynamodbOperation: jest.fn().mockRejectedValue(error)
      };

      // Act
      const result = await wrapper.executeDualRead(operation, 'findById');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.data).toBeUndefined();
    });
  });
});

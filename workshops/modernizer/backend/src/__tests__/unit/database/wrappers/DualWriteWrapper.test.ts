import { DualWriteWrapper, DualWriteOperation } from '../../../../database/wrappers/DualWriteWrapper';
import { FeatureFlagService } from '../../../../services/FeatureFlagService';

// Test implementation
class TestDualWriteWrapper extends DualWriteWrapper<string> {
  protected entityType = 'Test';

  transformForDynamoDB(mysqlData: string): any {
    return { transformed: mysqlData };
  }

  createRollbackOperation(mysqlData: string): (() => Promise<void>) | undefined {
    return () => Promise.resolve();
  }

  protected extractEntityId(data: string): string | number {
    return data;
  }
}

describe('DualWriteWrapper', () => {
  let wrapper: TestDualWriteWrapper;
  let featureFlagService: FeatureFlagService;

  beforeEach(() => {
    featureFlagService = new FeatureFlagService();
    wrapper = new TestDualWriteWrapper(featureFlagService);
    // Reset flags before each test
    FeatureFlagService.reset();
  });

  describe('executeDualWrite', () => {
    it('should execute only MySQL when dual_write_enabled is false', async () => {
      // Arrange
      FeatureFlagService.setFlag('dual_write_enabled', false);
      const mysqlOp = jest.fn().mockResolvedValue('mysql-result');
      const dynamodbOp = jest.fn().mockResolvedValue('dynamodb-result');
      
      const operation: DualWriteOperation<string> = {
        mysqlOperation: mysqlOp,
        dynamodbOperation: dynamodbOp
      };

      // Act
      const result = await wrapper.executeDualWrite(operation, 'TEST');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe('mysql-result');
      expect(result.mysqlResult).toBe('mysql-result');
      expect(result.dynamodbResult).toBeUndefined();
      expect(result.correlationId).toBeDefined();
      expect(mysqlOp).toHaveBeenCalledTimes(1);
      expect(dynamodbOp).not.toHaveBeenCalled();
    });

    it('should execute both operations when dual_write_enabled is true', async () => {
      // Arrange
      FeatureFlagService.setFlag('dual_write_enabled', true);
      const mysqlOp = jest.fn().mockResolvedValue('mysql-result');
      const dynamodbOp = jest.fn().mockResolvedValue('dynamodb-result');
      
      const operation: DualWriteOperation<string> = {
        mysqlOperation: mysqlOp,
        dynamodbOperation: dynamodbOp
      };

      // Act
      const result = await wrapper.executeDualWrite(operation, 'TEST');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe('mysql-result');
      expect(result.mysqlResult).toBe('mysql-result');
      expect(result.dynamodbResult).toBe('dynamodb-result');
      expect(result.correlationId).toBeDefined();
      expect(mysqlOp).toHaveBeenCalledTimes(1);
      expect(dynamodbOp).toHaveBeenCalledWith('mysql-result');
    });

    it('should handle MySQL failure gracefully', async () => {
      // Arrange
      FeatureFlagService.setFlag('dual_write_enabled', true);
      const error = new Error('MySQL failed');
      const mysqlOp = jest.fn().mockRejectedValue(error);
      const dynamodbOp = jest.fn();
      
      const operation: DualWriteOperation<string> = {
        mysqlOperation: mysqlOp,
        dynamodbOperation: dynamodbOp
      };

      // Act
      const result = await wrapper.executeDualWrite(operation, 'TEST');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.correlationId).toBeDefined();
      expect(dynamodbOp).not.toHaveBeenCalled();
    });

    it('should attempt rollback when DynamoDB fails', async () => {
      // Arrange
      FeatureFlagService.setFlag('dual_write_enabled', true);
      const mysqlOp = jest.fn().mockResolvedValue('mysql-result');
      const dynamodbOp = jest.fn().mockRejectedValue(new Error('DynamoDB failed'));
      const rollbackOp = jest.fn().mockResolvedValue(undefined);
      
      const operation: DualWriteOperation<string> = {
        mysqlOperation: mysqlOp,
        dynamodbOperation: dynamodbOp,
        rollbackOperation: rollbackOp
      };

      // Act
      const result = await wrapper.executeDualWrite(operation, 'TEST');

      // Assert
      expect(result.success).toBe(false);
      expect(result.rollbackPerformed).toBe(true);
      expect(result.correlationId).toBeDefined();
      expect(rollbackOp).toHaveBeenCalledWith('mysql-result');
    });
  });

  describe('transformId', () => {
    it('should convert number to string', () => {
      const result = (wrapper as any).transformId(123);
      expect(result).toBe('123');
    });
  });
});

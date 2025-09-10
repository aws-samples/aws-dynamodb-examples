import { FeatureFlagService } from '../../services/FeatureFlagService';
import { CorrelationId } from '../../utils/CorrelationId';

export interface DualReadResult<T> {
  success: boolean;
  data?: T;
  mysqlResult?: T;
  dynamodbResult?: T;
  validationPassed?: boolean;
  validationErrors?: string[];
  error?: Error;
  correlationId?: string;
}

export interface DualReadOperation<T> {
  mysqlOperation: () => Promise<T>;
  dynamodbOperation: () => Promise<T>;
}

export abstract class DualReadWrapper<T> {
  protected featureFlagService: FeatureFlagService;
  protected abstract entityType: string;

  constructor(featureFlagService: FeatureFlagService) {
    this.featureFlagService = featureFlagService;
  }

  async executeDualRead(operation: DualReadOperation<T>, operationType: string): Promise<DualReadResult<T>> {
    const correlationId = CorrelationId.generate();
    
    // Log operation start
    console.log(`[${correlationId}] Read operation start: ${this.entityType} ${operationType}`);

    // Check read routing based on feature flags
    const dualReadEnabled = FeatureFlagService.getFlag('dual_read_enabled');
    const readFromDynamoDB = FeatureFlagService.getFlag('read_from_dynamodb');
    const validationEnabled = FeatureFlagService.getFlag('validation_enabled');

    // Single database read scenarios
    if (!dualReadEnabled && !readFromDynamoDB) {
      // Read from MySQL only (Phase 1, 2)
      return this.executeMySQL(operation, correlationId);
    }

    if (!dualReadEnabled && readFromDynamoDB) {
      // Read from DynamoDB only (Phase 4, 5)
      return this.executeDynamoDB(operation, correlationId);
    }

    // Dual read scenario (Phase 3)
    if (dualReadEnabled) {
      return this.executeDualReadWithValidation(operation, correlationId, validationEnabled);
    }

    // Fallback to MySQL
    console.warn(`[${correlationId}] Unexpected flag combination, falling back to MySQL`);
    return this.executeMySQL(operation, correlationId);
  }

  private async executeMySQL(operation: DualReadOperation<T>, correlationId: string): Promise<DualReadResult<T>> {
    try {
      console.log(`[${correlationId}] Reading from MySQL for ${this.entityType}`);
      const mysqlResult = await operation.mysqlOperation();
      console.log(`[${correlationId}] MySQL read successful for ${this.entityType}`);
      
      return {
        success: true,
        data: mysqlResult,
        mysqlResult,
        correlationId
      };
    } catch (error) {
      console.error(`[${correlationId}] MySQL read failed for ${this.entityType}: ${(error as Error).message}`);
      return {
        success: false,
        error: error as Error,
        correlationId
      };
    }
  }

  private async executeDynamoDB(operation: DualReadOperation<T>, correlationId: string): Promise<DualReadResult<T>> {
    try {
      console.log(`[${correlationId}] Reading from DynamoDB for ${this.entityType}`);
      const dynamodbResult = await operation.dynamodbOperation();
      console.log(`[${correlationId}] DynamoDB read successful for ${this.entityType}`);
      
      return {
        success: true,
        data: dynamodbResult,
        dynamodbResult,
        correlationId
      };
    } catch (error) {
      console.error(`[${correlationId}] DynamoDB read failed for ${this.entityType}: ${(error as Error).message}`);
      return {
        success: false,
        error: error as Error,
        correlationId
      };
    }
  }

  private async executeDualReadWithValidation(
    operation: DualReadOperation<T>, 
    correlationId: string, 
    validationEnabled: boolean
  ): Promise<DualReadResult<T>> {
    console.log(`[${correlationId}] Executing dual read for ${this.entityType} (validation: ${validationEnabled})`);

    try {
      // Execute both reads in parallel
      const [mysqlResult, dynamodbResult] = await Promise.all([
        operation.mysqlOperation().catch(error => {
          console.error(`[${correlationId}] MySQL read failed: ${error.message}`);
          throw error;
        }),
        operation.dynamodbOperation().catch(error => {
          console.error(`[${correlationId}] DynamoDB read failed: ${error.message}`);
          throw error;
        })
      ]);

      console.log(`[${correlationId}] Both reads completed for ${this.entityType}`);

      // Perform validation if enabled
      let validationPassed = true;
      let validationErrors: string[] = [];

      if (validationEnabled) {
        const validationResult = this.validateResults(mysqlResult, dynamodbResult, correlationId);
        validationPassed = validationResult.passed;
        validationErrors = validationResult.errors;
      }

      // Return MySQL result as primary (consistent with dual-write approach)
      return {
        success: true,
        data: mysqlResult,
        mysqlResult,
        dynamodbResult,
        validationPassed,
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
        correlationId
      };

    } catch (error) {
      console.error(`[${correlationId}] Dual read failed for ${this.entityType}: ${(error as Error).message}`);
      return {
        success: false,
        error: error as Error,
        correlationId
      };
    }
  }

  private validateResults(mysqlResult: T, dynamodbResult: T, correlationId: string): { passed: boolean; errors: string[] } {
    console.log(`[${correlationId}] Validating dual read results for ${this.entityType}`);

    const errors: string[] = [];

    // Handle null/undefined cases
    if (mysqlResult === null && dynamodbResult === null) {
      console.log(`[${correlationId}] Both results are null - validation passed`);
      return { passed: true, errors: [] };
    }

    if (mysqlResult === null && dynamodbResult !== null) {
      errors.push('MySQL result is null but DynamoDB result is not null');
    }

    if (mysqlResult !== null && dynamodbResult === null) {
      errors.push('DynamoDB result is null but MySQL result is not null');
    }

    if (mysqlResult === null || dynamodbResult === null) {
      console.error(`[${correlationId}] Null mismatch validation failed: ${errors.join(', ')}`);
      return { passed: false, errors };
    }

    // Compare attributes using entity-specific validation
    const attributeErrors = this.compareAttributes(mysqlResult, dynamodbResult);
    errors.push(...attributeErrors);

    const passed = errors.length === 0;
    
    if (passed) {
      console.log(`[${correlationId}] Validation passed for ${this.entityType}`);
    } else {
      console.error(`[${correlationId}] Validation failed for ${this.entityType}: ${errors.join(', ')}`);
      console.error(`[${correlationId}] MySQL data:`, JSON.stringify(mysqlResult, null, 2));
      console.error(`[${correlationId}] DynamoDB data:`, JSON.stringify(dynamodbResult, null, 2));
    }

    return { passed, errors };
  }

  // Abstract method for entity-specific attribute comparison
  protected abstract compareAttributes(mysqlResult: T, dynamodbResult: T): string[];
}

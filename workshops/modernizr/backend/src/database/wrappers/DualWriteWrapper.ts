import { FeatureFlagService } from '../../services/FeatureFlagService';
import { CorrelationId } from '../../utils/CorrelationId';

export interface DualWriteResult<T> {
  success: boolean;
  data?: T;
  mysqlResult?: T;
  dynamodbResult?: T;
  error?: Error;
  rollbackPerformed?: boolean;
  correlationId?: string;
}

export interface DualWriteOperation<T> {
  mysqlOperation: () => Promise<T>;
  dynamodbOperation: (mysqlResult: T) => Promise<T>;
  dynamodbOnlyOperation?: () => Promise<T>; // For Phase 5 DynamoDB-only writes
  rollbackOperation?: (mysqlResult: T) => Promise<void>;
}

export abstract class DualWriteWrapper<T> {
  protected abstract entityType: string;

  constructor() {
    // No need to store FeatureFlagService instance since we use static methods
  }

  async executeDualWrite(operation: DualWriteOperation<T>, operationType: string): Promise<DualWriteResult<T>> {
    const correlationId = CorrelationId.generate();
    
    // Log operation start
    console.log(`[${correlationId}] Operation start: ${this.entityType} ${operationType}`);

    // Check if dual-write is enabled
    const dualWriteEnabled = FeatureFlagService.getFlag('dual_write_enabled');
    const readFromDynamoDB = FeatureFlagService.getFlag('read_from_dynamodb');

    // Phase 5: DynamoDB only (dual_write_enabled=false, read_from_dynamodb=true)
    if (!dualWriteEnabled && readFromDynamoDB && operation.dynamodbOnlyOperation) {
      console.log(`[${correlationId}] Phase 5: DynamoDB only write for ${this.entityType}`);
      
      try {
        const dynamodbResult = await operation.dynamodbOnlyOperation();
        const entityId = this.extractEntityId(dynamodbResult);
        console.log(`[${correlationId}] DynamoDB write successful for ${this.entityType} ID ${entityId}`);
        
        return {
          success: true,
          data: dynamodbResult,
          dynamodbResult,
          correlationId
        };
      } catch (error) {
        console.error(`[${correlationId}] DynamoDB write failed for ${this.entityType}: ${(error as Error).message}`);
        return {
          success: false,
          error: error as Error,
          correlationId
        };
      }
    }

    // Phase 1: MySQL only (dual_write_enabled=false, read_from_dynamodb=false)
    if (!dualWriteEnabled) {
      console.log(`[${correlationId}] Phase 1: MySQL only write for ${this.entityType}`);
      
      try {
        const mysqlResult = await operation.mysqlOperation();
        const entityId = this.extractEntityId(mysqlResult);
        console.log(`[${correlationId}] MySQL write successful for ${this.entityType} ID ${entityId}`);
        
        return {
          success: true,
          data: mysqlResult,
          mysqlResult,
          correlationId
        };
      } catch (error) {
        console.error(`[${correlationId}] MySQL write failed for ${this.entityType}: ${(error as Error).message}`);
        return {
          success: false,
          error: error as Error,
          correlationId
        };
      }
    }

    // Execute dual-write: MySQL first, then DynamoDB
    let mysqlResult: T;
    
    try {
      // Step 1: Execute MySQL operation (primary source of truth)
      mysqlResult = await operation.mysqlOperation();
      const entityId = this.extractEntityId(mysqlResult);
      console.log(`[${correlationId}] MySQL write successful for ${this.entityType} ID ${entityId}`);
    } catch (error) {
      console.error(`[${correlationId}] MySQL write failed for ${this.entityType}: ${(error as Error).message}`);
      console.error(`[${correlationId}] Stack trace:`, (error as Error).stack);
      return {
        success: false,
        error: error as Error,
        correlationId
      };
    }

    try {
      // Step 2: Execute DynamoDB operation using MySQL result
      const entityId = this.extractEntityId(mysqlResult);
      console.log(`[${correlationId}] Attempting DynamoDB write for ${this.entityType} ID ${entityId}`);
      
      const dynamodbResult = await operation.dynamodbOperation(mysqlResult);
      console.log(`[${correlationId}] DynamoDB write successful for ${this.entityType} ID ${entityId}`);
      
      return {
        success: true,
        data: mysqlResult, // Return MySQL result as primary
        mysqlResult,
        dynamodbResult,
        correlationId
      };
    } catch (error) {
      // Step 3: DynamoDB failed, log detailed error and attempt rollback
      const entityId = this.extractEntityId(mysqlResult);
      console.error(`[${correlationId}] DynamoDB write failed for ${this.entityType} ID ${entityId}: ${(error as Error).message}`);
      console.error(`[${correlationId}] Full error message:`, (error as Error).message);
      console.error(`[${correlationId}] Stack trace:`, (error as Error).stack);
      console.error(`[${correlationId}] Entity data that failed to write:`, JSON.stringify(mysqlResult, null, 2));
      console.error(`[${correlationId}] MySQL ID that was successfully generated: ${entityId}`);
      console.error(`[${correlationId}] Timestamp: ${new Date().toISOString()}`);
      
      let rollbackPerformed = false;
      
      if (operation.rollbackOperation) {
        try {
          console.log(`[${correlationId}] Attempting rollback for ${this.entityType} ID ${entityId}`);
          await operation.rollbackOperation(mysqlResult);
          rollbackPerformed = true;
          console.log(`[${correlationId}] Rollback successful for ${this.entityType} ID ${entityId}`);
        } catch (rollbackError) {
          console.error(`[${correlationId}] Rollback failed for ${this.entityType} ID ${entityId}:`, rollbackError);
        }
      }

      return {
        success: false,
        error: error as Error,
        mysqlResult,
        rollbackPerformed,
        correlationId
      };
    }
  }

  // Helper method for transforming MySQL auto-increment ID to string
  protected transformId(id: number): string {
    return id.toString();
  }

  // Abstract method to extract entity ID for logging
  protected abstract extractEntityId(data: T): string | number;

  // Abstract methods for entity-specific implementations
  abstract transformForDynamoDB(mysqlData: T): any;
  abstract createRollbackOperation(mysqlData: T): (() => Promise<void>) | undefined;
}

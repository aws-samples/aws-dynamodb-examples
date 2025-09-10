export interface ValidationError {
  attribute: string;
  mysqlValue: any;
  dynamodbValue: any;
  message: string;
}

export interface ValidationReport {
  entityType: string;
  entityId?: string | number;
  operationType: string;
  correlationId: string;
  validationPassed: boolean;
  errors: ValidationError[];
  mysqlData: any;
  dynamodbData: any;
  timestamp: string;
}

export class DualReadErrorHandler {
  static createValidationError(
    attribute: string,
    mysqlValue: any,
    dynamodbValue: any,
    customMessage?: string
  ): ValidationError {
    const message = customMessage || `${attribute} mismatch: MySQL=${JSON.stringify(mysqlValue)}, DynamoDB=${JSON.stringify(dynamodbValue)}`;
    
    return {
      attribute,
      mysqlValue,
      dynamodbValue,
      message
    };
  }

  static createValidationReport(
    entityType: string,
    operationType: string,
    correlationId: string,
    mysqlData: any,
    dynamodbData: any,
    errors: ValidationError[],
    entityId?: string | number
  ): ValidationReport {
    return {
      entityType,
      entityId,
      operationType,
      correlationId,
      validationPassed: errors.length === 0,
      errors,
      mysqlData,
      dynamodbData,
      timestamp: new Date().toISOString()
    };
  }

  static logValidationReport(report: ValidationReport): void {
    if (report.validationPassed) {
      console.log(`[${report.correlationId}] Validation passed for ${report.entityType} ${report.operationType}`);
      return;
    }

    console.error(`[${report.correlationId}] VALIDATION FAILED for ${report.entityType} ${report.operationType}`);
    console.error(`[${report.correlationId}] Entity ID: ${report.entityId || 'N/A'}`);
    console.error(`[${report.correlationId}] Timestamp: ${report.timestamp}`);
    console.error(`[${report.correlationId}] Total errors: ${report.errors.length}`);
    
    console.error(`[${report.correlationId}] Detailed errors:`);
    report.errors.forEach((error, index) => {
      console.error(`[${report.correlationId}]   ${index + 1}. ${error.message}`);
      console.error(`[${report.correlationId}]      MySQL value: ${JSON.stringify(error.mysqlValue)}`);
      console.error(`[${report.correlationId}]      DynamoDB value: ${JSON.stringify(error.dynamodbValue)}`);
    });

    console.error(`[${report.correlationId}] Complete MySQL data:`);
    console.error(`[${report.correlationId}] ${JSON.stringify(report.mysqlData, null, 2)}`);
    
    console.error(`[${report.correlationId}] Complete DynamoDB data:`);
    console.error(`[${report.correlationId}] ${JSON.stringify(report.dynamodbData, null, 2)}`);
  }

  static createActionableErrorMessage(
    entityType: string,
    operationType: string,
    entityId: string | number | undefined,
    errors: ValidationError[]
  ): string {
    const entityInfo = entityId ? `${entityType} ID ${entityId}` : `${entityType} ${operationType}`;
    const errorSummary = errors.map(e => e.message).join(', ');
    
    let actionableMessage = `Data validation failed for ${entityInfo}: ${errorSummary}`;
    
    // Add actionable suggestions based on error types
    const suggestions: string[] = [];
    
    if (errors.some(e => e.attribute === 'id')) {
      suggestions.push('Check ID mapping between MySQL and DynamoDB');
    }
    
    if (errors.some(e => e.attribute.includes('_at'))) {
      suggestions.push('Verify timestamp synchronization between databases');
    }
    
    if (errors.some(e => e.attribute === 'password_hash')) {
      suggestions.push('Check password hashing consistency');
    }
    
    if (errors.length > 3) {
      suggestions.push('Consider full data resynchronization for this entity');
    }
    
    if (suggestions.length > 0) {
      actionableMessage += `. Suggested actions: ${suggestions.join('; ')}`;
    }
    
    return actionableMessage;
  }

  static formatErrorsForThrow(errors: ValidationError[]): string {
    if (errors.length === 1) {
      return errors[0].message;
    }
    
    return errors.map((error, index) => `${index + 1}. ${error.message}`).join('; ');
  }
}

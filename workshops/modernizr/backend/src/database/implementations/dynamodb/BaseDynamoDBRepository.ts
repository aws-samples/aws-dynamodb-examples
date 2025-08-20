import { 
  GetCommand, 
  PutCommand, 
  UpdateCommand, 
  DeleteCommand, 
  QueryCommand, 
  ScanCommand,
  GetCommandInput,
  PutCommandInput,
  UpdateCommandInput,
  DeleteCommandInput,
  QueryCommandInput,
  ScanCommandInput
} from '@aws-sdk/lib-dynamodb';
import { 
  ProvisionedThroughputExceededException,
  ConditionalCheckFailedException,
  ResourceNotFoundException,
  ItemCollectionSizeLimitExceededException
} from '@aws-sdk/client-dynamodb';
import { DynamoDBClientManager } from '../../config/DynamoDBClient';

export abstract class BaseDynamoDBRepository {
  protected client = DynamoDBClientManager.getClient();
  protected tableName: string;

  constructor(tableName: string) {
    try {
      this.tableName = DynamoDBClientManager.getTableName(tableName);
    } catch (error) {
      // In test environments or when DynamoDB is not configured, use a fallback
      this.tableName = `test_${tableName}`;
    }
  }

  protected async getItem(key: Record<string, any>): Promise<any> {
    const params: GetCommandInput = {
      TableName: this.tableName,
      Key: key,
    };

    try {
      const result = await this.client.send(new GetCommand(params));
      return result.Item || null;
    } catch (error) {
      this.handleDynamoDBError(error, 'getItem');
      throw error;
    }
  }

  protected async putItem(item: Record<string, any>): Promise<void> {
    const params: PutCommandInput = {
      TableName: this.tableName,
      Item: item,
    };

    try {
      await this.client.send(new PutCommand(params));
    } catch (error) {
      this.handleDynamoDBError(error, 'putItem');
      throw error;
    }
  }

  protected async updateItem(
    key: Record<string, any>, 
    updateExpression: string, 
    expressionAttributeValues: Record<string, any>,
    expressionAttributeNames?: Record<string, string>
  ): Promise<any> {
    const params: UpdateCommandInput = {
      TableName: this.tableName,
      Key: key,
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    };

    if (expressionAttributeNames) {
      params.ExpressionAttributeNames = expressionAttributeNames;
    }

    try {
      const result = await this.client.send(new UpdateCommand(params));
      return result.Attributes;
    } catch (error) {
      this.handleDynamoDBError(error, 'updateItem');
      throw error;
    }
  }

  protected async deleteItem(key: Record<string, any>): Promise<boolean> {
    const params: DeleteCommandInput = {
      TableName: this.tableName,
      Key: key,
    };

    try {
      await this.client.send(new DeleteCommand(params));
      return true;
    } catch (error) {
      this.handleDynamoDBError(error, 'deleteItem');
      throw error;
    }
  }

  protected async query(
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, any>,
    indexName?: string,
    expressionAttributeNames?: Record<string, string>,
    limit?: number
  ): Promise<any[]> {
    const params: QueryCommandInput = {
      TableName: this.tableName,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
    };

    if (indexName) {
      params.IndexName = indexName;
    }

    if (expressionAttributeNames) {
      params.ExpressionAttributeNames = expressionAttributeNames;
    }

    if (limit) {
      params.Limit = limit;
    }

    try {
      const result = await this.client.send(new QueryCommand(params));
      return result.Items || [];
    } catch (error) {
      this.handleDynamoDBError(error, 'query');
      throw error;
    }
  }

  protected async scan(
    filterExpression?: string,
    expressionAttributeValues?: Record<string, any>,
    expressionAttributeNames?: Record<string, string>,
    limit?: number
  ): Promise<any[]> {
    const params: ScanCommandInput = {
      TableName: this.tableName,
    };

    if (filterExpression) {
      params.FilterExpression = filterExpression;
    }

    if (expressionAttributeValues) {
      params.ExpressionAttributeValues = expressionAttributeValues;
    }

    if (expressionAttributeNames) {
      params.ExpressionAttributeNames = expressionAttributeNames;
    }

    if (limit) {
      params.Limit = limit;
    }

    try {
      const result = await this.client.send(new ScanCommand(params));
      return result.Items || [];
    } catch (error) {
      this.handleDynamoDBError(error, 'scan');
      throw error;
    }
  }

  private handleDynamoDBError(error: any, operation: string): void {
    const errorName = error.name || error.constructor.name;
    
    // Log error details for debugging
    console.error(`DynamoDB ${operation} error on table ${this.tableName}:`, {
      errorName,
      message: error.message,
      statusCode: error.$metadata?.httpStatusCode,
      requestId: error.$metadata?.requestId,
      timestamp: new Date().toISOString()
    });

    // Handle specific DynamoDB errors
    if (error instanceof ProvisionedThroughputExceededException) {
      // AWS SDK handles retries automatically with exponential backoff
      console.warn(`Throughput exceeded for ${operation} on ${this.tableName} - SDK will retry`);
    } else if (error instanceof ConditionalCheckFailedException) {
      console.warn(`Conditional check failed for ${operation} on ${this.tableName}`);
    } else if (error instanceof ResourceNotFoundException) {
      console.error(`Table ${this.tableName} not found for ${operation}`);
    } else if (error.name === 'ValidationException') {
      console.error(`Validation error for ${operation} on ${this.tableName}: ${error.message}`);
    } else if (error instanceof ItemCollectionSizeLimitExceededException) {
      console.error(`Item collection size limit exceeded for ${operation} on ${this.tableName}`);
    } else {
      console.error(`Unexpected DynamoDB error for ${operation} on ${this.tableName}:`, error);
    }
  }
}

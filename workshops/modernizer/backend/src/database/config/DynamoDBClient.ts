import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DatabaseConfigManager } from './DatabaseConfig';
import { fromIni } from '@aws-sdk/credential-providers';

export class DynamoDBClientManager {
  private static client: DynamoDBDocumentClient;

  static getClient(): DynamoDBDocumentClient {
    console.log('🔧 DynamoDBClientManager.getClient() called');
    if (!DynamoDBClientManager.client) {
      console.log('🔧 Creating new DynamoDB client...');
      DynamoDBClientManager.client = DynamoDBClientManager.createClient();
    }
    return DynamoDBClientManager.client;
  }

  private static createClient(): DynamoDBDocumentClient {
    try {
      // Always try to get DynamoDB config from environment variables for dual-write
      const config = {
        region: process.env.AWS_REGION || 'us-east-1',
        endpoint: process.env.DYNAMODB_ENDPOINT,
        profile: process.env.AWS_PROFILE,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      };
      
      console.log('DynamoDB config:', { 
        region: config.region, 
        endpoint: config.endpoint,
        profile: config.profile,
        hasCredentials: !!(config.accessKeyId && config.secretAccessKey) 
      });
      
      const clientConfig: any = {
        region: config.region,
      };

      // Add endpoint for local development
      if (config.endpoint) {
        clientConfig.endpoint = config.endpoint;
      }

      // Use AWS profile if specified, otherwise fall back to environment credentials
      if (config.profile) {
        clientConfig.credentials = fromIni({ profile: config.profile });
      } else if (config.accessKeyId && config.secretAccessKey) {
        clientConfig.credentials = {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        };
      }

      const dynamoDBClient = new DynamoDBClient(clientConfig);
      
      // Use DynamoDBDocumentClient for easier data handling
      return DynamoDBDocumentClient.from(dynamoDBClient, {
        marshallOptions: {
          convertEmptyValues: false,
          removeUndefinedValues: true,
          convertClassInstanceToMap: false,
        },
        unmarshallOptions: {
          wrapNumbers: false,
        },
      });
    } catch (error) {
      // Return a mock client for test environments
      console.warn('DynamoDB configuration error:', error);
      console.warn('DynamoDB configuration not available, using mock client');
      return {} as DynamoDBDocumentClient;
    }
  }

  static getTableName(tableName: string): string {
    try {
      const config = DatabaseConfigManager.getDynamoDBConfig();
      const prefix = config.tablePrefix || '';
      return `${prefix}${tableName}`;
    } catch (error) {
      // Return a test table name when DynamoDB is not configured
      return `test_${tableName}`;
    }
  }
}

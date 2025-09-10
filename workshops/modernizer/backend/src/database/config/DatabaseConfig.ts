import { DatabaseType } from '../factory/DatabaseFactory';

export interface DatabaseConfig {
  type: DatabaseType;
  mysql?: MySQLConfig;
  dynamodb?: DynamoDBConfig;
}

export interface MySQLConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
  acquireTimeout: number;
  timeout: number;
}

export interface DynamoDBConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string; // For local development
  tablePrefix: string;
}

export class DatabaseConfigManager {
  private static config: DatabaseConfig;

  static initialize(): DatabaseConfig {
    const databaseType = (process.env.DATABASE_TYPE as DatabaseType) || 'mysql';
    
    if (databaseType !== 'mysql' && databaseType !== 'dynamodb') {
      throw new Error(`Invalid DATABASE_TYPE: ${databaseType}. Must be 'mysql' or 'dynamodb'`);
    }

    const config: DatabaseConfig = {
      type: databaseType
    };

    if (databaseType === 'mysql') {
      const dbHost = process.env.DB_HOST;
      const dbName = process.env.DB_NAME;
      
      // Validate required MySQL configuration before applying defaults
      if (!dbHost || dbHost.trim() === '' || !dbName || dbName.trim() === '') {
        throw new Error('MySQL configuration incomplete: DB_HOST and DB_NAME are required');
      }

      config.mysql = {
        host: dbHost,
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: dbName,
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
        acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
        timeout: parseInt(process.env.DB_TIMEOUT || '60000'),
      };
    } else if (databaseType === 'dynamodb') {
      const awsRegion = process.env.AWS_REGION;
      const tablePrefix = process.env.DYNAMODB_TABLE_PREFIX;
      
      // Validate required DynamoDB configuration before applying defaults
      if (!awsRegion || awsRegion.trim() === '') {
        throw new Error('DynamoDB configuration incomplete: AWS_REGION is required');
      }

      config.dynamodb = {
        region: awsRegion,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        endpoint: process.env.DYNAMODB_ENDPOINT, // For local development
        tablePrefix: tablePrefix || '', // Allow empty prefix
      };
    }

    DatabaseConfigManager.config = config;
    return config;
  }

  static getConfig(): DatabaseConfig {
    if (!DatabaseConfigManager.config) {
      return DatabaseConfigManager.initialize();
    }
    return DatabaseConfigManager.config;
  }

  static getDatabaseType(): DatabaseType {
    return DatabaseConfigManager.getConfig().type;
  }

  static getMySQLConfig(): MySQLConfig {
    const config = DatabaseConfigManager.getConfig();
    if (config.type !== 'mysql' || !config.mysql) {
      throw new Error('MySQL configuration not available');
    }
    return config.mysql;
  }

  static getDynamoDBConfig(): DynamoDBConfig {
    // For dual-write, we need DynamoDB config even when DATABASE_TYPE=mysql
    const awsRegion = process.env.AWS_REGION;
    
    if (!awsRegion || awsRegion.trim() === '') {
      throw new Error('DynamoDB configuration incomplete: AWS_REGION is required');
    }

    return {
      region: awsRegion,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      endpoint: process.env.DYNAMODB_ENDPOINT,
      tablePrefix: process.env.DYNAMODB_TABLE_PREFIX || '',
    };
  }
}

import { IUserRepository } from '../interfaces/IUserRepository';
import { IProductRepository } from '../interfaces/IProductRepository';
import { IOrderRepository } from '../interfaces/IOrderRepository';
import { ICategoryRepository } from '../interfaces/ICategoryRepository';
import { IShoppingCartRepository } from '../interfaces/IShoppingCartRepository';

import { MySQLUserRepository } from '../implementations/mysql/MySQLUserRepository';
import { MySQLProductRepository } from '../implementations/mysql/MySQLProductRepository';
import { MySQLOrderRepository } from '../implementations/mysql/MySQLOrderRepository';
import { MySQLCategoryRepository } from '../implementations/mysql/MySQLCategoryRepository';
import { MySQLShoppingCartRepository } from '../implementations/mysql/MySQLShoppingCartRepository';

import { DynamoDBUserRepository } from '../implementations/dynamodb/DynamoDBUserRepository';
import { DynamoDBProductRepository } from '../implementations/dynamodb/DynamoDBProductRepository';
import { DynamoDBOrderRepository } from '../implementations/dynamodb/DynamoDBOrderRepository';
import { DynamoDBCategoryRepository } from '../implementations/dynamodb/DynamoDBCategoryRepository';
import { DynamoDBShoppingCartRepository } from '../implementations/dynamodb/DynamoDBShoppingCartRepository';

import { UserDualWriteWrapper } from '../wrappers/UserDualWriteWrapper';
import { ProductDualWriteWrapper } from '../wrappers/ProductDualWriteWrapper';
import { OrderDualWriteWrapper } from '../wrappers/OrderDualWriteWrapper';
import { CategoryDualWriteWrapper } from '../wrappers/CategoryDualWriteWrapper';
import { CartDualWriteWrapper } from '../wrappers/CartDualWriteWrapper';

import { FeatureFlagService } from '../../services/FeatureFlagService';

export type DatabaseType = 'mysql' | 'dynamodb';

export class DatabaseFactory {
  private static databaseType: DatabaseType = 'mysql'; // Default to MySQL

  static initialize(databaseType: DatabaseType): void {
    if (!databaseType || (databaseType !== 'mysql' && databaseType !== 'dynamodb')) {
      throw new Error(`Invalid database type: ${databaseType}. Must be 'mysql' or 'dynamodb'`);
    }
    DatabaseFactory.databaseType = databaseType;
  }

  static getDatabaseType(): DatabaseType {
    return DatabaseFactory.databaseType;
  }

  // Helper method to determine which database to use for reads based on feature flags
  private static getReadDatabaseType(): DatabaseType {
    // If feature flags are not being used (migration_phase = 1), use the initialized database type
    const migrationPhase = FeatureFlagService.getFlag('migration_phase');
    if (migrationPhase === 1) {
      return DatabaseFactory.databaseType;
    }
    
    // Otherwise, use feature flag to determine read database
    const readFromDynamoDB = FeatureFlagService.getFlag('read_from_dynamodb');
    return readFromDynamoDB ? 'dynamodb' : 'mysql';
  }

  // Helper method to create both MySQL and DynamoDB repositories for dual operations
  static createBothUserRepositories(): { mysql: IUserRepository; dynamodb: IUserRepository } {
    return {
      mysql: new MySQLUserRepository(),
      dynamodb: new DynamoDBUserRepository('Users')
    };
  }

  static createBothProductRepositories(): { mysql: IProductRepository; dynamodb: IProductRepository } {
    return {
      mysql: new MySQLProductRepository(),
      dynamodb: new DynamoDBProductRepository('Products')
    };
  }

  static createBothOrderRepositories(): { mysql: IOrderRepository; dynamodb: IOrderRepository } {
    const dynamodbUserRepo = new DynamoDBUserRepository('Users');
    return {
      mysql: new MySQLOrderRepository(),
      dynamodb: new DynamoDBOrderRepository('Users', dynamodbUserRepo)
    };
  }

  static createBothCategoryRepositories(): { mysql: ICategoryRepository; dynamodb: ICategoryRepository } {
    return {
      mysql: new MySQLCategoryRepository(),
      dynamodb: new DynamoDBCategoryRepository('Categories')
    };
  }

  static createBothShoppingCartRepositories(): { mysql: IShoppingCartRepository; dynamodb: IShoppingCartRepository } {
    return {
      mysql: new MySQLShoppingCartRepository(),
      dynamodb: new DynamoDBShoppingCartRepository('Users')
    };
  }

  static createUserRepository(): IUserRepository {
    console.log('👤 DatabaseFactory.createUserRepository called');
    const migrationPhase = FeatureFlagService.getFlag('migration_phase');
    
    if (migrationPhase === 5) {
      // Phase 5: DynamoDB-only
      return new DynamoDBUserRepository('Users');
    }
    
    // Phases 1-4: Dual-write wrapper
    const mysqlRepo = new MySQLUserRepository();
    const dynamodbRepo = new DynamoDBUserRepository('Users');
    
    console.log('👤 Creating UserDualWriteWrapper');
    return new UserDualWriteWrapper(mysqlRepo, dynamodbRepo);
  }

  static createProductRepository(): IProductRepository {
    const migrationPhase = FeatureFlagService.getFlag('migration_phase');
    console.log(`🏭 DatabaseFactory.createProductRepository - Migration Phase: ${migrationPhase}`);
    
    if (migrationPhase === 5) {
      // Phase 5: DynamoDB-only
      console.log('🏭 Creating DynamoDB-only ProductRepository');
      return new DynamoDBProductRepository('Products');
    }
    
    // Phases 1-4: Dual-write wrapper
    console.log('🏭 Creating ProductDualWriteWrapper');
    const mysqlRepo = new MySQLProductRepository();
    const dynamodbRepo = new DynamoDBProductRepository('Products');
    
    return new ProductDualWriteWrapper(mysqlRepo, dynamodbRepo);
  }

  static createOrderRepository(): IOrderRepository {
    const migrationPhase = FeatureFlagService.getFlag('migration_phase');
    
    if (migrationPhase === 5) {
      // Phase 5: DynamoDB-only
      const dynamodbUserRepo = new DynamoDBUserRepository('Users');
      return new DynamoDBOrderRepository('Users', dynamodbUserRepo);
    }
    
    // Phases 1-4: Dual-write wrapper
    const mysqlOrderRepo = new MySQLOrderRepository();
    const mysqlUserRepo = new MySQLUserRepository();
    const dynamodbUserRepo = new DynamoDBUserRepository('Users');
    
    // Orders are stored in the Users table according to migration contract
    const dynamodbOrderRepo = new DynamoDBOrderRepository('Users', dynamodbUserRepo);
    
    return new OrderDualWriteWrapper(mysqlOrderRepo, dynamodbOrderRepo, mysqlUserRepo);
  }

  static createCategoryRepository(): ICategoryRepository {
    const migrationPhase = FeatureFlagService.getFlag('migration_phase');
    
    if (migrationPhase === 5) {
      // Phase 5: DynamoDB-only
      return new DynamoDBCategoryRepository('Categories');
    }
    
    // Phases 1-4: Dual-write wrapper
    const mysqlRepo = new MySQLCategoryRepository();
    const dynamodbRepo = new DynamoDBCategoryRepository('Categories');
    
    return new CategoryDualWriteWrapper(mysqlRepo, dynamodbRepo);
  }

  static createShoppingCartRepository(): IShoppingCartRepository {
    console.log('🏭 DatabaseFactory.createShoppingCartRepository called');
    const migrationPhase = FeatureFlagService.getFlag('migration_phase');
    
    if (migrationPhase === 5) {
      // Phase 5: DynamoDB-only
      console.log('🏭 Creating DynamoDB-only ShoppingCartRepository');
      return new DynamoDBShoppingCartRepository('Users');
    }
    
    // Phases 1-4: Dual-write wrapper
    const mysqlCartRepo = new MySQLShoppingCartRepository();
    const dynamodbCartRepo = new DynamoDBShoppingCartRepository('Users');
    const mysqlUserRepo = new MySQLUserRepository();
    const mysqlProductRepo = new MySQLProductRepository();
    
    console.log('🏭 Creating CartDualWriteWrapper');
    return new CartDualWriteWrapper(mysqlCartRepo, dynamodbCartRepo, mysqlUserRepo, mysqlProductRepo);
  }
}

import { DualReadWrapper, DualReadOperation, DualReadResult } from './DualReadWrapper';
import { DualReadErrorHandler, ValidationError } from './DualReadErrorHandler';
import { IUserRepository } from '../interfaces/IUserRepository';
import { User, CreateUserRequest, UpdateUserRequest } from '../../models/User';
import { FeatureFlagService } from '../../services/FeatureFlagService';

export class UserDualReadWrapper extends DualReadWrapper<User | null> implements IUserRepository {
  protected entityType = 'User';
  private mysqlRepo: IUserRepository;
  private dynamodbRepo: IUserRepository;

  constructor(
    mysqlRepo: IUserRepository,
    dynamodbRepo: IUserRepository,
    featureFlagService: FeatureFlagService
  ) {
    super(featureFlagService);
    this.mysqlRepo = mysqlRepo;
    this.dynamodbRepo = dynamodbRepo;
  }

  // Read operations with dual-read support
  async findById(id: number): Promise<User | null> {
    const operation: DualReadOperation<User | null> = {
      mysqlOperation: () => this.mysqlRepo.findById(id),
      dynamodbOperation: () => this.dynamodbRepo.findById(id)
    };

    const result = await this.executeDualRead(operation, 'findById');
    
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to find user by ID');
    }

    // Enhanced error handling for validation failures
    if (result.validationPassed === false && result.validationErrors) {
      const actionableMessage = DualReadErrorHandler.createActionableErrorMessage(
        this.entityType,
        'findById',
        id,
        this.createValidationErrorObjects(result.validationErrors, result.mysqlResult, result.dynamodbResult)
      );
      throw new Error(actionableMessage);
    }

    return result.data || null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const operation: DualReadOperation<User | null> = {
      mysqlOperation: () => this.mysqlRepo.findByUsername(username),
      dynamodbOperation: () => this.dynamodbRepo.findByUsername(username)
    };

    const result = await this.executeDualRead(operation, 'findByUsername');
    
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to find user by username');
    }

    if (result.validationPassed === false && result.validationErrors) {
      const actionableMessage = DualReadErrorHandler.createActionableErrorMessage(
        this.entityType,
        'findByUsername',
        username,
        this.createValidationErrorObjects(result.validationErrors, result.mysqlResult, result.dynamodbResult)
      );
      throw new Error(actionableMessage);
    }

    return result.data || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const operation: DualReadOperation<User | null> = {
      mysqlOperation: () => this.mysqlRepo.findByEmail(email),
      dynamodbOperation: () => this.dynamodbRepo.findByEmail(email)
    };

    const result = await this.executeDualRead(operation, 'findByEmail');
    
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to find user by email');
    }

    if (result.validationPassed === false && result.validationErrors) {
      const actionableMessage = DualReadErrorHandler.createActionableErrorMessage(
        this.entityType,
        'findByEmail',
        email,
        this.createValidationErrorObjects(result.validationErrors, result.mysqlResult, result.dynamodbResult)
      );
      throw new Error(actionableMessage);
    }

    return result.data || null;
  }

  // Write operations - delegate to existing dual-write wrapper or MySQL
  async create(userData: CreateUserRequest & { password_hash: string }): Promise<User> {
    return this.mysqlRepo.create(userData);
  }

  async update(id: number, userData: UpdateUserRequest): Promise<User | null> {
    return this.mysqlRepo.update(id, userData);
  }

  async delete(id: number): Promise<boolean> {
    return this.mysqlRepo.delete(id);
  }

  async upgradeToSeller(id: number): Promise<User | null> {
    return this.mysqlRepo.upgradeToSeller(id);
  }

  async existsByUsername(username: string): Promise<boolean> {
    return this.mysqlRepo.existsByUsername(username);
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.mysqlRepo.existsByEmail(email);
  }

  async promoteToSuperAdmin(id: number): Promise<User | null> {
    return this.mysqlRepo.promoteToSuperAdmin(id);
  }

  async demoteFromSuperAdmin(id: number): Promise<User | null> {
    return this.mysqlRepo.demoteFromSuperAdmin(id);
  }

  async findAllSuperAdmins(): Promise<User[]> {
    return this.mysqlRepo.findAllSuperAdmins();
  }

  // Helper method to create ValidationError objects from string errors
  private createValidationErrorObjects(
    errorMessages: string[], 
    mysqlResult: User | null | undefined, 
    dynamodbResult: User | null | undefined
  ): ValidationError[] {
    return errorMessages.map(message => {
      // Parse attribute name from error message
      const attributeMatch = message.match(/^(\w+) mismatch:/);
      const attribute = attributeMatch ? attributeMatch[1] : 'unknown';
      
      // Extract values from the objects
      const mysqlValue = mysqlResult && (mysqlResult as any)[attribute];
      const dynamodbValue = dynamodbResult && (dynamodbResult as any)[attribute];
      
      return DualReadErrorHandler.createValidationError(attribute, mysqlValue, dynamodbValue, message);
    });
  }

  // Enhanced attribute comparison with detailed error objects
  protected compareAttributes(mysqlResult: User | null, dynamodbResult: User | null): string[] {
    const errors: string[] = [];

    // Both null is valid
    if (mysqlResult === null && dynamodbResult === null) {
      return errors;
    }

    // One null, one not null
    if (mysqlResult === null || dynamodbResult === null) {
      return errors; // This is handled by the base class
    }

    // Compare each attribute with enhanced error messages
    if (mysqlResult.id !== dynamodbResult.id) {
      errors.push(`id mismatch: MySQL=${mysqlResult.id}, DynamoDB=${dynamodbResult.id}`);
    }

    if (mysqlResult.username !== dynamodbResult.username) {
      errors.push(`username mismatch: MySQL="${mysqlResult.username}", DynamoDB="${dynamodbResult.username}"`);
    }

    if (mysqlResult.email !== dynamodbResult.email) {
      errors.push(`email mismatch: MySQL="${mysqlResult.email}", DynamoDB="${dynamodbResult.email}"`);
    }

    if (mysqlResult.password_hash !== dynamodbResult.password_hash) {
      errors.push(`password_hash mismatch: values differ (security: not logged)`);
    }

    if (mysqlResult.first_name !== dynamodbResult.first_name) {
      errors.push(`first_name mismatch: MySQL="${mysqlResult.first_name}", DynamoDB="${dynamodbResult.first_name}"`);
    }

    if (mysqlResult.last_name !== dynamodbResult.last_name) {
      errors.push(`last_name mismatch: MySQL="${mysqlResult.last_name}", DynamoDB="${dynamodbResult.last_name}"`);
    }

    if (mysqlResult.is_seller !== dynamodbResult.is_seller) {
      errors.push(`is_seller mismatch: MySQL=${mysqlResult.is_seller}, DynamoDB=${dynamodbResult.is_seller}`);
    }

    if (mysqlResult.super_admin !== dynamodbResult.super_admin) {
      errors.push(`super_admin mismatch: MySQL=${mysqlResult.super_admin}, DynamoDB=${dynamodbResult.super_admin}`);
    }

    // Compare dates by converting to ISO strings for consistent comparison
    const mysqlCreatedAt = mysqlResult.created_at?.toISOString();
    const dynamodbCreatedAt = dynamodbResult.created_at?.toISOString();
    if (mysqlCreatedAt !== dynamodbCreatedAt) {
      errors.push(`created_at mismatch: MySQL="${mysqlCreatedAt}", DynamoDB="${dynamodbCreatedAt}"`);
    }

    const mysqlUpdatedAt = mysqlResult.updated_at?.toISOString();
    const dynamodbUpdatedAt = dynamodbResult.updated_at?.toISOString();
    if (mysqlUpdatedAt !== dynamodbUpdatedAt) {
      errors.push(`updated_at mismatch: MySQL="${mysqlUpdatedAt}", DynamoDB="${dynamodbUpdatedAt}"`);
    }

    return errors;
  }
}

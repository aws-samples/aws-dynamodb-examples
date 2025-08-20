import { DualWriteWrapper, DualWriteOperation, DualWriteResult } from './DualWriteWrapper';
import { IUserRepository } from '../interfaces/IUserRepository';
import { User, CreateUserRequest, UpdateUserRequest } from '../../models/User';
import { FeatureFlagService } from '../../services/FeatureFlagService';

export class UserDualWriteWrapper extends DualWriteWrapper<User> implements IUserRepository {
  protected entityType = 'User';
  private mysqlRepo: IUserRepository;
  private dynamodbRepo: IUserRepository;

  constructor(
    mysqlRepo: IUserRepository,
    dynamodbRepo: IUserRepository
  ) {
    super();
    this.mysqlRepo = mysqlRepo;
    this.dynamodbRepo = dynamodbRepo;
  }

  async create(userData: CreateUserRequest & { password_hash: string }): Promise<User> {
    const result = await this.executeDualWriteOperation(userData);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to create user');
    }
    return result.data;
  }

  async update(id: number, userData: UpdateUserRequest): Promise<User | null> {
    const result = await this.executeDualWriteUpdate(id, userData);
    return result.success ? result.data || null : null;
  }

  async delete(id: number): Promise<boolean> {
    const dualWriteEnabled = FeatureFlagService.getFlag('dual_write_enabled');
    const readFromDynamoDB = FeatureFlagService.getFlag('read_from_dynamodb');

    // Phase 5: DynamoDB only
    if (!dualWriteEnabled && readFromDynamoDB) {
      return await this.dynamodbRepo.delete(id);
    }

    // Phase 1: MySQL only
    if (!dualWriteEnabled) {
      return await this.mysqlRepo.delete(id);
    }

    // Dual-write phases: Delete from both databases
    const user = await this.mysqlRepo.findById(id);
    if (!user) {
      return false;
    }

    try {
      const mysqlResult = await this.mysqlRepo.delete(id);
      if (mysqlResult) {
        await this.dynamodbRepo.delete(id);
      }
      return mysqlResult;
    } catch (error) {
      console.error(`Failed to delete user ${id}:`, error);
      return false;
    }
  }

  async upgradeToSeller(id: number): Promise<User | null> {
    const result = await this.executeDualWriteUpgrade(id);
    return result.success ? result.data || null : null;
  }

  private async executeDualWriteOperation(userData: CreateUserRequest & { password_hash: string }): Promise<DualWriteResult<User>> {
    const operation: DualWriteOperation<User> = {
      mysqlOperation: () => this.mysqlRepo.create(userData),
      dynamodbOperation: (mysqlResult) => {
        // Use the MySQL-generated ID for DynamoDB
        if ('createWithId' in this.dynamodbRepo && typeof this.dynamodbRepo.createWithId === 'function') {
          return (this.dynamodbRepo as any).createWithId(userData, mysqlResult.id);
        } else {
          // Fallback to regular create if createWithId is not available
          const dynamoData = this.transformForDynamoDB(mysqlResult);
          return this.dynamodbRepo.create(dynamoData);
        }
      },
      dynamodbOnlyOperation: () => this.dynamodbRepo.create(userData),
      rollbackOperation: async (mysqlResult) => {
        await this.mysqlRepo.delete(mysqlResult.id);
      }
    };

    return this.executeDualWrite(operation, 'CREATE');
  }

  private async executeDualWriteUpdate(id: number, userData: UpdateUserRequest): Promise<DualWriteResult<User>> {
    const operation: DualWriteOperation<User> = {
      mysqlOperation: async () => {
        const result = await this.mysqlRepo.update(id, userData);
        if (!result) throw new Error('User not found');
        return result;
      },
      dynamodbOperation: async (mysqlResult) => {
        const dynamoData = this.transformForDynamoDB(mysqlResult);
        const result = await this.dynamodbRepo.update(mysqlResult.id, dynamoData);
        if (!result) throw new Error('Failed to update in DynamoDB');
        return result;
      },
      dynamodbOnlyOperation: async () => {
        const result = await this.dynamodbRepo.update(id, userData);
        if (!result) throw new Error('User not found');
        return result;
      }
    };

    return this.executeDualWrite(operation, 'UPDATE');
  }

  private async executeDualWriteUpgrade(id: number): Promise<DualWriteResult<User>> {
    const operation: DualWriteOperation<User> = {
      mysqlOperation: async () => {
        const result = await this.mysqlRepo.upgradeToSeller(id);
        if (!result) throw new Error('User not found');
        return result;
      },
      dynamodbOperation: async (mysqlResult) => {
        const dynamoData = this.transformForDynamoDB(mysqlResult);
        const result = await this.dynamodbRepo.update(mysqlResult.id, dynamoData);
        if (!result) throw new Error('Failed to upgrade in DynamoDB');
        return result;
      },
      dynamodbOnlyOperation: async () => {
        const result = await this.dynamodbRepo.upgradeToSeller(id);
        if (!result) throw new Error('User not found');
        return result;
      }
    };

    return this.executeDualWrite(operation, 'UPGRADE_TO_SELLER');
  }

  protected extractEntityId(data: User | boolean): string | number {
    return typeof data === 'boolean' ? 'N/A' : data.id;
  }

  transformForDynamoDB(mysqlData: User): any {
    return {
      ...mysqlData,
      id: this.transformId(mysqlData.id) // Convert to string for DynamoDB
    };
  }

  createRollbackOperation(mysqlData: User): (() => Promise<void>) | undefined {
    return async () => {
      await this.mysqlRepo.delete(mysqlData.id);
    };
  }

  // Read operations - delegate to primary repository (MySQL)
  async findById(id: number): Promise<User | null> {
    return this.mysqlRepo.findById(id);
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.mysqlRepo.findByUsername(username);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.mysqlRepo.findByEmail(email);
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
}

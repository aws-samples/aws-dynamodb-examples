import { IUserRepository } from '../../interfaces/IUserRepository';
import { User, CreateUserRequest, UpdateUserRequest } from '../../../models/User';
import { BaseDynamoDBRepository } from './BaseDynamoDBRepository';

export class DynamoDBUserRepository extends BaseDynamoDBRepository implements IUserRepository {
  constructor(tableName: string) {
    super(tableName);
  }

  private transformFromDynamoDB(item: any): User {
    return {
      id: parseInt(item.GSI1PK),
      username: item.username,
      email: item.email,
      password_hash: item.password_hash,
      first_name: item.profile_data?.first_name,
      last_name: item.profile_data?.last_name,
      is_seller: item.is_seller,
      super_admin: item.super_admin || false,
      created_at: new Date(item.created_at),
      updated_at: new Date(item.updated_at),
    };
  }

  private transformToDynamoDB(userData: CreateUserRequest & { password_hash: string }, id: number): any {
    return {
      PK: userData.email,
      SK: '#META',
      GSI1PK: id.toString(),
      GSI1SK: id.toString(),
      GSI2PK: userData.username,
      GSI2SK: userData.username,
      username: userData.username,
      email: userData.email,
      password_hash: userData.password_hash,
      profile_data: {
        first_name: userData.first_name || null,
        last_name: userData.last_name || null,
      },
      is_seller: false,
      super_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
  
  async findById(id: number): Promise<User | null> {
    const items = await this.query(
      'GSI1PK = :id',
      { ':id': id.toString() },
      'GSI1'
    );
    
    return items.length > 0 ? this.transformFromDynamoDB(items[0]) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const items = await this.query(
      'GSI2PK = :username',
      { ':username': username },
      'GSI2'
    );
    
    return items.length > 0 ? this.transformFromDynamoDB(items[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const item = await this.getItem({
      PK: email,
      SK: '#META'
    });
    
    return item ? this.transformFromDynamoDB(item) : null;
  }

  async create(userData: CreateUserRequest & { password_hash: string }): Promise<User> {
    const id = Date.now(); // Simple ID generation for now
    const dynamoItem = this.transformToDynamoDB(userData, id);
    
    await this.putItem(dynamoItem);
    
    return this.transformFromDynamoDB(dynamoItem);
  }

  async createWithId(userData: CreateUserRequest & { password_hash: string }, id: number): Promise<User> {
    const dynamoItem = this.transformToDynamoDB(userData, id);
    
    await this.putItem(dynamoItem);
    
    return this.transformFromDynamoDB(dynamoItem);
  }

  async update(id: number, userData: UpdateUserRequest): Promise<User | null> {
    const existingUser = await this.findById(id);
    if (!existingUser) return null;

    let updateExpression = 'SET updated_at = :updated_at';
    const expressionAttributeValues: any = {
      ':updated_at': new Date().toISOString()
    };

    if (userData.first_name !== undefined) {
      updateExpression += ', profile_data.first_name = :first_name';
      expressionAttributeValues[':first_name'] = userData.first_name;
    }
    if (userData.last_name !== undefined) {
      updateExpression += ', profile_data.last_name = :last_name';
      expressionAttributeValues[':last_name'] = userData.last_name;
    }
    if (userData.email !== undefined) {
      updateExpression += ', email = :email, PK = :email';
      expressionAttributeValues[':email'] = userData.email;
    }

    const updatedItem = await this.updateItem(
      { PK: existingUser.email, SK: '#META' },
      updateExpression,
      expressionAttributeValues
    );

    return updatedItem ? this.transformFromDynamoDB(updatedItem) : null;
  }

  async delete(id: number): Promise<boolean> {
    const user = await this.findById(id);
    if (!user) return false;

    await this.deleteItem({
      PK: user.email,
      SK: '#META'
    });

    return true;
  }

  async upgradeToSeller(id: number): Promise<User | null> {
    const user = await this.findById(id);
    if (!user) return null;

    const updatedItem = await this.updateItem(
      { PK: user.email, SK: '#META' },
      'SET is_seller = :is_seller, updated_at = :updated_at',
      {
        ':is_seller': true,
        ':updated_at': new Date().toISOString()
      }
    );

    return updatedItem ? this.transformFromDynamoDB(updatedItem) : null;
  }

  async existsByUsername(username: string): Promise<boolean> {
    const items = await this.query(
      'GSI2PK = :username',
      { ':username': username },
      'GSI2',
      undefined,
      1
    );
    
    return items.length > 0;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const item = await this.getItem({
      PK: email,
      SK: '#META'
    });
    
    return item !== null;
  }

  async promoteToSuperAdmin(id: number): Promise<User | null> {
    // First get the user to get their email (PK)
    const user = await this.findById(id);
    if (!user) {
      return null;
    }

    await this.updateItem(
      {
        PK: user.email,
        SK: '#META'
      },
      'SET super_admin = :super_admin, updated_at = :updated_at',
      {
        ':super_admin': true,
        ':updated_at': new Date().toISOString()
      }
    );

    return this.findById(id);
  }

  async demoteFromSuperAdmin(id: number): Promise<User | null> {
    // First get the user to get their email (PK)
    const user = await this.findById(id);
    if (!user) {
      return null;
    }

    await this.updateItem(
      {
        PK: user.email,
        SK: '#META'
      },
      'SET super_admin = :super_admin, updated_at = :updated_at',
      {
        ':super_admin': false,
        ':updated_at': new Date().toISOString()
      }
    );

    return this.findById(id);
  }

  async findAllSuperAdmins(): Promise<User[]> {
    // This would require a scan operation in DynamoDB which is expensive
    // For now, return empty array - in production this would need a GSI
    // or a different approach
    return [];
  }
}

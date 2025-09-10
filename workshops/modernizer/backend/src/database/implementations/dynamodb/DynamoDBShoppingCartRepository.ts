import { BaseDynamoDBRepository } from './BaseDynamoDBRepository';
import { IShoppingCartRepository } from '../../interfaces/IShoppingCartRepository';
import { ShoppingCartItem, ShoppingCartItemWithProduct } from '../../../models/ShoppingCart';
import { MySQLUserRepository } from '../mysql/MySQLUserRepository';
import { DynamoDBUserRepository } from './DynamoDBUserRepository';
import { FeatureFlagService } from '../../../services/FeatureFlagService';

export class DynamoDBShoppingCartRepository extends BaseDynamoDBRepository implements IShoppingCartRepository {
  constructor(tableName: string) {
    super(tableName);
  }

  private async getUserEmail(userId: number): Promise<string> {
    const FeatureFlagService = require('../../../services/FeatureFlagService').FeatureFlagService;
    const migrationPhase = FeatureFlagService.getFlag('migration_phase');
    
    let user;
    if (migrationPhase === 5) {
      // Phase 5: DynamoDB-only, user should exist in DynamoDB
      const DynamoDBUserRepository = require('./DynamoDBUserRepository').DynamoDBUserRepository;
      const dynamoUserRepo = new DynamoDBUserRepository('Users');
      user = await dynamoUserRepo.findById(userId);
    } else {
      // Phases 2-4: Use MySQL during transition
      const mysqlUserRepo = new MySQLUserRepository();
      user = await mysqlUserRepo.findById(userId);
    }
    
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    return user.email;
  }

  async addItem(userId: number, productId: number, quantity: number): Promise<ShoppingCartItem> {
    console.log(`DynamoDB addItem called: userId=${userId}, productId=${productId}, quantity=${quantity}`);
    
    const userEmail = await this.getUserEmail(userId);

    console.log(`Found user email: ${userEmail}`);

    const now = new Date();
    const id = Date.now();
    const item: ShoppingCartItem = {
      id,
      userId,
      productId,
      quantity,
      createdAt: now,
      updatedAt: now
    };

    console.log(`Writing to DynamoDB with PK=${userEmail}, SK=CART#${productId}`);

    // Use UpdateItem with ADD to handle quantity updates
    await this.updateItem(
      { PK: userEmail, SK: `CART#${productId}` },
      'SET quantity = if_not_exists(quantity, :zero) + :quantity, created_at = if_not_exists(created_at, :createdAt), updated_at = :updatedAt, product_id = :productId',
      {
        ':zero': 0,
        ':quantity': quantity,
        ':createdAt': now.toISOString(),
        ':updatedAt': now.toISOString(),
        ':productId': productId
      }
    );

    return item;
  }

  async getCartItems(userId: number): Promise<ShoppingCartItemWithProduct[]> {
    console.log(`🛒 DynamoDB getCartItems called for userId: ${userId}`);
    const migrationPhase = FeatureFlagService.getFlag('migration_phase');
    
    let email: string;
    
    if (migrationPhase === 5) {
      // Phase 5: Get user from DynamoDB
      const dynamoUserRepo = new DynamoDBUserRepository('Users');
      const user = await dynamoUserRepo.findById(userId);
      if (!user) {
        console.log(`🛒 User ${userId} not found in DynamoDB`);
        return [];
      }
      email = user.email;
      console.log(`🛒 Found user email: ${email}`);
    } else {
      // Phases 1-4: Get user from MySQL
      const mysqlUserRepo = new MySQLUserRepository();
      const user = await mysqlUserRepo.findById(userId);
      if (!user) {
        return [];
      }
      email = user.email;
    }

    const items = await this.query(
      'PK = :pk AND begins_with(SK, :sk)',
      { 
        ':pk': email,
        ':sk': 'CART#'
      }
    );

    console.log(`🛒 Found ${items.length} cart items in DynamoDB`);

    // Get product details for each cart item
    const { DatabaseFactory } = require('../../factory/DatabaseFactory');
    const productRepo = DatabaseFactory.createProductRepository();
    
    const cartItems = [];
    for (const item of items) {
      const productId = parseInt(item.SK.replace('CART#', ''));
      console.log(`🛒 Looking up product ${productId} for cart item`);
      const product = await productRepo.getProductById(productId);
      
      if (product) {
        console.log(`🛒 Found product: ${product.name}`);
        cartItems.push({
          id: Date.now() + Math.random(), // Generate a unique ID
          userId: userId,
          productId: productId,
          quantity: item.quantity,
          createdAt: new Date(item.created_at),
          updatedAt: new Date(item.updated_at),
          product: product
        });
      } else {
        console.log(`🛒 Product ${productId} not found`);
      }
    }
    
    console.log(`🛒 Returning ${cartItems.length} cart items with product details`);
    return cartItems;
  }

  async updateItemQuantity(userId: number, productId: number, quantity: number): Promise<boolean> {
    try {
      const email = await this.getUserEmail(userId);
      await this.updateItem(
        { PK: email, SK: `CART#${productId}` },
        'SET quantity = :quantity',
        { ':quantity': quantity }
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  async removeItem(userId: number, productId: number): Promise<boolean> {
    try {
      const email = await this.getUserEmail(userId);

      await this.deleteItem({
        PK: email,
        SK: `CART#${productId}`
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async clearCart(userId: number): Promise<boolean> {
    try {
      const email = await this.getUserEmail(userId);
      const items = await this.query(
        'PK = :pk AND begins_with(SK, :sk)',
        { 
          ':pk': email,
          ':sk': 'CART#'
        }
      );

      for (const item of items) {
        await this.deleteItem({
          PK: item.PK,
          SK: item.SK
        });
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  async getCartItemCount(userId: number): Promise<number> {
    const email = await this.getUserEmail(userId);

    const items = await this.query(
      'PK = :pk AND begins_with(SK, :sk)',
      { 
        ':pk': email,
        ':sk': 'CART#'
      }
    );

    return items.reduce((total, item) => total + (item.quantity || 0), 0);
  }

  async getCartItemByUserAndProduct(userId: number, productId: number): Promise<ShoppingCartItem | null> {
    const email = await this.getUserEmail(userId);

    const item = await this.getItem({
      PK: email,
      SK: `CART#${productId}`
    });

    if (!item) return null;

    return {
      id: item.id,
      userId: item.user_id,
      productId: item.product_id,
      quantity: item.quantity,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    };
  }

  async validateCartInventory(userId: number): Promise<{ valid: boolean; issues: string[] }> {
    const email = await this.getUserEmail(userId);

    // Simplified validation - would need product inventory lookup in real implementation
    const items = await this.query(
      'PK = :pk AND begins_with(SK, :sk)',
      { 
        ':pk': email,
        ':sk': 'CART#'
      }
    );

    return {
      valid: items.length > 0,
      issues: items.length === 0 ? ['Cart is empty'] : []
    };
  }
}

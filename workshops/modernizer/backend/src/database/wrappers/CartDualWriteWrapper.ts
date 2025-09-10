import { DualWriteWrapper, DualWriteOperation, DualWriteResult } from './DualWriteWrapper';
import { IShoppingCartRepository } from '../interfaces/IShoppingCartRepository';
import { IUserRepository } from '../interfaces/IUserRepository';
import { IProductRepository } from '../interfaces/IProductRepository';
import { ShoppingCartItem, ShoppingCartItemWithProduct } from '../../models/ShoppingCart';
import { FeatureFlagService } from '../../services/FeatureFlagService';

export class CartDualWriteWrapper extends DualWriteWrapper<ShoppingCartItem> implements IShoppingCartRepository {
  protected entityType = 'Cart';
  private mysqlCartRepo: IShoppingCartRepository;
  private dynamodbCartRepo: IShoppingCartRepository;
  private mysqlUserRepo: IUserRepository;
  private mysqlProductRepo: IProductRepository;

  constructor(
    mysqlCartRepo: IShoppingCartRepository,
    dynamodbCartRepo: IShoppingCartRepository,
    mysqlUserRepo: IUserRepository,
    mysqlProductRepo: IProductRepository
  ) {
    super();
    this.mysqlCartRepo = mysqlCartRepo;
    this.dynamodbCartRepo = dynamodbCartRepo;
    this.mysqlUserRepo = mysqlUserRepo;
    this.mysqlProductRepo = mysqlProductRepo;
  }

  async addItem(userId: number, productId: number, quantity: number): Promise<ShoppingCartItem> {
    console.log(`🛒 CartDualWriteWrapper.addItem called: userId=${userId}, productId=${productId}, quantity=${quantity}`);
    const result = await this.executeDualWriteAdd(userId, productId, quantity);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to add item to cart');
    }
    return result.data;
  }

  async updateItemQuantity(userId: number, productId: number, quantity: number): Promise<boolean> {
    try {
      const mysqlResult = await this.mysqlCartRepo.updateItemQuantity(userId, productId, quantity);
      if (mysqlResult && FeatureFlagService.getFlag('dual_write_enabled')) {
        await this.dynamodbCartRepo.updateItemQuantity(userId, productId, quantity);
      }
      return mysqlResult;
    } catch (error) {
      console.error(`Failed to update cart item quantity for user ${userId}, product ${productId}:`, error);
      return false;
    }
  }

  async removeItem(userId: number, productId: number): Promise<boolean> {
    try {
      const mysqlResult = await this.mysqlCartRepo.removeItem(userId, productId);
      if (mysqlResult && FeatureFlagService.getFlag('dual_write_enabled')) {
        await this.dynamodbCartRepo.removeItem(userId, productId);
      }
      return mysqlResult;
    } catch (error) {
      console.error(`Failed to remove cart item for user ${userId}, product ${productId}:`, error);
      return false;
    }
  }

  async clearCart(userId: number): Promise<boolean> {
    try {
      const mysqlResult = await this.mysqlCartRepo.clearCart(userId);
      if (mysqlResult && FeatureFlagService.getFlag('dual_write_enabled')) {
        await this.dynamodbCartRepo.clearCart(userId);
      }
      return mysqlResult;
    } catch (error) {
      console.error(`Failed to clear cart for user ${userId}:`, error);
      return false;
    }
  }

  private async executeDualWriteAdd(userId: number, productId: number, quantity: number): Promise<DualWriteResult<ShoppingCartItem>> {
    console.log(`🛒 executeDualWriteAdd called: userId=${userId}, productId=${productId}, quantity=${quantity}`);
    const operation: DualWriteOperation<ShoppingCartItem> = {
      mysqlOperation: () => this.mysqlCartRepo.addItem(userId, productId, quantity),
      dynamodbOperation: async (mysqlResult) => {
        console.log(`🛒 DynamoDB operation called with result:`, mysqlResult);
        const dynamoData = await this.transformForDynamoDB(mysqlResult);
        return this.dynamodbCartRepo.addItem(userId, productId, quantity);
      },
      dynamodbOnlyOperation: async () => {
        console.log(`🛒 Phase 5: DynamoDB-only addItem called: userId=${userId}, productId=${productId}, quantity=${quantity}`);
        return this.dynamodbCartRepo.addItem(userId, productId, quantity);
      },
      rollbackOperation: async () => { 
        await this.mysqlCartRepo.removeItem(userId, productId);
      }
    };

    return this.executeDualWrite(operation, 'ADD_ITEM');
  }

  protected extractEntityId(data: ShoppingCartItem | boolean): string | number {
    return typeof data === 'boolean' ? 'N/A' : `${data.userId}-${data.productId}`;
  }

  async transformForDynamoDB(mysqlData: ShoppingCartItem): Promise<any> {
    // Get user email for DynamoDB PK
    const user = await this.mysqlUserRepo.findById(mysqlData.userId);
    if (!user) {
      throw new Error(`User not found: ${mysqlData.userId}`);
    }

    // Get product details for denormalization
    const product = await this.mysqlProductRepo.getProductById(mysqlData.productId);
    if (!product) {
      throw new Error(`Product not found: ${mysqlData.productId}`);
    }

    return {
      ...mysqlData,
      userId: this.transformId(mysqlData.userId),
      productId: this.transformId(mysqlData.productId),
      // Denormalized fields for DynamoDB
      userEmail: user.email,
      productName: product.name,
      productPrice: product.price
    };
  }

  createRollbackOperation(mysqlData: ShoppingCartItem): (() => Promise<void>) | undefined {
    return async () => { 
      await this.mysqlCartRepo.removeItem(mysqlData.userId, mysqlData.productId);
    };
  }

  // Read operations - delegate to primary repository (MySQL)
  async getCartItems(userId: number): Promise<ShoppingCartItemWithProduct[]> {
    return this.mysqlCartRepo.getCartItems(userId);
  }

  async getCartItemCount(userId: number): Promise<number> {
    return this.mysqlCartRepo.getCartItemCount(userId);
  }

  async getCartItemByUserAndProduct(userId: number, productId: number): Promise<ShoppingCartItem | null> {
    return this.mysqlCartRepo.getCartItemByUserAndProduct(userId, productId);
  }

  async validateCartInventory(userId: number): Promise<{ valid: boolean; issues: string[] }> {
    return this.mysqlCartRepo.validateCartInventory(userId);
  }
}

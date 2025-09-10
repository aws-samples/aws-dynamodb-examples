import { DualWriteWrapper, DualWriteOperation, DualWriteResult } from './DualWriteWrapper';
import { IProductRepository } from '../interfaces/IProductRepository';
import { Product, CreateProductRequest, UpdateProductRequest, ProductWithDetails, ProductSearchFilters, ProductListResponse } from '../../models/Product';
import { FeatureFlagService } from '../../services/FeatureFlagService';

export class ProductDualWriteWrapper extends DualWriteWrapper<Product> implements IProductRepository {
  protected entityType = 'Product';
  private mysqlRepo: IProductRepository;
  private dynamodbRepo: IProductRepository;

  constructor(
    mysqlRepo: IProductRepository,
    dynamodbRepo: IProductRepository
  ) {
    super();
    this.mysqlRepo = mysqlRepo;
    this.dynamodbRepo = dynamodbRepo;
  }

  async createProduct(sellerId: number, productData: CreateProductRequest): Promise<Product> {
    console.log(`📦 ProductDualWriteWrapper.createProduct called: sellerId=${sellerId}`, productData);
    const result = await this.executeDualWriteCreate(sellerId, productData);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to create product');
    }
    return result.data;
  }

  async updateProduct(productId: number, sellerId: number, productData: UpdateProductRequest): Promise<Product | null> {
    try {
      const mysqlResult = await this.mysqlRepo.updateProduct(productId, sellerId, productData);
      if (mysqlResult && FeatureFlagService.getFlag('dual_write_enabled')) {
        const dynamoData = this.transformForDynamoDB(mysqlResult);
        await this.dynamodbRepo.updateProduct(productId, sellerId, dynamoData);
      }
      return mysqlResult;
    } catch (error) {
      console.error(`Failed to update product ${productId}:`, error);
      // Re-throw authorization and validation errors instead of returning null
      if (error instanceof Error && 
          (error.message.includes('You can only update your own products') ||
           error.message.includes('Product not found') ||
           error.message.includes('Category not found'))) {
        throw error;
      }
      return null;
    }
  }

  async deleteProduct(productId: number, sellerId: number): Promise<boolean> {
    try {
      const mysqlResult = await this.mysqlRepo.deleteProduct(productId, sellerId);
      if (mysqlResult && FeatureFlagService.getFlag('dual_write_enabled')) {
        await this.dynamodbRepo.deleteProduct(productId, sellerId);
      }
      return mysqlResult;
    } catch (error) {
      console.error(`Failed to delete product ${productId}:`, error);
      // Re-throw authorization and validation errors instead of returning false
      if (error instanceof Error && 
          (error.message.includes('You can only delete your own products') ||
           error.message.includes('Product not found'))) {
        throw error;
      }
      return false;
    }
  }

  async updateInventory(productId: number, quantity: number): Promise<boolean> {
    try {
      const mysqlResult = await this.mysqlRepo.updateInventory(productId, quantity);
      if (mysqlResult && FeatureFlagService.getFlag('dual_write_enabled')) {
        await this.dynamodbRepo.updateInventory(productId, quantity);
      }
      return mysqlResult;
    } catch (error) {
      console.error(`Failed to update inventory for product ${productId}:`, error);
      return false;
    }
  }

  private async executeDualWriteCreate(sellerId: number, productData: CreateProductRequest): Promise<DualWriteResult<Product>> {
    const operation: DualWriteOperation<Product> = {
      mysqlOperation: () => this.mysqlRepo.createProduct(sellerId, productData),
      dynamodbOperation: (mysqlResult) => {
        const dynamoData = this.transformForDynamoDB(mysqlResult);
        return this.dynamodbRepo.createProduct(sellerId, dynamoData);
      },
      rollbackOperation: async (mysqlResult) => {
        await this.mysqlRepo.deleteProduct(mysqlResult.id, sellerId);
      }
    };

    return this.executeDualWrite(operation, 'CREATE');
  }

  private async executeDualWriteUpdate(productId: number, sellerId: number, productData: UpdateProductRequest): Promise<DualWriteResult<Product>> {
    const operation: DualWriteOperation<Product> = {
      mysqlOperation: async () => {
        const result = await this.mysqlRepo.updateProduct(productId, sellerId, productData);
        if (!result) throw new Error('Product not found');
        return result;
      },
      dynamodbOperation: async (mysqlResult) => {
        const dynamoData = this.transformForDynamoDB(mysqlResult);
        const result = await this.dynamodbRepo.updateProduct(productId, sellerId, dynamoData);
        if (!result) throw new Error('Failed to update in DynamoDB');
        return result;
      }
    };

    return this.executeDualWrite(operation, 'UPDATE');
  }

  protected extractEntityId(data: Product | boolean): string | number {
    return typeof data === 'boolean' ? 'N/A' : data.id;
  }

  transformForDynamoDB(mysqlData: Product): any {
    return {
      ...mysqlData,
      id: this.transformId(mysqlData.id),
      sellerId: this.transformId(mysqlData.seller_id),
      categoryId: this.transformId(mysqlData.category_id)
    };
  }

  createRollbackOperation(mysqlData: Product): (() => Promise<void>) | undefined {
    return async () => {
      await this.mysqlRepo.deleteProduct(mysqlData.id, mysqlData.seller_id);
    };
  }

  // Read operations - delegate to primary repository (MySQL)
  async getProductById(productId: number): Promise<Product | null> {
    return this.mysqlRepo.getProductById(productId);
  }

  async getProductWithDetails(productId: number): Promise<ProductWithDetails | null> {
    return this.mysqlRepo.getProductWithDetails(productId);
  }

  async getProducts(filters?: ProductSearchFilters, page?: number, limit?: number): Promise<ProductListResponse> {
    return this.mysqlRepo.getProducts(filters, page, limit);
  }

  async getProductsBySeller(sellerId: number, page?: number, limit?: number): Promise<ProductListResponse> {
    return this.mysqlRepo.getProductsBySeller(sellerId, page, limit);
  }

  async getProductsByCategory(categoryId: number, page?: number, limit?: number): Promise<ProductListResponse> {
    return this.mysqlRepo.getProductsByCategory(categoryId, page, limit);
  }

  async searchProducts(searchTerm: string, page?: number, limit?: number): Promise<ProductListResponse> {
    return this.mysqlRepo.searchProducts(searchTerm, page, limit);
  }

  async reduceInventory(productId: number, quantity: number): Promise<boolean> {
    try {
      const mysqlResult = await this.mysqlRepo.reduceInventory(productId, quantity);
      if (mysqlResult && FeatureFlagService.getFlag('dual_write_enabled')) {
        await this.dynamodbRepo.reduceInventory(productId, quantity);
      }
      return mysqlResult;
    } catch (error) {
      console.error(`Failed to reduce inventory for product ${productId}:`, error);
      return false;
    }
  }

  async hasInventory(productId: number, requiredQuantity: number): Promise<boolean> {
    return this.mysqlRepo.hasInventory(productId, requiredQuantity);
  }
}

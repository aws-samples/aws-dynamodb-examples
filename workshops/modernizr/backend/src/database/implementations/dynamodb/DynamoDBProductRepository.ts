import { BaseDynamoDBRepository } from './BaseDynamoDBRepository';
import { IProductRepository } from '../../interfaces/IProductRepository';
import { 
  Product, 
  CreateProductRequest, 
  UpdateProductRequest, 
  ProductWithDetails, 
  ProductSearchFilters, 
  ProductListResponse 
} from '../../../models/Product';

export class DynamoDBProductRepository extends BaseDynamoDBRepository implements IProductRepository {
  constructor(tableName: string) {
    super(tableName);
  }

  async createProduct(sellerId: number, productData: CreateProductRequest): Promise<Product> {
    const id = Date.now();
    const now = new Date();
    
    const product: Product = {
      id,
      seller_id: sellerId,
      category_id: productData.category_id,
      name: productData.name,
      description: productData.description,
      price: productData.price,
      inventory_quantity: productData.inventory_quantity,
      image_url: productData.image_url,
      created_at: now,
      updated_at: now
    };

    const item = {
      PK: `PRODUCT#${id}`,
      SK: '#META',
      GSI1PK: `SELLER#${sellerId}`,
      GSI1SK: `PRODUCT#${id}`,
      GSI2PK: `CATEGORY#${productData.category_id}`,
      GSI2SK: `PRODUCT#${id}`,
      ...product,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };

    await this.putItem(item);
    return product;
  }

  async getProductById(productId: number): Promise<Product | null> {
    const item = await this.getItem({
      PK: productId.toString(),
      SK: '#META'
    });

    if (!item) return null;

    return await this.transformFromDynamoDB(item);
  }

  async getProductWithDetails(productId: number): Promise<ProductWithDetails | null> {
    // For now, return the basic product. In a full implementation,
    // we would join with category and seller data
    const product = await this.getProductById(productId);
    return product as ProductWithDetails;
  }

  async updateProduct(productId: number, sellerId: number, productData: UpdateProductRequest): Promise<Product | null> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    if (productData.name !== undefined) {
      updateExpressions.push('#name = :name');
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeValues[':name'] = productData.name;
    }

    if (productData.description !== undefined) {
      updateExpressions.push('description = :description');
      expressionAttributeValues[':description'] = productData.description;
    }

    if (productData.category_id !== undefined) {
      updateExpressions.push('category_id = :category_id, GSI2PK = :gsi2pk');
      expressionAttributeValues[':category_id'] = productData.category_id;
      expressionAttributeValues[':gsi2pk'] = `CATEGORY#${productData.category_id}`;
    }

    if (productData.price !== undefined) {
      updateExpressions.push('price = :price');
      expressionAttributeValues[':price'] = productData.price;
    }

    if (productData.inventory_quantity !== undefined) {
      updateExpressions.push('inventory_quantity = :inventory_quantity');
      expressionAttributeValues[':inventory_quantity'] = productData.inventory_quantity;
    }

    if (productData.image_url !== undefined) {
      updateExpressions.push('image_url = :image_url');
      expressionAttributeValues[':image_url'] = productData.image_url;
    }

    if (updateExpressions.length === 0) {
      return await this.getProductById(productId);
    }

    updateExpressions.push('updated_at = :updated_at');
    expressionAttributeValues[':updated_at'] = new Date().toISOString();

    const result = await this.updateItem(
      { PK: `PRODUCT#${productId}`, SK: '#META' },
      `SET ${updateExpressions.join(', ')}`,
      expressionAttributeValues,
      expressionAttributeNames
    );

    return result ? await this.transformFromDynamoDB(result) : null;
  }

  async deleteProduct(productId: number, sellerId: number): Promise<boolean> {
    try {
      await this.deleteItem({ PK: `PRODUCT#${productId}`, SK: '#META' });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getProducts(filters?: ProductSearchFilters, page: number = 1, limit: number = 10): Promise<ProductListResponse> {
    console.log('🔍 getProducts called with filters:', JSON.stringify(filters, null, 2));
    console.log('📄 Pagination - page:', page, 'limit:', limit);
    
    let items: any[] = [];
    
    if (filters?.category_id) {
      console.log('🏷️ Querying by category_id:', filters.category_id);
      items = await this.queryGSI1(filters.category_id.toString());
      console.log('📊 GSI1 query returned', items.length, 'items');
    } else if (filters?.seller_id) {
      console.log('👤 Querying by seller_id:', filters.seller_id);
      items = await this.queryGSI2(filters.seller_id.toString());
      console.log('📊 GSI2 query returned', items.length, 'items');
    } else {
      console.log('🔍 Scanning all products...');
      items = await this.scanTable();
      console.log('📊 Scan returned', items.length, 'items');
    }

    console.log('📋 Raw items sample:', items.length > 0 ? JSON.stringify(items[0], null, 2) : 'No items found');

    // Apply additional filters
    if (filters?.search) {
      console.log('🔎 Applying search filter:', filters.search);
      const beforeCount = items.length;
      items = items.filter(item => 
        item.product_name?.toLowerCase().includes(filters.search!.toLowerCase())
      );
      console.log('🔎 Search filter: ', beforeCount, '→', items.length, 'items');
    }

    if (filters?.min_price !== undefined) {
      console.log('💰 Applying min_price filter:', filters.min_price);
      const beforeCount = items.length;
      items = items.filter(item => parseFloat(item.price) >= filters.min_price!);
      console.log('💰 Min price filter:', beforeCount, '→', items.length, 'items');
    }

    if (filters?.max_price !== undefined) {
      console.log('💰 Applying max_price filter:', filters.max_price);
      const beforeCount = items.length;
      items = items.filter(item => parseFloat(item.price) <= filters.max_price!);
      console.log('💰 Max price filter:', beforeCount, '→', items.length, 'items');
    }

    if (filters?.in_stock_only) {
      console.log('📦 Applying in_stock_only filter');
      const beforeCount = items.length;
      items = items.filter(item => parseInt(item.inventory_quantity) > 0);
      console.log('📦 Stock filter:', beforeCount, '→', items.length, 'items');
    }

    const total = items.length;
    const startIndex = (page - 1) * limit;
    const paginatedItems = items.slice(startIndex, startIndex + limit);

    console.log('📄 Pagination: total =', total, 'startIndex =', startIndex, 'returning', paginatedItems.length, 'items');

    const products = await Promise.all(
      paginatedItems.map(async item => {
        const transformed = await this.transformFromDynamoDB(item);
        console.log('🔄 Transformed item:', JSON.stringify(transformed, null, 2));
        return transformed;
      })
    );

    const result = {
      products,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit)
    };

    console.log('✅ Final result summary:', {
      productCount: result.products.length,
      total: result.total,
      page: result.page,
      total_pages: result.total_pages
    });

    return result;
  }

  async getProductsBySeller(sellerId: number, page: number = 1, limit: number = 10): Promise<ProductListResponse> {
    return this.getProducts({ seller_id: sellerId }, page, limit);
  }

  async getProductsByCategory(categoryId: number, page: number = 1, limit: number = 10): Promise<ProductListResponse> {
    // Get the category and its children
    const { DatabaseFactory } = require('../../factory/DatabaseFactory');
    const categoryRepo = DatabaseFactory.createCategoryRepository();
    
    // Get child categories
    const childCategories = await categoryRepo.findChildCategories(categoryId);
    
    // Create array of category IDs to search (parent + children)
    const categoryIds = [categoryId, ...childCategories.map((child: any) => child.id)];
    
    // Get products from all categories (parent + children)
    let allProducts: any[] = [];
    
    for (const catId of categoryIds) {
      const categoryProducts = await this.getProducts({ category_id: catId }, 1, 1000); // Get all products for each category
      allProducts = allProducts.concat(categoryProducts.products);
    }
    
    // Remove duplicates (in case a product appears in multiple categories)
    const uniqueProducts = allProducts.filter((product, index, self) => 
      index === self.findIndex(p => p.id === product.id)
    );
    
    // Apply pagination to the combined results
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = uniqueProducts.slice(startIndex, endIndex);
    
    return {
      products: paginatedProducts,
      total: uniqueProducts.length,
      page,
      limit,
      total_pages: Math.ceil(uniqueProducts.length / limit)
    };
  }

  async searchProducts(searchTerm: string, page: number = 1, limit: number = 10): Promise<ProductListResponse> {
    return this.getProducts({ search: searchTerm }, page, limit);
  }

  async updateInventory(productId: number, quantity: number): Promise<boolean> {
    try {
      await this.updateItem(
        { PK: `PRODUCT#${productId}`, SK: '#META' },
        'SET inventory_quantity = :quantity, updated_at = :updated_at',
        { 
          ':quantity': quantity,
          ':updated_at': new Date().toISOString()
        }
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  async reduceInventory(productId: number, quantity: number): Promise<boolean> {
    try {
      await this.updateItem(
        { PK: productId.toString(), SK: '#META' },
        'SET inventory_quantity = inventory_quantity - :quantity, updated_at = :updated_at',
        { 
          ':quantity': quantity,
          ':updated_at': new Date().toISOString()
        }
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  async hasInventory(productId: number, requiredQuantity: number): Promise<boolean> {
    const product = await this.getProductById(productId);
    return product ? product.inventory_quantity >= requiredQuantity : false;
  }

  private async transformFromDynamoDB(item: any): Promise<ProductWithDetails> {
    const product: ProductWithDetails = {
      id: parseInt(item.id),
      seller_id: parseInt(item.seller_id),
      category_id: parseInt(item.category_id),
      name: item.product_name || item.name,
      description: item.description,
      price: parseFloat(item.price),
      inventory_quantity: parseInt(item.inventory_quantity),
      image_url: item.image_url,
      created_at: new Date(item.created_at),
      updated_at: new Date(item.updated_at)
    };

    // Add category_name if available from item or fetch it
    if (item.category_path) {
      product.category_name = item.category_path;
    } else {
      // Fetch category name from categories table
      const categoryItem = await this.getCategoryById(product.category_id);
      if (categoryItem) {
        product.category_name = categoryItem.category_name || categoryItem.name;
      }
    }

    // Fetch seller information from users table
    const userItem = await this.getUserById(product.seller_id);
    if (userItem) {
      product.seller_username = userItem.username;
      product.seller_email = userItem.email;
    }

    return product;
  }

  private async getCategoryById(categoryId: number): Promise<any | null> {
    try {
      // Query by GSI1 where GSI1SK = category_id
      const items = await this.query(
        'GSI1SK = :id',
        { ':id': categoryId.toString() },
        'GSI1'
      );
      return items && items.length > 0 ? items[0] : null;
    } catch (error) {
      console.error('Error fetching category:', error);
      return null;
    }
  }

  private async getUserById(userId: number): Promise<any | null> {
    try {
      // Assuming users table has similar structure with PK = user_id, SK = #META
      const item = await this.getItem({
        PK: userId.toString(),
        SK: '#META'
      });
      return item;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  private async queryGSI1(pk: string, skPrefix?: string): Promise<any[]> {
    return this.query(
      'GSI1PK = :pk',
      {
        ':pk': pk
      },
      'GSI1'
    );
  }

  private async queryGSI2(pk: string, skPrefix?: string): Promise<any[]> {
    return this.query(
      'GSI2PK = :pk',
      {
        ':pk': pk
      },
      'GSI2'
    );
  }

  private async scanTable(): Promise<any[]> {
    return this.scan(
      'SK = :sk',
      {
        ':sk': '#META'
      }
    );
  }
}

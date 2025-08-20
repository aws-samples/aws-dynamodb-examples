import { ProductRepository } from '../repositories/ProductRepository';
import { 
  Product, 
  ProductWithDetails, 
  CreateProductRequest, 
  UpdateProductRequest, 
  ProductSearchFilters,
  ProductListResponse,
  validateCreateProductRequest,
  validateUpdateProductRequest
} from '../models/Product';

export class ProductService {
  private productRepository: ProductRepository;

  constructor() {
    this.productRepository = new ProductRepository();
  }

  /**
   * Create a new product
   */
  async createProduct(sellerId: number, productData: any): Promise<Product> {
    try {
      // Validate input data
      const validatedData = validateCreateProductRequest(productData);
      
      // Create the product
      const product = await this.productRepository.createProduct(sellerId, validatedData);
      
      return product;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create product');
    }
  }

  /**
   * Get product by ID with details
   */
  async getProductById(productId: number): Promise<ProductWithDetails | null> {
    try {
      if (!Number.isInteger(productId) || productId <= 0) {
        throw new Error('Invalid product ID');
      }

      return await this.productRepository.getProductWithDetails(productId);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to retrieve product');
    }
  }

  /**
   * Update product
   */
  async updateProduct(productId: number, sellerId: number, updateData: any): Promise<Product | null> {
    try {
      if (!Number.isInteger(productId) || productId <= 0) {
        throw new Error('Invalid product ID');
      }

      // Validate input data
      const validatedData = validateUpdateProductRequest(updateData);
      
      // Check if there's anything to update
      if (Object.keys(validatedData).length === 0) {
        throw new Error('No valid fields provided for update');
      }

      // Update the product
      const updatedProduct = await this.productRepository.updateProduct(productId, sellerId, validatedData);
      
      return updatedProduct;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update product');
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(productId: number, sellerId: number): Promise<boolean> {
    try {
      if (!Number.isInteger(productId) || productId <= 0) {
        throw new Error('Invalid product ID');
      }

      return await this.productRepository.deleteProduct(productId, sellerId);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to delete product');
    }
  }

  /**
   * Get products with filtering and pagination
   */
  async getProducts(
    filters: ProductSearchFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<ProductListResponse> {
    try {
      // Validate pagination parameters
      if (!Number.isInteger(page) || page < 1) {
        page = 1;
      }
      
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        limit = 20;
      }

      // Validate filters
      const validatedFilters: ProductSearchFilters = {};

      if (filters.category_id !== undefined) {
        if (Number.isInteger(Number(filters.category_id)) && Number(filters.category_id) > 0) {
          validatedFilters.category_id = Number(filters.category_id);
        }
      }

      if (filters.seller_id !== undefined) {
        if (Number.isInteger(Number(filters.seller_id)) && Number(filters.seller_id) > 0) {
          validatedFilters.seller_id = Number(filters.seller_id);
        }
      }

      if (filters.search !== undefined && typeof filters.search === 'string') {
        const searchTerm = filters.search.trim();
        if (searchTerm.length > 0) {
          validatedFilters.search = searchTerm;
        }
      }

      if (filters.min_price !== undefined) {
        const minPrice = Number(filters.min_price);
        if (!isNaN(minPrice) && minPrice >= 0) {
          validatedFilters.min_price = minPrice;
        }
      }

      if (filters.max_price !== undefined) {
        const maxPrice = Number(filters.max_price);
        if (!isNaN(maxPrice) && maxPrice >= 0) {
          validatedFilters.max_price = maxPrice;
        }
      }

      if (filters.in_stock_only !== undefined) {
        validatedFilters.in_stock_only = Boolean(filters.in_stock_only);
      }

      return await this.productRepository.getProducts(validatedFilters, page, limit);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to retrieve products');
    }
  }

  /**
   * Get products by seller
   */
  async getProductsBySeller(
    sellerId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<ProductListResponse> {
    try {
      if (!Number.isInteger(sellerId) || sellerId <= 0) {
        throw new Error('Invalid seller ID');
      }

      return await this.productRepository.getProductsBySeller(sellerId, page, limit);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to retrieve seller products');
    }
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(
    categoryId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<ProductListResponse> {
    try {
      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        throw new Error('Invalid category ID');
      }

      return await this.productRepository.getProductsByCategory(categoryId, page, limit);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to retrieve category products');
    }
  }

  /**
   * Search products
   */
  async searchProducts(
    searchTerm: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ProductListResponse> {
    try {
      if (!searchTerm || typeof searchTerm !== 'string') {
        throw new Error('Search term is required');
      }

      const trimmedSearch = searchTerm.trim();
      if (trimmedSearch.length === 0) {
        throw new Error('Search term cannot be empty');
      }

      if (trimmedSearch.length > 100) {
        throw new Error('Search term is too long');
      }

      return await this.productRepository.searchProducts(trimmedSearch, page, limit);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to search products');
    }
  }

  /**
   * Update product inventory
   */
  async updateInventory(productId: number, sellerId: number, newQuantity: number): Promise<boolean> {
    try {
      if (!Number.isInteger(productId) || productId <= 0) {
        throw new Error('Invalid product ID');
      }

      if (!Number.isInteger(newQuantity) || newQuantity < 0) {
        throw new Error('Inventory quantity must be a non-negative integer');
      }

      if (newQuantity > 999999) {
        throw new Error('Inventory quantity cannot exceed 999,999');
      }

      // Verify the product belongs to the seller
      const product = await this.productRepository.getProductById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      if (product.seller_id !== sellerId) {
        throw new Error('You can only update inventory for your own products');
      }

      return await this.productRepository.updateInventory(productId, newQuantity);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update inventory');
    }
  }

  /**
   * Check product availability
   */
  async checkAvailability(productId: number, requiredQuantity: number): Promise<boolean> {
    try {
      if (!Number.isInteger(productId) || productId <= 0) {
        throw new Error('Invalid product ID');
      }

      if (!Number.isInteger(requiredQuantity) || requiredQuantity <= 0) {
        throw new Error('Required quantity must be a positive integer');
      }

      return await this.productRepository.hasInventory(productId, requiredQuantity);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to check product availability');
    }
  }

  /**
   * Reduce inventory (for purchases)
   */
  async reduceInventory(productId: number, quantity: number): Promise<boolean> {
    try {
      if (!Number.isInteger(productId) || productId <= 0) {
        throw new Error('Invalid product ID');
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error('Quantity must be a positive integer');
      }

      return await this.productRepository.reduceInventory(productId, quantity);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to reduce inventory');
    }
  }

  /**
   * Get product statistics for seller dashboard
   */
  async getSellerProductStats(sellerId: number): Promise<{
    total_products: number;
    in_stock_products: number;
    out_of_stock_products: number;
    total_inventory_value: number;
  }> {
    try {
      if (!Number.isInteger(sellerId) || sellerId <= 0) {
        throw new Error('Invalid seller ID');
      }

      const products = await this.productRepository.getProductsBySeller(sellerId, 1, 999999);
      
      const stats = {
        total_products: products.total,
        in_stock_products: 0,
        out_of_stock_products: 0,
        total_inventory_value: 0,
      };

      products.products.forEach(product => {
        if (product.inventory_quantity > 0) {
          stats.in_stock_products++;
          stats.total_inventory_value += product.price * product.inventory_quantity;
        } else {
          stats.out_of_stock_products++;
        }
      });

      return stats;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get seller product statistics');
    }
  }
}
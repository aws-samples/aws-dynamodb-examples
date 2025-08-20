import { Product, CreateProductRequest, UpdateProductRequest, ProductWithDetails, ProductSearchFilters, ProductListResponse } from '../../models/Product';

/**
 * Abstract interface for Product repository operations
 * Supports both MySQL and DynamoDB implementations
 */
export interface IProductRepository {
  /**
   * Create a new product
   * @param sellerId Seller ID
   * @param productData Product creation data
   * @returns Promise resolving to created Product
   */
  createProduct(sellerId: number, productData: CreateProductRequest): Promise<Product>;

  /**
   * Get product by ID
   * @param productId Product ID
   * @returns Promise resolving to Product or null if not found
   */
  getProductById(productId: number): Promise<Product | null>;

  /**
   * Get product with details (includes category and seller info)
   * @param productId Product ID
   * @returns Promise resolving to ProductWithDetails or null if not found
   */
  getProductWithDetails(productId: number): Promise<ProductWithDetails | null>;

  /**
   * Update product information
   * @param productId Product ID
   * @param sellerId Seller ID (for ownership verification)
   * @param productData Updated product data
   * @returns Promise resolving to updated Product or null if not found
   */
  updateProduct(productId: number, sellerId: number, productData: UpdateProductRequest): Promise<Product | null>;

  /**
   * Delete product
   * @param productId Product ID
   * @param sellerId Seller ID (for ownership verification)
   * @returns Promise resolving to boolean indicating success
   */
  deleteProduct(productId: number, sellerId: number): Promise<boolean>;

  /**
   * Get products with filtering and pagination
   * @param filters Search filters
   * @param page Page number
   * @param limit Items per page
   * @returns Promise resolving to ProductListResponse
   */
  getProducts(filters?: ProductSearchFilters, page?: number, limit?: number): Promise<ProductListResponse>;

  /**
   * Get products by seller
   * @param sellerId Seller ID
   * @param page Page number
   * @param limit Items per page
   * @returns Promise resolving to ProductListResponse
   */
  getProductsBySeller(sellerId: number, page?: number, limit?: number): Promise<ProductListResponse>;

  /**
   * Get products by category
   * @param categoryId Category ID
   * @param page Page number
   * @param limit Items per page
   * @returns Promise resolving to ProductListResponse
   */
  getProductsByCategory(categoryId: number, page?: number, limit?: number): Promise<ProductListResponse>;

  /**
   * Search products by term
   * @param searchTerm Search term
   * @param page Page number
   * @param limit Items per page
   * @returns Promise resolving to ProductListResponse
   */
  searchProducts(searchTerm: string, page?: number, limit?: number): Promise<ProductListResponse>;

  /**
   * Update product inventory
   * @param productId Product ID
   * @param quantity New inventory quantity
   * @returns Promise resolving to boolean indicating success
   */
  updateInventory(productId: number, quantity: number): Promise<boolean>;

  /**
   * Reduce product inventory
   * @param productId Product ID
   * @param quantity Quantity to reduce
   * @returns Promise resolving to boolean indicating success
   */
  reduceInventory(productId: number, quantity: number): Promise<boolean>;

  /**
   * Check if product has sufficient inventory
   * @param productId Product ID
   * @param requiredQuantity Required quantity
   * @returns Promise resolving to boolean indicating availability
   */
  hasInventory(productId: number, requiredQuantity: number): Promise<boolean>;
}

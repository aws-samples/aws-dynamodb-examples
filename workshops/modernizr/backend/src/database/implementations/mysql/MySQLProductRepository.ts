import { ProductRepository } from '../../../repositories/ProductRepository';
import { IProductRepository } from '../../interfaces/IProductRepository';
import { Product, CreateProductRequest, UpdateProductRequest, ProductWithDetails, ProductSearchFilters, ProductListResponse } from '../../../models/Product';

export class MySQLProductRepository implements IProductRepository {
  private productRepository: ProductRepository;

  constructor() {
    this.productRepository = new ProductRepository();
  }

  async createProduct(sellerId: number, productData: CreateProductRequest): Promise<Product> {
    return this.productRepository.createProduct(sellerId, productData);
  }

  async getProductById(productId: number): Promise<Product | null> {
    return this.productRepository.getProductById(productId);
  }

  async getProductWithDetails(productId: number): Promise<ProductWithDetails | null> {
    return this.productRepository.getProductWithDetails(productId);
  }

  async updateProduct(productId: number, sellerId: number, productData: UpdateProductRequest): Promise<Product | null> {
    return this.productRepository.updateProduct(productId, sellerId, productData);
  }

  async deleteProduct(productId: number, sellerId: number): Promise<boolean> {
    return this.productRepository.deleteProduct(productId, sellerId);
  }

  async getProducts(filters: ProductSearchFilters = {}, page: number = 1, limit: number = 20): Promise<ProductListResponse> {
    return this.productRepository.getProducts(filters, page, limit);
  }

  async getProductsBySeller(sellerId: number, page: number = 1, limit: number = 20): Promise<ProductListResponse> {
    return this.productRepository.getProductsBySeller(sellerId, page, limit);
  }

  async getProductsByCategory(categoryId: number, page: number = 1, limit: number = 20): Promise<ProductListResponse> {
    return this.productRepository.getProductsByCategory(categoryId, page, limit);
  }

  async searchProducts(searchTerm: string, page: number = 1, limit: number = 20): Promise<ProductListResponse> {
    return this.productRepository.searchProducts(searchTerm, page, limit);
  }

  async updateInventory(productId: number, quantity: number): Promise<boolean> {
    return this.productRepository.updateInventory(productId, quantity);
  }

  async reduceInventory(productId: number, quantity: number): Promise<boolean> {
    return this.productRepository.reduceInventory(productId, quantity);
  }

  async hasInventory(productId: number, requiredQuantity: number): Promise<boolean> {
    return this.productRepository.hasInventory(productId, requiredQuantity);
  }
}

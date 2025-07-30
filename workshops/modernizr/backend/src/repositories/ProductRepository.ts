import { pool } from '../config/database';
import { 
  Product, 
  ProductWithDetails, 
  CreateProductRequest, 
  UpdateProductRequest, 
  ProductSearchFilters,
  ProductListResponse 
} from '../models/Product';

export class ProductRepository {
  
  /**
   * Create a new product
   */
  async createProduct(sellerId: number, productData: CreateProductRequest): Promise<Product> {
    const connection = await pool.getConnection();
    
    try {
      // First verify the category exists
      const [categoryRows] = await connection.execute(
        'SELECT id FROM categories WHERE id = ?',
        [productData.category_id]
      );
      
      if ((categoryRows as any[]).length === 0) {
        throw new Error('Category not found');
      }
      
      // Insert the product
      const [result] = await connection.execute(
        `INSERT INTO products (seller_id, category_id, name, description, price, inventory_quantity)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          sellerId,
          productData.category_id,
          productData.name,
          productData.description || null,
          productData.price,
          productData.inventory_quantity
        ]
      );
      
      const productId = (result as any).insertId;
      
      // Fetch and return the created product
      const createdProduct = await this.getProductById(productId);
      if (!createdProduct) {
        throw new Error('Failed to retrieve created product');
      }
      
      return createdProduct;
      
    } finally {
      connection.release();
    }
  }
  
  /**
   * Get product by ID
   */
  async getProductById(productId: number): Promise<Product | null> {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        `SELECT 
           id,
           seller_id,
           category_id,
           name,
           description,
           price,
           inventory_quantity,
           created_at,
           updated_at
         FROM products WHERE id = ?`,
        [productId]
      );
      
      const products = rows as Product[];
      return products.length > 0 ? products[0] : null;
      
    } finally {
      connection.release();
    }
  }
  
  /**
   * Get product with details (including category and seller info)
   */
  async getProductWithDetails(productId: number): Promise<ProductWithDetails | null> {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        `SELECT 
           p.*,
           c.name as category_name,
           u.username as seller_username,
           u.email as seller_email
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         LEFT JOIN users u ON p.seller_id = u.id
         WHERE p.id = ?`,
        [productId]
      );
      
      const products = rows as ProductWithDetails[];
      return products.length > 0 ? products[0] : null;
      
    } finally {
      connection.release();
    }
  }
  
  /**
   * Update product
   */
  async updateProduct(productId: number, sellerId: number, updateData: UpdateProductRequest): Promise<Product | null> {
    const connection = await pool.getConnection();
    
    try {
      // First verify the product exists and belongs to the seller
      const existingProduct = await this.getProductById(productId);
      if (!existingProduct) {
        throw new Error('Product not found');
      }
      
      if (existingProduct.seller_id !== sellerId) {
        throw new Error('You can only update your own products');
      }
      
      // If category_id is being updated, verify it exists
      if (updateData.category_id) {
        const [categoryRows] = await connection.execute(
          'SELECT id FROM categories WHERE id = ?',
          [updateData.category_id]
        );
        
        if ((categoryRows as any[]).length === 0) {
          throw new Error('Category not found');
        }
      }
      
      // Build dynamic update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      
      if (updateData.name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(updateData.name);
      }
      
      if (updateData.description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(updateData.description);
      }
      
      if (updateData.category_id !== undefined) {
        updateFields.push('category_id = ?');
        updateValues.push(updateData.category_id);
      }
      
      if (updateData.price !== undefined) {
        updateFields.push('price = ?');
        updateValues.push(updateData.price);
      }
      
      if (updateData.inventory_quantity !== undefined) {
        updateFields.push('inventory_quantity = ?');
        updateValues.push(updateData.inventory_quantity);
      }
      
      if (updateFields.length === 0) {
        // No fields to update, return existing product
        return existingProduct;
      }
      
      // Add updated_at field
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(productId);
      
      // Execute update
      await connection.execute(
        `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
      
      // Return updated product
      return await this.getProductById(productId);
      
    } finally {
      connection.release();
    }
  }
  
  /**
   * Delete product
   */
  async deleteProduct(productId: number, sellerId: number): Promise<boolean> {
    const connection = await pool.getConnection();
    
    try {
      // First verify the product exists and belongs to the seller
      const existingProduct = await this.getProductById(productId);
      if (!existingProduct) {
        throw new Error('Product not found');
      }
      
      if (existingProduct.seller_id !== sellerId) {
        throw new Error('You can only delete your own products');
      }
      
      // Delete the product
      const [result] = await connection.execute(
        'DELETE FROM products WHERE id = ?',
        [productId]
      );
      
      return (result as any).affectedRows > 0;
      
    } finally {
      connection.release();
    }
  }
  
  /**
   * Get products with filtering, search, and pagination
   */
  async getProducts(
    filters: ProductSearchFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<ProductListResponse> {
    const connection = await pool.getConnection();
    
    try {
      // Build WHERE conditions and parameters
      const whereConditions: string[] = [];
      const queryParams: any[] = [];
      
      if (filters.category_id) {
        whereConditions.push('p.category_id = ?');
        queryParams.push(filters.category_id);
      }
      
      if (filters.seller_id) {
        whereConditions.push('p.seller_id = ?');
        queryParams.push(filters.seller_id);
      }
      
      if (filters.search) {
        whereConditions.push('(p.name LIKE ? OR p.description LIKE ?)');
        const searchTerm = `%${filters.search}%`;
        queryParams.push(searchTerm, searchTerm);
      }
      
      if (filters.min_price) {
        whereConditions.push('p.price >= ?');
        queryParams.push(filters.min_price);
      }
      
      if (filters.max_price) {
        whereConditions.push('p.price <= ?');
        queryParams.push(filters.max_price);
      }
      
      if (filters.in_stock_only) {
        whereConditions.push('p.inventory_quantity > 0');
      }
      
      const whereClause = whereConditions.length > 0 
        ? ` WHERE ${whereConditions.join(' AND ')}`
        : '';
      
      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM products p${whereClause}`;
      const [countRows] = await connection.execute(countQuery, queryParams);
      const total = (countRows as any[])[0].total;
      
      // Calculate pagination
      const offset = (page - 1) * limit;
      const totalPages = Math.ceil(total / limit);
      
      // Get products with details - using string interpolation for LIMIT/OFFSET to avoid parameter issues
      const productsQuery = `
        SELECT 
          p.id,
          p.seller_id,
          p.category_id,
          p.name,
          p.description,
          p.price,
          p.inventory_quantity,
          p.created_at,
          p.updated_at,
          c.name as category_name,
          u.username as seller_username,
          u.email as seller_email
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN users u ON p.seller_id = u.id
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      
      const [productRows] = await connection.execute(productsQuery, queryParams);
      const products = productRows as ProductWithDetails[];
      
      return {
        products,
        total,
        page,
        limit,
        total_pages: totalPages,
      };
      
    } finally {
      connection.release();
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
    return this.getProducts({ seller_id: sellerId }, page, limit);
  }
  
  /**
   * Get products by category
   */
  async getProductsByCategory(
    categoryId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<ProductListResponse> {
    return this.getProducts({ category_id: categoryId }, page, limit);
  }
  
  /**
   * Search products
   */
  async searchProducts(
    searchTerm: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ProductListResponse> {
    return this.getProducts({ search: searchTerm }, page, limit);
  }
  
  /**
   * Update product inventory
   */
  async updateInventory(productId: number, newQuantity: number): Promise<boolean> {
    const connection = await pool.getConnection();
    
    try {
      const [result] = await connection.execute(
        'UPDATE products SET inventory_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newQuantity, productId]
      );
      
      return (result as any).affectedRows > 0;
      
    } finally {
      connection.release();
    }
  }
  
  /**
   * Reduce inventory (for purchases)
   */
  async reduceInventory(productId: number, quantity: number): Promise<boolean> {
    const connection = await pool.getConnection();
    
    try {
      // Use atomic operation to prevent overselling
      const [result] = await connection.execute(
        `UPDATE products 
         SET inventory_quantity = inventory_quantity - ?, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = ? AND inventory_quantity >= ?`,
        [quantity, productId, quantity]
      );
      
      return (result as any).affectedRows > 0;
      
    } finally {
      connection.release();
    }
  }
  
  /**
   * Check if product has sufficient inventory
   */
  async hasInventory(productId: number, requiredQuantity: number): Promise<boolean> {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT inventory_quantity FROM products WHERE id = ?',
        [productId]
      );
      
      const products = rows as { inventory_quantity: number }[];
      if (products.length === 0) {
        return false;
      }
      
      return products[0].inventory_quantity >= requiredQuantity;
      
    } finally {
      connection.release();
    }
  }
}
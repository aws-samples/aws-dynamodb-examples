// Database Test Helper - Manage Test Database Operations
import { pool } from '../../config/database';
import { User } from '../../models/User';
import { Product } from '../../models/Product';
import { Category } from '../../models/Category';

export class DatabaseTestHelper {
  /**
   * Set up test database with schema and initial data
   */
  static async setupTestDatabase(): Promise<void> {
    try {
      console.log('Setting up test database...');
      
      // Test database connection
      await pool.execute('SELECT 1');
      
      // Create database schema
      await this.createSchema();
      
      // Clear existing test data
      await this.clearAllTables();
      
      // Reset auto-increment counters
      await this.resetAutoIncrements();
      
      console.log('✅ Test database setup complete');
    } catch (error) {
      console.error('❌ Failed to setup test database:', error);
      throw error;
    }
  }

  /**
   * Clean up test database completely
   */
  static async cleanupTestDatabase(): Promise<void> {
    try {
      console.log('Cleaning up test database...');
      
      await this.clearAllTables();
      
      console.log('✅ Test database cleanup complete');
    } catch (error) {
      console.error('❌ Failed to cleanup test database:', error);
      // Don't throw to avoid masking test failures
    }
  }

  /**
   * Close database connections (for test teardown)
   */
  static async closeConnections(): Promise<void> {
    try {
      await pool.end();
      console.log('✅ Database connections closed');
    } catch (error) {
      console.error('❌ Failed to close database connections:', error);
      // Don't throw to avoid masking test failures
    }
  }

  /**
   * Clean up only cart and order data (preserves users and products)
   */
  static async cleanupCartAndOrderData(): Promise<void> {
    try {
      // Clear only cart and order data, preserve users and products
      await pool.execute('DELETE FROM order_items');
      await pool.execute('DELETE FROM orders');
      await pool.execute('DELETE FROM shopping_carts');
    } catch (error) {
      console.error('Warning: Failed to cleanup cart and order data:', error);
      // Don't throw to avoid breaking test flow
    }
  }

  /**
   * Clean up test data after each test (preserves schema)
   */
  static async cleanupTestData(): Promise<void> {
    try {
      // Clear data in dependency order
      await pool.execute('DELETE FROM order_items');
      await pool.execute('DELETE FROM orders');
      await pool.execute('DELETE FROM shopping_carts');
      await pool.execute('DELETE FROM products');
      await pool.execute('DELETE FROM users');
      await pool.execute('DELETE FROM categories');
    } catch (error) {
      console.error('Warning: Failed to cleanup test data:', error);
      // Don't throw to avoid breaking test flow
    }
  }

  /**
   * Clear all tables in proper order
   */
  private static async clearAllTables(): Promise<void> {
    const tables = [
      'order_items',
      'orders', 
      'shopping_carts',
      'products',
      'users',
      'categories'
    ];

    for (const table of tables) {
      try {
        await pool.execute(`DELETE FROM ${table}`);
      } catch (error) {
        // Ignore errors for tables that don't exist yet
        console.warn(`Warning: Could not clear table ${table}:`, (error as Error).message);
      }
    }
  }

  /**
   * Create database schema for E2E tests
   */
  private static async createSchema(): Promise<void> {
    // Drop all tables in reverse dependency order to avoid foreign key issues
    await pool.execute('SET FOREIGN_KEY_CHECKS = 0');
    await pool.execute('DROP TABLE IF EXISTS order_items');
    await pool.execute('DROP TABLE IF EXISTS orders');
    await pool.execute('DROP TABLE IF EXISTS shopping_carts');
    await pool.execute('DROP TABLE IF EXISTS products');
    await pool.execute('DROP TABLE IF EXISTS categories');
    await pool.execute('DROP TABLE IF EXISTS users');
    await pool.execute('SET FOREIGN_KEY_CHECKS = 1');
    
    // Create tables in dependency order
    
    // Users table (with is_seller column to match actual schema)
    await pool.execute(`
      CREATE TABLE users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(50) NOT NULL DEFAULT '',
        last_name VARCHAR(50) NOT NULL DEFAULT '',
        is_seller BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_username (username),
        INDEX idx_email (email),
        INDEX idx_is_seller (is_seller)
      )
    `);

    // Categories table
    await pool.execute(`
      CREATE TABLE categories (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        parent_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_parent_id (parent_id),
        INDEX idx_name (name)
      )
    `);
    
    // Add foreign key constraint after table creation
    await pool.execute(`
      ALTER TABLE categories 
      ADD CONSTRAINT fk_categories_parent 
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
    `);

    // Products table (with inventory_quantity as expected by code)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INT PRIMARY KEY AUTO_INCREMENT,
        seller_id INT NOT NULL,
        category_id INT NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        inventory_quantity INT NOT NULL DEFAULT 0,
        image_url VARCHAR(500) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
        INDEX idx_seller_id (seller_id),
        INDEX idx_category_id (category_id),
        INDEX idx_name (name),
        INDEX idx_price (price),
        INDEX idx_inventory (inventory_quantity)
      )
    `);

    // Shopping carts table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS shopping_carts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_product (user_id, product_id),
        INDEX idx_user_id (user_id)
      )
    `);

    // Orders table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      )
    `);

    // Order items table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        price_at_time DECIMAL(10,2) NOT NULL,
        
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
        INDEX idx_order_id (order_id),
        INDEX idx_product_id (product_id)
      )
    `);
  }

  /**
   * Reset auto-increment counters
   */
  private static async resetAutoIncrements(): Promise<void> {
    const tables = [
      'categories',
      'users',
      'products',
      'shopping_carts',
      'orders',
      'order_items'
    ];

    for (const table of tables) {
      try {
        await pool.execute(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
      } catch (error) {
        // Ignore errors for tables that don't exist yet
        console.warn(`Warning: Could not reset auto-increment for ${table}:`, (error as Error).message);
      }
    }
  }

  /**
   * Create a test user with default values
   */
  static async createTestUser(userData: Partial<User> = {}): Promise<User> {
    const defaultUser = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password_hash: '$2b$10$test.hash.for.testing.purposes.only',
      first_name: 'Test',
      last_name: 'User',
      is_seller: false,
      ...userData
    };

    const [result] = await pool.execute(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, is_seller) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        defaultUser.username,
        defaultUser.email,
        defaultUser.password_hash,
        defaultUser.first_name,
        defaultUser.last_name,
        defaultUser.is_seller ? 1 : 0
      ]
    );

    const userId = (result as any).insertId;
    
    return {
      id: userId,
      ...defaultUser,
      created_at: new Date(),
      updated_at: new Date()
    } as User;
  }

  /**
   * Create a test category with default values
   */
  static async createTestCategory(categoryData: Partial<Category> = {}): Promise<Category> {
    const defaultCategory = {
      name: `Test Category ${Date.now()}`,
      parent_id: undefined,
      ...categoryData
    };

    const [result] = await pool.execute(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [defaultCategory.name, 'Test category description']
    );

    const categoryId = (result as any).insertId;

    return {
      id: categoryId,
      name: defaultCategory.name,
      parent_id: defaultCategory.parent_id,
      created_at: new Date()
    } as Category;
  }

  /**
   * Create a test product with default values
   */
  static async createTestProduct(productData: Partial<Product> = {}): Promise<Product> {
    // Ensure we have a category and seller
    const category = await this.createTestCategory();
    const seller = await this.createTestUser({ is_seller: true });

    const defaultProduct = {
      name: `Test Product ${Date.now()}`,
      description: 'Test product description',
      price: 99.99,
      inventory_quantity: 10,
      category_id: category.id,
      seller_id: seller.id,
      ...productData
    };

    const [result] = await pool.execute(
      `INSERT INTO products (name, description, price, stock_quantity, category_id, seller_id) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        defaultProduct.name,
        defaultProduct.description,
        defaultProduct.price,
        defaultProduct.inventory_quantity,
        defaultProduct.category_id,
        defaultProduct.seller_id
      ]
    );

    const productId = (result as any).insertId;

    return {
      id: productId,
      ...defaultProduct,
      created_at: new Date(),
      updated_at: new Date()
    } as Product;
  }
}
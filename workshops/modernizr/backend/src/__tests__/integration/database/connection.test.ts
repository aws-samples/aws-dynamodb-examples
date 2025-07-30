import { pool } from '../../../config/database';
import { RowDataPacket } from 'mysql2';
import { isDatabaseAvailable } from '../../../test-configs/integration-setup';

const describeIfDB = isDatabaseAvailable() ? describe : describe.skip;

describeIfDB('Database Connection Integration', () => {
  afterAll(async () => {
    // Clean up database connections
    if (isDatabaseAvailable()) {
      await pool.end();
    }
  });

  describe('Database Pool', () => {
    it('should connect to the database successfully', async () => {
      const connection = await pool.getConnection();
      expect(connection).toBeDefined();
      connection.release();
    });

    it('should execute a simple query', async () => {
      const [rows] = await pool.execute('SELECT 1 as test') as [RowDataPacket[], any];
      expect(rows).toHaveLength(1);
      expect(rows[0].test).toBe(1);
    });

    it('should handle multiple concurrent connections', async () => {
      const promises = Array.from({ length: 5 }, async (_, i) => {
        const [rows] = await pool.execute('SELECT ? as connection_id', [i]) as [RowDataPacket[], any];
        return rows[0].connection_id;
      });

      const results = await Promise.all(promises);
      expect(results).toEqual([0, 1, 2, 3, 4]);
    });

    it('should handle connection errors gracefully', async () => {
      // Test with invalid query
      await expect(pool.execute('INVALID SQL QUERY'))
        .rejects.toThrow();
    });
  });

  describe('Database Schema', () => {
    it('should have required tables', async () => {
      const [tables] = await pool.execute(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE()
      `) as [RowDataPacket[], any];

      const tableNames = tables.map(row => row.TABLE_NAME);
      
      // Check for essential tables
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('categories');
      expect(tableNames).toContain('products');
      expect(tableNames).toContain('shopping_carts');
      expect(tableNames).toContain('orders');
      expect(tableNames).toContain('order_items');
    });

    it('should have proper table structure for users', async () => {
      const [columns] = await pool.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
        ORDER BY ORDINAL_POSITION
      `) as [RowDataPacket[], any];

      const columnNames = columns.map(col => col.COLUMN_NAME);
      
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('username');
      expect(columnNames).toContain('email');
      expect(columnNames).toContain('password_hash');
      expect(columnNames).toContain('is_seller');
      expect(columnNames).toContain('created_at');
      expect(columnNames).toContain('updated_at');
    });

    it('should have proper table structure for products', async () => {
      const [columns] = await pool.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'
        ORDER BY ORDINAL_POSITION
      `) as [RowDataPacket[], any];

      const columnNames = columns.map(col => col.COLUMN_NAME);
      
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('seller_id');
      expect(columnNames).toContain('category_id');
      expect(columnNames).toContain('name');
      expect(columnNames).toContain('price');
      expect(columnNames).toContain('inventory_quantity');
    });
  });

  describe('Database Constraints', () => {
    it('should enforce foreign key constraints', async () => {
      // Try to insert a product with invalid category_id
      await expect(pool.execute(`
        INSERT INTO products (seller_id, category_id, name, price, inventory_quantity)
        VALUES (1, 99999, 'Test Product', 10.99, 100)
      `)).rejects.toThrow();
    });

    it('should enforce unique constraints', async () => {
      const testUsername = `test_unique_${Date.now()}`;
      
      // First insertion should succeed
      await pool.execute(`
        INSERT INTO users (username, email, password_hash)
        VALUES (?, ?, ?)
      `, [testUsername, `${testUsername}@test.com`, 'hashed_password']);

      // Second insertion with same username should fail
      await expect(pool.execute(`
        INSERT INTO users (username, email, password_hash)
        VALUES (?, ?, ?)
      `, [testUsername, `${testUsername}2@test.com`, 'hashed_password']))
        .rejects.toThrow();

      // Clean up
      await pool.execute('DELETE FROM users WHERE username = ?', [testUsername]);
    });
  });

  describe('Database Performance', () => {
    it('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();
      
      // Create a test category first
      const [categoryResult] = await pool.execute(`
        INSERT INTO categories (name) VALUES (?)
      `, [`test_category_${Date.now()}`]) as [any, any];
      
      const categoryId = categoryResult.insertId;
      
      // Create a test user
      const [userResult] = await pool.execute(`
        INSERT INTO users (username, email, password_hash)
        VALUES (?, ?, ?)
      `, [`test_user_${Date.now()}`, `test_${Date.now()}@test.com`, 'hashed_password']) as [any, any];
      
      const userId = userResult.insertId;
      
      // Bulk insert products
      const productPromises = Array.from({ length: 10 }, (_, i) => 
        pool.execute(`
          INSERT INTO products (seller_id, category_id, name, price, inventory_quantity)
          VALUES (?, ?, ?, ?, ?)
        `, [userId, categoryId, `Test Product ${i}`, 10.99 + i, 100])
      );
      
      await Promise.all(productPromises);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Should complete within reasonable time (5 seconds)
      expect(executionTime).toBeLessThan(5000);
      
      // Clean up
      await pool.execute('DELETE FROM products WHERE seller_id = ?', [userId]);
      await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
      await pool.execute('DELETE FROM categories WHERE id = ?', [categoryId]);
    });
  });
});

// If database is not available, show a message
if (!isDatabaseAvailable()) {
  describe('Database Connection Integration (Skipped)', () => {
    it('should skip database tests when database is not available', () => {
      console.log('⏭️  Database integration tests skipped - database not available');
      expect(true).toBe(true); // Always pass
    });
  });
}
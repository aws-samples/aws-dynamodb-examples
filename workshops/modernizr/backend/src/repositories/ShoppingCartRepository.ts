import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../config/database';
import { ShoppingCartItem, ShoppingCartItemWithProduct } from '../models/ShoppingCart';

export class ShoppingCartRepository {
  async addItem(userId: number, productId: number, quantity: number): Promise<ShoppingCartItem> {
    const connection = await pool.getConnection();
    
    try {
      // Check if item already exists in cart
      const [existingItems] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM shopping_carts WHERE user_id = ? AND product_id = ?',
        [userId, productId]
      );

      if (existingItems.length > 0) {
        // Update existing item quantity
        const newQuantity = existingItems[0].quantity + quantity;
        const [result] = await connection.execute<ResultSetHeader>(
          'UPDATE shopping_carts SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND product_id = ?',
          [newQuantity, userId, productId]
        );

        if (result.affectedRows === 0) {
          throw new Error('Failed to update cart item');
        }

        return {
          id: existingItems[0].id,
          userId,
          productId,
          quantity: newQuantity,
          createdAt: existingItems[0].created_at,
          updatedAt: new Date()
        };
      } else {
        // Insert new item
        const [result] = await connection.execute<ResultSetHeader>(
          'INSERT INTO shopping_carts (user_id, product_id, quantity) VALUES (?, ?, ?)',
          [userId, productId, quantity]
        );

        if (result.affectedRows === 0) {
          throw new Error('Failed to add item to cart');
        }

        return {
          id: result.insertId,
          userId,
          productId,
          quantity,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
    } finally {
      connection.release();
    }
  }

  async getCartItems(userId: number): Promise<ShoppingCartItemWithProduct[]> {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT 
          sc.id,
          sc.user_id,
          sc.product_id,
          sc.quantity,
          sc.created_at,
          sc.updated_at,
          p.id as product_id,
          p.seller_id,
          p.category_id,
          p.name as product_name,
          p.description as product_description,
          p.price as product_price,
          p.inventory_quantity as product_inventory,
          p.image_url as product_image_url,
          p.created_at as product_created_at,
          p.updated_at as product_updated_at,
          c.name as category_name,
          u.username as seller_username,
          u.email as seller_email
        FROM shopping_carts sc
        JOIN products p ON sc.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        JOIN users u ON p.seller_id = u.id
        WHERE sc.user_id = ?
        ORDER BY sc.created_at DESC`,
        [userId]
      );

      return rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        productId: row.product_id,
        quantity: row.quantity,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        product: {
          id: row.product_id,
          seller_id: row.seller_id,
          category_id: row.category_id,
          name: row.product_name,
          description: row.product_description,
          price: parseFloat(row.product_price),
          inventory_quantity: row.product_inventory,
          image_url: row.product_image_url,
          category_name: row.category_name,
          seller_username: row.seller_username,
          seller_email: row.seller_email,
          created_at: row.product_created_at,
          updated_at: row.product_updated_at
        }
      }));
    } finally {
      connection.release();
    }
  }

  async updateItemQuantity(userId: number, productId: number, quantity: number): Promise<boolean> {
    const connection = await pool.getConnection();
    
    try {
      if (quantity === 0) {
        // Remove item if quantity is 0
        return await this.removeItem(userId, productId);
      }

      const [result] = await connection.execute<ResultSetHeader>(
        'UPDATE shopping_carts SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND product_id = ?',
        [quantity, userId, productId]
      );

      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  async removeItem(userId: number, productId: number): Promise<boolean> {
    const connection = await pool.getConnection();
    
    try {
      const [result] = await connection.execute<ResultSetHeader>(
        'DELETE FROM shopping_carts WHERE user_id = ? AND product_id = ?',
        [userId, productId]
      );

      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  async clearCart(userId: number): Promise<boolean> {
    const connection = await pool.getConnection();
    
    try {
      const [result] = await connection.execute<ResultSetHeader>(
        'DELETE FROM shopping_carts WHERE user_id = ?',
        [userId]
      );

      return result.affectedRows >= 0; // Return true even if cart was already empty
    } finally {
      connection.release();
    }
  }

  async getCartItemCount(userId: number): Promise<number> {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM shopping_carts WHERE user_id = ?',
        [userId]
      );

      return rows[0].count;
    } finally {
      connection.release();
    }
  }

  async getCartItemByUserAndProduct(userId: number, productId: number): Promise<ShoppingCartItem | null> {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM shopping_carts WHERE user_id = ? AND product_id = ?',
        [userId, productId]
      );

      if (rows.length === 0) {
        return null;
      }

      const row = rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        productId: row.product_id,
        quantity: row.quantity,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } finally {
      connection.release();
    }
  }

  async validateCartInventory(userId: number): Promise<{ valid: boolean; issues: string[] }> {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT 
          sc.product_id,
          sc.quantity as cart_quantity,
          p.name as product_name,
          p.inventory_quantity as available_inventory
        FROM shopping_carts sc
        JOIN products p ON sc.product_id = p.id
        WHERE sc.user_id = ? AND sc.quantity > p.inventory_quantity`,
        [userId]
      );

      const issues: string[] = [];
      
      for (const row of rows) {
        issues.push(
          `${row.product_name}: requested ${row.cart_quantity}, but only ${row.available_inventory} available`
        );
      }

      return {
        valid: issues.length === 0,
        issues
      };
    } finally {
      connection.release();
    }
  }
}
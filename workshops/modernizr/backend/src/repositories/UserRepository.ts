import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../config/database';
import { User, CreateUserRequest, UpdateUserRequest } from '../models/User';

export class UserRepository {
  
  async findById(id: number): Promise<User | null> {
    try {
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );
      
      if (rows.length === 0) {
        return null;
      }
      
      return this.mapDbRowToUser(rows[0]);
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }
  
  async findByUsername(username: string): Promise<User | null> {
    try {
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );
      
      if (rows.length === 0) {
        return null;
      }
      
      return this.mapDbRowToUser(rows[0]);
    } catch (error) {
      console.error('Error finding user by username:', error);
      throw error;
    }
  }
  
  async findByEmail(email: string): Promise<User | null> {
    try {
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      
      if (rows.length === 0) {
        return null;
      }
      
      return this.mapDbRowToUser(rows[0]);
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }
  
  async create(userData: CreateUserRequest & { password_hash: string }): Promise<User> {
    try {
      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO users (username, email, password_hash, first_name, last_name, role) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userData.username,
          userData.email,
          userData.password_hash,
          userData.first_name || '',
          userData.last_name || '',
          'customer' // Default to customer role
        ]
      );
      
      const userId = result.insertId;
      const user = await this.findById(userId);
      
      if (!user) {
        throw new Error('Failed to retrieve created user');
      }
      
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
  
  async update(id: number, userData: UpdateUserRequest): Promise<User | null> {
    try {
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      
      if (userData.first_name !== undefined) {
        updateFields.push('first_name = ?');
        updateValues.push(userData.first_name);
      }
      
      if (userData.last_name !== undefined) {
        updateFields.push('last_name = ?');
        updateValues.push(userData.last_name);
      }
      
      if (userData.email !== undefined) {
        updateFields.push('email = ?');
        updateValues.push(userData.email);
      }
      
      if (updateFields.length === 0) {
        // No fields to update
        return this.findById(id);
      }
      
      updateValues.push(id);
      
      await pool.execute(
        `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        updateValues
      );
      
      return this.findById(id);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
  
  async upgradeToSeller(id: number): Promise<User | null> {
    try {
      await pool.execute(
        'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['seller', id]
      );
      
      return this.findById(id);
    } catch (error) {
      console.error('Error upgrading user to seller:', error);
      throw error;
    }
  }

  /**
   * Map database row to User model
   * Converts 'role' field to 'is_seller' boolean
   */
  private mapDbRowToUser(row: any): User {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      password_hash: row.password_hash,
      first_name: row.first_name,
      last_name: row.last_name,
      is_seller: row.role === 'seller',
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
  
  async delete(id: number): Promise<boolean> {
    try {
      const [result] = await pool.execute<ResultSetHeader>(
        'DELETE FROM users WHERE id = ?',
        [id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
  
  async existsByUsername(username: string): Promise<boolean> {
    try {
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM users WHERE username = ?',
        [username]
      );
      
      return (rows[0] as any).count > 0;
    } catch (error) {
      console.error('Error checking username existence:', error);
      throw error;
    }
  }
  
  async existsByEmail(email: string): Promise<boolean> {
    try {
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM users WHERE email = ?',
        [email]
      );
      
      return (rows[0] as any).count > 0;
    } catch (error) {
      console.error('Error checking email existence:', error);
      throw error;
    }
  }
}
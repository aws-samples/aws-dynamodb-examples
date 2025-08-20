import { pool, executeWithTracking } from '../config/database';
import { Category, CreateCategoryRequest, UpdateCategoryRequest } from '../models/Category';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class CategoryRepository {
  /**
   * Get all categories from the database
   */
  async findAll(): Promise<Category[]> {
    const { results: rows } = await executeWithTracking(
      'SELECT id, name, parent_id, created_at FROM categories ORDER BY name'
    );
    
    return (rows as any[]).map(row => ({
      id: row.id,
      name: row.name,
      parent_id: row.parent_id || undefined,
      created_at: row.created_at,
    }));
  }

  /**
   * Get a category by ID
   */
  async findById(id: number): Promise<Category | null> {
    const { results: rows } = await executeWithTracking(
      'SELECT id, name, parent_id, created_at FROM categories WHERE id = ?',
      [id]
    );

    if ((rows as any[]).length === 0) {
      return null;
    }

    const row = (rows as any[])[0];
    return {
      id: row.id,
      name: row.name,
      parent_id: row.parent_id || undefined,
      created_at: row.created_at,
    };
  }

  /**
   * Get categories by parent ID (null for root categories)
   */
  async findByParentId(parentId: number | null): Promise<Category[]> {
    let query: string;
    let params: any[];

    if (parentId === null) {
      query = 'SELECT id, name, parent_id, created_at FROM categories WHERE parent_id IS NULL ORDER BY name';
      params = [];
    } else {
      query = 'SELECT id, name, parent_id, created_at FROM categories WHERE parent_id = ? ORDER BY name';
      params = [parentId];
    }

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      parent_id: row.parent_id || undefined,
      created_at: row.created_at,
    }));
  }

  /**
   * Get root categories (categories with no parent)
   */
  async findRootCategories(): Promise<Category[]> {
    return this.findByParentId(null);
  }

  /**
   * Get child categories for a specific parent
   */
  async findChildCategories(parentId: number): Promise<Category[]> {
    return this.findByParentId(parentId);
  }

  /**
   * Create a new category
   */
  async create(categoryData: CreateCategoryRequest): Promise<Category> {
    const { name, parent_id } = categoryData;
    
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO categories (name, parent_id) VALUES (?, ?)',
      [name, parent_id || null]
    );

    const createdCategory = await this.findById(result.insertId);
    if (!createdCategory) {
      throw new Error('Failed to retrieve created category');
    }

    return createdCategory;
  }

  /**
   * Update a category
   */
  async update(id: number, updateData: UpdateCategoryRequest): Promise<Category | null> {
    const { name, parent_id } = updateData;
    
    // Build dynamic update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }

    if (parent_id !== undefined) {
      updateFields.push('parent_id = ?');
      updateValues.push(parent_id || null);
    }

    if (updateFields.length === 0) {
      // No fields to update, return existing category
      return this.findById(id);
    }

    updateValues.push(id);

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE categories SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    if (result.affectedRows === 0) {
      return null;
    }

    return this.findById(id);
  }

  /**
   * Delete a category
   */
  async delete(id: number): Promise<boolean> {
    // First check if category has children
    const children = await this.findChildCategories(id);
    if (children.length > 0) {
      throw new Error('Cannot delete category with child categories');
    }

    // Check if category has products (this will be implemented when we add products)
    // For now, we'll just delete the category

    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM categories WHERE id = ?',
      [id]
    );

    return result.affectedRows > 0;
  }

  /**
   * Check if a category exists by name
   */
  async existsByName(name: string, excludeId?: number): Promise<boolean> {
    let query = 'SELECT COUNT(*) as count FROM categories WHERE name = ?';
    const params: any[] = [name];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    return rows[0].count > 0;
  }

  /**
   * Check if a category exists by ID
   */
  async existsById(id: number): Promise<boolean> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM categories WHERE id = ?',
      [id]
    );
    return rows[0].count > 0;
  }

  /**
   * Validate that parent_id exists (if provided)
   */
  async validateParentId(parentId: number | undefined): Promise<boolean> {
    if (!parentId) {
      return true; // null parent is valid (root category)
    }

    return this.existsById(parentId);
  }

  /**
   * Check if creating a parent-child relationship would create a cycle
   */
  async wouldCreateCycle(categoryId: number, newParentId: number): Promise<boolean> {
    if (categoryId === newParentId) {
      return true; // Category cannot be its own parent
    }

    // Check if newParentId is a descendant of categoryId
    const checkDescendant = async (currentId: number, targetId: number): Promise<boolean> => {
      const children = await this.findChildCategories(currentId);
      
      for (const child of children) {
        if (child.id === targetId) {
          return true; // Found the target as a direct child
        }
        
        // Recursively check child's descendants
        if (await checkDescendant(child.id, targetId)) {
          return true;
        }
      }
      
      return false;
    };

    return checkDescendant(categoryId, newParentId);
  }

  /**
   * Get category path (breadcrumb) from root to category
   */
  async getCategoryPath(categoryId: number): Promise<Category[]> {
    const path: Category[] = [];
    let currentId: number | undefined = categoryId;

    while (currentId) {
      const category = await this.findById(currentId);
      if (!category) {
        break;
      }
      
      path.unshift(category); // Add to beginning of array
      currentId = category.parent_id;
    }

    return path;
  }
}
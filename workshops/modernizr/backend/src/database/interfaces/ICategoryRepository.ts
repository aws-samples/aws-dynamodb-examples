import { Category, CreateCategoryRequest, UpdateCategoryRequest, CategoryTreeResponse } from '../../models/Category';

/**
 * Abstract interface for Category repository operations
 * Supports both MySQL and DynamoDB implementations
 */
export interface ICategoryRepository {
  /**
   * Get all categories
   * @returns Promise resolving to array of Categories
   */
  findAll(): Promise<Category[]>;

  /**
   * Find category by ID
   * @param id Category ID
   * @returns Promise resolving to Category or null if not found
   */
  findById(id: number): Promise<Category | null>;

  /**
   * Find categories by parent ID
   * @param parentId Parent category ID (null for root categories)
   * @returns Promise resolving to array of Categories
   */
  findByParentId(parentId: number | null): Promise<Category[]>;

  /**
   * Find root categories (categories with no parent)
   * @returns Promise resolving to array of root Categories
   */
  findRootCategories(): Promise<Category[]>;

  /**
   * Find child categories of a parent
   * @param parentId Parent category ID
   * @returns Promise resolving to array of child Categories
   */
  findChildCategories(parentId: number): Promise<Category[]>;

  /**
   * Create a new category
   * @param categoryData Category creation data
   * @returns Promise resolving to created Category
   */
  create(categoryData: CreateCategoryRequest): Promise<Category>;

  /**
   * Update category information
   * @param id Category ID
   * @param categoryData Updated category data
   * @returns Promise resolving to updated Category or null if not found
   */
  update(id: number, categoryData: UpdateCategoryRequest): Promise<Category | null>;

  /**
   * Delete category by ID
   * @param id Category ID
   * @returns Promise resolving to boolean indicating success
   */
  delete(id: number): Promise<boolean>;

  /**
   * Check if category name exists
   * @param name Category name
   * @param excludeId Optional ID to exclude from check
   * @returns Promise resolving to boolean
   */
  existsByName(name: string, excludeId?: number): Promise<boolean>;

  /**
   * Check if category exists by ID
   * @param id Category ID
   * @returns Promise resolving to boolean
   */
  existsById(id: number): Promise<boolean>;

  /**
   * Validate parent ID exists
   * @param parentId Parent ID to validate
   * @returns Promise resolving to boolean
   */
  validateParentId(parentId: number | undefined): Promise<boolean>;

  /**
   * Check if setting parent would create a cycle
   * @param categoryId Category ID
   * @param newParentId New parent ID
   * @returns Promise resolving to boolean
   */
  wouldCreateCycle(categoryId: number, newParentId: number): Promise<boolean>;

  /**
   * Get category path from root to category
   * @param categoryId Category ID
   * @returns Promise resolving to array of Categories in path
   */
  getCategoryPath(categoryId: number): Promise<Category[]>;

  /**
   * Increment product count for a category
   * @param categoryId Category ID
   * @param increment Amount to increment (can be negative)
   * @returns Promise resolving when complete
   */
  incrementProductCount?(categoryId: number, increment: number): Promise<void>;
}

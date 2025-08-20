import { ICategoryRepository } from '../database/interfaces/ICategoryRepository';
import { DatabaseFactory } from '../database/factory/DatabaseFactory';
import { 
  Category, 
  CategoryTreeResponse, 
  CreateCategoryRequest, 
  UpdateCategoryRequest,
  buildCategoryTree,
  getCategorySubtreeIds
} from '../models/Category';

export class CategoryService {
  constructor() {
    // No longer cache repository - get fresh one on each request
  }

  private getCategoryRepository(): ICategoryRepository {
    return DatabaseFactory.createCategoryRepository();
  }

  /**
   * Get all categories as a flat list
   */
  async getAllCategories(): Promise<Category[]> {
    return this.getCategoryRepository().findAll();
  }

  /**
   * Get categories organized in a hierarchical tree structure
   */
  async getCategoryTree(): Promise<CategoryTreeResponse[]> {
    const categories = await this.getCategoryRepository().findAll();
    return buildCategoryTree(categories);
  }

  /**
   * Get a specific category by ID
   */
  async getCategoryById(id: number): Promise<Category | null> {
    return this.getCategoryRepository().findById(id);
  }

  /**
   * Get root categories (top-level categories)
   */
  async getRootCategories(): Promise<Category[]> {
    return this.getCategoryRepository().findRootCategories();
  }

  /**
   * Get child categories for a specific parent category
   */
  async getChildCategories(parentId: number): Promise<Category[]> {
    // First verify the parent category exists
    const parentExists = await this.getCategoryRepository().existsById(parentId);
    if (!parentExists) {
      throw new Error('Parent category not found');
    }

    return this.getCategoryRepository().findChildCategories(parentId);
  }

  /**
   * Create a new category
   */
  async createCategory(categoryData: CreateCategoryRequest): Promise<Category> {
    // Validate input
    if (!categoryData.name || categoryData.name.trim().length === 0) {
      throw new Error('Category name is required');
    }

    if (categoryData.name.length > 100) {
      throw new Error('Category name must be 100 characters or less');
    }

    // Check if category name already exists
    const nameExists = await this.getCategoryRepository().existsByName(categoryData.name.trim());
    if (nameExists) {
      throw new Error('Category name already exists');
    }

    // Validate parent_id if provided
    if (categoryData.parent_id) {
      const parentValid = await this.getCategoryRepository().validateParentId(categoryData.parent_id);
      if (!parentValid) {
        throw new Error('Parent category not found');
      }

      // For two-level hierarchy, ensure we don't create more than 2 levels
      const parentCategory = await this.getCategoryRepository().findById(categoryData.parent_id);
      if (parentCategory && parentCategory.parent_id) {
        throw new Error('Cannot create more than two levels of categories');
      }
    }

    return this.getCategoryRepository().create({
      name: categoryData.name.trim(),
      parent_id: categoryData.parent_id,
    });
  }

  /**
   * Update an existing category
   */
  async updateCategory(id: number, updateData: UpdateCategoryRequest): Promise<Category | null> {
    // Check if category exists
    const existingCategory = await this.getCategoryRepository().findById(id);
    if (!existingCategory) {
      throw new Error('Category not found');
    }

    // Validate name if provided
    if (updateData.name !== undefined) {
      if (!updateData.name || updateData.name.trim().length === 0) {
        throw new Error('Category name is required');
      }

      if (updateData.name.length > 100) {
        throw new Error('Category name must be 100 characters or less');
      }

      // Check if name already exists (excluding current category)
      const nameExists = await this.getCategoryRepository().existsByName(updateData.name.trim(), id);
      if (nameExists) {
        throw new Error('Category name already exists');
      }
    }

    // Validate parent_id if provided
    if (updateData.parent_id !== undefined) {
      if (updateData.parent_id) {
        const parentValid = await this.getCategoryRepository().validateParentId(updateData.parent_id);
        if (!parentValid) {
          throw new Error('Parent category not found');
        }

        // Check for cycles
        const wouldCreateCycle = await this.getCategoryRepository().wouldCreateCycle(id, updateData.parent_id);
        if (wouldCreateCycle) {
          throw new Error('Cannot create circular category relationship');
        }

        // For two-level hierarchy, ensure we don't create more than 2 levels
        const parentCategory = await this.getCategoryRepository().findById(updateData.parent_id);
        if (parentCategory && parentCategory.parent_id) {
          throw new Error('Cannot create more than two levels of categories');
        }

        // If this category has children, it cannot become a child itself (two-level limit)
        const children = await this.getCategoryRepository().findChildCategories(id);
        if (children.length > 0) {
          throw new Error('Category with children cannot become a subcategory');
        }
      }
    }

    const processedUpdateData: UpdateCategoryRequest = {};
    if (updateData.name !== undefined) {
      processedUpdateData.name = updateData.name.trim();
    }
    if (updateData.parent_id !== undefined) {
      processedUpdateData.parent_id = updateData.parent_id;
    }

    return this.getCategoryRepository().update(id, processedUpdateData);
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: number): Promise<boolean> {
    // Check if category exists
    const existingCategory = await this.getCategoryRepository().findById(id);
    if (!existingCategory) {
      throw new Error('Category not found');
    }

    // The repository will check for children and products
    return this.getCategoryRepository().delete(id);
  }

  /**
   * Get category path (breadcrumb) from root to category
   */
  async getCategoryPath(categoryId: number): Promise<Category[]> {
    const category = await this.getCategoryRepository().findById(categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    return this.getCategoryRepository().getCategoryPath(categoryId);
  }

  /**
   * Get all category IDs in a subtree (useful for product filtering)
   */
  async getCategorySubtreeIds(categoryId: number): Promise<number[]> {
    const category = await this.getCategoryRepository().findById(categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    const categoryTree = await this.getCategoryTree();
    return getCategorySubtreeIds(categoryId, categoryTree);
  }

  /**
   * Search categories by name
   */
  async searchCategories(searchTerm: string): Promise<Category[]> {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return [];
    }

    const allCategories = await this.getCategoryRepository().findAll();
    const searchTermLower = searchTerm.trim().toLowerCase();

    return allCategories.filter(category =>
      category.name.toLowerCase().includes(searchTermLower)
    );
  }

  /**
   * Validate category hierarchy constraints
   */
  async validateCategoryHierarchy(): Promise<{ valid: boolean; errors: string[] }> {
    const categories = await this.getCategoryRepository().findAll();
    const errors: string[] = [];

    // Check for cycles
    const visited = new Set<number>();
    const recursionStack = new Set<number>();

    const hasCycle = (categoryId: number): boolean => {
      if (recursionStack.has(categoryId)) {
        return true; // Cycle detected
      }

      if (visited.has(categoryId)) {
        return false; // Already processed
      }

      visited.add(categoryId);
      recursionStack.add(categoryId);

      const category = categories.find(c => c.id === categoryId);
      if (category && category.parent_id) {
        if (hasCycle(category.parent_id)) {
          return true;
        }
      }

      recursionStack.delete(categoryId);
      return false;
    };

    // Check each category for cycles
    for (const category of categories) {
      if (hasCycle(category.id)) {
        errors.push(`Cycle detected involving category: ${category.name}`);
      }
    }

    // Check for more than 2 levels
    for (const category of categories) {
      if (category.parent_id) {
        const parent = categories.find(c => c.id === category.parent_id);
        if (parent && parent.parent_id) {
          errors.push(`Category "${category.name}" creates more than 2 levels of hierarchy`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
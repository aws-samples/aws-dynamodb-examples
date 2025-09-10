export interface Category {
  id: number;
  name: string;
  parent_id?: number;
  created_at: Date;
}

export interface CategoryWithChildren extends Category {
  children?: CategoryWithChildren[];
}

export interface CreateCategoryRequest {
  name: string;
  parent_id?: number;
}

export interface UpdateCategoryRequest {
  name?: string;
  parent_id?: number;
}

export interface CategoryResponse {
  id: number;
  name: string;
  parent_id?: number;
  created_at: Date;
}

export interface CategoryTreeResponse {
  id: number;
  name: string;
  parent_id?: number;
  created_at: Date;
  children?: CategoryTreeResponse[];
}

/**
 * Convert Category to CategoryResponse by ensuring consistent format
 */
export function toCategoryResponse(category: Category): CategoryResponse {
  return {
    id: category.id,
    name: category.name,
    parent_id: category.parent_id,
    created_at: category.created_at,
  };
}

/**
 * Build hierarchical category tree from flat category list
 */
export function buildCategoryTree(categories: Category[]): CategoryTreeResponse[] {
  const categoryMap = new Map<number, CategoryTreeResponse>();
  const rootCategories: CategoryTreeResponse[] = [];

  // First pass: create all category nodes
  categories.forEach(category => {
    categoryMap.set(category.id, {
      id: category.id,
      name: category.name,
      parent_id: category.parent_id,
      created_at: category.created_at,
      children: [],
    });
  });

  // Second pass: build the tree structure
  categories.forEach(category => {
    const categoryNode = categoryMap.get(category.id)!;
    
    if (category.parent_id) {
      // This is a child category
      const parentNode = categoryMap.get(category.parent_id);
      if (parentNode) {
        parentNode.children!.push(categoryNode);
      }
    } else {
      // This is a root category
      rootCategories.push(categoryNode);
    }
  });

  // Sort categories by name at each level
  const sortCategories = (categories: CategoryTreeResponse[]) => {
    categories.sort((a, b) => a.name.localeCompare(b.name));
    categories.forEach(category => {
      if (category.children && category.children.length > 0) {
        sortCategories(category.children);
      }
    });
  };

  sortCategories(rootCategories);
  return rootCategories;
}

/**
 * Get all category IDs in a subtree (including the root category)
 */
export function getCategorySubtreeIds(categoryId: number, categoryTree: CategoryTreeResponse[]): number[] {
  const findCategoryAndDescendants = (categories: CategoryTreeResponse[], targetId: number): number[] => {
    for (const category of categories) {
      if (category.id === targetId) {
        // Found the target category, collect all descendant IDs
        const collectIds = (cat: CategoryTreeResponse): number[] => {
          const ids = [cat.id];
          if (cat.children) {
            cat.children.forEach(child => {
              ids.push(...collectIds(child));
            });
          }
          return ids;
        };
        return collectIds(category);
      }
      
      // Search in children
      if (category.children) {
        const result = findCategoryAndDescendants(category.children, targetId);
        if (result.length > 0) {
          return result;
        }
      }
    }
    return [];
  };

  return findCategoryAndDescendants(categoryTree, categoryId);
}
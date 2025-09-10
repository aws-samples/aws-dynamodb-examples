import { 
  buildCategoryTree, 
  getCategorySubtreeIds, 
  toCategoryResponse,
  Category,
  CategoryTreeResponse 
} from '../../../models/Category';

describe('Category Model', () => {
  describe('toCategoryResponse', () => {
    it('should convert Category to CategoryResponse', () => {
      const category: Category = {
        id: 1,
        name: 'Electronics',
        parent_id: undefined,
        created_at: new Date('2025-01-01T00:00:00.000Z'),
      };

      const result = toCategoryResponse(category);

      expect(result).toEqual({
        id: 1,
        name: 'Electronics',
        parent_id: undefined,
        created_at: new Date('2025-01-01T00:00:00.000Z'),
      });
    });

    it('should handle category with parent_id', () => {
      const category: Category = {
        id: 2,
        name: 'Laptops',
        parent_id: 1,
        created_at: new Date('2025-01-01T00:00:00.000Z'),
      };

      const result = toCategoryResponse(category);

      expect(result).toEqual({
        id: 2,
        name: 'Laptops',
        parent_id: 1,
        created_at: new Date('2025-01-01T00:00:00.000Z'),
      });
    });
  });

  describe('buildCategoryTree', () => {
    it('should build hierarchical tree from flat category list', () => {
      const categories: Category[] = [
        {
          id: 1,
          name: 'Electronics',
          parent_id: undefined,
          created_at: new Date('2025-01-01T00:00:00.000Z'),
        },
        {
          id: 2,
          name: 'Laptops',
          parent_id: 1,
          created_at: new Date('2025-01-01T00:00:00.000Z'),
        },
        {
          id: 3,
          name: 'Smartphones',
          parent_id: 1,
          created_at: new Date('2025-01-01T00:00:00.000Z'),
        },
        {
          id: 4,
          name: 'Garden',
          parent_id: undefined,
          created_at: new Date('2025-01-01T00:00:00.000Z'),
        },
        {
          id: 5,
          name: 'Tools',
          parent_id: 4,
          created_at: new Date('2025-01-01T00:00:00.000Z'),
        },
      ];

      const result = buildCategoryTree(categories);

      expect(result).toHaveLength(2); // Two root categories
      
      // Electronics category
      const electronics = result.find(c => c.name === 'Electronics');
      expect(electronics).toBeDefined();
      expect(electronics!.children).toHaveLength(2);
      expect(electronics!.children!.map(c => c.name)).toEqual(['Laptops', 'Smartphones']);
      
      // Garden category
      const garden = result.find(c => c.name === 'Garden');
      expect(garden).toBeDefined();
      expect(garden!.children).toHaveLength(1);
      expect(garden!.children![0].name).toBe('Tools');
    });

    it('should sort categories alphabetically at each level', () => {
      const categories: Category[] = [
        {
          id: 1,
          name: 'Zebra',
          parent_id: undefined,
          created_at: new Date('2025-01-01T00:00:00.000Z'),
        },
        {
          id: 2,
          name: 'Alpha',
          parent_id: undefined,
          created_at: new Date('2025-01-01T00:00:00.000Z'),
        },
        {
          id: 3,
          name: 'Zulu',
          parent_id: 2,
          created_at: new Date('2025-01-01T00:00:00.000Z'),
        },
        {
          id: 4,
          name: 'Beta',
          parent_id: 2,
          created_at: new Date('2025-01-01T00:00:00.000Z'),
        },
      ];

      const result = buildCategoryTree(categories);

      // Root level should be sorted
      expect(result.map(c => c.name)).toEqual(['Alpha', 'Zebra']);
      
      // Children should be sorted
      const alpha = result.find(c => c.name === 'Alpha');
      expect(alpha!.children!.map(c => c.name)).toEqual(['Beta', 'Zulu']);
    });

    it('should handle empty category list', () => {
      const result = buildCategoryTree([]);
      expect(result).toEqual([]);
    });

    it('should handle categories with no children', () => {
      const categories: Category[] = [
        {
          id: 1,
          name: 'Electronics',
          parent_id: undefined,
          created_at: new Date('2025-01-01T00:00:00.000Z'),
        },
      ];

      const result = buildCategoryTree(categories);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Electronics');
      expect(result[0].children).toEqual([]);
    });
  });

  describe('getCategorySubtreeIds', () => {
    const categoryTree: CategoryTreeResponse[] = [
      {
        id: 1,
        name: 'Electronics',
        parent_id: undefined,
        created_at: new Date('2025-01-01T00:00:00.000Z'),
        children: [
          {
            id: 2,
            name: 'Laptops',
            parent_id: 1,
            created_at: new Date('2025-01-01T00:00:00.000Z'),
            children: [],
          },
          {
            id: 3,
            name: 'Smartphones',
            parent_id: 1,
            created_at: new Date('2025-01-01T00:00:00.000Z'),
            children: [],
          },
        ],
      },
      {
        id: 4,
        name: 'Garden',
        parent_id: undefined,
        created_at: new Date('2025-01-01T00:00:00.000Z'),
        children: [
          {
            id: 5,
            name: 'Tools',
            parent_id: 4,
            created_at: new Date('2025-01-01T00:00:00.000Z'),
            children: [],
          },
        ],
      },
    ];

    it('should return all IDs in subtree for root category', () => {
      const result = getCategorySubtreeIds(1, categoryTree);
      expect(result.sort()).toEqual([1, 2, 3]);
    });

    it('should return only category ID for leaf category', () => {
      const result = getCategorySubtreeIds(2, categoryTree);
      expect(result).toEqual([2]);
    });

    it('should return category and children IDs', () => {
      const result = getCategorySubtreeIds(4, categoryTree);
      expect(result.sort()).toEqual([4, 5]);
    });

    it('should return empty array for non-existent category', () => {
      const result = getCategorySubtreeIds(999, categoryTree);
      expect(result).toEqual([]);
    });

    it('should handle empty category tree', () => {
      const result = getCategorySubtreeIds(1, []);
      expect(result).toEqual([]);
    });
  });
});
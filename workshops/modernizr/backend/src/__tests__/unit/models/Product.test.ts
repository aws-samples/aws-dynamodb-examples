import {
  validateCreateProductRequest,
  validateUpdateProductRequest,
  toProductResponse,
  ProductWithDetails
} from '../../../models/Product';

describe('Product Model', () => {
  describe('validateCreateProductRequest', () => {
    it('should validate a valid product creation request', () => {
      const validData = {
        name: 'Test Product',
        description: 'A test product description',
        category_id: 1,
        price: 29.99,
        inventory_quantity: 100
      };

      const result = validateCreateProductRequest(validData);

      expect(result).toEqual({
        name: 'Test Product',
        description: 'A test product description',
        category_id: 1,
        price: 29.99,
        inventory_quantity: 100
      });
    });

    it('should validate a product without description', () => {
      const validData = {
        name: 'Test Product',
        category_id: 1,
        price: 29.99,
        inventory_quantity: 100
      };

      const result = validateCreateProductRequest(validData);

      expect(result).toEqual({
        name: 'Test Product',
        description: undefined,
        category_id: 1,
        price: 29.99,
        inventory_quantity: 100
      });
    });

    it('should throw error for missing name', () => {
      const invalidData = {
        category_id: 1,
        price: 29.99,
        inventory_quantity: 100
      };

      expect(() => validateCreateProductRequest(invalidData))
        .toThrow('Product name is required');
    });

    it('should throw error for empty name', () => {
      const invalidData = {
        name: '   ',
        category_id: 1,
        price: 29.99,
        inventory_quantity: 100
      };

      expect(() => validateCreateProductRequest(invalidData))
        .toThrow('Product name is required');
    });

    it('should throw error for name too long', () => {
      const invalidData = {
        name: 'a'.repeat(201),
        category_id: 1,
        price: 29.99,
        inventory_quantity: 100
      };

      expect(() => validateCreateProductRequest(invalidData))
        .toThrow('Product name must be 200 characters or less');
    });

    it('should throw error for invalid category_id', () => {
      const invalidData = {
        name: 'Test Product',
        category_id: 'invalid',
        price: 29.99,
        inventory_quantity: 100
      };

      expect(() => validateCreateProductRequest(invalidData))
        .toThrow('Valid category ID is required');
    });

    it('should throw error for zero category_id', () => {
      const invalidData = {
        name: 'Test Product',
        category_id: 0,
        price: 29.99,
        inventory_quantity: 100
      };

      expect(() => validateCreateProductRequest(invalidData))
        .toThrow('Valid category ID is required');
    });

    it('should throw error for invalid price', () => {
      const invalidData = {
        name: 'Test Product',
        category_id: 1,
        price: 'invalid',
        inventory_quantity: 100
      };

      expect(() => validateCreateProductRequest(invalidData))
        .toThrow('Valid price greater than 0 is required');
    });

    it('should throw error for zero price', () => {
      const invalidData = {
        name: 'Test Product',
        category_id: 1,
        price: 0,
        inventory_quantity: 100
      };

      expect(() => validateCreateProductRequest(invalidData))
        .toThrow('Valid price greater than 0 is required');
    });

    it('should throw error for price too high', () => {
      const invalidData = {
        name: 'Test Product',
        category_id: 1,
        price: 1000000,
        inventory_quantity: 100
      };

      expect(() => validateCreateProductRequest(invalidData))
        .toThrow('Price cannot exceed $999,999.99');
    });

    it('should throw error for negative inventory', () => {
      const invalidData = {
        name: 'Test Product',
        category_id: 1,
        price: 29.99,
        inventory_quantity: -1
      };

      expect(() => validateCreateProductRequest(invalidData))
        .toThrow('Inventory quantity must be a non-negative integer');
    });

    it('should throw error for inventory too high', () => {
      const invalidData = {
        name: 'Test Product',
        category_id: 1,
        price: 29.99,
        inventory_quantity: 1000000
      };

      expect(() => validateCreateProductRequest(invalidData))
        .toThrow('Inventory quantity cannot exceed 999,999');
    });

    it('should throw error for description too long', () => {
      const invalidData = {
        name: 'Test Product',
        description: 'a'.repeat(2001),
        category_id: 1,
        price: 29.99,
        inventory_quantity: 100
      };

      expect(() => validateCreateProductRequest(invalidData))
        .toThrow('Product description must be 2000 characters or less');
    });
  });

  describe('validateUpdateProductRequest', () => {
    it('should validate a valid update request', () => {
      const validData = {
        name: 'Updated Product',
        price: 39.99
      };

      const result = validateUpdateProductRequest(validData);

      expect(result).toEqual({
        name: 'Updated Product',
        price: 39.99
      });
    });

    it('should return empty object for no updates', () => {
      const result = validateUpdateProductRequest({});
      expect(result).toEqual({});
    });

    it('should validate partial updates', () => {
      const validData = {
        inventory_quantity: 50
      };

      const result = validateUpdateProductRequest(validData);

      expect(result).toEqual({
        inventory_quantity: 50
      });
    });

    it('should throw error for invalid name in update', () => {
      const invalidData = {
        name: ''
      };

      expect(() => validateUpdateProductRequest(invalidData))
        .toThrow('Product name must be a non-empty string');
    });

    it('should throw error for invalid price in update', () => {
      const invalidData = {
        price: -10
      };

      expect(() => validateUpdateProductRequest(invalidData))
        .toThrow('Price must be greater than 0');
    });

    it('should handle null description', () => {
      const validData = {
        description: null
      };

      const result = validateUpdateProductRequest(validData);

      expect(result).toEqual({
        description: undefined
      });
    });
  });

  describe('toProductResponse', () => {
    it('should convert product to response format', () => {
      const product: ProductWithDetails = {
        id: 1,
        seller_id: 2,
        category_id: 3,
        name: 'Test Product',
        description: 'Test description',
        price: 29.99,
        inventory_quantity: 100,
        category_name: 'Electronics',
        seller_username: 'testseller',
        seller_email: 'seller@test.com',
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2023-01-02')
      };

      const result = toProductResponse(product);

      expect(result).toEqual({
        id: 1,
        seller_id: 2,
        category_id: 3,
        name: 'Test Product',
        description: 'Test description',
        price: 29.99,
        inventory_quantity: 100,
        category_name: 'Electronics',
        seller_username: 'testseller',
        seller_email: 'seller@test.com',
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2023-01-02')
      });
    });

    it('should handle product without optional fields', () => {
      const product: ProductWithDetails = {
        id: 1,
        seller_id: 2,
        category_id: 3,
        name: 'Test Product',
        price: 29.99,
        inventory_quantity: 100,
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2023-01-02')
      };

      const result = toProductResponse(product);

      expect(result.description).toBeUndefined();
      expect(result.category_name).toBeUndefined();
      expect(result.seller_username).toBeUndefined();
      expect(result.seller_email).toBeUndefined();
    });
  });
});
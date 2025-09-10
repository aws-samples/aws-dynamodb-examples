import { ShoppingCartValidator, ShoppingCartItemWithProduct } from '../../../models/ShoppingCart';

describe('ShoppingCartValidator', () => {
  describe('validateAddToCart', () => {
    it('should return no errors for valid add to cart data', () => {
      const validData = {
        productId: 1,
        quantity: 2
      };

      const errors = ShoppingCartValidator.validateAddToCart(validData);
      expect(errors).toHaveLength(0);
    });

    it('should return error for missing product ID', () => {
      const invalidData = {
        quantity: 2
      };

      const errors = ShoppingCartValidator.validateAddToCart(invalidData);
      expect(errors).toContain('Valid product ID is required');
    });

    it('should return error for invalid product ID', () => {
      const invalidData = {
        productId: 'invalid',
        quantity: 2
      };

      const errors = ShoppingCartValidator.validateAddToCart(invalidData);
      expect(errors).toContain('Valid product ID is required');
    });

    it('should return error for zero or negative product ID', () => {
      const invalidData = {
        productId: 0,
        quantity: 2
      };

      const errors = ShoppingCartValidator.validateAddToCart(invalidData);
      expect(errors).toContain('Valid product ID is required');
    });

    it('should return error for missing quantity', () => {
      const invalidData = {
        productId: 1
      };

      const errors = ShoppingCartValidator.validateAddToCart(invalidData);
      expect(errors).toContain('Quantity must be a positive integer');
    });

    it('should return error for invalid quantity', () => {
      const invalidData = {
        productId: 1,
        quantity: 'invalid'
      };

      const errors = ShoppingCartValidator.validateAddToCart(invalidData);
      expect(errors).toContain('Quantity must be a positive integer');
    });

    it('should return error for zero or negative quantity', () => {
      const invalidData = {
        productId: 1,
        quantity: 0
      };

      const errors = ShoppingCartValidator.validateAddToCart(invalidData);
      expect(errors).toContain('Quantity must be a positive integer');
    });

    it('should return error for quantity exceeding maximum', () => {
      const invalidData = {
        productId: 1,
        quantity: 101
      };

      const errors = ShoppingCartValidator.validateAddToCart(invalidData);
      expect(errors).toContain('Quantity cannot exceed 100 items per product');
    });

    it('should return multiple errors for multiple invalid fields', () => {
      const invalidData = {
        productId: 'invalid',
        quantity: -1
      };

      const errors = ShoppingCartValidator.validateAddToCart(invalidData);
      expect(errors).toHaveLength(2);
      expect(errors).toContain('Valid product ID is required');
      expect(errors).toContain('Quantity must be a positive integer');
    });
  });

  describe('validateUpdateCartItem', () => {
    it('should return no errors for valid update data', () => {
      const validData = {
        quantity: 3
      };

      const errors = ShoppingCartValidator.validateUpdateCartItem(validData);
      expect(errors).toHaveLength(0);
    });

    it('should return no errors for zero quantity (removal)', () => {
      const validData = {
        quantity: 0
      };

      const errors = ShoppingCartValidator.validateUpdateCartItem(validData);
      expect(errors).toHaveLength(0);
    });

    it('should return error for missing quantity', () => {
      const invalidData = {};

      const errors = ShoppingCartValidator.validateUpdateCartItem(invalidData);
      expect(errors).toContain('Quantity must be a non-negative integer');
    });

    it('should return error for invalid quantity type', () => {
      const invalidData = {
        quantity: 'invalid'
      };

      const errors = ShoppingCartValidator.validateUpdateCartItem(invalidData);
      expect(errors).toContain('Quantity must be a non-negative integer');
    });

    it('should return error for negative quantity', () => {
      const invalidData = {
        quantity: -1
      };

      const errors = ShoppingCartValidator.validateUpdateCartItem(invalidData);
      expect(errors).toContain('Quantity must be a non-negative integer');
    });

    it('should return error for quantity exceeding maximum', () => {
      const invalidData = {
        quantity: 101
      };

      const errors = ShoppingCartValidator.validateUpdateCartItem(invalidData);
      expect(errors).toContain('Quantity cannot exceed 100 items per product');
    });
  });

  describe('calculateCartTotals', () => {
    it('should calculate correct totals for empty cart', () => {
      const items: ShoppingCartItemWithProduct[] = [];

      const totals = ShoppingCartValidator.calculateCartTotals(items);

      expect(totals.totalItems).toBe(0);
      expect(totals.totalAmount).toBe(0);
      expect(totals.itemCount).toBe(0);
    });

    it('should calculate correct totals for single item', () => {
      const items: ShoppingCartItemWithProduct[] = [
        {
          id: 1,
          userId: 1,
          productId: 1,
          quantity: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
          product: {
            id: 1,
            seller_id: 1,
            category_id: 1,
            name: 'Test Product',
            description: 'Test Description',
            price: 10.99,
            inventory_quantity: 50,
            category_name: 'Electronics',
            seller_username: 'seller1',
            seller_email: 'seller1@example.com',
            created_at: new Date(),
            updated_at: new Date()
          }
        }
      ];

      const totals = ShoppingCartValidator.calculateCartTotals(items);

      expect(totals.totalItems).toBe(2);
      expect(totals.totalAmount).toBe(21.98);
      expect(totals.itemCount).toBe(1);
    });

    it('should calculate correct totals for multiple items', () => {
      const items: ShoppingCartItemWithProduct[] = [
        {
          id: 1,
          userId: 1,
          productId: 1,
          quantity: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
          product: {
            id: 1,
            seller_id: 1,
            category_id: 1,
            name: 'Product 1',
            description: 'Description 1',
            price: 10.99,
            inventory_quantity: 50,
            category_name: 'Electronics',
            seller_username: 'seller1',
            seller_email: 'seller1@example.com',
            created_at: new Date(),
            updated_at: new Date()
          }
        },
        {
          id: 2,
          userId: 1,
          productId: 2,
          quantity: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          product: {
            id: 2,
            seller_id: 1,
            category_id: 1,
            name: 'Product 2',
            description: 'Description 2',
            price: 25.50,
            inventory_quantity: 30,
            category_name: 'Electronics',
            seller_username: 'seller1',
            seller_email: 'seller1@example.com',
            created_at: new Date(),
            updated_at: new Date()
          }
        }
      ];

      const totals = ShoppingCartValidator.calculateCartTotals(items);

      expect(totals.totalItems).toBe(3);
      expect(totals.totalAmount).toBe(47.48);
      expect(totals.itemCount).toBe(2);
    });

    it('should round total amount to 2 decimal places', () => {
      const items: ShoppingCartItemWithProduct[] = [
        {
          id: 1,
          userId: 1,
          productId: 1,
          quantity: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
          product: {
            id: 1,
            seller_id: 1,
            category_id: 1,
            name: 'Test Product',
            description: 'Test Description',
            price: 10.333, // Price that would create rounding issues
            inventory_quantity: 50,
            category_name: 'Electronics',
            seller_username: 'seller1',
            seller_email: 'seller1@example.com',
            created_at: new Date(),
            updated_at: new Date()
          }
        }
      ];

      const totals = ShoppingCartValidator.calculateCartTotals(items);

      expect(totals.totalItems).toBe(3);
      expect(totals.totalAmount).toBe(31.00); // Should be rounded properly
      expect(totals.itemCount).toBe(1);
    });
  });

  describe('formatCartResponse', () => {
    it('should format cart response correctly', () => {
      const cart = {
        items: [
          {
            id: 1,
            userId: 1,
            productId: 1,
            quantity: 2,
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-01-02'),
            product: {
              id: 1,
              seller_id: 1,
              category_id: 1,
              name: 'Test Product',
              description: 'Test Description',
              price: 10.99,
              inventory_quantity: 50,
              category_name: 'Electronics',
              seller_username: 'seller1',
              seller_email: 'seller1@example.com',
              created_at: new Date('2023-01-01'),
              updated_at: new Date('2023-01-01')
            }
          }
        ],
        totalItems: 2,
        totalAmount: 21.98
      };

      const formatted = ShoppingCartValidator.formatCartResponse(cart);

      expect(formatted).toHaveProperty('items');
      expect(formatted).toHaveProperty('summary');
      expect(formatted.items).toHaveLength(1);
      expect(formatted.items[0]).toHaveProperty('subtotal', 21.98);
      expect(formatted.summary.totalItems).toBe(2);
      expect(formatted.summary.totalAmount).toBe(21.98);
      expect(formatted.summary.itemCount).toBe(1);
    });

    it('should format empty cart response correctly', () => {
      const cart = {
        items: [],
        totalItems: 0,
        totalAmount: 0
      };

      const formatted = ShoppingCartValidator.formatCartResponse(cart);

      expect(formatted.items).toHaveLength(0);
      expect(formatted.summary.totalItems).toBe(0);
      expect(formatted.summary.totalAmount).toBe(0);
      expect(formatted.summary.itemCount).toBe(0);
    });
  });
});
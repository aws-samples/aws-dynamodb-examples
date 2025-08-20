import { OrderValidator, OrderWithItems } from '../../../models/Order';

describe('OrderValidator', () => {
  describe('validateCheckoutRequest', () => {
    it('should return no errors for valid PayPal checkout', () => {
      const validData = {
        paymentMethod: 'paypal'
      };

      const errors = OrderValidator.validateCheckoutRequest(validData);
      expect(errors).toHaveLength(0);
    });

    it('should return no errors for valid credit card checkout', () => {
      const validData = {
        paymentMethod: 'credit_card',
        paymentDetails: {
          cardNumber: '4111111111111111',
          expiryDate: '12/25',
          cvv: '123',
          cardholderName: 'John Doe'
        }
      };

      const errors = OrderValidator.validateCheckoutRequest(validData);
      expect(errors).toHaveLength(0);
    });

    it('should return error for missing payment method', () => {
      const invalidData = {};

      const errors = OrderValidator.validateCheckoutRequest(invalidData);
      expect(errors).toContain('Payment method is required');
    });

    it('should return error for invalid payment method', () => {
      const invalidData = {
        paymentMethod: 'bitcoin'
      };

      const errors = OrderValidator.validateCheckoutRequest(invalidData);
      expect(errors).toContain('Invalid payment method. Must be credit_card, debit_card, or paypal');
    });

    it('should return error for missing payment details on card payment', () => {
      const invalidData = {
        paymentMethod: 'credit_card'
      };

      const errors = OrderValidator.validateCheckoutRequest(invalidData);
      expect(errors).toContain('Payment details are required for card payments');
    });

    it('should return error for invalid card number', () => {
      const invalidData = {
        paymentMethod: 'credit_card',
        paymentDetails: {
          cardNumber: '123',
          expiryDate: '12/25',
          cvv: '123',
          cardholderName: 'John Doe'
        }
      };

      const errors = OrderValidator.validateCheckoutRequest(invalidData);
      expect(errors).toContain('Valid card number is required');
    });

    it('should return error for invalid expiry date format', () => {
      const invalidData = {
        paymentMethod: 'credit_card',
        paymentDetails: {
          cardNumber: '4111111111111111',
          expiryDate: '1225',
          cvv: '123',
          cardholderName: 'John Doe'
        }
      };

      const errors = OrderValidator.validateCheckoutRequest(invalidData);
      expect(errors).toContain('Valid expiry date is required (MM/YY format)');
    });

    it('should return error for invalid CVV', () => {
      const invalidData = {
        paymentMethod: 'credit_card',
        paymentDetails: {
          cardNumber: '4111111111111111',
          expiryDate: '12/25',
          cvv: '12',
          cardholderName: 'John Doe'
        }
      };

      const errors = OrderValidator.validateCheckoutRequest(invalidData);
      expect(errors).toContain('Valid CVV is required');
    });

    it('should return error for missing cardholder name', () => {
      const invalidData = {
        paymentMethod: 'credit_card',
        paymentDetails: {
          cardNumber: '4111111111111111',
          expiryDate: '12/25',
          cvv: '123',
          cardholderName: ''
        }
      };

      const errors = OrderValidator.validateCheckoutRequest(invalidData);
      expect(errors).toContain('Cardholder name is required');
    });

    it('should return multiple errors for multiple invalid fields', () => {
      const invalidData = {
        paymentMethod: 'credit_card',
        paymentDetails: {
          cardNumber: '123',
          expiryDate: 'invalid',
          cvv: '12',
          cardholderName: ''
        }
      };

      const errors = OrderValidator.validateCheckoutRequest(invalidData);
      expect(errors.length).toBeGreaterThan(1);
      expect(errors).toContain('Valid card number is required');
      expect(errors).toContain('Valid expiry date is required (MM/YY format)');
      expect(errors).toContain('Valid CVV is required');
      expect(errors).toContain('Cardholder name is required');
    });
  });

  describe('calculateOrderTotal', () => {
    it('should calculate correct total for single item', () => {
      const items = [
        { quantity: 2, price_at_time: 10.99 }
      ];

      const total = OrderValidator.calculateOrderTotal(items);
      expect(total).toBe(21.98);
    });

    it('should calculate correct total for multiple items', () => {
      const items = [
        { quantity: 2, price_at_time: 10.99 },
        { quantity: 1, price_at_time: 25.50 }
      ];

      const total = OrderValidator.calculateOrderTotal(items);
      expect(total).toBe(47.48);
    });

    it('should return 0 for empty items array', () => {
      const items: { quantity: number; price_at_time: number }[] = [];

      const total = OrderValidator.calculateOrderTotal(items);
      expect(total).toBe(0);
    });

    it('should round total to 2 decimal places', () => {
      const items = [
        { quantity: 3, price_at_time: 10.333 }
      ];

      const total = OrderValidator.calculateOrderTotal(items);
      expect(total).toBe(31.00);
    });
  });

  describe('formatOrderResponse', () => {
    it('should format order response correctly', () => {
      const order: OrderWithItems = {
        id: 1,
        user_id: 1,
        total_amount: 21.98,
        status: 'completed',
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2023-01-02'),
        items: [
          {
            id: 1,
            order_id: 1,
            product_id: 1,
            quantity: 2,
            price_at_time: 10.99,
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
        ]
      };

      const formatted = OrderValidator.formatOrderResponse(order);

      expect(formatted).toHaveProperty('id', 1);
      expect(formatted).toHaveProperty('userId', 1);
      expect(formatted).toHaveProperty('totalAmount', 21.98);
      expect(formatted).toHaveProperty('status', 'completed');
      expect(formatted).toHaveProperty('items');
      expect(formatted.items).toHaveLength(1);
      expect(formatted.items[0]).toHaveProperty('subtotal', 21.98);
      expect(formatted.items[0].product).toHaveProperty('name', 'Test Product');
    });
  });

  describe('formatOrderSummaryResponse', () => {
    it('should format order summary correctly', () => {
      const orders: OrderWithItems[] = [
        {
          id: 1,
          user_id: 1,
          total_amount: 21.98,
          status: 'completed',
          created_at: new Date('2023-01-01'),
          updated_at: new Date('2023-01-02'),
          items: []
        },
        {
          id: 2,
          user_id: 1,
          total_amount: 15.50,
          status: 'pending',
          created_at: new Date('2023-01-03'),
          updated_at: new Date('2023-01-03'),
          items: []
        }
      ];

      const formatted = OrderValidator.formatOrderSummaryResponse(orders);

      expect(formatted).toHaveProperty('orders');
      expect(formatted).toHaveProperty('summary');
      expect(formatted.orders).toHaveLength(2);
      expect(formatted.summary.totalOrders).toBe(2);
      expect(formatted.summary.totalAmount).toBe(37.48);
      expect(formatted.summary.completedOrders).toBe(1);
      expect(formatted.summary.pendingOrders).toBe(1);
      expect(formatted.summary.cancelledOrders).toBe(0);
    });

    it('should handle empty orders array', () => {
      const orders: OrderWithItems[] = [];

      const formatted = OrderValidator.formatOrderSummaryResponse(orders);

      expect(formatted.orders).toHaveLength(0);
      expect(formatted.summary.totalOrders).toBe(0);
      expect(formatted.summary.totalAmount).toBe(0);
      expect(formatted.summary.completedOrders).toBe(0);
      expect(formatted.summary.pendingOrders).toBe(0);
      expect(formatted.summary.cancelledOrders).toBe(0);
    });
  });
});
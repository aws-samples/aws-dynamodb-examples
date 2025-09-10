import { PaymentService } from '../../../services/PaymentService';

describe('PaymentService', () => {
  let paymentService: PaymentService;

  beforeEach(() => {
    paymentService = new PaymentService();
  });

  describe('processPayment', () => {
    it('should process PayPal payment successfully', async () => {
      const checkoutRequest = {
        paymentMethod: 'paypal' as const
      };

      const result = await paymentService.processPayment(100.00, checkoutRequest);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.transactionId).toMatch(/^PP_/);
      expect(result.errorMessage).toBeUndefined();
    });

    it('should process credit card payment successfully', async () => {
      const checkoutRequest = {
        paymentMethod: 'credit_card' as const,
        paymentDetails: {
          cardNumber: '4111111111111111',
          expiryDate: '12/25',
          cvv: '123',
          cardholderName: 'John Doe'
        }
      };

      const result = await paymentService.processPayment(100.00, checkoutRequest);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.transactionId).toMatch(/^CC_/);
      expect(result.errorMessage).toBeUndefined();
    });

    it('should process debit card payment successfully', async () => {
      const checkoutRequest = {
        paymentMethod: 'debit_card' as const,
        paymentDetails: {
          cardNumber: '4111111111111111',
          expiryDate: '12/25',
          cvv: '123',
          cardholderName: 'John Doe'
        }
      };

      const result = await paymentService.processPayment(100.00, checkoutRequest);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.transactionId).toMatch(/^DC_/);
      expect(result.errorMessage).toBeUndefined();
    });

    it('should fail payment for declined card', async () => {
      const checkoutRequest = {
        paymentMethod: 'credit_card' as const,
        paymentDetails: {
          cardNumber: '4000000000000002', // Test declined card
          expiryDate: '12/25',
          cvv: '123',
          cardholderName: 'John Doe'
        }
      };

      const result = await paymentService.processPayment(100.00, checkoutRequest);

      expect(result.success).toBe(false);
      expect(result.transactionId).toBeUndefined();
      expect(result.errorMessage).toBe('Your card was declined. Please try a different payment method.');
    });

    it('should fail payment for processing error card', async () => {
      const checkoutRequest = {
        paymentMethod: 'credit_card' as const,
        paymentDetails: {
          cardNumber: '4000000000000119', // Test processing error card
          expiryDate: '12/25',
          cvv: '123',
          cardholderName: 'John Doe'
        }
      };

      const result = await paymentService.processPayment(100.00, checkoutRequest);

      expect(result.success).toBe(false);
      expect(result.transactionId).toBeUndefined();
      expect(result.errorMessage).toBe('Payment processing error. Please try again later.');
    });

    it('should fail payment for insufficient funds card', async () => {
      const checkoutRequest = {
        paymentMethod: 'credit_card' as const,
        paymentDetails: {
          cardNumber: '4000000000000127', // Test insufficient funds card
          expiryDate: '12/25',
          cvv: '123',
          cardholderName: 'John Doe'
        }
      };

      const result = await paymentService.processPayment(100.00, checkoutRequest);

      expect(result.success).toBe(false);
      expect(result.transactionId).toBeUndefined();
      expect(result.errorMessage).toBe('Insufficient funds. Please check your account balance.');
    });

    it('should take time to process payment', async () => {
      const checkoutRequest = {
        paymentMethod: 'paypal' as const
      };

      const startTime = Date.now();
      await paymentService.processPayment(100.00, checkoutRequest);
      const endTime = Date.now();

      const processingTime = endTime - startTime;
      expect(processingTime).toBeGreaterThan(500); // Should take at least 500ms
      expect(processingTime).toBeLessThan(3000); // Should not take more than 3s
    });
  });

  describe('validatePaymentDetails', () => {
    it('should validate PayPal payment successfully', () => {
      const checkoutRequest = {
        paymentMethod: 'paypal' as const
      };

      const result = paymentService.validatePaymentDetails(checkoutRequest);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate credit card payment successfully', () => {
      const checkoutRequest = {
        paymentMethod: 'credit_card' as const,
        paymentDetails: {
          cardNumber: '4111111111111111',
          expiryDate: '12/25',
          cvv: '123',
          cardholderName: 'John Doe'
        }
      };

      const result = paymentService.validatePaymentDetails(checkoutRequest);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for missing payment method', () => {
      const checkoutRequest = {} as any;

      const result = paymentService.validatePaymentDetails(checkoutRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Payment method is required');
    });

    it('should return error for invalid payment method', () => {
      const checkoutRequest = {
        paymentMethod: 'bitcoin' as any
      };

      const result = paymentService.validatePaymentDetails(checkoutRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid payment method');
    });

    it('should return error for missing payment details on card payment', () => {
      const checkoutRequest = {
        paymentMethod: 'credit_card' as const
      };

      const result = paymentService.validatePaymentDetails(checkoutRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Payment details are required for card payments');
    });

    it('should return error for invalid card number', () => {
      const checkoutRequest = {
        paymentMethod: 'credit_card' as const,
        paymentDetails: {
          cardNumber: '123',
          expiryDate: '12/25',
          cvv: '123',
          cardholderName: 'John Doe'
        }
      };

      const result = paymentService.validatePaymentDetails(checkoutRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid card number');
    });

    it('should return error for expired card', () => {
      const checkoutRequest = {
        paymentMethod: 'credit_card' as const,
        paymentDetails: {
          cardNumber: '4111111111111111',
          expiryDate: '01/20', // Expired date
          cvv: '123',
          cardholderName: 'John Doe'
        }
      };

      const result = paymentService.validatePaymentDetails(checkoutRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Card has expired');
    });

    it('should return error for invalid CVV', () => {
      const checkoutRequest = {
        paymentMethod: 'credit_card' as const,
        paymentDetails: {
          cardNumber: '4111111111111111',
          expiryDate: '12/25',
          cvv: '12',
          cardholderName: 'John Doe'
        }
      };

      const result = paymentService.validatePaymentDetails(checkoutRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid CVV');
    });
  });

  describe('getSupportedPaymentMethods', () => {
    it('should return supported payment methods', () => {
      const methods = paymentService.getSupportedPaymentMethods();

      expect(methods).toContain('credit_card');
      expect(methods).toContain('debit_card');
      expect(methods).toContain('paypal');
      expect(methods).toHaveLength(3);
    });
  });

  describe('requiresPaymentDetails', () => {
    it('should return true for credit card', () => {
      const result = paymentService.requiresPaymentDetails('credit_card');
      expect(result).toBe(true);
    });

    it('should return true for debit card', () => {
      const result = paymentService.requiresPaymentDetails('debit_card');
      expect(result).toBe(true);
    });

    it('should return false for PayPal', () => {
      const result = paymentService.requiresPaymentDetails('paypal');
      expect(result).toBe(false);
    });
  });

  describe('formatPaymentMethod', () => {
    it('should format payment methods correctly', () => {
      expect(paymentService.formatPaymentMethod('credit_card')).toBe('Credit Card');
      expect(paymentService.formatPaymentMethod('debit_card')).toBe('Debit Card');
      expect(paymentService.formatPaymentMethod('paypal')).toBe('PayPal');
    });
  });

  describe('maskPaymentDetails', () => {
    it('should mask credit card details', () => {
      const checkoutRequest = {
        paymentMethod: 'credit_card' as const,
        paymentDetails: {
          cardNumber: '4111111111111111',
          expiryDate: '12/25',
          cvv: '123',
          cardholderName: 'John Doe'
        }
      };

      const masked = paymentService.maskPaymentDetails(checkoutRequest);

      expect(masked.paymentDetails.cardNumber).toBe('****-****-****-1111');
      expect(masked.paymentDetails.cvv).toBe('***');
      expect(masked.paymentDetails.expiryDate).toBe('12/25');
      expect(masked.paymentDetails.cardholderName).toBe('John Doe');
    });

    it('should handle PayPal payment without details', () => {
      const checkoutRequest = {
        paymentMethod: 'paypal' as const
      };

      const masked = paymentService.maskPaymentDetails(checkoutRequest);

      expect(masked.paymentMethod).toBe('paypal');
      expect(masked.paymentDetails).toBeUndefined();
    });
  });
});
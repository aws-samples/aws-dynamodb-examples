import { CheckoutRequest, PaymentResult } from '../models/Order';

export class PaymentService {
  /**
   * Simulated payment processing service
   * In a real application, this would integrate with actual payment gateways
   * like Stripe, PayPal, Square, etc.
   */
  
  async processPayment(amount: number, paymentRequest: CheckoutRequest): Promise<PaymentResult> {
    // Simulate processing delay
    await this.simulateProcessingDelay();

    // Simulate different payment scenarios based on amount or card details
    const result = this.simulatePaymentOutcome(amount, paymentRequest);
    
    return result;
  }

  private async simulateProcessingDelay(): Promise<void> {
    // In test environments, use minimal delay for faster tests
    if (process.env.NODE_ENV === 'test') {
      const delay = 100; // 100ms for tests
      return new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Simulate realistic payment processing time (500ms - 2s) in non-test environments
    const delay = Math.random() * 1500 + 500;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  private simulatePaymentOutcome(amount: number, paymentRequest: CheckoutRequest): PaymentResult {
    // Simulate different payment scenarios for testing
    
    // PayPal payments always succeed (for demo purposes)
    if (paymentRequest.paymentMethod === 'paypal') {
      return {
        success: true,
        transactionId: this.generateTransactionId('PP')
      };
    }

    // Card payments - simulate various scenarios
    if (paymentRequest.paymentMethod === 'credit_card' || paymentRequest.paymentMethod === 'debit_card') {
      const cardNumber = paymentRequest.paymentDetails?.cardNumber || '';
      
      // Simulate specific test card numbers for different outcomes
      if (cardNumber.includes('4000000000000002')) {
        // Declined card
        return {
          success: false,
          errorMessage: 'Your card was declined. Please try a different payment method.'
        };
      }
      
      if (cardNumber.includes('4000000000000119')) {
        // Processing error
        return {
          success: false,
          errorMessage: 'Payment processing error. Please try again later.'
        };
      }
      
      if (cardNumber.includes('4000000000000127')) {
        // Insufficient funds
        return {
          success: false,
          errorMessage: 'Insufficient funds. Please check your account balance.'
        };
      }

      // Simulate random failures for realistic testing (5% failure rate)
      // Skip random failures in test environments for reliable testing
      const isTestEnvironment = process.env.NODE_ENV === 'test' || 
                                process.env.NODE_ENV === 'testing' ||
                                process.env.NODE_ENV?.includes('test') ||
                                process.env.DB_NAME?.includes('test');
      
      if (!isTestEnvironment && Math.random() < 0.05) {
        const errors = [
          'Payment processing temporarily unavailable. Please try again.',
          'Card verification failed. Please check your card details.',
          'Transaction timeout. Please try again.',
          'Network error during payment processing.'
        ];
        
        return {
          success: false,
          errorMessage: errors[Math.floor(Math.random() * errors.length)]
        };
      }

      // Simulate high-value transaction additional verification
      if (amount > 1000) {
        // In a real system, this might trigger additional verification steps
        console.log(`High-value transaction detected: $${amount}`);
      }

      // Most payments succeed
      return {
        success: true,
        transactionId: this.generateTransactionId(paymentRequest.paymentMethod === 'credit_card' ? 'CC' : 'DC')
      };
    }

    // Fallback - should not reach here with proper validation
    return {
      success: false,
      errorMessage: 'Invalid payment method'
    };
  }

  private generateTransactionId(prefix: string): string {
    // Generate a realistic-looking transaction ID
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Validate payment method and details
   */
  validatePaymentDetails(paymentRequest: CheckoutRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!paymentRequest.paymentMethod) {
      errors.push('Payment method is required');
      return { valid: false, errors };
    }

    if (!['credit_card', 'debit_card', 'paypal'].includes(paymentRequest.paymentMethod)) {
      errors.push('Invalid payment method');
      return { valid: false, errors };
    }

    // Validate card details for card payments
    if (paymentRequest.paymentMethod === 'credit_card' || paymentRequest.paymentMethod === 'debit_card') {
      if (!paymentRequest.paymentDetails) {
        errors.push('Payment details are required for card payments');
        return { valid: false, errors };
      }

      const { cardNumber, expiryDate, cvv, cardholderName } = paymentRequest.paymentDetails;

      // Basic card number validation (Luhn algorithm would be used in real implementation)
      if (!cardNumber || cardNumber.replace(/\s/g, '').length < 13) {
        errors.push('Invalid card number');
      }

      // Expiry date validation
      if (!expiryDate || !/^\d{2}\/\d{2}$/.test(expiryDate)) {
        errors.push('Invalid expiry date format (MM/YY required)');
      } else {
        const [month, year] = expiryDate.split('/').map(Number);
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear() % 100;
        const currentMonth = currentDate.getMonth() + 1;

        if (month < 1 || month > 12) {
          errors.push('Invalid expiry month');
        } else if (year < currentYear || (year === currentYear && month < currentMonth)) {
          errors.push('Card has expired');
        }
      }

      // CVV validation
      if (!cvv || cvv.length < 3 || cvv.length > 4) {
        errors.push('Invalid CVV');
      }

      // Cardholder name validation
      if (!cardholderName || cardholderName.trim().length < 2) {
        errors.push('Cardholder name is required');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get supported payment methods
   */
  getSupportedPaymentMethods(): string[] {
    return ['credit_card', 'debit_card', 'paypal'];
  }

  /**
   * Check if payment method requires additional details
   */
  requiresPaymentDetails(paymentMethod: string): boolean {
    return paymentMethod === 'credit_card' || paymentMethod === 'debit_card';
  }

  /**
   * Format payment method for display
   */
  formatPaymentMethod(paymentMethod: string): string {
    const methods = {
      'credit_card': 'Credit Card',
      'debit_card': 'Debit Card',
      'paypal': 'PayPal'
    };

    return methods[paymentMethod as keyof typeof methods] || paymentMethod;
  }

  /**
   * Mask sensitive payment information for logging/display
   */
  maskPaymentDetails(paymentRequest: CheckoutRequest): any {
    if (!paymentRequest.paymentDetails) {
      return { paymentMethod: paymentRequest.paymentMethod };
    }

    const masked = {
      paymentMethod: paymentRequest.paymentMethod,
      paymentDetails: {
        cardNumber: paymentRequest.paymentDetails.cardNumber 
          ? `****-****-****-${paymentRequest.paymentDetails.cardNumber.slice(-4)}`
          : undefined,
        expiryDate: paymentRequest.paymentDetails.expiryDate,
        cvv: paymentRequest.paymentDetails.cvv ? '***' : undefined,
        cardholderName: paymentRequest.paymentDetails.cardholderName
      }
    };

    return masked;
  }
}
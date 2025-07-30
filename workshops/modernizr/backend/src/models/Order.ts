import { ProductWithDetails } from './Product';

export interface Order {
  id: number;
  user_id: number;
  total_amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: Date;
  updated_at: Date;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price_at_time: number;
}

export interface OrderItemWithProduct extends OrderItem {
  product: ProductWithDetails;
}

export interface OrderWithItems extends Order {
  items: OrderItemWithProduct[];
}

export interface CreateOrderRequest {
  // Order will be created from the user's cart
  // No additional fields needed as cart contains all necessary info
}

export interface CheckoutRequest {
  paymentMethod: 'credit_card' | 'debit_card' | 'paypal';
  paymentDetails?: {
    cardNumber?: string;
    expiryDate?: string;
    cvv?: string;
    cardholderName?: string;
  };
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  errorMessage?: string;
}

export interface OrderSummary {
  totalOrders: number;
  totalAmount: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
}

export class OrderValidator {
  static validateCheckoutRequest(data: any): string[] {
    const errors: string[] = [];

    if (!data.paymentMethod) {
      errors.push('Payment method is required');
    }

    if (data.paymentMethod && !['credit_card', 'debit_card', 'paypal'].includes(data.paymentMethod)) {
      errors.push('Invalid payment method. Must be credit_card, debit_card, or paypal');
    }

    // For credit/debit cards, validate payment details
    if ((data.paymentMethod === 'credit_card' || data.paymentMethod === 'debit_card')) {
      if (!data.paymentDetails) {
        errors.push('Payment details are required for card payments');
      } else {
        if (!data.paymentDetails.cardNumber || data.paymentDetails.cardNumber.length < 13) {
          errors.push('Valid card number is required');
        }

        if (!data.paymentDetails.expiryDate || !/^\d{2}\/\d{2}$/.test(data.paymentDetails.expiryDate)) {
          errors.push('Valid expiry date is required (MM/YY format)');
        }

        if (!data.paymentDetails.cvv || data.paymentDetails.cvv.length < 3) {
          errors.push('Valid CVV is required');
        }

        if (!data.paymentDetails.cardholderName || data.paymentDetails.cardholderName.trim().length < 2) {
          errors.push('Cardholder name is required');
        }
      }
    }

    return errors;
  }

  static formatOrderResponse(order: OrderWithItems): any {
    return {
      id: order.id,
      userId: order.user_id,
      totalAmount: order.total_amount,
      status: order.status,
      items: order.items.map(item => ({
        id: item.id,
        productId: item.product_id,
        quantity: item.quantity,
        priceAtTime: item.price_at_time,
        subtotal: item.quantity * item.price_at_time,
        product: {
          id: item.product.id,
          name: item.product.name,
          description: item.product.description,
          categoryName: item.product.category_name,
          sellerUsername: item.product.seller_username
        }
      })),
      createdAt: order.created_at,
      updatedAt: order.updated_at
    };
  }

  static formatOrderSummaryResponse(orders: OrderWithItems[]): any {
    const totalOrders = orders.length;
    const totalAmount = orders.reduce((sum, order) => sum + order.total_amount, 0);
    const completedOrders = orders.filter(order => order.status === 'completed').length;
    const pendingOrders = orders.filter(order => order.status === 'pending').length;
    const cancelledOrders = orders.filter(order => order.status === 'cancelled').length;

    return {
      orders: orders.map(order => this.formatOrderResponse(order)),
      summary: {
        totalOrders,
        totalAmount: Math.round(totalAmount * 100) / 100,
        completedOrders,
        pendingOrders,
        cancelledOrders
      }
    };
  }

  static calculateOrderTotal(items: { quantity: number; price_at_time: number }[]): number {
    const total = items.reduce((sum, item) => sum + (item.quantity * item.price_at_time), 0);
    return Math.round(total * 100) / 100; // Round to 2 decimal places
  }
}
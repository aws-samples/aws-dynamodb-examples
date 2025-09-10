import { ProductWithDetails } from './Product';

export interface ShoppingCartItem {
  id: number;
  userId: number;
  productId: number;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShoppingCartItemWithProduct extends ShoppingCartItem {
  product: ProductWithDetails;
}

export interface ShoppingCart {
  items: ShoppingCartItemWithProduct[];
  totalItems: number;
  totalAmount: number;
}

export interface AddToCartRequest {
  productId: number;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export interface CartSummary {
  totalItems: number;
  totalAmount: number;
  itemCount: number;
}

export class ShoppingCartValidator {
  static validateAddToCart(data: any): string[] {
    const errors: string[] = [];

    if (!data.productId || typeof data.productId !== 'number' || data.productId <= 0) {
      errors.push('Valid product ID is required');
    }

    if (!data.quantity || typeof data.quantity !== 'number' || data.quantity <= 0) {
      errors.push('Quantity must be a positive integer');
    }

    if (data.quantity && data.quantity > 100) {
      errors.push('Quantity cannot exceed 100 items per product');
    }

    return errors;
  }

  static validateUpdateCartItem(data: any): string[] {
    const errors: string[] = [];

    if (data.quantity === undefined || typeof data.quantity !== 'number' || data.quantity < 0) {
      errors.push('Quantity must be a non-negative integer');
    }

    if (data.quantity && data.quantity > 100) {
      errors.push('Quantity cannot exceed 100 items per product');
    }

    return errors;
  }

  static formatCartResponse(cart: ShoppingCart): any {
    return {
      items: cart.items.map(item => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        product: {
          id: item.product.id,
          name: item.product.name,
          description: item.product.description,
          price: item.product.price,
          inventoryQuantity: item.product.inventory_quantity,
          categoryName: item.product.category_name,
          sellerUsername: item.product.seller_username
        },
        subtotal: item.quantity * item.product.price,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      })),
      summary: {
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
        itemCount: cart.items.length
      }
    };
  }

  static calculateCartTotals(items: ShoppingCartItemWithProduct[]): CartSummary {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.product.price), 0);
    
    return {
      totalItems,
      totalAmount: Math.round(totalAmount * 100) / 100, // Round to 2 decimal places
      itemCount: items.length
    };
  }
}
import { IShoppingCartRepository } from '../database/interfaces/IShoppingCartRepository';
import { IProductRepository } from '../database/interfaces/IProductRepository';
import { DatabaseFactory } from '../database/factory/DatabaseFactory';
import { 
  ShoppingCart, 
  ShoppingCartValidator, 
  AddToCartRequest, 
  UpdateCartItemRequest,
  CartSummary 
} from '../models/ShoppingCart';

export class ShoppingCartService {
  constructor() {
    console.log('🛍️ ShoppingCartService constructor called');
    console.log('🛍️ ShoppingCartService repositories created');
  }

  private getCartRepository(): IShoppingCartRepository {
    return DatabaseFactory.createShoppingCartRepository();
  }

  private getProductRepository(): IProductRepository {
    return DatabaseFactory.createProductRepository();
  }

  async addToCart(userId: number, request: AddToCartRequest): Promise<ShoppingCart> {
    console.log(`🛍️ ShoppingCartService.addToCart called: userId=${userId}`, request);
    // Validate input
    const validationErrors = ShoppingCartValidator.validateAddToCart(request);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(', '));
    }

    // Check if product exists and has sufficient inventory
    const product = await this.getProductRepository().getProductById(request.productId);
    if (!product) {
      throw new Error('Product not found');
    }

    // Check current cart quantity for this product
    const existingCartItem = await this.getCartRepository().getCartItemByUserAndProduct(userId, request.productId);
    const currentCartQuantity = existingCartItem ? existingCartItem.quantity : 0;
    const totalRequestedQuantity = currentCartQuantity + request.quantity;

    if (totalRequestedQuantity > product.inventory_quantity) {
      throw new Error(`Insufficient inventory. Available: ${product.inventory_quantity}, Requested: ${totalRequestedQuantity}`);
    }

    // Add item to cart
    console.log(`🛍️ ShoppingCartService calling cartRepository.addItem: userId=${userId}, productId=${request.productId}, quantity=${request.quantity}`);
    await this.getCartRepository().addItem(userId, request.productId, request.quantity);

    // Return updated cart
    return await this.getCart(userId);
  }

  async getCart(userId: number): Promise<ShoppingCart> {
    const items = await this.getCartRepository().getCartItems(userId);
    const totals = ShoppingCartValidator.calculateCartTotals(items);

    return {
      items,
      totalItems: totals.totalItems,
      totalAmount: totals.totalAmount
    };
  }

  async updateCartItem(userId: number, productId: number, request: UpdateCartItemRequest): Promise<ShoppingCart> {
    // Validate input
    const validationErrors = ShoppingCartValidator.validateUpdateCartItem(request);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(', '));
    }

    // Check if cart item exists
    const existingCartItem = await this.getCartRepository().getCartItemByUserAndProduct(userId, productId);
    if (!existingCartItem) {
      throw new Error('Cart item not found');
    }

    // If quantity is 0, remove the item
    if (request.quantity === 0) {
      await this.getCartRepository().removeItem(userId, productId);
      return await this.getCart(userId);
    }

    // Check inventory availability
    const product = await this.getProductRepository().getProductById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    if (request.quantity > product.inventory_quantity) {
      throw new Error(`Insufficient inventory. Available: ${product.inventory_quantity}, Requested: ${request.quantity}`);
    }

    // Update cart item
    const success = await this.getCartRepository().updateItemQuantity(userId, productId, request.quantity);
    if (!success) {
      throw new Error('Failed to update cart item');
    }

    return await this.getCart(userId);
  }

  async removeFromCart(userId: number, productId: number): Promise<ShoppingCart> {
    // Check if cart item exists
    const existingCartItem = await this.getCartRepository().getCartItemByUserAndProduct(userId, productId);
    if (!existingCartItem) {
      throw new Error('Cart item not found');
    }

    // Remove item from cart
    const success = await this.getCartRepository().removeItem(userId, productId);
    if (!success) {
      throw new Error('Failed to remove item from cart');
    }

    return await this.getCart(userId);
  }

  async clearCart(userId: number): Promise<void> {
    const success = await this.getCartRepository().clearCart(userId);
    if (!success) {
      throw new Error('Failed to clear cart');
    }
  }

  async getCartSummary(userId: number): Promise<CartSummary> {
    const items = await this.getCartRepository().getCartItems(userId);
    return ShoppingCartValidator.calculateCartTotals(items);
  }

  async validateCartInventory(userId: number): Promise<{ valid: boolean; issues: string[] }> {
    return await this.getCartRepository().validateCartInventory(userId);
  }

  async getCartItemCount(userId: number): Promise<number> {
    return await this.getCartRepository().getCartItemCount(userId);
  }

  async isProductInCart(userId: number, productId: number): Promise<boolean> {
    const cartItem = await this.getCartRepository().getCartItemByUserAndProduct(userId, productId);
    return cartItem !== null;
  }

  async getCartValue(userId: number): Promise<number> {
    const cart = await this.getCart(userId);
    return cart.totalAmount;
  }
}
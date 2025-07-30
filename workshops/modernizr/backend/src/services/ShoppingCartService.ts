import { ShoppingCartRepository } from '../repositories/ShoppingCartRepository';
import { ProductRepository } from '../repositories/ProductRepository';
import { 
  ShoppingCart, 
  ShoppingCartValidator, 
  AddToCartRequest, 
  UpdateCartItemRequest,
  CartSummary 
} from '../models/ShoppingCart';

export class ShoppingCartService {
  private cartRepository: ShoppingCartRepository;
  private productRepository: ProductRepository;

  constructor() {
    this.cartRepository = new ShoppingCartRepository();
    this.productRepository = new ProductRepository();
  }

  async addToCart(userId: number, request: AddToCartRequest): Promise<ShoppingCart> {
    // Validate input
    const validationErrors = ShoppingCartValidator.validateAddToCart(request);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(', '));
    }

    // Check if product exists and has sufficient inventory
    const product = await this.productRepository.getProductById(request.productId);
    if (!product) {
      throw new Error('Product not found');
    }

    // Check current cart quantity for this product
    const existingCartItem = await this.cartRepository.getCartItemByUserAndProduct(userId, request.productId);
    const currentCartQuantity = existingCartItem ? existingCartItem.quantity : 0;
    const totalRequestedQuantity = currentCartQuantity + request.quantity;

    if (totalRequestedQuantity > product.inventory_quantity) {
      throw new Error(`Insufficient inventory. Available: ${product.inventory_quantity}, Requested: ${totalRequestedQuantity}`);
    }

    // Add item to cart
    await this.cartRepository.addItem(userId, request.productId, request.quantity);

    // Return updated cart
    return await this.getCart(userId);
  }

  async getCart(userId: number): Promise<ShoppingCart> {
    const items = await this.cartRepository.getCartItems(userId);
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
    const existingCartItem = await this.cartRepository.getCartItemByUserAndProduct(userId, productId);
    if (!existingCartItem) {
      throw new Error('Cart item not found');
    }

    // If quantity is 0, remove the item
    if (request.quantity === 0) {
      await this.cartRepository.removeItem(userId, productId);
      return await this.getCart(userId);
    }

    // Check inventory availability
    const product = await this.productRepository.getProductById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    if (request.quantity > product.inventory_quantity) {
      throw new Error(`Insufficient inventory. Available: ${product.inventory_quantity}, Requested: ${request.quantity}`);
    }

    // Update cart item
    const success = await this.cartRepository.updateItemQuantity(userId, productId, request.quantity);
    if (!success) {
      throw new Error('Failed to update cart item');
    }

    return await this.getCart(userId);
  }

  async removeFromCart(userId: number, productId: number): Promise<ShoppingCart> {
    // Check if cart item exists
    const existingCartItem = await this.cartRepository.getCartItemByUserAndProduct(userId, productId);
    if (!existingCartItem) {
      throw new Error('Cart item not found');
    }

    // Remove item from cart
    const success = await this.cartRepository.removeItem(userId, productId);
    if (!success) {
      throw new Error('Failed to remove item from cart');
    }

    return await this.getCart(userId);
  }

  async clearCart(userId: number): Promise<void> {
    const success = await this.cartRepository.clearCart(userId);
    if (!success) {
      throw new Error('Failed to clear cart');
    }
  }

  async getCartSummary(userId: number): Promise<CartSummary> {
    const items = await this.cartRepository.getCartItems(userId);
    return ShoppingCartValidator.calculateCartTotals(items);
  }

  async validateCartInventory(userId: number): Promise<{ valid: boolean; issues: string[] }> {
    return await this.cartRepository.validateCartInventory(userId);
  }

  async getCartItemCount(userId: number): Promise<number> {
    return await this.cartRepository.getCartItemCount(userId);
  }

  async isProductInCart(userId: number, productId: number): Promise<boolean> {
    const cartItem = await this.cartRepository.getCartItemByUserAndProduct(userId, productId);
    return cartItem !== null;
  }

  async getCartValue(userId: number): Promise<number> {
    const cart = await this.getCart(userId);
    return cart.totalAmount;
  }
}
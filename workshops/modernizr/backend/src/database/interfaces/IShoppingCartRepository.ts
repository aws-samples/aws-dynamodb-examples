import { ShoppingCartItem, ShoppingCartItemWithProduct } from '../../models/ShoppingCart';

/**
 * Abstract interface for ShoppingCart repository operations
 * Supports both MySQL and DynamoDB implementations
 */
export interface IShoppingCartRepository {
  /**
   * Add item to cart or update quantity if exists
   * @param userId User ID
   * @param productId Product ID
   * @param quantity Quantity to add
   * @returns Promise resolving to ShoppingCartItem
   */
  addItem(userId: number, productId: number, quantity: number): Promise<ShoppingCartItem>;

  /**
   * Get all cart items for a user with product details
   * @param userId User ID
   * @returns Promise resolving to array of ShoppingCartItemWithProduct
   */
  getCartItems(userId: number): Promise<ShoppingCartItemWithProduct[]>;

  /**
   * Update cart item quantity
   * @param userId User ID
   * @param productId Product ID
   * @param quantity New quantity
   * @returns Promise resolving to boolean indicating success
   */
  updateItemQuantity(userId: number, productId: number, quantity: number): Promise<boolean>;

  /**
   * Remove item from cart
   * @param userId User ID
   * @param productId Product ID
   * @returns Promise resolving to boolean indicating success
   */
  removeItem(userId: number, productId: number): Promise<boolean>;

  /**
   * Clear all items from user's cart
   * @param userId User ID
   * @returns Promise resolving to boolean indicating success
   */
  clearCart(userId: number): Promise<boolean>;

  /**
   * Get count of items in cart
   * @param userId User ID
   * @returns Promise resolving to item count
   */
  getCartItemCount(userId: number): Promise<number>;

  /**
   * Get specific cart item by user and product
   * @param userId User ID
   * @param productId Product ID
   * @returns Promise resolving to ShoppingCartItem or null if not found
   */
  getCartItemByUserAndProduct(userId: number, productId: number): Promise<ShoppingCartItem | null>;

  /**
   * Validate cart inventory availability
   * @param userId User ID
   * @returns Promise resolving to validation result
   */
  validateCartInventory(userId: number): Promise<{ valid: boolean; issues: string[] }>;
}

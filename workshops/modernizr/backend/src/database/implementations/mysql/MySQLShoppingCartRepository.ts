import { ShoppingCartRepository } from '../../../repositories/ShoppingCartRepository';
import { IShoppingCartRepository } from '../../interfaces/IShoppingCartRepository';
import { ShoppingCartItem, ShoppingCartItemWithProduct } from '../../../models/ShoppingCart';

export class MySQLShoppingCartRepository implements IShoppingCartRepository {
  private shoppingCartRepository: ShoppingCartRepository;

  constructor() {
    this.shoppingCartRepository = new ShoppingCartRepository();
  }

  async addItem(userId: number, productId: number, quantity: number): Promise<ShoppingCartItem> {
    return this.shoppingCartRepository.addItem(userId, productId, quantity);
  }

  async getCartItems(userId: number): Promise<ShoppingCartItemWithProduct[]> {
    return this.shoppingCartRepository.getCartItems(userId);
  }

  async updateItemQuantity(userId: number, productId: number, quantity: number): Promise<boolean> {
    return this.shoppingCartRepository.updateItemQuantity(userId, productId, quantity);
  }

  async removeItem(userId: number, productId: number): Promise<boolean> {
    return this.shoppingCartRepository.removeItem(userId, productId);
  }

  async clearCart(userId: number): Promise<boolean> {
    return this.shoppingCartRepository.clearCart(userId);
  }

  async getCartItemCount(userId: number): Promise<number> {
    return this.shoppingCartRepository.getCartItemCount(userId);
  }

  async getCartItemByUserAndProduct(userId: number, productId: number): Promise<ShoppingCartItem | null> {
    return this.shoppingCartRepository.getCartItemByUserAndProduct(userId, productId);
  }

  async validateCartInventory(userId: number): Promise<{ valid: boolean; issues: string[] }> {
    return this.shoppingCartRepository.validateCartInventory(userId);
  }
}

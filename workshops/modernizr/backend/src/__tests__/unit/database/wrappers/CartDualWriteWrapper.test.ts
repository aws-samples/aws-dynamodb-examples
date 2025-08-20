import { CartDualWriteWrapper } from '../../../../database/wrappers/CartDualWriteWrapper';
import { IShoppingCartRepository } from '../../../../database/interfaces/IShoppingCartRepository';
import { IUserRepository } from '../../../../database/interfaces/IUserRepository';
import { IProductRepository } from '../../../../database/interfaces/IProductRepository';
import { FeatureFlagService } from '../../../../services/FeatureFlagService';
import { ShoppingCartItem } from '../../../../models/ShoppingCart';
import { User } from '../../../../models/User';
import { Product } from '../../../../models/Product';

describe('CartDualWriteWrapper', () => {
  let wrapper: CartDualWriteWrapper;
  let mysqlCartRepo: jest.Mocked<IShoppingCartRepository>;
  let dynamodbCartRepo: jest.Mocked<IShoppingCartRepository>;
  let mysqlUserRepo: jest.Mocked<IUserRepository>;
  let mysqlProductRepo: jest.Mocked<IProductRepository>;
  let featureFlagService: FeatureFlagService;

  const mockCartItem: ShoppingCartItem = {
    id: 1,
    userId: 1,
    productId: 1,
    quantity: 2,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockUser: User = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password_hash: 'hashedpassword',
    first_name: 'Test',
    last_name: 'User',
    is_seller: false,
    super_admin: false,
    created_at: new Date(),
    updated_at: new Date()
  };

  const mockProduct: Product = {
    id: 1,
    seller_id: 1,
    name: 'Test Product',
    description: 'Test Description',
    price: 99.99,
    category_id: 1,
    inventory_quantity: 10,
    created_at: new Date(),
    updated_at: new Date()
  };

  beforeEach(() => {
    mysqlCartRepo = {
      addItem: jest.fn(),
      getCartItems: jest.fn(),
      updateItemQuantity: jest.fn(),
      removeItem: jest.fn(),
      clearCart: jest.fn(),
      getCartItemCount: jest.fn(),
      getCartItemByUserAndProduct: jest.fn(),
      validateCartInventory: jest.fn()
    };

    dynamodbCartRepo = {
      addItem: jest.fn(),
      getCartItems: jest.fn(),
      updateItemQuantity: jest.fn(),
      removeItem: jest.fn(),
      clearCart: jest.fn(),
      getCartItemCount: jest.fn(),
      getCartItemByUserAndProduct: jest.fn(),
      validateCartInventory: jest.fn()
    };

    mysqlUserRepo = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upgradeToSeller: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      existsByUsername: jest.fn(),
      existsByEmail: jest.fn()
    };

    mysqlProductRepo = {
      createProduct: jest.fn(),
      updateProduct: jest.fn(),
      deleteProduct: jest.fn(),
      getProductById: jest.fn().mockResolvedValue(mockProduct),
      getProductWithDetails: jest.fn(),
      getProducts: jest.fn(),
      getProductsBySeller: jest.fn(),
      getProductsByCategory: jest.fn(),
      searchProducts: jest.fn(),
      updateInventory: jest.fn(),
      reduceInventory: jest.fn(),
      hasInventory: jest.fn()
    };

    featureFlagService = new FeatureFlagService();
    wrapper = new CartDualWriteWrapper(mysqlCartRepo, dynamodbCartRepo, mysqlUserRepo, mysqlProductRepo, featureFlagService);
    FeatureFlagService.reset();
  });

  describe('addItem', () => {
    it('should execute dual-write when enabled', async () => {
      FeatureFlagService.setFlag('dual_write_enabled', true);
      mysqlUserRepo.findById.mockResolvedValue(mockUser);
      mysqlCartRepo.addItem.mockResolvedValue(mockCartItem);
      dynamodbCartRepo.addItem.mockResolvedValue(mockCartItem);

      const result = await wrapper.addItem(1, 1, 2);

      expect(result.success).toBe(true);
      expect(result.correlationId).toBeDefined();
      expect(mysqlCartRepo.addItem).toHaveBeenCalledWith(1, 1, 2);
      expect(dynamodbCartRepo.addItem).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateItemQuantity', () => {
    it('should execute dual-write when enabled', async () => {
      FeatureFlagService.setFlag('dual_write_enabled', true);
      mysqlCartRepo.updateItemQuantity.mockResolvedValue(true);
      dynamodbCartRepo.updateItemQuantity.mockResolvedValue(true);

      const result = await wrapper.updateItemQuantity(1, 1, 3);

      expect(result.success).toBe(true);
      expect(mysqlCartRepo.updateItemQuantity).toHaveBeenCalledWith(1, 1, 3);
      expect(dynamodbCartRepo.updateItemQuantity).toHaveBeenCalledWith(1, 1, 3);
    });
  });

  describe('removeItem', () => {
    it('should execute dual-write when enabled', async () => {
      FeatureFlagService.setFlag('dual_write_enabled', true);
      mysqlCartRepo.removeItem.mockResolvedValue(true);
      dynamodbCartRepo.removeItem.mockResolvedValue(true);

      const result = await wrapper.removeItem(1, 1);

      expect(result.success).toBe(true);
      expect(mysqlCartRepo.removeItem).toHaveBeenCalledWith(1, 1);
      expect(dynamodbCartRepo.removeItem).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('clearCart', () => {
    it('should execute dual-write when enabled', async () => {
      FeatureFlagService.setFlag('dual_write_enabled', true);
      mysqlCartRepo.clearCart.mockResolvedValue(true);
      dynamodbCartRepo.clearCart.mockResolvedValue(true);

      const result = await wrapper.clearCart(1);

      expect(result.success).toBe(true);
      expect(mysqlCartRepo.clearCart).toHaveBeenCalledWith(1);
      expect(dynamodbCartRepo.clearCart).toHaveBeenCalledWith(1);
    });
  });
});

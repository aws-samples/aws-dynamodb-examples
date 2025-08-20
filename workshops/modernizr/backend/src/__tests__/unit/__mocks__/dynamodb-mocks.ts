// Shared DynamoDB mocks for unit tests to avoid configuration issues

jest.mock('../../../database/implementations/dynamodb/DynamoDBUserRepository', () => {
  return {
    DynamoDBUserRepository: jest.fn().mockImplementation(() => ({
      findById: jest.fn(),
      findByUsername: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upgradeToSeller: jest.fn(),
      existsByUsername: jest.fn(),
      existsByEmail: jest.fn(),
      promoteToSuperAdmin: jest.fn(),
      demoteFromSuperAdmin: jest.fn(),
      findAllSuperAdmins: jest.fn()
    }))
  };
});

jest.mock('../../../database/implementations/dynamodb/DynamoDBProductRepository', () => {
  return {
    DynamoDBProductRepository: jest.fn().mockImplementation(() => ({
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByCategory: jest.fn(),
      findBySeller: jest.fn(),
      search: jest.fn()
    }))
  };
});

jest.mock('../../../database/implementations/dynamodb/DynamoDBShoppingCartRepository', () => {
  return {
    DynamoDBShoppingCartRepository: jest.fn().mockImplementation(() => ({
      addToCart: jest.fn(),
      getCartByUserId: jest.fn(),
      updateCartItem: jest.fn(),
      removeFromCart: jest.fn(),
      clearCart: jest.fn(),
      getCartItemByUserAndProduct: jest.fn()
    }))
  };
});

jest.mock('../../../database/implementations/dynamodb/DynamoDBCategoryRepository', () => {
  return {
    DynamoDBCategoryRepository: jest.fn().mockImplementation(() => ({
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByParentId: jest.fn()
    }))
  };
});

jest.mock('../../../database/implementations/dynamodb/DynamoDBOrderRepository', () => {
  return {
    DynamoDBOrderRepository: jest.fn().mockImplementation(() => ({
      create: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findBySellerId: jest.fn(),
      updateStatus: jest.fn(),
      findAll: jest.fn()
    }))
  };
});

import { DynamoDBProductRepository } from '../../../../../database/implementations/dynamodb/DynamoDBProductRepository';
import { isDynamoDBAvailable } from '../../../../../test-configs/integration-setup';

describe('DynamoDBProductRepository Integration', () => {
  let repository: DynamoDBProductRepository;

  beforeAll(async () => {
    if (!isDynamoDBAvailable()) {
      pending('DynamoDB Local not available');
    }
    repository = new DynamoDBProductRepository('products');
  });

  beforeEach(async () => {
    // Clean up any existing test data
    try {
      await repository.deleteProduct(999, 1);
    } catch (error) {
      // Ignore if item doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await repository.deleteProduct(999, 1);
    } catch (error) {
      // Ignore if item doesn't exist
    }
  });

  it('should perform full CRUD operations', async () => {
    // Create
    const productData = {
      name: 'Integration Test Product',
      description: 'Test Description',
      price: 99.99,
      category_id: 1,
      inventory_quantity: 10,
      image_url: 'test.jpg'
    };

    const created = await repository.createProduct(1, productData);
    expect(created.name).toBe('Integration Test Product');
    expect(created.id).toBeDefined();

    const productId = created.id;

    // Read
    const found = await repository.getProductById(productId);
    expect(found).not.toBeNull();
    expect(found!.name).toBe('Integration Test Product');

    // Update
    const updated = await repository.updateProduct(productId, 1, {
      name: 'Updated Product Name',
      price: 149.99
    });
    expect(updated?.name).toBe('Updated Product Name');
    expect(updated?.price).toBe(149.99);

    // Delete
    const deleted = await repository.deleteProduct(productId, 1);
    expect(deleted).toBe(true);
    
    const notFound = await repository.getProductById(productId);
    expect(notFound).toBeNull();
  });

  it('should handle inventory operations', async () => {
    const productData = {
      name: 'Inventory Test Product',
      description: 'Test Description',
      price: 99.99,
      category_id: 1,
      inventory_quantity: 10,
      image_url: 'test.jpg'
    };

    const created = await repository.createProduct(1, productData);
    
    try {
      // Update inventory
      const updated = await repository.updateInventory(created.id, 20);
      expect(updated).toBe(true);
      
      // Check inventory
      const hasStock = await repository.hasInventory(created.id, 15);
      expect(hasStock).toBe(true);
      
      const noStock = await repository.hasInventory(created.id, 25);
      expect(noStock).toBe(false);
    } finally {
      await repository.deleteProduct(created.id, 1);
    }
  });
});

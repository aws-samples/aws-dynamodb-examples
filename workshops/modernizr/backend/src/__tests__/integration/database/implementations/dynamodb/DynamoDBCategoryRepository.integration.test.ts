import { DynamoDBCategoryRepository } from '../../../../../database/implementations/dynamodb/DynamoDBCategoryRepository';
import { isDynamoDBAvailable } from '../../../../../test-configs/integration-setup';

describe('DynamoDBCategoryRepository Integration', () => {
  let repository: DynamoDBCategoryRepository;

  beforeAll(async () => {
    if (!isDynamoDBAvailable()) {
      pending('DynamoDB Local not available');
    }
    repository = new DynamoDBCategoryRepository('categories');
  });

  beforeEach(async () => {
    // Clean up any existing test data
    try {
      await repository.delete(999);
    } catch (error) {
      // Ignore if item doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await repository.delete(999);
    } catch (error) {
      // Ignore if item doesn't exist
    }
  });

  it('should perform full CRUD operations', async () => {
    // Create
    const category = await repository.create({
      name: 'Integration Test Category'
    });
    expect(category.name).toBe('Integration Test Category');
    expect(category.id).toBeDefined();

    const categoryId = category.id;

    // Read
    const found = await repository.findById(categoryId);
    expect(found).not.toBeNull();
    expect(found!.name).toBe('Integration Test Category');

    // Update
    const updated = await repository.update(categoryId, {
      name: 'Updated Category Name'
    });
    expect(updated?.name).toBe('Updated Category Name');

    // Delete
    const deleted = await repository.delete(categoryId);
    expect(deleted).toBe(true);
    
    const notFound = await repository.findById(categoryId);
    expect(notFound).toBeNull();
  });

  it('should handle hierarchical relationships', async () => {
    const parent = await repository.create({
      name: 'Parent Category'
    });
    
    const child = await repository.create({
      name: 'Child Category',
      parent_id: parent.id
    });
    
    try {
      // Find by parent ID
      const children = await repository.findByParentId(parent.id);
      expect(children.length).toBeGreaterThan(0);
      
      // Check existence
      const exists = await repository.existsById(parent.id);
      expect(exists).toBe(true);
    } finally {
      await repository.delete(child.id);
      await repository.delete(parent.id);
    }
  });
});

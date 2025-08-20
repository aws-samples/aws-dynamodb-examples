import { DynamoDBProductRepository } from '../../../../../database/implementations/dynamodb/DynamoDBProductRepository';

// Mock the DynamoDB client
const mockSend = jest.fn();
const mockClient = {
  send: mockSend,
};

// Mock the DynamoDBClientManager
jest.mock('../../../../../database/config/DynamoDBClient', () => ({
  DynamoDBClientManager: {
    getClient: () => mockClient,
    getTableName: (tableName: string) => `test_${tableName}`,
  },
}));

describe('DynamoDBProductRepository Unit Tests', () => {
  let repository: DynamoDBProductRepository;

  beforeEach(() => {
    repository = new DynamoDBProductRepository('products');
    mockSend.mockClear();
  });

  describe('getProductById', () => {
    it('should return product when found', async () => {
      const mockProduct = {
        PK: 'PRODUCT#1',
        SK: '#META',
        id: 1,
        name: 'Test Product',
        description: 'Test Description',
        price: 99.99,
        category_id: 1,
        seller_id: 1,
        inventory_quantity: 10,
        image_url: 'test.jpg',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      };

      mockSend.mockResolvedValue({ Item: mockProduct });

      const result = await repository.getProductById(1);

      expect(result).toEqual({
        id: 1,
        name: 'Test Product',
        description: 'Test Description',
        price: 99.99,
        category_id: 1,
        seller_id: 1,
        inventory_quantity: 10,
        image_url: 'test.jpg',
        created_at: new Date('2024-01-01T00:00:00.000Z'),
        updated_at: new Date('2024-01-01T00:00:00.000Z')
      });
    });

    it('should return null when product not found', async () => {
      mockSend.mockResolvedValue({});

      const result = await repository.getProductById(999);

      expect(result).toBeNull();
    });
  });

  describe('createProduct', () => {
    it('should create product with generated ID', async () => {
      const productData = {
        name: 'New Product',
        description: 'New Description',
        price: 149.99,
        category_id: 2,
        inventory_quantity: 5,
        image_url: 'new.jpg'
      };

      mockSend.mockResolvedValue({});

      const result = await repository.createProduct(1, productData);

      expect(result.name).toBe('New Product');
      expect(result.price).toBe(149.99);
      expect(result.seller_id).toBe(1);
      expect(result.id).toBeDefined();
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('updateProduct', () => {
    it('should update existing product', async () => {
      const updates = {
        name: 'Updated Product',
        price: 199.99
      };

      const mockUpdatedProduct = {
        PK: 'PRODUCT#1',
        SK: '#META',
        id: 1,
        name: 'Updated Product',
        price: 199.99,
        category_id: 1,
        seller_id: 1,
        inventory_quantity: 10,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      };

      mockSend.mockResolvedValue({ Attributes: mockUpdatedProduct });

      const result = await repository.updateProduct(1, 1, updates);

      expect(result?.name).toBe('Updated Product');
      expect(result?.price).toBe(199.99);
    });
  });

  describe('deleteProduct', () => {
    it('should delete product', async () => {
      mockSend.mockResolvedValue({});

      const result = await repository.deleteProduct(1, 1);

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('getProducts', () => {
    it('should return paginated products', async () => {
      const mockProducts = [
        {
          PK: 'PRODUCT#1',
          SK: '#META',
          id: 1,
          name: 'Test Product',
          price: 99.99,
          category_id: 1,
          seller_id: 1,
          inventory_quantity: 10,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        }
      ];

      mockSend.mockResolvedValue({ Items: mockProducts });

      const result = await repository.getProducts({}, 1, 10);

      expect(result.products).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });
  });

  describe('updateInventory', () => {
    it('should update product inventory', async () => {
      mockSend.mockResolvedValue({});

      const result = await repository.updateInventory(1, 15);

      expect(result).toBe(true);
    });
  });
});

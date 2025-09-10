import { DynamoDBOrderRepository } from '../../../../../database/implementations/dynamodb/DynamoDBOrderRepository';
import { isDynamoDBAvailable } from '../../../../../test-configs/integration-setup';

describe('DynamoDBOrderRepository Integration', () => {
  let repository: DynamoDBOrderRepository;

  beforeAll(async () => {
    if (!isDynamoDBAvailable()) {
      pending('DynamoDB Local not available');
    }
    repository = new DynamoDBOrderRepository('orders');
  });

  beforeEach(async () => {
    // Clean up any existing test data
    try {
      await repository.updateOrderStatus(999, 'cancelled');
    } catch (error) {
      // Ignore if item doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await repository.updateOrderStatus(999, 'cancelled');
    } catch (error) {
      // Ignore if item doesn't exist
    }
  });

  it('should perform full order lifecycle', async () => {
    // Create order
    const order = await repository.createOrder(1, 149.99);
    expect(order.user_id).toBe(1);
    expect(order.total_amount).toBe(149.99);
    expect(order.status).toBe('pending');
    expect(order.id).toBeDefined();

    const orderId = order.id;

    // Create order items
    const item1 = await repository.createOrderItem(orderId, 1, 2, 49.99);
    const item2 = await repository.createOrderItem(orderId, 2, 1, 49.99);

    expect(item1.order_id).toBe(orderId);
    expect(item2.order_id).toBe(orderId);

    // Get order with items
    const orderWithItems = await repository.getOrderById(orderId);
    expect(orderWithItems).not.toBeNull();
    expect(orderWithItems!.items).toHaveLength(2);

    // Update order status
    const updated = await repository.updateOrderStatus(orderId, 'completed');
    expect(updated).toBe(true);

    // Verify status update
    const updatedOrder = await repository.getOrderById(orderId);
    expect(updatedOrder!.status).toBe('completed');
  });

  it('should handle user order queries', async () => {
    const order = await repository.createOrder(1, 99.99);
    
    try {
      // Get user orders
      const userOrders = await repository.getUserOrders(1);
      expect(userOrders.length).toBeGreaterThan(0);
      
      // Get user order count
      const count = await repository.getUserOrderCount(1);
      expect(count).toBeGreaterThan(0);
    } finally {
      await repository.updateOrderStatus(order.id, 'cancelled');
    }
  });
});

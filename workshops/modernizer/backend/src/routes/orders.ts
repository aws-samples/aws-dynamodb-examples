import { Router, Request, Response } from 'express';
import { OrderService } from '../services/OrderService';
import { OrderValidator } from '../models/Order';
import { authenticate } from '../middleware/auth';
import { ValidationSets } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const orderService = new OrderService();

// Checkout - Create order from cart
router.post('/checkout', authenticate, asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const checkoutRequest = req.body;

    const result = await orderService.checkout(userId, checkoutRequest);

    res.status(201).json({
      success: true,
      data: {
        order: OrderValidator.formatOrderResponse(result.order),
        payment: {
          success: result.paymentResult.success,
          transactionId: result.paymentResult.transactionId
        },
        message: 'Order created successfully'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    const statusCode = error.message.includes('Cart is empty') ? 400 :
                      error.message.includes('Inventory issues') ? 400 :
                      error.message.includes('Payment') ? 402 :
                      error.message.includes('required') || error.message.includes('Invalid') ? 400 : 500;

    res.status(statusCode).json({
      success: false,
      error: {
        type: error.constructor.name,
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
}));

// Get user's orders (order history)
router.get('/', authenticate, ValidationSets.getOrders, asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const result = await orderService.getUserOrders(userId, page, limit);

    res.json({
      success: true,
      data: {
        orders: result.orders.map(order => OrderValidator.formatOrderResponse(order)),
        pagination: result.pagination,
        message: 'Orders retrieved successfully'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      error: {
        type: error.constructor.name,
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
}));

// Get specific order by ID
router.get('/:orderId', authenticate, ValidationSets.getOrder, asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const orderId = parseInt(req.params.orderId);

    if (isNaN(orderId)) {
      res.status(400).json({
        success: false,
        error: {
          type: 'ValidationError',
          message: 'Invalid order ID'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const order = await orderService.getOrderById(orderId, userId);

    if (!order) {
      res.status(404).json({
        success: false,
        error: {
          type: 'NotFoundError',
          message: 'Order not found'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.json({
      success: true,
      data: {
        order: OrderValidator.formatOrderResponse(order),
        message: 'Order retrieved successfully'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Get order error:', error);
    const statusCode = error.message.includes('can only view your own') ? 403 : 500;

    res.status(statusCode).json({
      success: false,
      error: {
        type: error.constructor.name,
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
}));

// Cancel order
router.put('/:orderId/cancel', authenticate, ValidationSets.getOrder, asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const orderId = parseInt(req.params.orderId);

    if (isNaN(orderId)) {
      res.status(400).json({
        success: false,
        error: {
          type: 'ValidationError',
          message: 'Invalid order ID'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const success = await orderService.cancelOrder(orderId, userId);

    if (!success) {
      res.status(500).json({
        success: false,
        error: {
          type: 'Error',
          message: 'Failed to cancel order'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.json({
      success: true,
      data: {
        message: 'Order cancelled successfully'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Cancel order error:', error);
    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('can only cancel your own') ? 403 :
                      error.message.includes('Only pending orders') ? 400 : 500;

    res.status(statusCode).json({
      success: false,
      error: {
        type: error.constructor.name,
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
}));

// Get order summary/statistics
router.get('/user/summary', authenticate, asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const summary = await orderService.getOrderSummary(userId);

    res.json({
      success: true,
      data: {
        ...summary,
        message: 'Order summary retrieved successfully'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Get order summary error:', error);
    res.status(500).json({
      success: false,
      error: {
        type: error.constructor.name,
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
}));

// Update order status (for sellers)
router.put('/:orderId/status', authenticate, ValidationSets.getOrder, asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const orderId = parseInt(req.params.orderId);
    const { status } = req.body;

    if (isNaN(orderId)) {
      res.status(400).json({
        success: false,
        error: {
          type: 'ValidationError',
          message: 'Invalid order ID'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!status) {
      res.status(400).json({
        success: false,
        error: {
          type: 'ValidationError',
          message: 'Status is required'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const success = await orderService.updateOrderStatus(orderId, status, userId);

    if (!success) {
      res.status(500).json({
        success: false,
        error: {
          type: 'Error',
          message: 'Failed to update order status'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.json({
      success: true,
      data: {
        message: 'Order status updated successfully'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Update order status error:', error);
    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('not authorized') ? 403 :
                      error.message.includes('Invalid status') ? 400 : 500;

    res.status(statusCode).json({
      success: false,
      error: {
        type: error.constructor.name,
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
}));

// Get recent orders
router.get('/user/recent', authenticate, asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);

    const orders = await orderService.getRecentOrders(userId, limit);

    res.json({
      success: true,
      data: {
        orders: orders.map(order => OrderValidator.formatOrderResponse(order)),
        message: 'Recent orders retrieved successfully'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Get recent orders error:', error);
    res.status(500).json({
      success: false,
      error: {
        type: error.constructor.name,
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
}));

// Search user orders
router.get('/user/search', authenticate, asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const searchTerm = req.query.q as string;

    if (!searchTerm || searchTerm.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: {
          type: 'ValidationError',
          message: 'Search term is required'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const orders = await orderService.searchUserOrders(userId, searchTerm.trim());

    res.json({
      success: true,
      data: {
        orders: orders.map(order => OrderValidator.formatOrderResponse(order)),
        searchTerm: searchTerm.trim(),
        message: 'Order search completed successfully'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Search orders error:', error);
    res.status(500).json({
      success: false,
      error: {
        type: error.constructor.name,
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
}));

// Validate checkout eligibility
router.get('/checkout/validate', authenticate, asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const validation = await orderService.validateCheckoutEligibility(userId);

    res.json({
      success: true,
      data: {
        validation,
        message: validation.eligible ? 'Checkout is available' : 'Checkout validation failed'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Validate checkout error:', error);
    res.status(500).json({
      success: false,
      error: {
        type: error.constructor.name,
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
}));

export default router;
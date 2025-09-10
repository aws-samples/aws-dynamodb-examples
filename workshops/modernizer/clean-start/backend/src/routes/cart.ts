import { Router, Request, Response } from 'express';
import { ShoppingCartService } from '../services/ShoppingCartService';
import { ShoppingCartValidator } from '../models/ShoppingCart';
import { authenticate } from '../middleware/auth';
import { ValidationSets } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const cartService = new ShoppingCartService();

// Get user's cart
router.get('/', authenticate, asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const cart = await cartService.getCart(userId);

    res.json({
      success: true,
      data: {
        cart: ShoppingCartValidator.formatCartResponse(cart),
        message: 'Cart retrieved successfully'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Get cart error:', error);
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

// Add item to cart
router.post('/items', authenticate, ValidationSets.addToCart, asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { productId, quantity } = req.body;

    const cart = await cartService.addToCart(userId, { productId, quantity });

    res.status(201).json({
      success: true,
      data: {
        cart: ShoppingCartValidator.formatCartResponse(cart),
        message: 'Item added to cart successfully'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Add to cart error:', error);
    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('Insufficient inventory') ? 400 :
                      error.message.includes('Valid') || error.message.includes('must be') ? 400 : 500;

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

// Update cart item quantity
router.put('/items/:productId', authenticate, ValidationSets.updateCartItem, asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const productId = parseInt(req.params.productId);
    const { quantity } = req.body;

    if (isNaN(productId)) {
      res.status(400).json({
        success: false,
        error: {
          type: 'ValidationError',
          message: 'Invalid product ID'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const cart = await cartService.updateCartItem(userId, productId, { quantity });

    res.json({
      success: true,
      data: {
        cart: ShoppingCartValidator.formatCartResponse(cart),
        message: 'Cart item updated successfully'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Update cart item error:', error);
    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('Insufficient inventory') ? 400 :
                      error.message.includes('must be') ? 400 : 500;

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

// Remove item from cart
router.delete('/items/:productId', authenticate, ValidationSets.removeFromCart, asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const productId = parseInt(req.params.productId);

    if (isNaN(productId)) {
      res.status(400).json({
        success: false,
        error: {
          type: 'ValidationError',
          message: 'Invalid product ID'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const cart = await cartService.removeFromCart(userId, productId);

    res.json({
      success: true,
      data: {
        cart: ShoppingCartValidator.formatCartResponse(cart),
        message: 'Item removed from cart successfully'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Remove from cart error:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;

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

// Clear entire cart
router.delete('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    await cartService.clearCart(userId);

    res.json({
      success: true,
      data: {
        message: 'Cart cleared successfully'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      error: {
        type: error.constructor.name,
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Get cart summary (lightweight endpoint for cart badge)
router.get('/summary', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const summary = await cartService.getCartSummary(userId);

    res.json({
      success: true,
      data: {
        summary,
        message: 'Cart summary retrieved successfully'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Get cart summary error:', error);
    res.status(500).json({
      success: false,
      error: {
        type: error.constructor.name,
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Validate cart inventory (useful before checkout)
router.get('/validate', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const validation = await cartService.validateCartInventory(userId);

    res.json({
      success: true,
      data: {
        validation,
        message: validation.valid ? 'Cart inventory is valid' : 'Cart has inventory issues'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Validate cart error:', error);
    res.status(500).json({
      success: false,
      error: {
        type: error.constructor.name,
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
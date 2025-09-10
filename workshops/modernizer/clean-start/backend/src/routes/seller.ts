import { Router, Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { AuthMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const authService = new AuthService();
const authMiddleware = new AuthMiddleware();

// Apply authentication middleware to all seller routes
router.use(authMiddleware.authenticate.bind(authMiddleware));

/**
 * POST /api/seller/upgrade
 * Upgrade current user to seller status
 */
router.post('/upgrade', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          type: 'AuthenticationError',
          message: 'User authentication required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const updatedUser = await authService.upgradeToSeller(userId);

    res.status(200).json({
      success: true,
      data: {
        user: updatedUser,
        message: 'Successfully upgraded to seller account',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Seller upgrade error:', error);
    
    const statusCode = error instanceof Error && error.message === 'User not found' ? 404 : 500;
    
    res.status(statusCode).json({
      success: false,
      error: {
        type: error instanceof Error ? error.constructor.name : 'UnknownError',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/seller/profile
 * Get seller profile information
 */
router.get('/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          type: 'AuthenticationError',
          message: 'User authentication required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const userProfile = await authService.getUserProfile(userId);

    // Check if user is actually a seller
    if (!userProfile.is_seller) {
      res.status(403).json({
        success: false,
        error: {
          type: 'AuthorizationError',
          message: 'Seller account required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        seller: userProfile,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get seller profile error:', error);
    
    const statusCode = error instanceof Error && error.message === 'User not found' ? 404 : 500;
    
    res.status(statusCode).json({
      success: false,
      error: {
        type: error instanceof Error ? error.constructor.name : 'UnknownError',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/seller/dashboard
 * Get seller dashboard information
 */
router.get('/dashboard', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          type: 'AuthenticationError',
          message: 'User authentication required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const userProfile = await authService.getUserProfile(userId);

    // Check if user is actually a seller
    if (!userProfile.is_seller) {
      res.status(403).json({
        success: false,
        error: {
          type: 'AuthorizationError',
          message: 'Seller account required to access this resource',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Return basic dashboard data
    res.status(200).json({
      success: true,
      data: {
        seller: userProfile,
        dashboard: {
          totalProducts: 0, // TODO: Implement actual counts
          totalOrders: 0,
          totalRevenue: 0,
          pendingOrders: 0
        },
        message: 'Seller dashboard retrieved successfully'
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get seller dashboard error:', error);
    
    const statusCode = error instanceof Error && error.message === 'User not found' ? 404 : 500;
    
    res.status(statusCode).json({
      success: false,
      error: {
        type: error instanceof Error ? error.constructor.name : 'UnknownError',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * PUT /api/seller/profile
 * Update seller profile information
 */
router.put('/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          type: 'AuthenticationError',
          message: 'User authentication required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // First check if user is a seller
    const currentUser = await authService.getUserProfile(userId);
    if (!currentUser.is_seller) {
      res.status(403).json({
        success: false,
        error: {
          type: 'AuthorizationError',
          message: 'Seller account required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { first_name, last_name, email } = req.body;
    
    const updateData: any = {};
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (email !== undefined) updateData.email = email;

    const updatedUser = await authService.updateUserProfile(userId, updateData);

    res.status(200).json({
      success: true,
      data: {
        seller: updatedUser,
        message: 'Seller profile updated successfully',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update seller profile error:', error);
    
    let statusCode = 500;
    if (error instanceof Error) {
      if (error.message === 'User not found') statusCode = 404;
      if (error.message === 'Email already exists') statusCode = 409;
    }
    
    res.status(statusCode).json({
      success: false,
      error: {
        type: error instanceof Error ? error.constructor.name : 'UnknownError',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';

export class SellerMiddleware {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Middleware to ensure the authenticated user is a seller
   * Must be used after authentication middleware
   */
  requireSeller = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            type: 'AuthenticationError',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get user profile to check seller status
      const userProfile = await this.authService.getUserProfile(userId);

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

      // Add seller information to request for downstream use
      req.seller = {
        id: userProfile.id,
        username: userProfile.username,
        email: userProfile.email,
        first_name: userProfile.first_name,
        last_name: userProfile.last_name,
      };

      next();
    } catch (error) {
      console.error('Seller middleware error:', error);
      
      const statusCode = error instanceof Error && error.message === 'User not found' ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: {
          type: error instanceof Error ? error.constructor.name : 'UnknownError',
          message: error instanceof Error ? error.message : 'Failed to verify seller status',
        },
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Middleware to check if the authenticated user owns a specific resource
   * Requires the resource to have a seller_id field
   */
  requireResourceOwnership = (resourceIdParam: string = 'id') => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const userId = req.user?.userId;
        const resourceId = req.params[resourceIdParam];

        if (!userId) {
          res.status(401).json({
            success: false,
            error: {
              type: 'AuthenticationError',
              message: 'Authentication required',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (!resourceId) {
          res.status(400).json({
            success: false,
            error: {
              type: 'ValidationError',
              message: `Resource ID parameter '${resourceIdParam}' is required`,
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Store the resource ID and user ID for downstream validation
        // The actual ownership check will be done in the service layer
        // since it requires knowledge of the specific resource type
        req.resourceOwnership = {
          userId,
          resourceId: parseInt(resourceId, 10),
          resourceIdParam,
        };

        next();
      } catch (error) {
        console.error('Resource ownership middleware error:', error);
        
        res.status(500).json({
          success: false,
          error: {
            type: error instanceof Error ? error.constructor.name : 'UnknownError',
            message: 'Failed to verify resource ownership',
          },
          timestamp: new Date().toISOString(),
        });
      }
    };
  };
}

// Extend Express Request interface to include seller information
declare global {
  namespace Express {
    interface Request {
      seller?: {
        id: number;
        username: string;
        email: string;
        first_name?: string;
        last_name?: string;
      };
      resourceOwnership?: {
        userId: number;
        resourceId: number;
        resourceIdParam: string;
      };
    }
  }
}
import { Request, Response, NextFunction } from 'express';
import { DatabaseFactory } from '../database/factory/DatabaseFactory';

// Extend Express Request interface to include user with super_admin
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        super_admin?: boolean;
      };
    }
  }
}

export class SuperAdminMiddleware {
  // Middleware to check if user is a super admin
  requireSuperAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.userId) {
        res.status(401).json({
          success: false,
          error: {
            type: 'AuthenticationError',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get user from database to check super_admin status
      const userRepository = DatabaseFactory.createUserRepository();
      const user = await userRepository.findById(req.user.userId);

      if (!user) {
        res.status(401).json({
          success: false,
          error: {
            type: 'AuthenticationError',
            message: 'User not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!user.super_admin) {
        res.status(403).json({
          success: false,
          error: {
            type: 'AuthorizationError',
            message: 'Super admin privileges required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Add super_admin flag to request user object
      req.user.super_admin = true;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          type: 'InternalServerError',
          message: error instanceof Error ? error.message : 'Failed to verify super admin status'
        },
        timestamp: new Date().toISOString()
      });
    }
  };
}

// Create singleton instance
const superAdminMiddleware = new SuperAdminMiddleware();

export const requireSuperAdmin = superAdminMiddleware.requireSuperAdmin;

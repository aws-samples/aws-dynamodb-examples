import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';

// Extend Express Request interface to include user
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

export class AuthMiddleware {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  // Middleware to authenticate JWT token
  authenticate = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        res.status(401).json({
          success: false,
          error: {
            type: 'AuthenticationError',
            message: 'Authorization header is required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : authHeader;

      if (!token) {
        res.status(401).json({
          success: false,
          error: {
            type: 'AuthenticationError',
            message: 'Token is required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const decoded = this.authService.verifyToken(token);
      req.user = { userId: decoded.userId };
      
      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        error: {
          type: 'AuthenticationError',
          message: error instanceof Error ? error.message : 'Authentication failed'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  // Optional authentication - doesn't fail if no token provided
  optionalAuthenticate = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        next();
        return;
      }

      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : authHeader;

      if (!token) {
        next();
        return;
      }

      try {
        const decoded = this.authService.verifyToken(token);
        req.user = { userId: decoded.userId };
      } catch (error) {
        // Ignore token errors for optional authentication
        console.warn('Optional authentication failed:', error);
      }
      
      next();
    } catch (error) {
      // For optional auth, we don't fail the request
      next();
    }
  };
}

// Create singleton instance
const authMiddleware = new AuthMiddleware();

export const authenticate = authMiddleware.authenticate;
export const optionalAuthenticate = authMiddleware.optionalAuthenticate;
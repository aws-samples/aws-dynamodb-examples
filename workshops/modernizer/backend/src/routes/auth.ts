import { Router, Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { authenticate } from '../middleware/auth';
import { ValidationSets, rateLimitValidation, sanitizeInput } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const authService = new AuthService();

// Stricter rate limiting for authentication endpoints (configurable via environment variables)
const authMaxRequests = parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5');
const authWindowMs = parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '900000'); // 15 minutes default
const authRateLimit = rateLimitValidation(authMaxRequests, authWindowMs);

// Input sanitization middleware
const sanitizeAuthInput = (req: Request, res: Response, next: any) => {
  if (req.body.username) req.body.username = sanitizeInput.cleanHtml(req.body.username);
  if (req.body.email) req.body.email = sanitizeInput.cleanHtml(req.body.email);
  if (req.body.first_name) req.body.first_name = sanitizeInput.cleanHtml(req.body.first_name);
  if (req.body.last_name) req.body.last_name = sanitizeInput.cleanHtml(req.body.last_name);
  next();
};

// POST /api/auth/register - User registration
router.post('/register', authRateLimit, sanitizeAuthInput, ValidationSets.register, asyncHandler(async (req: Request, res: Response) => {
  const { username, email, password, first_name, last_name } = req.body;
  
  const result = await authService.register({
    username,
    email,
    password,
    first_name,
    last_name
  });

  res.status(201).json({
    success: true,
    data: result,
    message: 'User registered successfully',
    timestamp: new Date().toISOString()
  });
}));

// POST /api/auth/login - User login
router.post('/login', authRateLimit, sanitizeAuthInput, ValidationSets.login, asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body;
  
  const result = await authService.login({ username, password });

  res.json({
    success: true,
    data: result,
    message: 'Login successful',
    timestamp: new Date().toISOString()
  });
}));

// GET /api/auth/profile - Get user profile (protected)
router.get('/profile', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const user = await authService.getUserProfile(userId);

  res.json({
    success: true,
    data: { user },
    message: 'Profile retrieved successfully',
    timestamp: new Date().toISOString()
  });
}));

// PUT /api/auth/profile - Update user profile (protected)
router.put('/profile', authenticate, sanitizeAuthInput, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { email, first_name, last_name } = req.body;
  
  const result = await authService.updateUserProfile(userId, {
    email,
    first_name,
    last_name
  });

  res.json({
    success: true,
    data: result,
    message: 'Profile updated successfully',
    timestamp: new Date().toISOString()
  });
}));

// POST /api/auth/upgrade-seller - Upgrade to seller account (protected)
router.post('/upgrade-seller', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  
  const result = await authService.upgradeToSeller(userId);

  res.json({
    success: true,
    data: result,
    message: 'Successfully upgraded to seller account',
    timestamp: new Date().toISOString()
  });
}));

// POST /api/auth/logout - Logout (protected)
router.post('/logout', authenticate, asyncHandler(async (req: Request, res: Response) => {
  // In a more sophisticated implementation, you might want to blacklist the token
  // For now, we'll just return a success response as the client will remove the token
  
  res.json({
    success: true,
    message: 'Logged out successfully',
    timestamp: new Date().toISOString()
  });
}));

// GET /api/auth/verify - Verify token (protected)
router.get('/verify', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const user = await authService.getUserProfile(userId);

  res.json({
    success: true,
    data: { user, valid: true },
    message: 'Token is valid',
    timestamp: new Date().toISOString()
  });
}));

export default router;
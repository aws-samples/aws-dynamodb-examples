import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import { AppError, ErrorTypes } from './errorHandler';

// Validation result handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      type: 'field',
      msg: error.msg,
      path: (error as any).path || (error as any).param,
      location: (error as any).location,
      value: (error as any).value
    }));

    const error = new AppError('Validation failed', 400, ErrorTypes.VALIDATION_ERROR);
    (error as any).details = errorMessages;

    return next(error);
  }
  
  next();
};

// Common validation rules
export const ValidationRules = {
  // User validation
  username: () => body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),

  email: () => body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  password: () => body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character (@$!%*?&)'),

  // Product validation
  productName: () => body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Product name is required and must be less than 255 characters'),

  productDescription: () => body('description')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Product description is required and must be less than 2000 characters'),

  productPrice: () => body('price')
    .isFloat({ min: 0.01, max: 999999.99 })
    .withMessage('Price must be a positive number between 0.01 and 999999.99'),

  productInventory: () => body('inventory_quantity')
    .isInt({ min: 0 })
    .withMessage('Inventory quantity must be a non-negative integer'),

  categoryId: () => body('category_id')
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer'),

  // Cart validation
  productId: () => body('productId')
    .isInt({ min: 1 })
    .withMessage('Product ID must be a positive integer'),

  quantity: () => body('quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantity must be between 1 and 100'),

  // Order validation
  paymentMethod: () => body('paymentMethod')
    .isIn(['credit_card', 'paypal'])
    .withMessage('Payment method must be either credit_card or paypal'),

  cardNumber: () => body('paymentDetails.cardNumber')
    .optional()
    .matches(/^\d{16}$/)
    .withMessage('Card number must be 16 digits'),

  expiryDate: () => body('paymentDetails.expiryDate')
    .optional()
    .matches(/^(0[1-9]|1[0-2])\/\d{2}$/)
    .withMessage('Expiry date must be in MM/YY format'),

  cvv: () => body('paymentDetails.cvv')
    .optional()
    .matches(/^\d{3,4}$/)
    .withMessage('CVV must be 3 or 4 digits'),

  cardholderName: () => body('paymentDetails.cardholderName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Cardholder name is required and must be less than 100 characters'),

  // Parameter validation
  idParam: (paramName: string = 'id') => param(paramName)
    .isInt({ min: 1 })
    .withMessage(`${paramName} must be a positive integer`),

  // Query validation
  pageQuery: () => query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  limitQuery: () => query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  searchQuery: () => query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Search query must be between 1 and 255 characters'),

  sortQuery: () => query('sort')
    .optional()
    .isIn(['name', 'price_asc', 'price_desc', 'created_at_desc', 'created_at_asc'])
    .withMessage('Sort must be one of: name, price_asc, price_desc, created_at_desc, created_at_asc')
};

// Validation rule sets for different endpoints
export const ValidationSets = {
  // Auth validations
  register: [
    ValidationRules.username(),
    ValidationRules.email(),
    ValidationRules.password(),
    handleValidationErrors
  ],

  login: [
    ValidationRules.username(),
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors
  ],

  // Product validations
  createProduct: [
    ValidationRules.productName(),
    ValidationRules.productDescription(),
    ValidationRules.productPrice(),
    ValidationRules.productInventory(),
    ValidationRules.categoryId(),
    handleValidationErrors
  ],

  updateProduct: [
    ValidationRules.idParam(),
    ValidationRules.productName().optional(),
    ValidationRules.productDescription().optional(),
    ValidationRules.productPrice().optional(),
    ValidationRules.productInventory().optional(),
    ValidationRules.categoryId().optional(),
    handleValidationErrors
  ],

  getProduct: [
    ValidationRules.idParam(),
    handleValidationErrors
  ],

  getProducts: [
    ValidationRules.pageQuery(),
    ValidationRules.limitQuery(),
    ValidationRules.searchQuery(),
    ValidationRules.sortQuery(),
    query('category_id').optional().isInt({ min: 1 }).withMessage('Category ID must be a positive integer'),
    handleValidationErrors
  ],

  // Cart validations
  addToCart: [
    ValidationRules.productId(),
    ValidationRules.quantity(),
    handleValidationErrors
  ],

  updateCartItem: [
    ValidationRules.idParam('productId'),
    ValidationRules.quantity(),
    handleValidationErrors
  ],

  removeFromCart: [
    ValidationRules.idParam('productId'),
    handleValidationErrors
  ],

  // Order validations
  checkout: [
    body('shipping_address')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Shipping address is required and must be less than 500 characters'),
    ValidationRules.paymentMethod(),
    body('paymentDetails').custom((value, { req }) => {
      if (req.body.paymentMethod === 'credit_card') {
        if (!value || typeof value !== 'object') {
          throw new Error('Payment details are required for credit card payments');
        }
        
        const { cardNumber, expiryDate, cvv, cardholderName } = value;
        
        if (!cardNumber || !/^\d{16}$/.test(cardNumber)) {
          throw new Error('Valid 16-digit card number is required');
        }
        
        if (!expiryDate || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiryDate)) {
          throw new Error('Valid expiry date in MM/YY format is required');
        }
        
        if (!cvv || !/^\d{3,4}$/.test(cvv)) {
          throw new Error('Valid CVV (3-4 digits) is required');
        }
        
        if (!cardholderName || cardholderName.trim().length === 0) {
          throw new Error('Cardholder name is required');
        }
      }
      
      return true;
    }),
    handleValidationErrors
  ],

  getOrders: [
    ValidationRules.pageQuery(),
    ValidationRules.limitQuery(),
    handleValidationErrors
  ],

  getOrder: [
    ValidationRules.idParam('orderId'),
    handleValidationErrors
  ],

  // Category validations
  createCategory: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Category name is required and must be less than 100 characters'),
    body('parent_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Parent ID must be a positive integer'),
    handleValidationErrors
  ]
};

// Rate limiting validation
export const rateLimitValidation = (maxRequests?: number, windowMs?: number) => {
  // Use environment variables with fallback defaults
  const defaultMaxRequests = maxRequests || parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');
  const defaultWindowMs = windowMs || parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15 minutes default
  
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - defaultWindowMs;

    // Clean up old entries
    for (const [key, value] of requests.entries()) {
      if (value.resetTime < windowStart) {
        requests.delete(key);
      }
    }

    const clientRequests = requests.get(clientId);

    if (!clientRequests) {
      requests.set(clientId, { count: 1, resetTime: now + defaultWindowMs });
      return next();
    }

    if (clientRequests.resetTime < now) {
      // Reset the window
      requests.set(clientId, { count: 1, resetTime: now + defaultWindowMs });
      return next();
    }

    if (clientRequests.count >= defaultMaxRequests) {
      const error = new AppError(
        'Too many requests. Please try again later.',
        429,
        ErrorTypes.RATE_LIMIT_ERROR
      );
      return next(error);
    }

    clientRequests.count++;
    next();
  };
};

// Sanitization helpers
export const sanitizeInput = {
  // Remove HTML tags and dangerous characters
  cleanHtml: (input: string): string => {
    return input.replace(/<[^>]*>/g, '').trim();
  },

  // Escape SQL injection attempts
  escapeSql: (input: string): string => {
    return input.replace(/['";\\]/g, '\\$&');
  },

  // Clean search queries
  cleanSearchQuery: (query: string): string => {
    return query.replace(/[<>'"&]/g, '').trim();
  }
};
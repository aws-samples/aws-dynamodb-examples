import { Request, Response, NextFunction } from 'express';

// Custom error class for application errors
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error types for better categorization
export const ErrorTypes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
};

// Global error handling middleware
export const globalErrorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err } as AppError;
  error.message = err.message;

  // Log error for debugging (sanitized for security)
  const sanitizedBody = req.body ? Object.keys(req.body).reduce((acc: any, key) => {
    // Don't log sensitive fields
    if (['password', 'token', 'cardNumber', 'cvv', 'ssn'].includes(key.toLowerCase())) {
      acc[key] = '[REDACTED]';
    } else {
      acc[key] = req.body[key];
    }
    return acc;
  }, {}) : {};

  console.error('Error occurred:', {
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    url: req.url,
    method: req.method,
    body: sanitizedBody,
    params: req.params,
    query: req.query,
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    error = handleValidationError(err);
  } else if (err.name === 'CastError') {
    error = handleCastError(err);
  } else if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  } else if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  } else if ((err as any).code === 'ER_DUP_ENTRY') {
    error = handleDuplicateFieldError(err);
  } else if ((err as any).code === 'ER_NO_REFERENCED_ROW_2') {
    error = handleForeignKeyError(err);
  } else if ((err as any).code === 'ECONNREFUSED') {
    error = handleDatabaseConnectionError();
  }

  // Set default values if not already set
  if (!error.statusCode) {
    error.statusCode = 500;
  }
  if (!error.code) {
    error.code = ErrorTypes.INTERNAL_SERVER_ERROR;
  }

  // Send error response (sanitized for production)
  const response: any = {
    success: false,
    error: {
      type: error.code || error.name,
      message: error.isOperational ? error.message : 'Something went wrong'
    },
    timestamp: new Date().toISOString()
  };

  // Only include sensitive debugging info in development
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = error.stack;
    response.error.details = {
      name: error.name,
      statusCode: error.statusCode,
      isOperational: error.isOperational
    };
  }

  res.status(error.statusCode).json(response);
};

// Handle validation errors
const handleValidationError = (err: any): AppError => {
  const errors = Object.values(err.errors).map((val: any) => val.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new AppError(message, 400, ErrorTypes.VALIDATION_ERROR);
};

// Handle database cast errors
const handleCastError = (err: any): AppError => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400, ErrorTypes.VALIDATION_ERROR);
};

// Handle JWT errors
const handleJWTError = (): AppError => {
  return new AppError('Invalid token. Please log in again.', 401, ErrorTypes.AUTHENTICATION_ERROR);
};

// Handle JWT expired errors
const handleJWTExpiredError = (): AppError => {
  return new AppError('Your token has expired. Please log in again.', 401, ErrorTypes.AUTHENTICATION_ERROR);
};

// Handle duplicate field errors
const handleDuplicateFieldError = (err: any): AppError => {
  const field = err.message.match(/for key '(.+?)'/)?.[1] || 'field';
  const message = `Duplicate value for ${field}. Please use another value.`;
  return new AppError(message, 409, ErrorTypes.CONFLICT_ERROR);
};

// Handle foreign key constraint errors
const handleForeignKeyError = (err: any): AppError => {
  const message = 'Referenced record does not exist. Please check your input.';
  return new AppError(message, 400, ErrorTypes.VALIDATION_ERROR);
};

// Handle database connection errors
const handleDatabaseConnectionError = (): AppError => {
  return new AppError('Database connection failed. Please try again later.', 503, ErrorTypes.DATABASE_ERROR);
};

// Async error wrapper to catch async errors
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler for undefined routes
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404, ErrorTypes.NOT_FOUND_ERROR);
  next(error);
};

// Unhandled promise rejection handler
export const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('Unhandled Promise Rejection:', reason);
    // In production, you might want to gracefully shut down the server
    process.exit(1);
  });
};

// Uncaught exception handler
export const handleUncaughtException = () => {
  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);
    // In production, you might want to gracefully shut down the server
    process.exit(1);
  });
};
// Load environment variables first
import { config } from 'dotenv';
config(); // Load .env file

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { testConnection, getPoolStats } from './config/database';
import { config as envConfig } from './config/env';
import { 
  globalErrorHandler, 
  notFoundHandler, 
  handleUnhandledRejection, 
  handleUncaughtException 
} from './middleware/errorHandler';
import { rateLimitValidation } from './middleware/validation';
import { performanceMonitor, performanceMiddleware } from './utils/performanceMonitor';
import authRoutes from './routes/auth';
import sellerRoutes from './routes/seller';
import categoryRoutes from './routes/categories';
import productRoutes from './routes/products';
import cartRoutes from './routes/cart';
import orderRoutes from './routes/orders';

const app = express();
const PORT = envConfig.PORT;

console.log('Starting server with enhanced error handling...');
console.log('✅ Environment variables validated successfully');

// Handle uncaught exceptions and unhandled rejections
handleUncaughtException();
handleUnhandledRejection();

// Security and basic middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for API compatibility
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] // Replace with actual production domain
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('combined'));

// Body parsing middleware with secure size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Global rate limiting (configurable via environment variables)
const globalMaxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');
const globalWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15 minutes default
app.use(rateLimitValidation(globalMaxRequests, globalWindowMs));

// Performance monitoring middleware
app.use(performanceMiddleware);

// Register routes
console.log('Registering routes...');
app.use('/api/auth', authRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
console.log('All routes registered.');

// Performance monitoring endpoint
app.get('/api/performance', (req, res) => {
  const summary = performanceMonitor.getPerformanceSummary();
  const endpointStats = performanceMonitor.getAllEndpointStats();
  
  res.json({
    success: true,
    data: {
      systemHealth: summary.systemHealth,
      issues: summary.issues,
      recommendations: summary.recommendations,
      metrics: summary.metrics,
      endpoints: endpointStats,
      timestamp: new Date().toISOString()
    }
  });
});

// Health check route with database and performance monitoring
app.get('/api/health', async (req, res) => {
  try {
    const poolStats = getPoolStats();
    const performanceStats = performanceMonitor.getSystemMetrics();
    
    res.json({
      success: true,
      data: {
        status: 'OK',
        message: 'Server is running with performance monitoring',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        database: {
          poolStats: {
            total: poolStats.totalConnections,
            active: poolStats.activeConnections,
            idle: poolStats.idleConnections,
            queued: poolStats.queuedRequests
          }
        },
        performance: {
          memory: performanceStats.memory,
          requests: performanceStats.requests
        }
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: {
        type: 'SERVICE_UNAVAILABLE',
        message: 'Health check failed'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Handle 404 for undefined routes
app.use(notFoundHandler);

// Global error handling middleware (must be last)
app.use(globalErrorHandler);

// Start server with performance monitoring
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Database connection established
    
    // Start performance monitoring
    const monitoringInterval = performanceMonitor.startMonitoring(60000); // Every minute
    
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📈 Performance monitoring: http://localhost:${PORT}/api/performance`);
      console.log(`🛡️  Enhanced error handling and validation enabled`);
      console.log(`📊 Database pool monitoring enabled`);
      console.log(`⚡ Performance monitoring enabled`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      clearInterval(monitoringInterval);
      process.exit(0);
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully');
      clearInterval(monitoringInterval);
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Export app for testing
export { app };

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

console.log('Server setup complete with comprehensive error handling');
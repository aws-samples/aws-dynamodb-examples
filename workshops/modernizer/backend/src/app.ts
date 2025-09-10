// Load environment variables first
import { config } from 'dotenv';
config(); // Load .env file

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { testConnection, getPoolStats } from './config/database';
import { config as envConfig } from './config/env';
import { DatabaseFactory } from './database/factory/DatabaseFactory';
import { DatabaseConfigManager } from './database/config/DatabaseConfig';
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
import adminRoutes from './routes/admin';

const app = express();

// Initialize database abstraction layer
const databaseConfig = DatabaseConfigManager.initialize();
DatabaseFactory.initialize(databaseConfig.type);

console.log('Starting server with enhanced error handling...');
console.log('✅ Environment variables validated successfully');
console.log(`✅ Database abstraction layer initialized with ${databaseConfig.type} configuration`);

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
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Performance monitoring middleware
app.use(performanceMiddleware);

// Rate limiting
app.use(rateLimitValidation());

console.log('Registering routes...');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

console.log('All routes registered.');

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const isDbConnected = await testConnection();
    const poolStats = getPoolStats();
    
    if (!isDbConnected) {
      return res.status(503).json({
        success: false,
        error: {
          type: 'SERVICE_UNAVAILABLE',
          message: 'Health check failed',
          details: 'Database connection failed'
        }
      });
    }

    return res.json({
      success: true,
      data: {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: {
          connected: isDbConnected,
          pool: poolStats
        },
        environment: process.env.NODE_ENV || 'development'
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    return res.status(503).json({
      success: false,
      error: {
        type: 'SERVICE_UNAVAILABLE',
        message: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(globalErrorHandler);

console.log('Server setup complete with comprehensive error handling');

export { app };
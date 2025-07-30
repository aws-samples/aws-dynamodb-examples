import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { testConnection } from './src/config/database';
import authRoutes from './src/routes/auth';
import sellerRoutes from './src/routes/seller';
import categoryRoutes from './src/routes/categories';
import productRoutes from './src/routes/products';
import cartRoutes from './src/routes/cart';
import orderRoutes from './src/routes/orders';

const app = express();
const PORT = process.env.PORT || 8100;

console.log('Starting debug server...');

// Basic middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register routes
console.log('Registering routes...');
app.use('/api/auth', authRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
console.log('All routes registered.');

// Simple test route
app.get('/api/health', (req, res) => {
  console.log('Health check endpoint hit');
  res.json({
    status: 'OK',
    message: 'Debug server is running',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Debug server is running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

console.log('Debug server setup complete');
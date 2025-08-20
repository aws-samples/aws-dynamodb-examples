// React import not needed with new JSX transform
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Import pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CategoriesPage from './pages/CategoriesPage';
import CartPage from './pages/CartPage';
import ProfilePage from './pages/ProfilePage';
import UpgradeSellerPage from './pages/UpgradeSellerPage';
import SellerDashboardPage from './pages/SellerDashboardPage';
import SellerProductsPage from './pages/SellerProductsPage';
import CreateProductPage from './pages/CreateProductPage';
import EditProductPage from './pages/EditProductPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import OrderDetailPage from './pages/OrderDetailPage';
import AdminMigrationControlPage from './pages/AdminMigrationControlPage';

// API configuration is handled in services/api.ts
import { logger } from './services/logger';

function App() {
  // Configure basename for production deployment behind nginx at /store
  const basename: string | undefined = process.env.NODE_ENV === 'production' ? '/store' : undefined;
  logger.debug('Environment configuration', {
    NODE_ENV: process.env.NODE_ENV,
    PUBLIC_URL: process.env.PUBLIC_URL,
    REACT_APP_API_URL: process.env.REACT_APP_API_URL
  });
  logger.info('Router basename configured', { basename });

  return (
    <ErrorBoundary>
      <Router {...(basename ? { basename } : {})}>
        <AuthProvider>
          <CartProvider>
            <Layout>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />

              {/* Protected routes */}
              <Route
                path="/cart"
                element={
                  <ProtectedRoute>
                    <CartPage />
                  </ProtectedRoute>
                }
              />

              {/* Placeholder routes for future implementation */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/checkout"
                element={
                  <ProtectedRoute>
                    <CheckoutPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/order-confirmation"
                element={
                  <ProtectedRoute>
                    <OrderConfirmationPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <OrderHistoryPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/orders/:orderId"
                element={
                  <ProtectedRoute>
                    <OrderDetailPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/upgrade-seller"
                element={
                  <ProtectedRoute>
                    <UpgradeSellerPage />
                  </ProtectedRoute>
                }
              />

              {/* Seller routes */}
              <Route
                path="/seller/dashboard"
                element={
                  <ProtectedRoute requireSeller={true}>
                    <SellerDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/seller/products"
                element={
                  <ProtectedRoute requireSeller={true}>
                    <SellerProductsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/seller/products/new"
                element={
                  <ProtectedRoute requireSeller={true}>
                    <CreateProductPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/seller/products/:id/edit"
                element={
                  <ProtectedRoute requireSeller={true}>
                    <EditProductPage />
                  </ProtectedRoute>
                }
              />

              <Route path="/categories" element={<CategoriesPage />} />

              {/* Hidden admin route - not in navigation */}
              <Route
                path="/admin/migration-control"
                element={
                  <ProtectedRoute>
                    <AdminMigrationControlPage />
                  </ProtectedRoute>
                }
              />

              {/* 404 route */}
              <Route
                path="*"
                element={
                  <div className="text-center py-8">
                    <h1 className="text-2xl font-bold">Page Not Found</h1>
                    <p className="text-gray-600 mt-2">The page you're looking for doesn't exist.</p>
                  </div>
                }
              />
            </Routes>
          </Layout>
        </CartProvider>
      </AuthProvider>
    </Router>
    </ErrorBoundary>
  );
}

export default App;

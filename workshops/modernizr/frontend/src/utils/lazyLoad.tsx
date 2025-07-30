import React, { Suspense, ComponentType } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';

// Higher-order component for lazy loading with loading fallback
export function withLazyLoading<T extends {}>(
  LazyComponent: React.LazyExoticComponent<ComponentType<T>>,
  fallback?: React.ReactNode
) {
  return function LazyLoadedComponent(props: T) {
    return (
      <Suspense fallback={fallback || <LoadingSpinner size="large" />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Utility for creating lazy-loaded components with error boundaries
export function createLazyComponent<T extends {}>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = React.lazy(importFn);
  return withLazyLoading(LazyComponent, fallback);
}

// Preload utility for critical routes
export function preloadComponent(importFn: () => Promise<any>) {
  // Preload the component when the user hovers over a link or button
  return {
    onMouseEnter: () => {
      importFn();
    },
    onFocus: () => {
      importFn();
    }
  };
}

// Route-based code splitting utility
export const LazyRoutes = {
  // Lazy load page components
  HomePage: createLazyComponent(() => import('../pages/HomePage')),
  LoginPage: createLazyComponent(() => import('../pages/LoginPage')),
  RegisterPage: createLazyComponent(() => import('../pages/RegisterPage')),
  ProductsPage: createLazyComponent(() => import('../pages/ProductsPage')),
  ProductDetailPage: createLazyComponent(() => import('../pages/ProductDetailPage')),
  CartPage: createLazyComponent(() => import('../pages/CartPage')),
  CheckoutPage: createLazyComponent(() => import('../pages/CheckoutPage')),
  OrderHistoryPage: createLazyComponent(() => import('../pages/OrderHistoryPage')),
  OrderDetailPage: createLazyComponent(() => import('../pages/OrderDetailPage')),
  OrderConfirmationPage: createLazyComponent(() => import('../pages/OrderConfirmationPage')),
  SellerDashboard: createLazyComponent(() => import('../pages/SellerDashboardPage')),
  ProfilePage: createLazyComponent(() => import('../pages/ProfilePage'))
};

// Performance monitoring for lazy loading
export function trackLazyLoadPerformance(componentName: string) {
  const startTime = performance.now();
  
  return {
    onLoad: () => {
      const loadTime = performance.now() - startTime;
      console.log(`Lazy component ${componentName} loaded in ${loadTime.toFixed(2)}ms`);
      
      // In production, send to analytics
      if (process.env.NODE_ENV === 'production') {
        // Example: analytics.track('lazy_component_load', { componentName, loadTime });
      }
    }
  };
}
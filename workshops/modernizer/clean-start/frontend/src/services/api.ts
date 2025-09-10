import axios, { AxiosError, AxiosResponse } from 'axios';
import { ErrorService, ErrorType } from './errorService';
import { logger } from './logger';
import { secureStorage } from './secureStorage';

// Create axios instance with base configuration
// Environment-aware API URL configuration
// Development: Use full localhost URL with /api prefix for direct backend connection
// Production: Use relative /api path for nginx proxy
const apiUrl = process.env.NODE_ENV === 'production' 
  ? '/api'  // Relative path for nginx proxy in production
  : (process.env.REACT_APP_API_URL || 'http://localhost:8100/api'); // Full URL with /api prefix for development

logger.info('API service configured with URL:', { apiUrl });
const api = axios.create({
  baseURL: apiUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token from secure storage
api.interceptors.request.use(
  async (config) => {
    const token = secureStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for enhanced error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // Parse error using ErrorService
    const parsedError = ErrorService.parseApiError(error);
    
    // Log error for debugging
    ErrorService.logError(parsedError, 'API Request');
    
    // Handle authentication errors
    if (parsedError.type === ErrorType.AUTHENTICATION_ERROR) {
      // Clear secure storage on authentication errors
      secureStorage.removeToken();
      ErrorService.handleAuthenticationError();
    }
    
    // Create enhanced error object
    const enhancedError = new Error(ErrorService.getUserFriendlyMessage(parsedError));
    (enhancedError as any).originalError = error;
    (enhancedError as any).parsedError = parsedError;
    
    return Promise.reject(enhancedError);
  }
);

export default api;

// Enhanced API methods with retry logic
export const apiGet = (url: string, config?: any, retries?: number) => 
  retries ? ErrorService.retryRequest(() => api.get(url, config), retries) : api.get(url, config);

export const apiPost = (url: string, data?: any, config?: any, retries?: number) => 
  retries ? ErrorService.retryRequest(() => api.post(url, data, config), retries) : api.post(url, data, config);

export const apiPut = (url: string, data?: any, config?: any, retries?: number) => 
  retries ? ErrorService.retryRequest(() => api.put(url, data, config), retries) : api.put(url, data, config);

export const apiDelete = (url: string, config?: any, retries?: number) => 
  retries ? ErrorService.retryRequest(() => api.delete(url, config), retries) : api.delete(url, config);

// API endpoint constants
export const API_ENDPOINTS = {
  // Auth endpoints
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  UPGRADE_TO_SELLER: '/auth/upgrade-seller',
  
  // Product endpoints
  PRODUCTS: '/products',
  PRODUCT_BY_ID: (id: number) => `/products/${id}`,
  SELLER_PRODUCTS: '/products/seller',
  
  // Category endpoints
  CATEGORIES: '/categories',
  CATEGORY_BY_ID: (id: number) => `/categories/${id}`,
  
  // Cart endpoints
  CART: '/cart',
  CART_ADD: '/cart/add',
  CART_UPDATE: '/cart/update',
  CART_REMOVE: (productId: number) => `/cart/remove/${productId}`,
  CART_CLEAR: '/cart/clear',
  
  // Order endpoints
  ORDERS: '/orders',
  ORDER_BY_ID: (id: number) => `/orders/${id}`,
  CHECKOUT: '/orders/checkout',
};
import axios, { AxiosError, AxiosResponse } from 'axios';
import { ErrorService, ErrorType } from './errorService';

// Create axios instance with base configuration
// Environment-aware API URL configuration
// Development: Use full localhost URL for direct backend connection
// Production: Use relative /api path for nginx proxy
const apiUrl = process.env.NODE_ENV === 'production' 
  ? '/api'  // Relative path for nginx proxy in production
  : (process.env.REACT_APP_API_URL || 'http://localhost:8100'); // Full URL for development

console.log('API service configured with URL:', apiUrl);
const api = axios.create({
  baseURL: apiUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
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
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  UPGRADE_TO_SELLER: '/api/auth/upgrade-seller',
  
  // Product endpoints
  PRODUCTS: '/api/products',
  PRODUCT_BY_ID: (id: number) => `/api/products/${id}`,
  SELLER_PRODUCTS: '/api/products/seller',
  
  // Category endpoints
  CATEGORIES: '/api/categories',
  CATEGORY_BY_ID: (id: number) => `/api/categories/${id}`,
  
  // Cart endpoints
  CART: '/api/cart',
  CART_ADD: '/api/cart/add',
  CART_UPDATE: '/api/cart/update',
  CART_REMOVE: (productId: number) => `/api/cart/remove/${productId}`,
  CART_CLEAR: '/api/cart/clear',
  
  // Order endpoints
  ORDERS: '/api/orders',
  ORDER_BY_ID: (id: number) => `/api/orders/${id}`,
  CHECKOUT: '/api/orders/checkout',
};
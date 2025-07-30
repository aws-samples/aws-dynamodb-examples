// Core types and interfaces for the load testing system

export interface LoadTestConfig {
  // Test parameters
  userCount: number;
  duration: number; // minutes
  rampUpTime: number; // seconds
  
  // User behavior distribution (percentages)
  behaviors: {
    browserUsers: number;
    buyerUsers: number;
    sellerUsers: number;
  };
  
  // Action frequencies (actions per minute)
  actionRates: {
    browsing: number;
    searching: number;
    cartActions: number;
    checkouts: number;
    sellerActions: number;
  };
  
  // Data seeding configuration
  dataSeeding: DataSeedingConfig;
  
  // Test identification
  testName?: string;
  description?: string;
}

export interface DataSeedingConfig {
  categories: number;
  products: number;
  users: number;
  sellers: number;
  cleanupAfter: boolean;
}

export interface UserBehaviorConfig {
  browserUsers: number;
  buyerUsers: number;
  sellerUsers: number;
  actionDelayRange: {
    min: number; // seconds
    max: number; // seconds
  };
}

// Test execution and status
export interface TestStatus {
  isRunning: boolean;
  startTime?: Date;
  elapsedTime: number; // seconds
  activeUsers: number;
  completedActions: number;
  errors: number;
  currentPhase: TestPhase;
}

export enum TestPhase {
  INITIALIZING = 'initializing',
  SEEDING_DATA = 'seeding_data',
  RAMPING_UP = 'ramping_up',
  STEADY_STATE = 'steady_state',
  RAMPING_DOWN = 'ramping_down',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// User session management
export interface UserSession {
  id: string;
  type: UserType;
  userId?: number; // Database user ID after authentication
  token?: string; // JWT token for API calls
  startTime: Date;
  endTime?: Date;
  actions: UserAction[];
  isActive: boolean;
  currentState: SessionState;
  metadata: Record<string, any>;
}

export enum UserType {
  BROWSER = 'browser',
  BUYER = 'buyer',
  SELLER = 'seller'
}

export enum SessionState {
  INITIALIZING = 'initializing',
  AUTHENTICATING = 'authenticating',
  ACTIVE = 'active',
  COMPLETING_ACTION = 'completing_action',
  ERROR = 'error',
  COMPLETED = 'completed'
}

// User actions tracking
export interface UserAction {
  id: string;
  sessionId: string;
  type: ActionType;
  endpoint: string;
  method: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds
  success: boolean;
  statusCode?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export enum ActionType {
  // Authentication
  REGISTER = 'register',
  LOGIN = 'login',
  LOGOUT = 'logout',
  
  // Browsing
  BROWSE_PRODUCTS = 'browse_products',
  BROWSE_CATEGORIES = 'browse_categories',
  SEARCH_PRODUCTS = 'search_products',
  VIEW_PRODUCT = 'view_product',
  FILTER_PRODUCTS = 'filter_products',
  
  // Shopping
  ADD_TO_CART = 'add_to_cart',
  UPDATE_CART = 'update_cart',
  REMOVE_FROM_CART = 'remove_from_cart',
  VIEW_CART = 'view_cart',
  CLEAR_CART = 'clear_cart',
  
  // Checkout
  CHECKOUT_START = 'checkout_start',
  CHECKOUT_COMPLETE = 'checkout_complete',
  VIEW_ORDERS = 'view_orders',
  VIEW_ORDER_DETAIL = 'view_order_detail',
  
  // Seller actions
  UPGRADE_TO_SELLER = 'upgrade_to_seller',
  CREATE_PRODUCT = 'create_product',
  UPDATE_PRODUCT = 'update_product',
  UPDATE_INVENTORY = 'update_inventory',
  VIEW_SELLER_DASHBOARD = 'view_seller_dashboard',
  
  // System actions
  HEALTH_CHECK = 'health_check',
  GET_PROFILE = 'get_profile'
}

// Performance monitoring
export interface PerformanceMetrics {
  testId: string;
  timestamp: Date;
  apiMetrics: EndpointMetrics[];
  systemMetrics: SystemMetrics;
  userMetrics: UserMetrics;
  errorMetrics: ErrorMetrics;
}

export interface EndpointMetrics {
  endpoint: string;
  method: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
}

export interface SystemMetrics {
  timestamp: Date;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  database: {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    queuedRequests: number;
  };
  requests: {
    total: number;
    successful: number;
    failed: number;
    rate: number; // requests per second
  };
}

export interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  usersByType: Record<UserType, number>;
  averageSessionDuration: number;
  totalActions: number;
  actionsPerUser: number;
  successfulSessions: number;
  failedSessions: number;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByEndpoint: Record<string, number>;
  errorRate: number;
  criticalErrors: number;
  recentErrors: ErrorSummary[];
}

export interface ErrorSummary {
  timestamp: Date;
  type: string;
  message: string;
  endpoint?: string;
  sessionId?: string;
  count: number;
}

// Test results and reporting
export interface TestResults {
  testId: string;
  config: LoadTestConfig;
  status: TestStatus;
  startTime: Date;
  endTime?: Date;
  duration: number; // seconds
  summary: TestSummary;
  metrics: PerformanceMetrics;
  errors: ErrorSummary[];
  recommendations: string[];
}

export interface TestSummary {
  totalUsers: number;
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  successRate: number;
  averageResponseTime: number;
  requestsPerSecond: number;
  peakConcurrentUsers: number;
  dataGenerated: {
    categories: number;
    products: number;
    users: number;
    orders: number;
  };
}

// Data seeding results
export interface SeedingResults {
  categories: Array<{ id: number; name: string; parent_id?: number }>;
  products: Array<{ id: number; name: string; category_id: number; seller_id: number }>;
  users: Array<{ id: number; username: string; email: string; is_seller: boolean }>;
  sellers: Array<{ id: number; username: string; products_created: number }>;
  summary: {
    totalCategories: number;
    totalProducts: number;
    totalUsers: number;
    totalSellers: number;
    seedingDuration: number; // seconds
  };
}

// Configuration validation
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// API response types for load testing
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    type: string;
    message: string;
  };
  timestamp: string;
}

// Load test event types for monitoring
export interface LoadTestEvent {
  type: LoadTestEventType;
  timestamp: Date;
  data: any;
  sessionId?: string;
  userId?: number;
}

export enum LoadTestEventType {
  TEST_STARTED = 'test_started',
  TEST_COMPLETED = 'test_completed',
  TEST_FAILED = 'test_failed',
  USER_SPAWNED = 'user_spawned',
  USER_COMPLETED = 'user_completed',
  USER_FAILED = 'user_failed',
  ACTION_COMPLETED = 'action_completed',
  ACTION_FAILED = 'action_failed',
  ERROR_OCCURRED = 'error_occurred',
  MILESTONE_REACHED = 'milestone_reached'
}
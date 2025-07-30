// Core interfaces for load testing components

import {
  LoadTestConfig,
  TestResults,
  TestStatus,
  UserSession,
  UserBehaviorConfig,
  PerformanceMetrics,
  SeedingResults,
  ValidationResult,
  LoadTestEvent
} from './index';

// Main test controller interface
export interface ITestController {
  startLoadTest(config: LoadTestConfig): Promise<TestResults>;
  stopLoadTest(): Promise<void>;
  getTestStatus(): TestStatus;
  validateConfig(config: LoadTestConfig): ValidationResult;
  getTestResults(): TestResults | null;
}

// Data seeding interface
export interface IDataSeeder {
  seedCategories(count: number): Promise<Array<{ id: number; name: string; parent_id?: number }>>;
  seedProducts(count: number, categories: Array<{ id: number; name: string }>): Promise<Array<{ id: number; name: string; category_id: number; seller_id: number }>>;
  seedUsers(count: number): Promise<Array<{ id: number; username: string; email: string; password: string }>>;
  seedSellers(userCount: number, existingUsers?: Array<{ id: number; username: string }>): Promise<Array<{ id: number; username: string; products_created: number }>>;
  cleanupTestData(): Promise<void>;
  getSeedingResults(): SeedingResults | null;
}

// User simulation interfaces
export interface IUserSimulator {
  spawnUsers(count: number, config: UserBehaviorConfig): Promise<UserSession[]>;
  stopAllUsers(): Promise<void>;
  getUserSessions(): UserSession[];
  getActiveUserCount(): number;
}

export interface IUserBehaviorSimulator {
  simulate(session: UserSession): Promise<void>;
  stop(session: UserSession): Promise<void>;
  getSessionMetrics(session: UserSession): any;
}

export interface IBrowserUserSimulator extends IUserBehaviorSimulator {
  browseProducts(session: UserSession): Promise<void>;
  searchProducts(session: UserSession, query?: string): Promise<void>;
  viewProductDetails(session: UserSession, productId?: number): Promise<void>;
  browseCategories(session: UserSession): Promise<void>;
  filterProducts(session: UserSession): Promise<void>;
}

export interface IBuyerUserSimulator extends IBrowserUserSimulator {
  addToCart(session: UserSession, productId?: number, quantity?: number): Promise<void>;
  modifyCart(session: UserSession): Promise<void>;
  viewCart(session: UserSession): Promise<void>;
  checkout(session: UserSession): Promise<void>;
  viewOrders(session: UserSession): Promise<void>;
}

export interface ISellerUserSimulator extends IUserBehaviorSimulator {
  upgradeToSeller(session: UserSession): Promise<void>;
  createProduct(session: UserSession): Promise<void>;
  updateInventory(session: UserSession): Promise<void>;
  manageProducts(session: UserSession): Promise<void>;
  viewSellerDashboard(session: UserSession): Promise<void>;
}

// Performance monitoring interface
export interface IPerformanceMonitor {
  startMonitoring(): void;
  stopMonitoring(): void;
  recordApiCall(endpoint: string, method: string, duration: number, success: boolean, statusCode?: number): void;
  recordUserAction(action: any): void;
  recordError(error: any): void;
  getMetrics(): PerformanceMetrics;
  getSystemMetrics(): any;
  generateReport(): any;
  reset(): void;
}

// User pool management interface
export interface IUserPoolManager {
  createUserPool(count: number, config: UserBehaviorConfig): Promise<UserSession[]>;
  assignUserTypes(sessions: UserSession[], config: UserBehaviorConfig): void;
  authenticateUsers(sessions: UserSession[]): Promise<void>;
  startUserSessions(sessions: UserSession[]): Promise<void>;
  stopUserSessions(sessions: UserSession[]): Promise<void>;
  getPoolStatus(): {
    total: number;
    active: number;
    completed: number;
    failed: number;
  };
}

// Configuration management interface
export interface IConfigManager {
  loadConfig(filePath?: string): LoadTestConfig;
  validateConfig(config: LoadTestConfig): ValidationResult;
  saveConfig(config: LoadTestConfig, filePath: string): void;
  getDefaultConfig(): LoadTestConfig;
  mergeConfigs(base: LoadTestConfig, override: Partial<LoadTestConfig>): LoadTestConfig;
}

// Event handling interface
export interface IEventHandler {
  on(event: string, callback: (data: any) => void): void;
  emit(event: string, data: any): void;
  off(event: string, callback?: (data: any) => void): void;
  getEventHistory(): LoadTestEvent[];
}

// API client interface for making test requests
export interface IApiClient {
  setBaseUrl(url: string): void;
  setAuthToken(token: string): void;
  get<T = any>(endpoint: string, params?: any): Promise<{ data: T; duration: number; statusCode: number }>;
  post<T = any>(endpoint: string, data?: any): Promise<{ data: T; duration: number; statusCode: number }>;
  put<T = any>(endpoint: string, data?: any): Promise<{ data: T; duration: number; statusCode: number }>;
  delete<T = any>(endpoint: string): Promise<{ data: T; duration: number; statusCode: number }>;
  setRequestTimeout(timeout: number): void;
}

// Report generation interface
export interface IReportGenerator {
  generateTestReport(results: TestResults): string;
  generateHtmlReport(results: TestResults): string;
  generateCsvReport(results: TestResults): string;
  generateJsonReport(results: TestResults): string;
  saveReport(content: string, filePath: string, format: 'html' | 'csv' | 'json' | 'txt'): void;
}

// Utility interfaces
export interface IRandomDataGenerator {
  generateUsername(): string;
  generateEmail(): string;
  generatePassword(): string;
  generateProductName(): string;
  generateProductDescription(): string;
  generateCategoryName(): string;
  generatePrice(): number;
  generateInventoryQuantity(): number;
  generateAddress(): any;
  generatePhoneNumber(): string;
}

export interface IDelayManager {
  randomDelay(min: number, max: number): Promise<void>;
  fixedDelay(seconds: number): Promise<void>;
  exponentialBackoff(attempt: number, baseDelay: number): Promise<void>;
}

// CLI interface
export interface ICliInterface {
  run(args: string[]): Promise<void>;
  showHelp(): void;
  showVersion(): void;
  parseArguments(args: string[]): any;
  promptForConfig(): Promise<LoadTestConfig>;
}
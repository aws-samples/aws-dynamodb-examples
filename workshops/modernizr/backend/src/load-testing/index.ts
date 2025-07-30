// Main entry point for the load testing system

// Export all types and interfaces
export * from './types';
export * from './types/interfaces';

// Export configuration utilities
export * from './config/schema';

// Export utility functions
export * from './utils/helpers';
export * from './utils/apiClient';

// Version information
export const VERSION = '1.0.0';
export const DESCRIPTION = 'Load Testing and User Simulation System for Online Shopping Store';

// Default configuration for quick setup
import { ConfigDefaults } from './config/schema';

export const DEFAULT_CONFIG = ConfigDefaults.getDefaultConfig();
export const STRESS_TEST_CONFIG = ConfigDefaults.getStressTestConfig();
export const QUICK_TEST_CONFIG = ConfigDefaults.getQuickTestConfig();

// Utility function to validate system requirements
export function validateSystemRequirements(): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 16) {
    issues.push(`Node.js version ${nodeVersion} is not supported. Please use Node.js 16 or higher.`);
  }

  // Check available memory (use RSS as it's more representative of actual memory usage)
  const memUsage = process.memoryUsage();
  const availableMemory = memUsage.rss / (1024 * 1024); // Convert to MB
  if (availableMemory < 256) {
    issues.push(`Low memory detected (${Math.round(availableMemory)}MB RSS). Recommend at least 256MB for load testing.`);
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

// Utility function to get system information
export function getSystemInfo() {
  const memUsage = process.memoryUsage();
  
  return {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    memory: {
      used: Math.round(memUsage.heapUsed / (1024 * 1024)),
      total: Math.round(memUsage.heapTotal / (1024 * 1024)),
      external: Math.round(memUsage.external / (1024 * 1024)),
      rss: Math.round(memUsage.rss / (1024 * 1024))
    },
    uptime: Math.round(process.uptime()),
    loadTestingVersion: VERSION
  };
}

// Quick start function for basic load testing
export async function quickStart(options?: {
  userCount?: number;
  duration?: number;
  baseUrl?: string;
}) {
  console.log('🚀 Load Testing System Quick Start');
  console.log('==================================');
  
  const systemCheck = validateSystemRequirements();
  if (!systemCheck.valid) {
    console.error('❌ System requirements not met:');
    systemCheck.issues.forEach(issue => console.error(`  - ${issue}`));
    return false;
  }

  const systemInfo = getSystemInfo();
  console.log('✅ System Information:');
  console.log(`  - Node.js: ${systemInfo.nodeVersion}`);
  console.log(`  - Platform: ${systemInfo.platform} (${systemInfo.arch})`);
  console.log(`  - Memory: ${systemInfo.memory.used}MB / ${systemInfo.memory.total}MB`);
  console.log(`  - Load Testing Version: ${systemInfo.loadTestingVersion}`);
  
  console.log('\n📋 Default Configuration:');
  const config = ConfigDefaults.getDefaultConfig();
  if (options?.userCount) config.userCount = options.userCount;
  if (options?.duration) config.duration = options.duration;
  
  console.log(`  - Users: ${config.userCount}`);
  console.log(`  - Duration: ${config.duration} minutes`);
  console.log(`  - Ramp-up: ${config.rampUpTime} seconds`);
  console.log(`  - Browser Users: ${config.behaviors.browserUsers}%`);
  console.log(`  - Buyer Users: ${config.behaviors.buyerUsers}%`);
  console.log(`  - Seller Users: ${config.behaviors.sellerUsers}%`);
  
  console.log('\n🔧 Next Steps:');
  console.log('  1. Ensure your backend server is running');
  console.log('  2. Import and use TestController to start load testing');
  console.log('  3. Monitor results with PerformanceMonitor');
  
  return true;
}

// Export commonly used constants
export const CONSTANTS = {
  DEFAULT_BASE_URL: 'http://localhost:8100',
  DEFAULT_TIMEOUT: 30000,
  MAX_CONCURRENT_USERS: 200,
  MIN_TEST_DURATION: 1,
  MAX_TEST_DURATION: 60,
  DEFAULT_RAMP_UP_TIME: 30,
  
  // Action type groups for easier configuration
  BROWSING_ACTIONS: ['browse_products', 'browse_categories', 'search_products', 'view_product', 'filter_products'],
  SHOPPING_ACTIONS: ['add_to_cart', 'update_cart', 'remove_from_cart', 'view_cart', 'checkout_start', 'checkout_complete'],
  SELLER_ACTIONS: ['upgrade_to_seller', 'create_product', 'update_product', 'update_inventory', 'view_seller_dashboard'],
  
  // Default delays (in seconds)
  DELAYS: {
    MIN_ACTION_DELAY: 1,
    MAX_ACTION_DELAY: 5,
    AUTHENTICATION_DELAY: 2,
    CHECKOUT_DELAY: 3,
    PRODUCT_CREATION_DELAY: 4
  }
};

// Helper function to create a basic test configuration
export function createTestConfig(overrides?: Partial<any>): any {
  return ConfigDefaults.getDefaultConfig();
}
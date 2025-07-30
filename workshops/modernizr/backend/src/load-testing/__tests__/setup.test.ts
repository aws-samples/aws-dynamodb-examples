// Basic tests to verify load testing setup

import { 
  validateSystemRequirements, 
  getSystemInfo, 
  VERSION,
  DEFAULT_CONFIG,
  CONSTANTS
} from '../index';
import { ConfigValidator, ConfigDefaults } from '../config/schema';
import { RandomDataGenerator, DelayManager, IdGenerator } from '../utils/helpers';
import { ApiClient } from '../utils/apiClient';

describe('Load Testing System Setup', () => {
  describe('System Validation', () => {
    test('should validate system requirements', () => {
      const result = validateSystemRequirements();
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('issues');
      expect(Array.isArray(result.issues)).toBe(true);
    });

    test('should get system information', () => {
      const info = getSystemInfo();
      expect(info).toHaveProperty('nodeVersion');
      expect(info).toHaveProperty('platform');
      expect(info).toHaveProperty('memory');
      expect(info).toHaveProperty('loadTestingVersion', VERSION);
    });
  });

  describe('Configuration', () => {
    test('should provide default configuration', () => {
      expect(DEFAULT_CONFIG).toHaveProperty('userCount');
      expect(DEFAULT_CONFIG).toHaveProperty('duration');
      expect(DEFAULT_CONFIG).toHaveProperty('behaviors');
      expect(DEFAULT_CONFIG).toHaveProperty('dataSeeding');
    });

    test('should validate valid configuration', () => {
      const config = ConfigDefaults.getDefaultConfig();
      const result = ConfigValidator.validate(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect invalid configuration', () => {
      const invalidConfig = {
        ...ConfigDefaults.getDefaultConfig(),
        userCount: -1,
        duration: 0
      };
      const result = ConfigValidator.validate(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Utilities', () => {
    test('should generate random data', () => {
      const username = RandomDataGenerator.generateUsername();
      const email = RandomDataGenerator.generateEmail();
      const productName = RandomDataGenerator.generateProductName();
      const price = RandomDataGenerator.generatePrice();

      expect(typeof username).toBe('string');
      expect(username.length).toBeGreaterThan(0);
      expect(email).toContain('@');
      expect(typeof productName).toBe('string');
      expect(typeof price).toBe('number');
      expect(price).toBeGreaterThan(0);
    });

    test('should generate unique IDs', () => {
      const id1 = IdGenerator.generateId();
      const id2 = IdGenerator.generateId();
      const sessionId = IdGenerator.generateSessionId();
      const actionId = IdGenerator.generateActionId();

      expect(id1).not.toBe(id2);
      expect(sessionId).toContain('session-');
      expect(actionId).toContain('action-');
    });

    test('should create delay promises', async () => {
      const startTime = Date.now();
      await DelayManager.fixedDelay(0.1); // 100ms
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeGreaterThanOrEqual(90); // Allow some variance
      expect(duration).toBeLessThan(200);
    });
  });

  describe('API Client', () => {
    test('should create API client with default configuration', () => {
      const client = new ApiClient();
      const config = client.getConfig();

      expect(config).toHaveProperty('baseUrl');
      expect(config).toHaveProperty('timeout');
      expect(config).toHaveProperty('hasAuth');
      expect(config.hasAuth).toBe(false);
    });

    test('should set authentication token', () => {
      const client = new ApiClient();
      const token = 'test-token-123';
      
      client.setAuthToken(token);
      const config = client.getConfig();
      
      expect(config.hasAuth).toBe(true);
    });

    test('should create multiple clients', () => {
      const clients = ApiClient.createPool(3);
      
      expect(clients).toHaveLength(3);
      expect(clients[0]).toBeInstanceOf(ApiClient);
      expect(clients[1]).toBeInstanceOf(ApiClient);
      expect(clients[2]).toBeInstanceOf(ApiClient);
    });
  });

  describe('Constants', () => {
    test('should provide required constants', () => {
      expect(CONSTANTS).toHaveProperty('DEFAULT_BASE_URL');
      expect(CONSTANTS).toHaveProperty('DEFAULT_TIMEOUT');
      expect(CONSTANTS).toHaveProperty('MAX_CONCURRENT_USERS');
      expect(CONSTANTS).toHaveProperty('BROWSING_ACTIONS');
      expect(CONSTANTS).toHaveProperty('SHOPPING_ACTIONS');
      expect(CONSTANTS).toHaveProperty('SELLER_ACTIONS');
      expect(CONSTANTS).toHaveProperty('DELAYS');

      expect(Array.isArray(CONSTANTS.BROWSING_ACTIONS)).toBe(true);
      expect(Array.isArray(CONSTANTS.SHOPPING_ACTIONS)).toBe(true);
      expect(Array.isArray(CONSTANTS.SELLER_ACTIONS)).toBe(true);
    });
  });
});
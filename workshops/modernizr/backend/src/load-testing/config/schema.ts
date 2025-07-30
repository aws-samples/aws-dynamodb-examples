// Configuration schema and validation for load testing

import { LoadTestConfig, ValidationResult, DataSeedingConfig, UserBehaviorConfig } from '../types';

export class ConfigValidator {
  static validate(config: LoadTestConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate basic test parameters
    if (!config.userCount || config.userCount < 1) {
      errors.push('userCount must be a positive number');
    } else if (config.userCount > 200) {
      warnings.push('userCount > 200 may cause high system load');
    }

    if (!config.duration || config.duration < 1) {
      errors.push('duration must be at least 1 minute');
    } else if (config.duration > 60) {
      warnings.push('duration > 60 minutes may cause resource exhaustion');
    }

    if (config.rampUpTime < 0) {
      errors.push('rampUpTime cannot be negative');
    } else if (config.rampUpTime > config.duration * 60) {
      errors.push('rampUpTime cannot be longer than test duration');
    }

    // Validate user behavior distribution
    if (config.behaviors) {
      const totalPercentage = config.behaviors.browserUsers + 
                             config.behaviors.buyerUsers + 
                             config.behaviors.sellerUsers;
      
      if (Math.abs(totalPercentage - 100) > 0.1) {
        errors.push('User behavior percentages must sum to 100');
      }

      if (config.behaviors.browserUsers < 0 || config.behaviors.browserUsers > 100) {
        errors.push('browserUsers percentage must be between 0 and 100');
      }
      if (config.behaviors.buyerUsers < 0 || config.behaviors.buyerUsers > 100) {
        errors.push('buyerUsers percentage must be between 0 and 100');
      }
      if (config.behaviors.sellerUsers < 0 || config.behaviors.sellerUsers > 100) {
        errors.push('sellerUsers percentage must be between 0 and 100');
      }
    } else {
      errors.push('behaviors configuration is required');
    }

    // Validate action rates
    if (config.actionRates) {
      Object.entries(config.actionRates).forEach(([key, value]) => {
        if (value < 0) {
          errors.push(`${key} action rate cannot be negative`);
        } else if (value > 60) {
          warnings.push(`${key} action rate > 60 per minute may cause high load`);
        }
      });
    } else {
      errors.push('actionRates configuration is required');
    }

    // Validate data seeding configuration
    if (config.dataSeeding) {
      this.validateDataSeedingConfig(config.dataSeeding, errors, warnings);
    } else {
      errors.push('dataSeeding configuration is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private static validateDataSeedingConfig(
    config: DataSeedingConfig, 
    errors: string[], 
    warnings: string[]
  ): void {
    if (config.categories < 1) {
      errors.push('categories count must be at least 1');
    } else if (config.categories > 20) {
      warnings.push('categories > 20 may create complex hierarchy');
    }

    if (config.products < 1) {
      errors.push('products count must be at least 1');
    } else if (config.products > 10000) {
      warnings.push('products > 10000 may cause slow seeding');
    }

    if (config.users < 1) {
      errors.push('users count must be at least 1');
    } else if (config.users > 1000) {
      warnings.push('users > 1000 may cause slow authentication');
    }

    if (config.sellers < 0) {
      errors.push('sellers count cannot be negative');
    } else if (config.sellers > config.users) {
      errors.push('sellers count cannot exceed users count');
    }
  }
}

export class ConfigDefaults {
  static getDefaultConfig(): LoadTestConfig {
    return {
      userCount: 25,
      duration: 5, // 5 minutes
      rampUpTime: 30, // 30 seconds
      behaviors: {
        browserUsers: 40,
        buyerUsers: 50,
        sellerUsers: 10
      },
      actionRates: {
        browsing: 10,
        searching: 5,
        cartActions: 8,
        checkouts: 2,
        sellerActions: 3
      },
      dataSeeding: {
        categories: 6,
        products: 1000,
        users: 50,
        sellers: 5,
        cleanupAfter: true
      },
      testName: 'Load Test',
      description: 'Default load test configuration'
    };
  }

  static getStressTestConfig(): LoadTestConfig {
    return {
      userCount: 100,
      duration: 10,
      rampUpTime: 60,
      behaviors: {
        browserUsers: 30,
        buyerUsers: 60,
        sellerUsers: 10
      },
      actionRates: {
        browsing: 15,
        searching: 8,
        cartActions: 12,
        checkouts: 4,
        sellerActions: 5
      },
      dataSeeding: {
        categories: 8,
        products: 5000,
        users: 200,
        sellers: 20,
        cleanupAfter: false
      },
      testName: 'Stress Test',
      description: 'High-load stress test configuration'
    };
  }

  static getQuickTestConfig(): LoadTestConfig {
    return {
      userCount: 10,
      duration: 2,
      rampUpTime: 10,
      behaviors: {
        browserUsers: 50,
        buyerUsers: 40,
        sellerUsers: 10
      },
      actionRates: {
        browsing: 8,
        searching: 4,
        cartActions: 6,
        checkouts: 1,
        sellerActions: 2
      },
      dataSeeding: {
        categories: 4,
        products: 100,
        users: 20,
        sellers: 2,
        cleanupAfter: true
      },
      testName: 'Quick Test',
      description: 'Quick test for development and debugging'
    };
  }
}

export class ConfigManager {
  static mergeConfigs(base: LoadTestConfig, override: Partial<LoadTestConfig>): LoadTestConfig {
    return {
      ...base,
      ...override,
      behaviors: {
        ...base.behaviors,
        ...(override.behaviors || {})
      },
      actionRates: {
        ...base.actionRates,
        ...(override.actionRates || {})
      },
      dataSeeding: {
        ...base.dataSeeding,
        ...(override.dataSeeding || {})
      }
    };
  }

  static normalizeConfig(config: LoadTestConfig): LoadTestConfig {
    // Ensure percentages are normalized
    const totalBehaviorPercentage = config.behaviors.browserUsers + 
                                   config.behaviors.buyerUsers + 
                                   config.behaviors.sellerUsers;
    
    if (totalBehaviorPercentage !== 100) {
      const factor = 100 / totalBehaviorPercentage;
      config.behaviors.browserUsers = Math.round(config.behaviors.browserUsers * factor);
      config.behaviors.buyerUsers = Math.round(config.behaviors.buyerUsers * factor);
      config.behaviors.sellerUsers = 100 - config.behaviors.browserUsers - config.behaviors.buyerUsers;
    }

    // Ensure minimum values
    config.userCount = Math.max(1, config.userCount);
    config.duration = Math.max(1, config.duration);
    config.rampUpTime = Math.max(0, config.rampUpTime);

    return config;
  }

  static calculateDerivedValues(config: LoadTestConfig) {
    const totalActions = config.userCount * config.duration * (
      config.actionRates.browsing +
      config.actionRates.searching +
      config.actionRates.cartActions +
      config.actionRates.checkouts +
      config.actionRates.sellerActions
    );

    const estimatedLoad = {
      totalActions,
      actionsPerSecond: totalActions / (config.duration * 60),
      peakConcurrentUsers: config.userCount,
      estimatedDuration: config.duration + (config.rampUpTime / 60),
      dataVolume: {
        categories: config.dataSeeding.categories,
        products: config.dataSeeding.products,
        users: config.dataSeeding.users,
        estimatedOrders: Math.round(config.userCount * config.behaviors.buyerUsers / 100 * config.actionRates.checkouts * config.duration / 60)
      }
    };

    return estimatedLoad;
  }
}
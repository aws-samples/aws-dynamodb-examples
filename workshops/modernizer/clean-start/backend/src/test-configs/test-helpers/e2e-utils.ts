// E2E Test Utilities - Common utilities for E2E testing
import { Response } from './server';

export interface TestScenario {
  name: string;
  description: string;
  steps: TestStep[];
}

export interface TestStep {
  name: string;
  action: () => Promise<any>;
  validation?: (result: any) => void;
  timeout?: number;
}

export class E2ETestUtils {
  /**
   * Execute a test scenario with steps
   */
  static async executeScenario(scenario: TestScenario): Promise<void> {
    console.log(`🎬 Executing scenario: ${scenario.name}`);
    console.log(`📝 Description: ${scenario.description}`);

    for (let i = 0; i < scenario.steps.length; i++) {
      const step = scenario.steps[i];
      console.log(`📍 Step ${i + 1}: ${step.name}`);

      try {
        const result = await this.executeStepWithTimeout(step);
        
        if (step.validation) {
          step.validation(result);
        }
        
        console.log(`✅ Step ${i + 1} completed successfully`);
      } catch (error) {
        console.error(`❌ Step ${i + 1} failed:`, error);
        throw new Error(`Scenario "${scenario.name}" failed at step ${i + 1}: ${step.name}`);
      }
    }

    console.log(`🎉 Scenario "${scenario.name}" completed successfully`);
  }

  /**
   * Execute a step with timeout
   */
  private static async executeStepWithTimeout(step: TestStep): Promise<any> {
    const timeout = step.timeout || 30000; // Default 30 seconds
    
    return Promise.race([
      step.action(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Step "${step.name}" timed out after ${timeout}ms`)), timeout)
      )
    ]);
  }

  /**
   * Generate random test data
   */
  static generateTestData(): {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    productName: string;
    categoryName: string;
  } {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);

    return {
      username: `e2e_user_${timestamp}_${random}`,
      email: `e2e_${timestamp}_${random}@test.com`,
      password: `TestPass123!${random}`,
      firstName: `TestFirst${random}`,
      lastName: `TestLast${random}`,
      productName: `Test Product ${timestamp}`,
      categoryName: `Test Category ${timestamp}`
    };
  }

  /**
   * Validate API response structure
   */
  static validateApiResponse(
    response: Response,
    expectedStatus: number,
    expectedStructure?: any
  ): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.data).toBeDefined();
    
    if (response.status >= 200 && response.status < 300) {
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
    } else {
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBeDefined();
      expect(response.data.error.message).toBeDefined();
    }

    if (expectedStructure) {
      expect(response.data).toMatchObject(expectedStructure);
    }
  }

  /**
   * Validate pagination response
   */
  static validatePaginationResponse(response: Response): void {
    this.validateApiResponse(response, 200);
    
    expect(response.data.data).toHaveProperty('items');
    expect(response.data.data).toHaveProperty('pagination');
    expect(response.data.data.pagination).toHaveProperty('page');
    expect(response.data.data.pagination).toHaveProperty('limit');
    expect(response.data.data.pagination).toHaveProperty('total');
    expect(response.data.data.pagination).toHaveProperty('totalPages');
    
    expect(Array.isArray(response.data.data.items)).toBe(true);
    expect(typeof response.data.data.pagination.page).toBe('number');
    expect(typeof response.data.data.pagination.limit).toBe('number');
    expect(typeof response.data.data.pagination.total).toBe('number');
    expect(typeof response.data.data.pagination.totalPages).toBe('number');
  }

  /**
   * Create test data cleanup function
   */
  static createCleanupFunction(cleanupActions: (() => Promise<void>)[]): () => Promise<void> {
    return async () => {
      for (const action of cleanupActions.reverse()) {
        try {
          await action();
        } catch (error) {
          console.warn('Cleanup action failed:', error);
        }
      }
    };
  }

  /**
   * Retry operation with exponential backoff
   */
  static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          break;
        }

        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Wait for condition to be true
   */
  static async waitForCondition(
    condition: () => Promise<boolean> | boolean,
    timeout: number = 10000,
    interval: number = 500,
    description: string = 'condition'
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const result = await condition();
        if (result) {
          return;
        }
      } catch (error) {
        // Ignore errors and continue polling
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(`Timeout waiting for ${description} after ${timeout}ms`);
  }

  /**
   * Generate load test data
   */
  static generateLoadTestData(count: number): Array<{
    username: string;
    email: string;
    password: string;
  }> {
    const users = [];
    
    for (let i = 0; i < count; i++) {
      const timestamp = Date.now();
      users.push({
        username: `load_user_${i}_${timestamp}`,
        email: `load_user_${i}_${timestamp}@test.com`,
        password: `LoadTest123!${i}`
      });
    }

    return users;
  }

  /**
   * Measure memory usage during test
   */
  static measureMemoryUsage(): {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  } {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      external: Math.round(memUsage.external / 1024 / 1024), // MB
      rss: Math.round(memUsage.rss / 1024 / 1024) // MB
    };
  }

  /**
   * Log test progress
   */
  static logTestProgress(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🔍 ${message}`);
    
    if (data) {
      console.log('📊 Data:', JSON.stringify(data, null, 2));
    }
  }

  /**
   * Create test summary
   */
  static createTestSummary(
    testName: string,
    startTime: number,
    endTime: number,
    results: any
  ): string {
    const duration = endTime - startTime;
    const memUsage = this.measureMemoryUsage();

    return `
🧪 Test Summary: ${testName}
================================
Duration: ${duration}ms
Memory Usage: ${memUsage.heapUsed}MB (heap), ${memUsage.rss}MB (RSS)
Results: ${JSON.stringify(results, null, 2)}
Completed at: ${new Date(endTime).toISOString()}
    `.trim();
  }
}
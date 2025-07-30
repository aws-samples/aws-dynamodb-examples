/**
 * Test Reliability Helper - Utilities for improving test reliability and identifying flaky tests
 */

export class TestReliabilityHelper {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1 second

  /**
   * Retry a test operation with exponential backoff
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = TestReliabilityHelper.MAX_RETRIES,
    delay: number = TestReliabilityHelper.RETRY_DELAY,
    testName?: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          console.warn(`⚠️  Test operation failed after ${maxRetries} attempts${testName ? ` (${testName})` : ''}`);
          break;
        }
        
        console.warn(`⚠️  Test operation failed (attempt ${attempt}/${maxRetries})${testName ? ` (${testName})` : ''}: ${lastError.message}`);
        
        // Exponential backoff
        const waitTime = delay * Math.pow(2, attempt - 1);
        await this.sleep(waitTime);
      }
    }
    
    throw lastError!;
  }

  /**
   * Wait for a condition to be true with timeout
   */
  static async waitFor(
    condition: () => Promise<boolean> | boolean,
    timeout: number = 5000,
    interval: number = 100,
    description?: string
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const result = await condition();
        if (result) {
          return;
        }
      } catch (error) {
        // Ignore errors and keep trying
      }
      
      await this.sleep(interval);
    }
    
    throw new Error(`Timeout waiting for condition${description ? ` (${description})` : ''} after ${timeout}ms`);
  }

  /**
   * Wait for a specific amount of time
   */
  static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute an operation with a timeout
   */
  static async withTimeout<T>(
    operation: () => Promise<T>,
    timeout: number,
    description?: string
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeout}ms${description ? ` (${description})` : ''}`));
        }, timeout);
      })
    ]);
  }

  /**
   * Measure execution time of an operation
   */
  static async measureTime<T>(
    operation: () => Promise<T>,
    description?: string
  ): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    const result = await operation();
    const duration = Date.now() - startTime;
    
    if (description) {
      console.log(`⏱️  ${description}: ${duration}ms`);
    }
    
    return { result, duration };
  }

  /**
   * Check if a test is running slower than expected
   */
  static checkPerformance(
    duration: number,
    expectedMax: number,
    testName: string
  ): void {
    if (duration > expectedMax) {
      console.warn(`⚠️  Performance warning: ${testName} took ${duration}ms (expected < ${expectedMax}ms)`);
    }
  }

  /**
   * Detect potential flaky test patterns
   */
  static detectFlakyPatterns(error: Error, testName: string): void {
    const flakyPatterns = [
      /timeout/i,
      /connection.*refused/i,
      /network.*error/i,
      /socket.*hang.*up/i,
      /econnreset/i,
      /enotfound/i,
      /random/i,
      /race.*condition/i,
      /timing/i
    ];

    const isFlakyPattern = flakyPatterns.some(pattern => 
      pattern.test(error.message) || pattern.test(error.stack || '')
    );

    if (isFlakyPattern) {
      console.warn(`🔄 Potential flaky test detected: ${testName}`);
      console.warn(`   Error pattern suggests timing/network issues: ${error.message}`);
    }
  }

  /**
   * Stabilize async operations by ensuring they complete
   */
  static async stabilizeAsync<T>(
    operation: () => Promise<T>,
    stabilityCheck?: () => Promise<boolean>,
    maxWait: number = 2000
  ): Promise<T> {
    const result = await operation();
    
    if (stabilityCheck) {
      await this.waitFor(stabilityCheck, maxWait, 50, 'stability check');
    } else {
      // Default stability wait
      await this.sleep(100);
    }
    
    return result;
  }

  /**
   * Clean up resources with error handling
   */
  static async safeCleanup(
    cleanupFn: () => Promise<void>,
    description?: string
  ): Promise<void> {
    try {
      await cleanupFn();
    } catch (error) {
      console.warn(`⚠️  Cleanup warning${description ? ` (${description})` : ''}: ${(error as Error).message}`);
      // Don't throw to avoid masking test failures
    }
  }

  /**
   * Execute multiple cleanup operations safely
   */
  static async safeCleanupAll(
    cleanupOperations: Array<{ fn: () => Promise<void>; description?: string }>
  ): Promise<void> {
    for (const { fn, description } of cleanupOperations) {
      await this.safeCleanup(fn, description);
    }
  }

  /**
   * Wrap a test with reliability improvements
   */
  static async reliableTest<T>(
    testFn: () => Promise<T>,
    options: {
      testName?: string;
      maxRetries?: number;
      timeout?: number;
      cleanup?: () => Promise<void>;
      stabilityCheck?: () => Promise<boolean>;
    } = {}
  ): Promise<T> {
    const {
      testName = 'unknown test',
      maxRetries = 1,
      timeout = 30000,
      cleanup,
      stabilityCheck
    } = options;

    try {
      const operation = async () => {
        if (timeout > 0) {
          return await this.withTimeout(testFn, timeout, testName);
        } else {
          return await testFn();
        }
      };

      let result: T;
      if (maxRetries > 1) {
        result = await this.withRetry(operation, maxRetries, 1000, testName);
      } else {
        result = await operation();
      }

      if (stabilityCheck) {
        await this.stabilizeAsync(() => Promise.resolve(result), stabilityCheck);
      }

      return result;
    } catch (error) {
      this.detectFlakyPatterns(error as Error, testName);
      throw error;
    } finally {
      if (cleanup) {
        await this.safeCleanup(cleanup, `${testName} cleanup`);
      }
    }
  }
}

/**
 * Decorator for making tests more reliable
 */
export function reliableTest(options?: {
  maxRetries?: number;
  timeout?: number;
  description?: string;
}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const testName = options?.description || `${target.constructor.name}.${propertyName}`;
      
      return TestReliabilityHelper.reliableTest(
        () => method.apply(this, args),
        {
          testName,
          maxRetries: options?.maxRetries || 1,
          timeout: options?.timeout || 30000
        }
      );
    };
    
    return descriptor;
  };
}

/**
 * Helper for database operations that might be flaky
 */
export class DatabaseReliabilityHelper {
  static async reliableQuery<T>(
    queryFn: () => Promise<T>,
    description?: string
  ): Promise<T> {
    return TestReliabilityHelper.withRetry(
      queryFn,
      3,
      500,
      description ? `Database query: ${description}` : 'Database query'
    );
  }

  static async reliableConnection<T>(
    connectionFn: () => Promise<T>,
    description?: string
  ): Promise<T> {
    return TestReliabilityHelper.withRetry(
      connectionFn,
      5,
      1000,
      description ? `Database connection: ${description}` : 'Database connection'
    );
  }
}

/**
 * Helper for HTTP operations that might be flaky
 */
export class HttpReliabilityHelper {
  static async reliableRequest<T>(
    requestFn: () => Promise<T>,
    description?: string
  ): Promise<T> {
    return TestReliabilityHelper.withRetry(
      requestFn,
      3,
      1000,
      description ? `HTTP request: ${description}` : 'HTTP request'
    );
  }

  static async waitForServer(
    healthCheckFn: () => Promise<boolean>,
    timeout: number = 10000
  ): Promise<void> {
    return TestReliabilityHelper.waitFor(
      healthCheckFn,
      timeout,
      500,
      'server to be ready'
    );
  }
}
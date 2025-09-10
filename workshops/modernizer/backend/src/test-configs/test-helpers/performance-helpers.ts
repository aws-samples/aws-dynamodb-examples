// Performance Test Helpers - Measure and validate E2E performance
import { E2ETestHelper, TestUser } from './e2e-helpers';
import { ServerTestHelper, Response } from './server';

export interface PerformanceMetrics {
  responseTime: number;
  throughput?: number;
  errorRate: number;
  successRate: number;
}

export interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errors: string[];
}

export class PerformanceTestHelper {
  /**
   * Measure single request performance
   */
  static async measureSingleRequest(
    requestFn: () => Promise<Response>
  ): Promise<PerformanceMetrics> {
    const startTime = Date.now();
    let success = false;
    
    try {
      const response = await requestFn();
      success = response.status >= 200 && response.status < 400;
      const responseTime = Date.now() - startTime;
      
      return {
        responseTime,
        errorRate: success ? 0 : 1,
        successRate: success ? 1 : 0
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        responseTime,
        errorRate: 1,
        successRate: 0
      };
    }
  }

  /**
   * Run load test with multiple concurrent requests
   */
  static async runLoadTest(
    requestFn: () => Promise<Response>,
    options: {
      totalRequests: number;
      concurrency: number;
      duration?: number; // in milliseconds
    }
  ): Promise<LoadTestResult> {
    const { totalRequests, concurrency, duration } = options;
    const results: { success: boolean; responseTime: number; error?: string }[] = [];
    const startTime = Date.now();
    
    // Create request functions
    const requests: (() => Promise<void>)[] = [];
    
    for (let i = 0; i < totalRequests; i++) {
      requests.push(async () => {
        const requestStart = Date.now();
        try {
          const response = await requestFn();
          const responseTime = Date.now() - requestStart;
          const success = response.status >= 200 && response.status < 400;
          
          results.push({ success, responseTime });
        } catch (error) {
          const responseTime = Date.now() - requestStart;
          results.push({ 
            success: false, 
            responseTime, 
            error: (error as Error).message 
          });
        }
      });
    }

    // Execute requests with concurrency control
    await this.executeConcurrentRequests(requests, concurrency);
    
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    
    // Calculate metrics
    const successfulRequests = results.filter(r => r.success).length;
    const failedRequests = results.length - successfulRequests;
    const responseTimes = results.map(r => r.responseTime);
    const errors = results.filter(r => r.error).map(r => r.error!);
    
    return {
      totalRequests: results.length,
      successfulRequests,
      failedRequests,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      requestsPerSecond: (results.length / totalDuration) * 1000,
      errors: [...new Set(errors)] // Remove duplicates
    };
  }

  /**
   * Execute requests with concurrency control
   */
  private static async executeConcurrentRequests(
    requests: (() => Promise<void>)[],
    concurrency: number
  ): Promise<void> {
    const executing: Promise<void>[] = [];
    
    for (const request of requests) {
      const promise = request();
      executing.push(promise);
      
      if (executing.length >= concurrency) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => p === promise), 1);
      }
    }
    
    await Promise.all(executing);
  }

  /**
   * Test authentication endpoint performance
   */
  static async testAuthenticationPerformance(
    userCount: number = 10,
    concurrency: number = 5
  ): Promise<LoadTestResult> {
    // Create test users first
    const users = await E2ETestHelper.createMultipleTestUsers(userCount);
    
    let userIndex = 0;
    const loginRequest = async (): Promise<Response> => {
      const user = users[userIndex % users.length];
      userIndex++;
      
      return ServerTestHelper.makeRequest({
        method: 'POST',
        url: '/api/auth/login',
        data: {
          username: user.username,
          password: user.password
        }
      });
    };

    return this.runLoadTest(loginRequest, {
      totalRequests: userCount * 2, // Each user logs in twice
      concurrency
    });
  }

  /**
   * Test product search performance
   */
  static async testProductSearchPerformance(
    searchTerms: string[] = ['laptop', 'phone', 'tablet'],
    requestsPerTerm: number = 10,
    concurrency: number = 5
  ): Promise<LoadTestResult> {
    let termIndex = 0;
    const searchRequest = async (): Promise<Response> => {
      const term = searchTerms[termIndex % searchTerms.length];
      termIndex++;
      
      return ServerTestHelper.makeRequest({
        method: 'GET',
        url: `/api/products/search?q=${encodeURIComponent(term)}`
      });
    };

    return this.runLoadTest(searchRequest, {
      totalRequests: searchTerms.length * requestsPerTerm,
      concurrency
    });
  }

  /**
   * Test shopping cart performance
   */
  static async testShoppingCartPerformance(
    userCount: number = 5,
    actionsPerUser: number = 10,
    concurrency: number = 3
  ): Promise<LoadTestResult> {
    // Setup test data
    const { seller, product } = await E2ETestHelper.setupCompleteScenario();
    const users = await E2ETestHelper.createMultipleTestUsers(userCount);
    
    let actionIndex = 0;
    const cartRequest = async (): Promise<Response> => {
      const user = users[actionIndex % users.length];
      actionIndex++;
      
      // Alternate between adding to cart and viewing cart
      if (actionIndex % 2 === 0) {
        return E2ETestHelper.addToCart(product.id, 1, user.token);
      } else {
        return E2ETestHelper.getCart(user.token);
      }
    };

    return this.runLoadTest(cartRequest, {
      totalRequests: userCount * actionsPerUser,
      concurrency
    });
  }

  /**
   * Validate performance metrics against thresholds
   */
  static validatePerformanceThresholds(
    result: LoadTestResult,
    thresholds: {
      maxAverageResponseTime?: number;
      minSuccessRate?: number;
      maxErrorRate?: number;
      minRequestsPerSecond?: number;
    }
  ): void {
    const successRate = result.successfulRequests / result.totalRequests;
    const errorRate = result.failedRequests / result.totalRequests;

    if (thresholds.maxAverageResponseTime) {
      expect(result.averageResponseTime).toBeLessThan(thresholds.maxAverageResponseTime);
    }

    if (thresholds.minSuccessRate) {
      expect(successRate).toBeGreaterThanOrEqual(thresholds.minSuccessRate);
    }

    if (thresholds.maxErrorRate) {
      expect(errorRate).toBeLessThanOrEqual(thresholds.maxErrorRate);
    }

    if (thresholds.minRequestsPerSecond) {
      expect(result.requestsPerSecond).toBeGreaterThanOrEqual(thresholds.minRequestsPerSecond);
    }
  }

  /**
   * Generate performance report
   */
  static generatePerformanceReport(result: LoadTestResult): string {
    const successRate = ((result.successfulRequests / result.totalRequests) * 100).toFixed(2);
    const errorRate = ((result.failedRequests / result.totalRequests) * 100).toFixed(2);

    return `
📊 Performance Test Report
========================
Total Requests: ${result.totalRequests}
Successful: ${result.successfulRequests} (${successRate}%)
Failed: ${result.failedRequests} (${errorRate}%)

Response Times:
- Average: ${result.averageResponseTime.toFixed(2)}ms
- Min: ${result.minResponseTime}ms
- Max: ${result.maxResponseTime}ms

Throughput: ${result.requestsPerSecond.toFixed(2)} requests/second

${result.errors.length > 0 ? `
Errors:
${result.errors.map(error => `- ${error}`).join('\n')}
` : 'No errors encountered ✅'}
    `.trim();
  }
}
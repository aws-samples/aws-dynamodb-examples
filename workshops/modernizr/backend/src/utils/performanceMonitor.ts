import { performance } from 'perf_hooks';
import { getPoolStats } from '../config/database';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

interface SystemMetrics {
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
    averageResponseTime: number;
  };
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private requestMetrics: Map<string, number[]> = new Map();
  private requestCounts = {
    total: 0,
    successful: 0,
    failed: 0
  };

  // Record a performance metric
  recordMetric(name: string, value: number, unit: string, tags?: Record<string, string>): void {
    this.metrics.push({
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags
    });

    // Keep only last 1000 metrics to prevent memory issues
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  // Record request timing
  recordRequest(endpoint: string, responseTime: number, success: boolean): void {
    this.requestCounts.total++;
    if (success) {
      this.requestCounts.successful++;
    } else {
      this.requestCounts.failed++;
    }

    if (!this.requestMetrics.has(endpoint)) {
      this.requestMetrics.set(endpoint, []);
    }

    const endpointMetrics = this.requestMetrics.get(endpoint)!;
    endpointMetrics.push(responseTime);

    // Keep only last 100 requests per endpoint
    if (endpointMetrics.length > 100) {
      endpointMetrics.splice(0, endpointMetrics.length - 100);
    }

    this.recordMetric('request_duration', responseTime, 'ms', {
      endpoint,
      success: success.toString()
    });
  }

  // Get current system metrics
  getSystemMetrics(): SystemMetrics {
    const memUsage = process.memoryUsage();
    const poolStats = getPoolStats();

    return {
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
      },
      cpu: {
        usage: process.cpuUsage().user / 1000000 // Convert to seconds
      },
      database: {
        totalConnections: poolStats.totalConnections || 0,
        activeConnections: poolStats.activeConnections || 0,
        idleConnections: poolStats.idleConnections || 0,
        queuedRequests: poolStats.queuedRequests || 0
      },
      requests: {
        total: this.requestCounts.total,
        successful: this.requestCounts.successful,
        failed: this.requestCounts.failed,
        averageResponseTime: this.getAverageResponseTime()
      }
    };
  }

  // Get metrics for a specific time range
  getMetrics(since?: number): PerformanceMetric[] {
    if (!since) {
      return [...this.metrics];
    }

    return this.metrics.filter(metric => metric.timestamp >= since);
  }

  // Get endpoint performance statistics
  getEndpointStats(endpoint: string): {
    requestCount: number;
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    p95ResponseTime: number;
  } | null {
    const metrics = this.requestMetrics.get(endpoint);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const sorted = [...metrics].sort((a, b) => a - b);
    const sum = metrics.reduce((acc, val) => acc + val, 0);

    return {
      requestCount: metrics.length,
      averageResponseTime: sum / metrics.length,
      minResponseTime: sorted[0],
      maxResponseTime: sorted[sorted.length - 1],
      p95ResponseTime: sorted[Math.floor(sorted.length * 0.95)]
    };
  }

  // Get all endpoint statistics
  getAllEndpointStats(): Record<string, ReturnType<typeof this.getEndpointStats>> {
    const stats: Record<string, ReturnType<typeof this.getEndpointStats>> = {};
    
    for (const endpoint of this.requestMetrics.keys()) {
      stats[endpoint] = this.getEndpointStats(endpoint);
    }

    return stats;
  }

  // Clear old metrics
  clearOldMetrics(olderThan: number): void {
    this.metrics = this.metrics.filter(metric => metric.timestamp >= olderThan);
  }

  // Get performance summary
  getPerformanceSummary(): {
    systemHealth: 'good' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
    metrics: SystemMetrics;
  } {
    const metrics = this.getSystemMetrics();
    const issues: string[] = [];
    const recommendations: string[] = [];
    let systemHealth: 'good' | 'warning' | 'critical' = 'good';

    // Check memory usage (configurable thresholds)
    const memoryWarningThreshold = parseInt(process.env.MEMORY_WARNING_THRESHOLD || '85');
    const memoryCriticalThreshold = parseInt(process.env.MEMORY_CRITICAL_THRESHOLD || '95');
    
    if (metrics.memory.percentage > memoryCriticalThreshold) {
      issues.push('High memory usage detected');
      recommendations.push('Consider increasing memory allocation or optimizing memory usage');
      systemHealth = 'critical';
    } else if (metrics.memory.percentage > memoryWarningThreshold) {
      issues.push('Elevated memory usage');
      recommendations.push('Monitor memory usage and consider optimization');
      if (systemHealth === 'good') systemHealth = 'warning';
    }

    // Check database connections
    if (metrics.database.queuedRequests > 10) {
      issues.push('High number of queued database requests');
      recommendations.push('Consider increasing database connection pool size');
      systemHealth = 'critical';
    } else if (metrics.database.queuedRequests > 5) {
      issues.push('Elevated database queue');
      recommendations.push('Monitor database performance');
      if (systemHealth === 'good') systemHealth = 'warning';
    }

    // Check request success rate
    const successRate = metrics.requests.total > 0 ? 
      (metrics.requests.successful / metrics.requests.total) * 100 : 100;
    
    if (successRate < 95) {
      issues.push('Low request success rate');
      recommendations.push('Investigate failed requests and improve error handling');
      systemHealth = 'critical';
    } else if (successRate < 98) {
      issues.push('Moderate request failures');
      recommendations.push('Monitor error rates and logs');
      if (systemHealth === 'good') systemHealth = 'warning';
    }

    // Check average response time
    if (metrics.requests.averageResponseTime > 1000) {
      issues.push('High average response time');
      recommendations.push('Optimize slow endpoints and database queries');
      systemHealth = 'critical';
    } else if (metrics.requests.averageResponseTime > 500) {
      issues.push('Elevated response times');
      recommendations.push('Review and optimize performance bottlenecks');
      if (systemHealth === 'good') systemHealth = 'warning';
    }

    return {
      systemHealth,
      issues,
      recommendations,
      metrics
    };
  }

  private getAverageResponseTime(): number {
    let totalTime = 0;
    let totalRequests = 0;

    for (const metrics of this.requestMetrics.values()) {
      totalTime += metrics.reduce((sum, time) => sum + time, 0);
      totalRequests += metrics.length;
    }

    return totalRequests > 0 ? totalTime / totalRequests : 0;
  }

  // Start periodic monitoring
  startMonitoring(intervalMs: number = 60000): NodeJS.Timeout {
    return setInterval(() => {
      const metrics = this.getSystemMetrics();
      
      this.recordMetric('memory_usage', metrics.memory.percentage, '%');
      this.recordMetric('database_active_connections', metrics.database.activeConnections, 'count');
      this.recordMetric('database_queued_requests', metrics.database.queuedRequests, 'count');
      
      // Log warnings if needed
      const summary = this.getPerformanceSummary();
      if (summary.systemHealth !== 'good') {
        console.warn(`⚠️ System health: ${summary.systemHealth}`);
        summary.issues.forEach(issue => console.warn(`  - ${issue}`));
      }
      
      // Clean up old metrics (older than 1 hour)
      this.clearOldMetrics(Date.now() - 3600000);
    }, intervalMs);
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Middleware to track request performance
export const performanceMiddleware = (req: any, res: any, next: any) => {
  const startTime = performance.now();
  const endpoint = `${req.method} ${req.route?.path || req.path}`;

  res.on('finish', () => {
    const responseTime = performance.now() - startTime;
    const success = res.statusCode < 400;
    
    performanceMonitor.recordRequest(endpoint, responseTime, success);
  });

  next();
};

// Function to measure execution time
export function measureExecutionTime<T>(
  name: string,
  fn: () => T | Promise<T>,
  tags?: Record<string, string>
): T | Promise<T> {
  const startTime = performance.now();
  
  const result = fn();
  
  if (result instanceof Promise) {
    return result.finally(() => {
      const executionTime = performance.now() - startTime;
      performanceMonitor.recordMetric(name, executionTime, 'ms', tags);
    });
  } else {
    const executionTime = performance.now() - startTime;
    performanceMonitor.recordMetric(name, executionTime, 'ms', tags);
    return result;
  }
}

export default PerformanceMonitor;
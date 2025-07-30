#!/usr/bin/env ts-node

import { runAPILoadTests } from '../tests/load/load-test';
import { performanceMonitor } from '../utils/performanceMonitor';

async function runPerformanceTestSuite(): Promise<void> {
  console.log('🚀 Starting Comprehensive Performance Test Suite\n');
  console.log('=' .repeat(60));

  try {
    // 1. Database Performance Tests
    console.log('\n📊 1. Database Performance Tests');
    console.log('-'.repeat(40));
    
    const { testConnection, getPoolStats } = await import('../config/database');
    
    // Test database connection speed
    const dbStartTime = Date.now();
    const dbConnected = await testConnection();
    const dbConnectionTime = Date.now() - dbStartTime;
    
    console.log(`Database connection: ${dbConnected ? '✅ Connected' : '❌ Failed'}`);
    console.log(`Connection time: ${dbConnectionTime}ms`);
    
    if (dbConnected) {
      const poolStats = getPoolStats();
      console.log('Pool statistics:', {
        total: poolStats.totalConnections,
        active: poolStats.activeConnections,
        idle: poolStats.idleConnections,
        queued: poolStats.queuedRequests
      });
    }

    // 2. API Load Tests
    console.log('\n🌐 2. API Load Tests');
    console.log('-'.repeat(40));
    
    await runAPILoadTests();

    // 3. Memory and Performance Analysis
    console.log('\n💾 3. Memory and Performance Analysis');
    console.log('-'.repeat(40));
    
    const systemMetrics = performanceMonitor.getSystemMetrics();
    console.log('System Metrics:', {
      'Memory Usage': `${systemMetrics.memory.percentage.toFixed(2)}%`,
      'Memory Used': `${(systemMetrics.memory.used / 1024 / 1024).toFixed(2)} MB`,
      'Total Requests': systemMetrics.requests.total,
      'Success Rate': systemMetrics.requests.total > 0 ? 
        `${((systemMetrics.requests.successful / systemMetrics.requests.total) * 100).toFixed(2)}%` : 'N/A',
      'Avg Response Time': `${systemMetrics.requests.averageResponseTime.toFixed(2)}ms`
    });

    // 4. Performance Summary
    console.log('\n📈 4. Performance Summary');
    console.log('-'.repeat(40));
    
    const performanceSummary = performanceMonitor.getPerformanceSummary();
    console.log(`System Health: ${getHealthEmoji(performanceSummary.systemHealth)} ${performanceSummary.systemHealth.toUpperCase()}`);
    
    if (performanceSummary.issues.length > 0) {
      console.log('\n⚠️  Issues Detected:');
      performanceSummary.issues.forEach(issue => console.log(`  - ${issue}`));
    }
    
    if (performanceSummary.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      performanceSummary.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }

    // 5. Endpoint Performance Analysis
    console.log('\n🎯 5. Endpoint Performance Analysis');
    console.log('-'.repeat(40));
    
    const endpointStats = performanceMonitor.getAllEndpointStats();
    Object.entries(endpointStats).forEach(([endpoint, stats]) => {
      if (stats) {
        console.log(`\n${endpoint}:`);
        console.log(`  Requests: ${stats.requestCount}`);
        console.log(`  Avg Response: ${stats.averageResponseTime.toFixed(2)}ms`);
        console.log(`  P95 Response: ${stats.p95ResponseTime.toFixed(2)}ms`);
        console.log(`  Min/Max: ${stats.minResponseTime.toFixed(2)}ms / ${stats.maxResponseTime.toFixed(2)}ms`);
      }
    });

    // 6. Performance Benchmarks
    console.log('\n🏆 6. Performance Benchmarks');
    console.log('-'.repeat(40));
    
    const benchmarks = {
      'Health Check Response': { actual: systemMetrics.requests.averageResponseTime, target: 100, unit: 'ms' },
      'Memory Usage': { actual: systemMetrics.memory.percentage, target: 70, unit: '%' },
      'Database Connections': { actual: systemMetrics.database.activeConnections, target: 15, unit: 'connections' },
      'Success Rate': { 
        actual: systemMetrics.requests.total > 0 ? (systemMetrics.requests.successful / systemMetrics.requests.total) * 100 : 100, 
        target: 95, 
        unit: '%' 
      }
    };

    Object.entries(benchmarks).forEach(([name, benchmark]) => {
      const status = benchmark.actual <= benchmark.target ? '✅' : '❌';
      console.log(`${status} ${name}: ${benchmark.actual.toFixed(2)}${benchmark.unit} (target: ≤${benchmark.target}${benchmark.unit})`);
    });

    // 7. Test Results Summary
    console.log('\n📋 7. Test Results Summary');
    console.log('='.repeat(60));
    
    const overallHealth = performanceSummary.systemHealth;
    const healthEmoji = getHealthEmoji(overallHealth);
    
    console.log(`\n${healthEmoji} Overall System Health: ${overallHealth.toUpperCase()}`);
    console.log(`📊 Total Tests Run: ${Object.keys(benchmarks).length}`);
    console.log(`✅ Tests Passed: ${Object.values(benchmarks).filter(b => b.actual <= b.target).length}`);
    console.log(`❌ Tests Failed: ${Object.values(benchmarks).filter(b => b.actual > b.target).length}`);
    
    if (overallHealth === 'good') {
      console.log('\n🎉 All performance tests completed successfully!');
      console.log('Your application is performing well within acceptable parameters.');
    } else if (overallHealth === 'warning') {
      console.log('\n⚠️  Performance tests completed with warnings.');
      console.log('Consider reviewing the recommendations above to optimize performance.');
    } else {
      console.log('\n🚨 Performance tests detected critical issues.');
      console.log('Immediate attention required to resolve performance problems.');
    }

    console.log('\n' + '='.repeat(60));
    console.log('Performance test suite completed.');

  } catch (error) {
    console.error('\n❌ Performance test suite failed:', error);
    process.exit(1);
  }
}

function getHealthEmoji(health: string): string {
  switch (health) {
    case 'good': return '🟢';
    case 'warning': return '🟡';
    case 'critical': return '🔴';
    default: return '⚪';
  }
}

// Run the test suite if this script is executed directly
if (require.main === module) {
  runPerformanceTestSuite()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

export { runPerformanceTestSuite };
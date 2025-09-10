const fs = require('fs');
const path = require('path');

/**
 * Custom test results processor for E2E Tests
 * Provides detailed performance metrics and end-to-end workflow analysis
 */
module.exports = (results) => {
  const timestamp = new Date().toISOString();
  const testType = 'E2E';
  
  // Calculate performance metrics
  const performanceMetrics = {
    totalTime: results.testResults.reduce((sum, result) => sum + result.perfStats.runtime, 0),
    averageTime: results.testResults.length > 0 
      ? results.testResults.reduce((sum, result) => sum + result.perfStats.runtime, 0) / results.testResults.length 
      : 0,
    slowestTest: results.testResults.reduce((slowest, result) => 
      result.perfStats.runtime > (slowest?.perfStats?.runtime || 0) ? result : slowest, null),
    fastestTest: results.testResults.reduce((fastest, result) => 
      result.perfStats.runtime < (fastest?.perfStats?.runtime || Infinity) ? result : fastest, null)
  };

  // Calculate test statistics
  const testStats = {
    totalTests: results.numTotalTests,
    passedTests: results.numPassedTests,
    failedTests: results.numFailedTests,
    skippedTests: results.numPendingTests,
    passRate: results.numTotalTests > 0 ? (results.numPassedTests / results.numTotalTests * 100).toFixed(2) : 0,
    testSuites: results.numTotalTestSuites,
    passedSuites: results.numPassedTestSuites,
    failedSuites: results.numFailedTestSuites
  };

  // Identify slow tests (over 30 seconds for e2e tests)
  const slowTests = results.testResults
    .filter(result => result.perfStats.runtime > 30000)
    .map(result => ({
      testPath: result.testFilePath.replace(process.cwd(), ''),
      runtime: result.perfStats.runtime,
      numTests: result.numPassingTests + result.numFailingTests
    }))
    .sort((a, b) => b.runtime - a.runtime);

  // Identify failed tests with details
  const failedTests = results.testResults
    .filter(result => result.numFailingTests > 0)
    .map(result => ({
      testPath: result.testFilePath.replace(process.cwd(), ''),
      failureMessages: result.failureMessage ? [result.failureMessage] : [],
      numFailingTests: result.numFailingTests
    }));

  // Analyze E2E-specific patterns
  const e2eAnalysis = analyzeE2EPatterns(results.testResults);

  // Create comprehensive report
  const report = {
    testType,
    timestamp,
    summary: {
      success: results.success,
      ...testStats
    },
    performance: {
      ...performanceMetrics,
      targetTime: 120000, // 120 seconds target for e2e tests
      withinTarget: performanceMetrics.totalTime <= 120000,
      slowTests: slowTests.length > 0 ? slowTests : null
    },
    e2eAnalysis,
    coverage: results.coverageMap ? {
      available: true,
      // Coverage details will be in separate coverage reports
    } : {
      available: false
    },
    failures: failedTests.length > 0 ? failedTests : null,
    recommendations: generateRecommendations(performanceMetrics, testStats, slowTests, e2eAnalysis)
  };

  // Ensure test-results directory exists
  const resultsDir = path.join(process.cwd(), 'test-results', 'e2e');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  // Write detailed JSON report
  const reportPath = path.join(resultsDir, 'detailed-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Write performance summary
  const perfSummaryPath = path.join(resultsDir, 'performance-summary.txt');
  const perfSummary = generatePerformanceSummary(report);
  fs.writeFileSync(perfSummaryPath, perfSummary);

  // Write workflow analysis
  const workflowAnalysisPath = path.join(resultsDir, 'workflow-analysis.txt');
  const workflowAnalysis = generateWorkflowAnalysis(report);
  fs.writeFileSync(workflowAnalysisPath, workflowAnalysis);

  // Console output for immediate feedback
  console.log(`\\n📊 ${testType} Test Results Summary:`);
  console.log(`   ✅ Passed: ${testStats.passedTests}/${testStats.totalTests} (${testStats.passRate}%)`);
  console.log(`   ⏱️  Total Time: ${(performanceMetrics.totalTime / 1000).toFixed(2)}s`);
  console.log(`   🎯 Target Met: ${report.performance.withinTarget ? '✅' : '❌'} (${(performanceMetrics.totalTime / 1000).toFixed(2)}s / 120s)`);
  
  if (e2eAnalysis.authWorkflows > 0) {
    console.log(`   🔐 Auth Workflows: ${e2eAnalysis.authWorkflows}`);
  }
  
  if (e2eAnalysis.productWorkflows > 0) {
    console.log(`   🛍️  Product Workflows: ${e2eAnalysis.productWorkflows}`);
  }
  
  if (e2eAnalysis.orderWorkflows > 0) {
    console.log(`   📦 Order Workflows: ${e2eAnalysis.orderWorkflows}`);
  }
  
  if (e2eAnalysis.securityTests > 0) {
    console.log(`   🔒 Security Tests: ${e2eAnalysis.securityTests}`);
  }
  
  if (slowTests.length > 0) {
    console.log(`   🐌 Slow Tests: ${slowTests.length} tests over 30s`);
  }
  
  if (failedTests.length > 0) {
    console.log(`   ❌ Failed Suites: ${failedTests.length}`);
  }

  console.log(`   📄 Detailed report: ${reportPath}`);
  console.log(`   🔄 Workflow analysis: ${workflowAnalysisPath}`);

  return results;
};

function analyzeE2EPatterns(testResults) {
  let authWorkflows = 0;
  let productWorkflows = 0;
  let orderWorkflows = 0;
  let securityTests = 0;
  let configTests = 0;

  testResults.forEach(result => {
    const testPath = result.testFilePath.toLowerCase();
    
    if (testPath.includes('auth') || testPath.includes('login') || testPath.includes('register')) {
      authWorkflows++;
    }
    
    if (testPath.includes('product') || testPath.includes('catalog')) {
      productWorkflows++;
    }
    
    if (testPath.includes('order') || testPath.includes('checkout') || testPath.includes('cart')) {
      orderWorkflows++;
    }
    
    if (testPath.includes('security') || testPath.includes('rate-limit') || testPath.includes('cors')) {
      securityTests++;
    }
    
    if (testPath.includes('config') || testPath.includes('health')) {
      configTests++;
    }
  });

  return {
    authWorkflows,
    productWorkflows,
    orderWorkflows,
    securityTests,
    configTests,
    totalWorkflows: authWorkflows + productWorkflows + orderWorkflows,
    workflowCoverage: calculateWorkflowCoverage(authWorkflows, productWorkflows, orderWorkflows, securityTests)
  };
}

function calculateWorkflowCoverage(auth, product, order, security) {
  const expectedWorkflows = ['auth', 'product', 'order', 'security'];
  const coveredWorkflows = [];
  
  if (auth > 0) coveredWorkflows.push('auth');
  if (product > 0) coveredWorkflows.push('product');
  if (order > 0) coveredWorkflows.push('order');
  if (security > 0) coveredWorkflows.push('security');
  
  return {
    covered: coveredWorkflows,
    missing: expectedWorkflows.filter(w => !coveredWorkflows.includes(w)),
    percentage: (coveredWorkflows.length / expectedWorkflows.length * 100).toFixed(1)
  };
}

function generateRecommendations(performance, stats, slowTests, e2eAnalysis) {
  const recommendations = [];

  if (performance.totalTime > 120000) {
    recommendations.push({
      type: 'performance',
      priority: 'high',
      message: `E2E tests took ${(performance.totalTime / 1000).toFixed(2)}s, exceeding 120s target. Consider optimizing server startup or reducing test scope.`
    });
  }

  if (slowTests.length > 0) {
    recommendations.push({
      type: 'performance',
      priority: 'medium',
      message: `${slowTests.length} E2E tests are taking over 30 seconds. Consider optimizing test workflows or server response times.`,
      details: slowTests.slice(0, 3).map(test => `${test.testPath}: ${(test.runtime / 1000).toFixed(2)}s`)
    });
  }

  if (stats.passRate < 100 && stats.passRate > 0) {
    recommendations.push({
      type: 'quality',
      priority: 'high',
      message: `${stats.failedTests} E2E tests are failing. Check server connectivity, database state, and test data setup.`
    });
  }

  // Workflow coverage recommendations
  if (e2eAnalysis.workflowCoverage.missing.length > 0) {
    recommendations.push({
      type: 'coverage',
      priority: 'medium',
      message: `Missing E2E coverage for: ${e2eAnalysis.workflowCoverage.missing.join(', ')}. Consider adding comprehensive workflow tests.`
    });
  }

  if (e2eAnalysis.authWorkflows === 0 && stats.totalTests > 0) {
    recommendations.push({
      type: 'coverage',
      priority: 'high',
      message: 'No authentication workflow tests detected. E2E tests should cover user registration and login flows.'
    });
  }

  if (e2eAnalysis.securityTests === 0 && stats.totalTests > 0) {
    recommendations.push({
      type: 'security',
      priority: 'medium',
      message: 'No security E2E tests detected. Consider adding tests for rate limiting, CORS, and input validation.'
    });
  }

  if (performance.averageTime > 20000) {
    recommendations.push({
      type: 'performance',
      priority: 'low',
      message: `Average test time is ${(performance.averageTime / 1000).toFixed(2)}s. Consider optimizing test server startup or using test fixtures.`
    });
  }

  return recommendations;
}

function generatePerformanceSummary(report) {
  const lines = [
    `E2E Test Performance Summary - ${report.timestamp}`,
    '='.repeat(60),
    '',
    `Total Tests: ${report.summary.totalTests}`,
    `Passed: ${report.summary.passedTests} (${report.summary.passRate}%)`,
    `Failed: ${report.summary.failedTests}`,
    `Skipped: ${report.summary.skippedTests}`,
    '',
    `Total Runtime: ${(report.performance.totalTime / 1000).toFixed(2)}s`,
    `Average per Test: ${(report.performance.averageTime / 1000).toFixed(3)}s`,
    `Target Met (≤120s): ${report.performance.withinTarget ? 'YES' : 'NO'}`,
    '',
    'Workflow Coverage:',
    `  Authentication: ${report.e2eAnalysis.authWorkflows} tests`,
    `  Product Management: ${report.e2eAnalysis.productWorkflows} tests`,
    `  Order Processing: ${report.e2eAnalysis.orderWorkflows} tests`,
    `  Security Features: ${report.e2eAnalysis.securityTests} tests`,
    `  Overall Coverage: ${report.e2eAnalysis.workflowCoverage.percentage}%`,
    ''
  ];

  if (report.performance.slowTests && report.performance.slowTests.length > 0) {
    lines.push('Slow Tests (>30s):');
    report.performance.slowTests.forEach(test => {
      lines.push(`  - ${test.testPath}: ${(test.runtime / 1000).toFixed(2)}s`);
    });
    lines.push('');
  }

  if (report.recommendations && report.recommendations.length > 0) {
    lines.push('Recommendations:');
    report.recommendations.forEach((rec, index) => {
      lines.push(`  ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
      if (rec.details) {
        rec.details.forEach(detail => lines.push(`     - ${detail}`));
      }
    });
  }

  return lines.join('\\n');
}

function generateWorkflowAnalysis(report) {
  const lines = [
    `E2E Workflow Analysis - ${report.timestamp}`,
    '='.repeat(60),
    '',
    'User Journey Coverage:',
    ''
  ];

  const workflows = [
    { name: 'Authentication Workflows', count: report.e2eAnalysis.authWorkflows, description: 'User registration, login, logout' },
    { name: 'Product Workflows', count: report.e2eAnalysis.productWorkflows, description: 'Browse, search, view products' },
    { name: 'Order Workflows', count: report.e2eAnalysis.orderWorkflows, description: 'Add to cart, checkout, order management' },
    { name: 'Security Tests', count: report.e2eAnalysis.securityTests, description: 'Rate limiting, CORS, input validation' }
  ];

  workflows.forEach(workflow => {
    const status = workflow.count > 0 ? '✅' : '❌';
    lines.push(`${status} ${workflow.name}: ${workflow.count} tests`);
    lines.push(`   ${workflow.description}`);
    lines.push('');
  });

  lines.push('Coverage Summary:');
  lines.push(`  Covered Workflows: ${report.e2eAnalysis.workflowCoverage.covered.join(', ') || 'None'}`);
  lines.push(`  Missing Workflows: ${report.e2eAnalysis.workflowCoverage.missing.join(', ') || 'None'}`);
  lines.push(`  Coverage Percentage: ${report.e2eAnalysis.workflowCoverage.percentage}%`);
  lines.push('');

  if (report.e2eAnalysis.workflowCoverage.missing.length > 0) {
    lines.push('Recommendations for Missing Workflows:');
    report.e2eAnalysis.workflowCoverage.missing.forEach(workflow => {
      switch (workflow) {
        case 'auth':
          lines.push('  - Add user registration and login flow tests');
          break;
        case 'product':
          lines.push('  - Add product browsing and search workflow tests');
          break;
        case 'order':
          lines.push('  - Add shopping cart and checkout workflow tests');
          break;
        case 'security':
          lines.push('  - Add security feature validation tests');
          break;
      }
    });
  }

  return lines.join('\\n');
}
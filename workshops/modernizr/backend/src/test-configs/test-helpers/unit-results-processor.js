const fs = require('fs');
const path = require('path');

/**
 * Custom test results processor for Unit Tests
 * Provides detailed performance metrics and test analysis
 */
module.exports = (results) => {
  const timestamp = new Date().toISOString();
  const testType = 'Unit';
  
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

  // Identify slow tests (over 1 second for unit tests)
  const slowTests = results.testResults
    .filter(result => result.perfStats.runtime > 1000)
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
      targetTime: 10000, // 10 seconds target for unit tests
      withinTarget: performanceMetrics.totalTime <= 10000,
      slowTests: slowTests.length > 0 ? slowTests : null
    },
    coverage: results.coverageMap ? {
      available: true,
      // Coverage details will be in separate coverage reports
    } : {
      available: false
    },
    failures: failedTests.length > 0 ? failedTests : null,
    recommendations: generateRecommendations(performanceMetrics, testStats, slowTests)
  };

  // Ensure test-results directory exists
  const resultsDir = path.join(process.cwd(), 'test-results', 'unit');
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

  // Console output for immediate feedback
  console.log(`\\n📊 ${testType} Test Results Summary:`);
  console.log(`   ✅ Passed: ${testStats.passedTests}/${testStats.totalTests} (${testStats.passRate}%)`);
  console.log(`   ⏱️  Total Time: ${(performanceMetrics.totalTime / 1000).toFixed(2)}s`);
  console.log(`   🎯 Target Met: ${report.performance.withinTarget ? '✅' : '❌'} (${(performanceMetrics.totalTime / 1000).toFixed(2)}s / 10s)`);
  
  if (slowTests.length > 0) {
    console.log(`   🐌 Slow Tests: ${slowTests.length} tests over 1s`);
  }
  
  if (failedTests.length > 0) {
    console.log(`   ❌ Failed Suites: ${failedTests.length}`);
  }

  console.log(`   📄 Detailed report: ${reportPath}`);

  return results;
};

function generateRecommendations(performance, stats, slowTests) {
  const recommendations = [];

  if (performance.totalTime > 10000) {
    recommendations.push({
      type: 'performance',
      priority: 'high',
      message: `Unit tests took ${(performance.totalTime / 1000).toFixed(2)}s, exceeding 10s target. Consider optimizing slow tests.`
    });
  }

  if (slowTests.length > 0) {
    recommendations.push({
      type: 'performance',
      priority: 'medium',
      message: `${slowTests.length} unit tests are taking over 1 second. Unit tests should be fast and isolated.`,
      details: slowTests.slice(0, 3).map(test => `${test.testPath}: ${(test.runtime / 1000).toFixed(2)}s`)
    });
  }

  if (stats.passRate < 100 && stats.passRate > 0) {
    recommendations.push({
      type: 'quality',
      priority: 'high',
      message: `${stats.failedTests} unit tests are failing. Fix failing tests to maintain code quality.`
    });
  }

  if (performance.averageTime > 500) {
    recommendations.push({
      type: 'performance',
      priority: 'low',
      message: `Average test time is ${(performance.averageTime / 1000).toFixed(2)}s. Consider optimizing test setup/teardown.`
    });
  }

  return recommendations;
}

function generatePerformanceSummary(report) {
  const lines = [
    `Unit Test Performance Summary - ${report.timestamp}`,
    '='.repeat(60),
    '',
    `Total Tests: ${report.summary.totalTests}`,
    `Passed: ${report.summary.passedTests} (${report.summary.passRate}%)`,
    `Failed: ${report.summary.failedTests}`,
    `Skipped: ${report.summary.skippedTests}`,
    '',
    `Total Runtime: ${(report.performance.totalTime / 1000).toFixed(2)}s`,
    `Average per Test: ${(report.performance.averageTime / 1000).toFixed(3)}s`,
    `Target Met (≤10s): ${report.performance.withinTarget ? 'YES' : 'NO'}`,
    ''
  ];

  if (report.performance.slowTests && report.performance.slowTests.length > 0) {
    lines.push('Slow Tests (>1s):');
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
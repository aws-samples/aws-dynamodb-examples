const fs = require('fs');
const path = require('path');

/**
 * Combined Test Reporter
 * Generates comprehensive reports across all test types
 */
class CombinedTestReporter {
  constructor() {
    this.resultsDir = path.join(process.cwd(), 'test-results');
    this.combinedDir = path.join(this.resultsDir, 'combined');
  }

  /**
   * Generate combined report from all test types
   */
  async generateCombinedReport() {
    console.log('📊 Generating combined test report...');

    // Ensure combined results directory exists
    if (!fs.existsSync(this.combinedDir)) {
      fs.mkdirSync(this.combinedDir, { recursive: true });
    }

    // Load individual test reports
    const reports = await this.loadIndividualReports();
    
    // Generate combined analysis
    const combinedReport = this.createCombinedReport(reports);
    
    // Write reports
    await this.writeReports(combinedReport);
    
    // Generate dashboard
    await this.generateDashboard(combinedReport);

    console.log(`✅ Combined test report generated: ${path.join(this.combinedDir, 'dashboard.html')}`);
    
    return combinedReport;
  }

  /**
   * Load individual test reports
   */
  async loadIndividualReports() {
    const reports = {
      unit: null,
      integration: null,
      e2e: null
    };

    // Load unit test report
    const unitReportPath = path.join(this.resultsDir, 'unit', 'detailed-report.json');
    if (fs.existsSync(unitReportPath)) {
      reports.unit = JSON.parse(fs.readFileSync(unitReportPath, 'utf8'));
    }

    // Load integration test report
    const integrationReportPath = path.join(this.resultsDir, 'integration', 'detailed-report.json');
    if (fs.existsSync(integrationReportPath)) {
      reports.integration = JSON.parse(fs.readFileSync(integrationReportPath, 'utf8'));
    }

    // Load e2e test report
    const e2eReportPath = path.join(this.resultsDir, 'e2e', 'detailed-report.json');
    if (fs.existsSync(e2eReportPath)) {
      reports.e2e = JSON.parse(fs.readFileSync(e2eReportPath, 'utf8'));
    }

    return reports;
  }

  /**
   * Create combined report analysis
   */
  createCombinedReport(reports) {
    const timestamp = new Date().toISOString();
    
    // Calculate totals across all test types
    const totals = this.calculateTotals(reports);
    
    // Analyze test pyramid compliance
    const pyramidAnalysis = this.analyzePyramidCompliance(reports);
    
    // Generate overall recommendations
    const recommendations = this.generateOverallRecommendations(reports, totals, pyramidAnalysis);
    
    // Performance analysis
    const performanceAnalysis = this.analyzeOverallPerformance(reports);

    return {
      timestamp,
      summary: {
        ...totals,
        overallSuccess: totals.failedTests === 0,
        testTypes: Object.keys(reports).filter(type => reports[type] !== null)
      },
      testPyramid: pyramidAnalysis,
      performance: performanceAnalysis,
      coverage: this.analyzeCombinedCoverage(reports),
      recommendations,
      individualReports: reports
    };
  }

  /**
   * Calculate totals across all test types
   */
  calculateTotals(reports) {
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let skippedTests = 0;
    let totalTime = 0;

    Object.values(reports).forEach(report => {
      if (report && report.summary) {
        totalTests += report.summary.totalTests || 0;
        passedTests += report.summary.passedTests || 0;
        failedTests += report.summary.failedTests || 0;
        skippedTests += report.summary.skippedTests || 0;
        totalTime += report.performance?.totalTime || 0;
      }
    });

    return {
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      passRate: totalTests > 0 ? (passedTests / totalTests * 100).toFixed(2) : 0,
      totalTime,
      averageTime: totalTests > 0 ? totalTime / totalTests : 0
    };
  }

  /**
   * Analyze test pyramid compliance
   */
  analyzePyramidCompliance(reports) {
    const unitCount = reports.unit?.summary?.totalTests || 0;
    const integrationCount = reports.integration?.summary?.totalTests || 0;
    const e2eCount = reports.e2e?.summary?.totalTests || 0;
    const total = unitCount + integrationCount + e2eCount;

    if (total === 0) {
      return { compliant: false, message: 'No tests found' };
    }

    const unitPercentage = (unitCount / total * 100).toFixed(1);
    const integrationPercentage = (integrationCount / total * 100).toFixed(1);
    const e2ePercentage = (e2eCount / total * 100).toFixed(1);

    // Ideal pyramid: 70% unit, 20% integration, 10% e2e
    const isCompliant = unitPercentage >= 60 && integrationPercentage <= 30 && e2ePercentage <= 20;

    return {
      compliant: isCompliant,
      distribution: {
        unit: { count: unitCount, percentage: unitPercentage },
        integration: { count: integrationCount, percentage: integrationPercentage },
        e2e: { count: e2eCount, percentage: e2ePercentage }
      },
      recommendation: isCompliant 
        ? 'Test pyramid distribution is healthy'
        : 'Consider rebalancing tests: aim for ~70% unit, ~20% integration, ~10% e2e'
    };
  }

  /**
   * Analyze overall performance
   */
  analyzeOverallPerformance(reports) {
    const performance = {
      unit: reports.unit?.performance || null,
      integration: reports.integration?.performance || null,
      e2e: reports.e2e?.performance || null
    };

    const targetsMet = {
      unit: performance.unit?.withinTarget ?? null,
      integration: performance.integration?.withinTarget ?? null,
      e2e: performance.e2e?.withinTarget ?? null
    };

    const allTargetsMet = Object.values(targetsMet).every(met => met === true || met === null);

    return {
      individual: performance,
      targetsMet,
      allTargetsMet,
      totalTime: Object.values(performance).reduce((sum, perf) => 
        sum + (perf?.totalTime || 0), 0),
      recommendation: allTargetsMet 
        ? 'All performance targets are being met'
        : 'Some test types are exceeding performance targets'
    };
  }

  /**
   * Analyze combined coverage
   */
  analyzeCombinedCoverage(reports) {
    const coverageAvailable = Object.values(reports).some(report => 
      report?.coverage?.available === true);

    return {
      available: coverageAvailable,
      byType: {
        unit: reports.unit?.coverage?.available || false,
        integration: reports.integration?.coverage?.available || false,
        e2e: reports.e2e?.coverage?.available || false
      },
      recommendation: coverageAvailable 
        ? 'Coverage reports are available for detailed analysis'
        : 'Enable coverage collection for better test quality insights'
    };
  }

  /**
   * Generate overall recommendations
   */
  generateOverallRecommendations(reports, totals, pyramidAnalysis) {
    const recommendations = [];

    // Overall quality recommendations
    if (totals.passRate < 100) {
      recommendations.push({
        type: 'quality',
        priority: 'high',
        message: `${totals.failedTests} tests are failing across all test types. Address failing tests to maintain code quality.`
      });
    }

    // Test pyramid recommendations
    if (!pyramidAnalysis.compliant) {
      recommendations.push({
        type: 'architecture',
        priority: 'medium',
        message: pyramidAnalysis.recommendation
      });
    }

    // Performance recommendations
    const slowTestTypes = [];
    if (reports.unit?.performance?.withinTarget === false) slowTestTypes.push('unit');
    if (reports.integration?.performance?.withinTarget === false) slowTestTypes.push('integration');
    if (reports.e2e?.performance?.withinTarget === false) slowTestTypes.push('e2e');

    if (slowTestTypes.length > 0) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: `${slowTestTypes.join(', ')} tests are exceeding performance targets. Consider optimization.`
      });
    }

    // Coverage recommendations
    const missingCoverage = [];
    if (!reports.unit?.coverage?.available) missingCoverage.push('unit');
    if (!reports.integration?.coverage?.available) missingCoverage.push('integration');
    if (!reports.e2e?.coverage?.available) missingCoverage.push('e2e');

    if (missingCoverage.length > 0) {
      recommendations.push({
        type: 'coverage',
        priority: 'low',
        message: `Coverage reporting not available for: ${missingCoverage.join(', ')}. Enable for better insights.`
      });
    }

    // Consolidate individual recommendations
    Object.values(reports).forEach(report => {
      if (report?.recommendations) {
        report.recommendations.forEach(rec => {
          if (rec.priority === 'high') {
            recommendations.push({
              ...rec,
              source: report.testType
            });
          }
        });
      }
    });

    return recommendations;
  }

  /**
   * Write all report files
   */
  async writeReports(combinedReport) {
    // Write JSON report
    const jsonPath = path.join(this.combinedDir, 'combined-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(combinedReport, null, 2));

    // Write summary report
    const summaryPath = path.join(this.combinedDir, 'summary.txt');
    const summary = this.generateTextSummary(combinedReport);
    fs.writeFileSync(summaryPath, summary);

    // Write recommendations
    const recommendationsPath = path.join(this.combinedDir, 'recommendations.txt');
    const recommendations = this.generateRecommendationsText(combinedReport);
    fs.writeFileSync(recommendationsPath, recommendations);
  }

  /**
   * Generate text summary
   */
  generateTextSummary(report) {
    const lines = [
      `Combined Test Results Summary - ${report.timestamp}`,
      '='.repeat(60),
      '',
      `Overall Status: ${report.summary.overallSuccess ? '✅ PASSED' : '❌ FAILED'}`,
      `Total Tests: ${report.summary.totalTests}`,
      `Passed: ${report.summary.passedTests} (${report.summary.passRate}%)`,
      `Failed: ${report.summary.failedTests}`,
      `Skipped: ${report.summary.skippedTests}`,
      `Total Runtime: ${(report.summary.totalTime / 1000).toFixed(2)}s`,
      '',
      'Test Pyramid Distribution:',
      `  Unit Tests: ${report.testPyramid.distribution.unit.count} (${report.testPyramid.distribution.unit.percentage}%)`,
      `  Integration Tests: ${report.testPyramid.distribution.integration.count} (${report.testPyramid.distribution.integration.percentage}%)`,
      `  E2E Tests: ${report.testPyramid.distribution.e2e.count} (${report.testPyramid.distribution.e2e.percentage}%)`,
      `  Pyramid Compliant: ${report.testPyramid.compliant ? 'YES' : 'NO'}`,
      '',
      'Performance Targets:',
      `  Unit Tests: ${report.performance.targetsMet.unit === true ? '✅' : report.performance.targetsMet.unit === false ? '❌' : 'N/A'}`,
      `  Integration Tests: ${report.performance.targetsMet.integration === true ? '✅' : report.performance.targetsMet.integration === false ? '❌' : 'N/A'}`,
      `  E2E Tests: ${report.performance.targetsMet.e2e === true ? '✅' : report.performance.targetsMet.e2e === false ? '❌' : 'N/A'}`,
      `  All Targets Met: ${report.performance.allTargetsMet ? 'YES' : 'NO'}`,
      ''
    ];

    if (report.recommendations.length > 0) {
      lines.push('Top Recommendations:');
      report.recommendations.slice(0, 5).forEach((rec, index) => {
        lines.push(`  ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
      });
    }

    return lines.join('\\n');
  }

  /**
   * Generate recommendations text
   */
  generateRecommendationsText(report) {
    const lines = [
      `Test Suite Recommendations - ${report.timestamp}`,
      '='.repeat(60),
      ''
    ];

    if (report.recommendations.length === 0) {
      lines.push('🎉 No recommendations - your test suite is in great shape!');
      return lines.join('\\n');
    }

    const byPriority = {
      high: report.recommendations.filter(r => r.priority === 'high'),
      medium: report.recommendations.filter(r => r.priority === 'medium'),
      low: report.recommendations.filter(r => r.priority === 'low')
    };

    ['high', 'medium', 'low'].forEach(priority => {
      if (byPriority[priority].length > 0) {
        lines.push(`${priority.toUpperCase()} PRIORITY (${byPriority[priority].length} items):`);
        lines.push('');
        
        byPriority[priority].forEach((rec, index) => {
          lines.push(`${index + 1}. ${rec.message}`);
          if (rec.source) {
            lines.push(`   Source: ${rec.source} tests`);
          }
          if (rec.details) {
            rec.details.forEach(detail => lines.push(`   - ${detail}`));
          }
          lines.push('');
        });
      }
    });

    return lines.join('\\n');
  }

  /**
   * Generate HTML dashboard
   */
  async generateDashboard(report) {
    const dashboardPath = path.join(this.combinedDir, 'dashboard.html');
    const html = this.generateDashboardHTML(report);
    fs.writeFileSync(dashboardPath, html);
  }

  /**
   * Generate dashboard HTML
   */
  generateDashboardHTML(report) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Results Dashboard</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .status { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .success { color: #28a745; }
        .failure { color: #dc3545; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .metric-value { font-weight: bold; }
        .progress-bar { width: 100%; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; margin: 10px 0; }
        .progress-fill { height: 100%; background: #28a745; transition: width 0.3s ease; }
        .recommendations { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .rec-high { border-left: 4px solid #dc3545; padding-left: 15px; margin-bottom: 15px; }
        .rec-medium { border-left: 4px solid #ffc107; padding-left: 15px; margin-bottom: 15px; }
        .rec-low { border-left: 4px solid #17a2b8; padding-left: 15px; margin-bottom: 15px; }
        .timestamp { color: #6c757d; font-size: 14px; }
        .pyramid { display: flex; flex-direction: column; align-items: center; }
        .pyramid-level { margin: 5px 0; padding: 10px; text-align: center; color: white; border-radius: 4px; }
        .pyramid-e2e { background: #e74c3c; width: 100px; }
        .pyramid-integration { background: #f39c12; width: 200px; }
        .pyramid-unit { background: #27ae60; width: 300px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="status ${report.summary.overallSuccess ? 'success' : 'failure'}">
                ${report.summary.overallSuccess ? '✅ All Tests Passed' : '❌ Some Tests Failed'}
            </div>
            <div class="timestamp">Generated: ${new Date(report.timestamp).toLocaleString()}</div>
        </div>

        <div class="grid">
            <div class="card">
                <h3>Test Summary</h3>
                <div class="metric">
                    <span>Total Tests:</span>
                    <span class="metric-value">${report.summary.totalTests}</span>
                </div>
                <div class="metric">
                    <span>Passed:</span>
                    <span class="metric-value" style="color: #28a745">${report.summary.passedTests}</span>
                </div>
                <div class="metric">
                    <span>Failed:</span>
                    <span class="metric-value" style="color: #dc3545">${report.summary.failedTests}</span>
                </div>
                <div class="metric">
                    <span>Pass Rate:</span>
                    <span class="metric-value">${report.summary.passRate}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${report.summary.passRate}%"></div>
                </div>
            </div>

            <div class="card">
                <h3>Performance</h3>
                <div class="metric">
                    <span>Total Runtime:</span>
                    <span class="metric-value">${(report.summary.totalTime / 1000).toFixed(2)}s</span>
                </div>
                <div class="metric">
                    <span>Unit Tests:</span>
                    <span class="metric-value">${report.performance.targetsMet.unit === true ? '✅' : report.performance.targetsMet.unit === false ? '❌' : 'N/A'}</span>
                </div>
                <div class="metric">
                    <span>Integration Tests:</span>
                    <span class="metric-value">${report.performance.targetsMet.integration === true ? '✅' : report.performance.targetsMet.integration === false ? '❌' : 'N/A'}</span>
                </div>
                <div class="metric">
                    <span>E2E Tests:</span>
                    <span class="metric-value">${report.performance.targetsMet.e2e === true ? '✅' : report.performance.targetsMet.e2e === false ? '❌' : 'N/A'}</span>
                </div>
            </div>

            <div class="card">
                <h3>Test Pyramid</h3>
                <div class="pyramid">
                    <div class="pyramid-level pyramid-e2e">
                        E2E: ${report.testPyramid.distribution.e2e.count} (${report.testPyramid.distribution.e2e.percentage}%)
                    </div>
                    <div class="pyramid-level pyramid-integration">
                        Integration: ${report.testPyramid.distribution.integration.count} (${report.testPyramid.distribution.integration.percentage}%)
                    </div>
                    <div class="pyramid-level pyramid-unit">
                        Unit: ${report.testPyramid.distribution.unit.count} (${report.testPyramid.distribution.unit.percentage}%)
                    </div>
                </div>
                <div style="text-align: center; margin-top: 10px;">
                    ${report.testPyramid.compliant ? '✅ Pyramid Compliant' : '⚠️ Needs Rebalancing'}
                </div>
            </div>
        </div>

        ${report.recommendations.length > 0 ? `
        <div class="recommendations">
            <h3>Recommendations</h3>
            ${report.recommendations.map(rec => `
                <div class="rec-${rec.priority}">
                    <strong>[${rec.priority.toUpperCase()}]</strong> ${rec.message}
                    ${rec.source ? `<br><small>Source: ${rec.source} tests</small>` : ''}
                </div>
            `).join('')}
        </div>
        ` : ''}
    </div>
</body>
</html>`;
  }
}

// Export for use as a module
module.exports = CombinedTestReporter;

// Allow running as a script
if (require.main === module) {
  const reporter = new CombinedTestReporter();
  reporter.generateCombinedReport()
    .then(() => console.log('✅ Combined report generated successfully'))
    .catch(error => {
      console.error('❌ Failed to generate combined report:', error);
      process.exit(1);
    });
}
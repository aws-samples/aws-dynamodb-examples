module.exports = {
  displayName: {
    name: 'Integration Tests',
    color: 'blue'
  },
  testMatch: ['<rootDir>/../__tests__/integration/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/integration-setup.ts'],
  globalTeardown: '<rootDir>/integration-teardown.js',
  testEnvironment: 'node',
  testTimeout: 30000,
  maxWorkers: 1, // Sequential execution for database tests
  forceExit: true, // Force Jest to exit after tests complete
  // Performance optimizations
  cache: true,
  cacheDirectory: '<rootDir>/../node_modules/.cache/jest-integration',
  preset: 'ts-jest',
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  roots: ['<rootDir>/..'],
  collectCoverageFrom: [
    '../**/*.ts',
    '!../__tests__/**',
    '!../test-configs/**',
    '!../load-testing/**',
    '!../tests/**'
  ],
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  // Enhanced reporting
  verbose: true,
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results/integration',
      outputName: 'junit.xml',
      suiteName: 'Integration Tests',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }],
    ['jest-html-reporters', {
      publicPath: 'test-results/integration',
      filename: 'report.html',
      pageTitle: 'Integration Test Results',
      logoImgPath: undefined,
      hideIcon: false,
      expand: false,
      openReport: false,
      includeFailureMsg: true,
      includeSuiteFailure: true
    }]
  ],
  // Test result processor for custom reporting
  testResultsProcessor: '<rootDir>/test-helpers/integration-results-processor.js'
};
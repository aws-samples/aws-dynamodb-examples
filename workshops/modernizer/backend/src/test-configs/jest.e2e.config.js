module.exports = {
  displayName: {
    name: 'E2E Tests',
    color: 'magenta'
  },
  testMatch: ['<rootDir>/../__tests__/e2e/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/e2e-setup.ts'],
  testEnvironment: 'node',
  testTimeout: 60000,
  maxWorkers: 1, // Sequential execution for server tests
  // Performance optimizations
  cache: true,
  cacheDirectory: '<rootDir>/../node_modules/.cache/jest-e2e',
  preset: 'ts-jest',
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  roots: ['<rootDir>/..'],
  globalSetup: '<rootDir>/e2e-global-setup.ts',
  globalTeardown: '<rootDir>/e2e-global-teardown.ts',
  collectCoverageFrom: [
    '../**/*.ts',
    '!../__tests__/**',
    '!../test-configs/**',
    '!../load-testing/**',
    '!../tests/**'
  ],
  coverageDirectory: 'coverage/e2e',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  // Enhanced reporting
  verbose: true,
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results/e2e',
      outputName: 'junit.xml',
      suiteName: 'E2E Tests',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }],
    ['jest-html-reporters', {
      publicPath: 'test-results/e2e',
      filename: 'report.html',
      pageTitle: 'E2E Test Results',
      logoImgPath: undefined,
      hideIcon: false,
      expand: false,
      openReport: false,
      includeFailureMsg: true,
      includeSuiteFailure: true
    }]
  ],
  // Test result processor for custom reporting
  testResultsProcessor: '<rootDir>/test-helpers/e2e-results-processor.js'
};
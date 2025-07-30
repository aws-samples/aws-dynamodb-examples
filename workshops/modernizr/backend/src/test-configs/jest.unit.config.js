module.exports = {
  displayName: {
    name: 'Unit Tests',
    color: 'green'
  },
  testMatch: ['<rootDir>/../__tests__/unit/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/unit-setup.ts'],
  testEnvironment: 'node',
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  collectCoverageFrom: [
    '../**/*.ts',
    '!../__tests__/**',
    '!../test-configs/**',
    '!../load-testing/**',
    '!../tests/**'
  ],
  coverageDirectory: 'coverage/unit',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testTimeout: 10000,
  maxWorkers: '50%',
  // Performance optimizations
  cache: true,
  cacheDirectory: '<rootDir>/../node_modules/.cache/jest-unit',
  preset: 'ts-jest',
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  roots: ['<rootDir>/..'],
  // Enhanced reporting
  verbose: true,
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results/unit',
      outputName: 'junit.xml',
      suiteName: 'Unit Tests',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }],
    ['jest-html-reporters', {
      publicPath: 'test-results/unit',
      filename: 'report.html',
      pageTitle: 'Unit Test Results',
      logoImgPath: undefined,
      hideIcon: false,
      expand: false,
      openReport: false,
      includeFailureMsg: true,
      includeSuiteFailure: true
    }]
  ],
  // Test result processor for custom reporting
  testResultsProcessor: '<rootDir>/test-helpers/unit-results-processor.js'
};
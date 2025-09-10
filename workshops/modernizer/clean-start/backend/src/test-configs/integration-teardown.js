// Global teardown for integration tests
module.exports = async () => {
  try {
    // Import the teardown function
    const { teardownIntegrationTests } = require('./integration-setup');
    await teardownIntegrationTests();
  } catch (error) {
    console.warn('⚠️  Error during integration test teardown:', error.message);
  }
};
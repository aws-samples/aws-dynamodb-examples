import { app } from './app';
import { config as envConfig } from './config/env';
import { performanceMonitor } from './utils/performanceMonitor';
import { FeatureFlagService } from './services/FeatureFlagService';

// Configure migration phase for dual-write
if (process.env.ENABLE_DYNAMODB_WRITES === 'true') {
  console.log('🚀 Enabling dual-write mode (Phase 2)');
  FeatureFlagService.setMigrationPhase(2); // Dual Write + MySQL Read
} else {
  console.log('📝 Using MySQL-only mode (Phase 1)');
  FeatureFlagService.setMigrationPhase(1); // MySQL Only
}

const PORT = envConfig.PORT;

// Start performance monitoring
const monitoringInterval = performanceMonitor.startMonitoring(60000); // Every minute

const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔧 Performance: http://localhost:${PORT}/api/performance`);
  console.log(`📈 Metrics: http://localhost:${PORT}/api/metrics`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  clearInterval(monitoringInterval);
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  clearInterval(monitoringInterval);
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

export { app };
import { app } from './app';
import { config as envConfig } from './config/env';
import { performanceMonitor } from './utils/performanceMonitor';

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
import mysql from 'mysql2/promise';

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
  acquireTimeout: number;
  timeout: number;
}

export const databaseConfig: DatabaseConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'online_shopping_store',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
  acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
  timeout: parseInt(process.env.DB_TIMEOUT || '60000'),
};

// Create connection pool with optimized settings
export const pool = mysql.createPool({
  host: databaseConfig.host,
  port: databaseConfig.port,
  user: databaseConfig.user,
  password: databaseConfig.password,
  database: databaseConfig.database,
  waitForConnections: true,
  connectionLimit: databaseConfig.connectionLimit,
  queueLimit: 0,
  // Performance optimizations
  idleTimeout: 900000, // 15 minutes
  maxIdle: 10, // Maximum idle connections
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // Connection health checks
  multipleStatements: false, // Security: prevent SQL injection
  dateStrings: false,
  supportBigNumbers: true,
  bigNumberStrings: false,
  charset: 'utf8mb4'
});

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    // First test connection without database
    const testPool = mysql.createPool({
      host: databaseConfig.host,
      port: databaseConfig.port,
      user: databaseConfig.user,
      password: databaseConfig.password,
      // Don't specify database for initial connection test
    });
    
    const connection = await testPool.getConnection();
    await connection.ping();
    connection.release();
    await testPool.end();
    
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Database monitoring and health utilities
export function getPoolStats() {
  return {
    totalConnections: databaseConfig.connectionLimit,
    // Note: mysql2 doesn't expose internal connection stats in TypeScript
    // These would need to be tracked manually or use a monitoring solution
    activeConnections: 0, // Placeholder - would need custom tracking
    idleConnections: 0, // Placeholder - would need custom tracking
    queuedRequests: 0, // Placeholder - would need custom tracking
    acquiringConnections: 0 // Placeholder - would need custom tracking
  };
}

// Health check with connection validation
export async function healthCheck(): Promise<{ healthy: boolean; details: any }> {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    
    const poolStatus = getPoolStats();
    
    return {
      healthy: true,
      details: {
        database: 'connected',
        poolStatus,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      healthy: false,
      details: {
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    };
  }
}

// Query performance monitoring
export async function executeQuery<T = any>(
  query: string, 
  params: any[] = []
): Promise<{ results: T; executionTime: number }> {
  const startTime = Date.now();
  
  try {
    const [results] = await pool.execute(query, params);
    const executionTime = Date.now() - startTime;
    
    // Log slow queries (> 1000ms)
    if (executionTime > 1000) {
      console.warn(`Slow query detected (${executionTime}ms):`, {
        query: query.substring(0, 100) + '...',
        executionTime,
        timestamp: new Date().toISOString()
      });
    }
    
    return { results: results as T, executionTime };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`Query failed (${executionTime}ms):`, {
      query: query.substring(0, 100) + '...',
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTime,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

// Close all connections
export async function closePool(): Promise<void> {
  try {
    await pool.end();
    console.log('Database connection pool closed');
  } catch (error) {
    console.error('Error closing database pool:', error);
  }
}
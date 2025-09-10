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
const rawPool = mysql.createPool({
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

// Wrap the pool to automatically track all queries
const originalExecute = rawPool.execute.bind(rawPool);
rawPool.execute = function(sql: any, values?: any) {
  connectionStats.activeConnections++;
  connectionStats.totalQueries++;
  
  const startTime = Date.now();
  
  // Call the original execute method
  const result = originalExecute(sql, values);
  
  // Handle the promise to track completion
  if (result && typeof result.then === 'function') {
    return result
      .then((res: any) => {
        connectionStats.successfulQueries++;
        connectionStats.activeConnections = Math.max(0, connectionStats.activeConnections - 1);
        
        const executionTime = Date.now() - startTime;
        if (executionTime > 1000) {
          console.warn(`Slow query detected (${executionTime}ms):`, {
            query: typeof sql === 'string' ? sql.substring(0, 100) + '...' : 'Prepared statement',
            executionTime,
            timestamp: new Date().toISOString()
          });
        }
        
        return res;
      })
      .catch((error: any) => {
        connectionStats.failedQueries++;
        connectionStats.activeConnections = Math.max(0, connectionStats.activeConnections - 1);
        
        const executionTime = Date.now() - startTime;
        console.error(`Query failed (${executionTime}ms):`, {
          query: typeof sql === 'string' ? sql.substring(0, 100) + '...' : 'Prepared statement',
          error: error instanceof Error ? error.message : 'Unknown error',
          executionTime,
          timestamp: new Date().toISOString()
        });
        
        throw error;
      });
  }
  
  return result;
};

// Also wrap getConnection to track queries from individual connections
const originalGetConnection = rawPool.getConnection.bind(rawPool);
rawPool.getConnection = async function() {
  const connection = await originalGetConnection();
  
  // Wrap the connection's execute method
  const originalConnectionExecute = connection.execute.bind(connection);
  connection.execute = function(sql: any, values?: any) {
    connectionStats.activeConnections++;
    connectionStats.totalQueries++;
    
    const startTime = Date.now();
    
    // Call the original execute method
    const result = originalConnectionExecute(sql, values);
    
    // Handle the promise to track completion
    if (result && typeof result.then === 'function') {
      return result
        .then((res: any) => {
          connectionStats.successfulQueries++;
          connectionStats.activeConnections = Math.max(0, connectionStats.activeConnections - 1);
          
          const executionTime = Date.now() - startTime;
          if (executionTime > 1000) {
            console.warn(`Slow query detected (${executionTime}ms):`, {
              query: typeof sql === 'string' ? sql.substring(0, 100) + '...' : 'Prepared statement',
              executionTime,
              timestamp: new Date().toISOString()
            });
          }
          
          return res;
        })
        .catch((error: any) => {
          connectionStats.failedQueries++;
          connectionStats.activeConnections = Math.max(0, connectionStats.activeConnections - 1);
          
          const executionTime = Date.now() - startTime;
          console.error(`Query failed (${executionTime}ms):`, {
            query: typeof sql === 'string' ? sql.substring(0, 100) + '...' : 'Prepared statement',
            error: error instanceof Error ? error.message : 'Unknown error',
            executionTime,
            timestamp: new Date().toISOString()
          });
          
          throw error;
        });
    }
    
    return result;
  };
  
  return connection;
};

// Export the wrapped pool
export const pool = rawPool;

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
let connectionStats = {
  activeConnections: 0,
  totalQueries: 0,
  successfulQueries: 0,
  failedQueries: 0
};

export function getPoolStats() {
  return {
    totalConnections: databaseConfig.connectionLimit,
    activeConnections: connectionStats.activeConnections,
    idleConnections: Math.max(0, databaseConfig.connectionLimit - connectionStats.activeConnections),
    queuedRequests: 0, // mysql2 doesn't expose this easily
    totalQueries: connectionStats.totalQueries,
    successfulQueries: connectionStats.successfulQueries,
    failedQueries: connectionStats.failedQueries
  };
}

// Track connection usage
export async function executeWithTracking<T = any>(
  query: string, 
  params: any[] = []
): Promise<{ results: T; executionTime: number }> {
  const timestamp = new Date().toISOString();
  console.log(`🔍 [${timestamp}] EXECUTING SQL QUERY:`, {
    fullQuery: query,
    parameters: params,
    queryId: Math.random().toString(36).substr(2, 9)
  });
  
  const startTime = Date.now();
  connectionStats.activeConnections++;
  connectionStats.totalQueries++;
  console.log('📊 Updated connectionStats:', connectionStats);
  
  try {
    console.log(`🚀 [${timestamp}] Calling pool.execute() - Query will hit MySQL now`);
    const [results] = await pool.execute(query, params);
    const executionTime = Date.now() - startTime;
    console.log(`✅ [${timestamp}] MySQL query completed in ${executionTime}ms, rows affected: ${Array.isArray(results) ? results.length : 'N/A'}`);
    
    connectionStats.successfulQueries++;
    
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
    connectionStats.failedQueries++;
    
    console.error(`Query failed (${executionTime}ms):`, {
      query: query.substring(0, 100) + '...',
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTime,
      timestamp: new Date().toISOString()
    });
    throw error;
  } finally {
    connectionStats.activeConnections = Math.max(0, connectionStats.activeConnections - 1);
  }
}

// Enable MySQL query logging for debugging
export async function enableMySQLQueryLogging(): Promise<void> {
  try {
    const connection = await pool.getConnection();
    
    // Enable general query log
    await connection.execute('SET GLOBAL general_log = "ON"');
    await connection.execute('SET GLOBAL log_output = "TABLE"');
    
    // Test if logging is working by executing a simple query
    await connection.execute('SELECT "MYSQL_LOGGING_TEST" as test_query');
    
    console.log('✅ MySQL query logging enabled - queries will be logged to mysql.general_log table');
    connection.release();
  } catch (error) {
    console.error('❌ Failed to enable MySQL query logging:', error);
  }
}

// Test function to verify database connectivity and query execution
export async function testDatabaseQuery(): Promise<{ success: boolean; details: any }> {
  try {
    const connection = await pool.getConnection();
    
    console.log('🧪 Testing direct database query...');
    const [testResult] = await connection.execute('SELECT "DIRECT_TEST_QUERY" as test, NOW() as timestamp');
    console.log('🧪 Direct query result:', testResult);
    
    connection.release();
    
    console.log('🧪 Testing executeWithTracking...');
    const trackingResult = await executeWithTracking('SELECT "TRACKING_TEST_QUERY" as test, NOW() as timestamp');
    console.log('🧪 Tracking query result:', trackingResult);
    
    return {
      success: true,
      details: {
        directQuery: testResult,
        trackingQuery: trackingResult,
        connectionStats: connectionStats
      }
    };
  } catch (error) {
    console.error('❌ Database test failed:', error);
    return {
      success: false,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

// Check recent MySQL queries from the general log
export async function getRecentMySQLQueries(limit: number = 10): Promise<any[]> {
  try {
    const connection = await pool.getConnection();
    
    // First check if general_log table exists and has data
    console.log('🔍 Checking MySQL general_log table...');
    
    // Check if general logging is enabled
    const [logStatus] = await connection.execute('SHOW VARIABLES LIKE "general_log"');
    console.log('📊 General log status:', logStatus);
    
    // Check if we can access the general_log table
    const [tableCheck] = await connection.execute('SELECT COUNT(*) as count FROM mysql.general_log');
    console.log('📊 General log table count:', tableCheck);
    
    const [rows] = await connection.execute(
      'SELECT event_time, user_host, thread_id, server_id, command_type, argument FROM mysql.general_log WHERE command_type = "Query" ORDER BY event_time DESC LIMIT ?',
      [limit]
    );
    
    console.log('📊 Retrieved queries from general_log:', rows);
    connection.release();
    return rows as any[];
  } catch (error) {
    console.error('❌ Failed to get MySQL query log:', error);
    return [];
  }
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
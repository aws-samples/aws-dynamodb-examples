// Server Test Helper - Manage Test Server Lifecycle
import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';
  url: string;
  data?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface Response {
  status: number;
  data: any;
  headers: Record<string, string>;
}

export class ServerTestHelper {
  private static server: ChildProcess | null = null;
  private static serverUrl: string = '';
  private static readonly DEFAULT_PORT = 8101; // Different from dev port

  /**
   * Start test server on available port
   */
  static async startTestServer(): Promise<string> {
    const port = process.env.PORT || this.DEFAULT_PORT;
    this.serverUrl = `http://localhost:${port}`;

    try {
      // Check if port is already in use
      await this.checkPortAvailable(port as number);

      // Start server process with E2E environment
      this.server = spawn('node', ['-e', `
        require('dotenv').config({path: '.env.test.e2e'});
        require('./dist/index.js');
      `], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          PORT: port.toString(),
          NODE_ENV: 'e2e'
        },
        stdio: 'pipe'
      });

      // Handle server output
      this.server.stdout?.on('data', (data) => {
        const output = data.toString();
        if (process.env.DEBUG_E2E === 'true') {
          console.log('Server stdout:', output);
        }
        if (output.includes('Server is running')) {
          console.log('✅ Test server started successfully');
        }
      });

      this.server.stderr?.on('data', (data) => {
        const errorOutput = data.toString();
        if (process.env.DEBUG_E2E === 'true') {
          console.error('Server stderr:', errorOutput);
        }
        // Log all stderr output for debugging
        console.error('Server error:', errorOutput);
      });

      // Handle server process errors
      this.server.on('error', (error) => {
        console.error('Server process error:', error);
      });

      // Wait for server to be ready
      await this.waitForServer();

      return this.serverUrl;
    } catch (error) {
      console.error('Failed to start test server:', error);
      await this.stopTestServer(); // Cleanup on failure
      throw error;
    }
  }

  /**
   * Stop test server
   */
  static async stopTestServer(): Promise<void> {
    if (this.server) {
      try {
        this.server.kill('SIGTERM');
        
        // Wait for graceful shutdown
        await new Promise<void>((resolve) => {
          this.server!.on('exit', () => {
            resolve();
          });
          
          // Force kill after timeout
          setTimeout(() => {
            if (this.server && !this.server.killed) {
              this.server.kill('SIGKILL');
            }
            resolve();
          }, 5000);
        });

        this.server = null;
        this.serverUrl = '';
      } catch (error) {
        console.error('Error stopping test server:', error);
      }
    }
  }

  /**
   * Make HTTP request to test server
   */
  static async makeRequest(options: RequestOptions): Promise<Response> {
    const {
      method = 'GET',
      url,
      data,
      headers = {},
      timeout = 10000
    } = options;

    try {
      // Ensure we have the server URL (might be from global scope in E2E tests)
      const serverUrl = this.getServerUrl();
      if (!serverUrl) {
        throw new Error('Server URL not available. Make sure the test server is started.');
      }
      
      const fullUrl = url.startsWith('http') ? url : `${serverUrl}${url}`;
      
      const response = await axios({
        method,
        url: fullUrl,
        data,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        timeout,
        validateStatus: () => true // Don't throw on HTTP error status
      });

      return {
        status: response.status,
        data: response.data,
        headers: response.headers as Record<string, string>
      };
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        const serverUrl = this.getServerUrl();
        throw new Error(`Test server not available at ${serverUrl}`);
      }
      throw error;
    }
  }

  /**
   * Wait for server to be ready
   */
  private static async waitForServer(maxAttempts: number = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const serverUrl = this.getServerUrl();
        await axios.get(`${serverUrl}/api/health`, { timeout: 1000 });
        return; // Server is ready
      } catch (error) {
        if (i === maxAttempts - 1) {
          throw new Error(`Test server failed to start after ${maxAttempts} attempts`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Get server URL
   */
  static getServerUrl(): string {
    // In E2E tests, server URL might be stored in global scope
    if (!this.serverUrl && (global as any).__SERVER_URL__) {
      this.serverUrl = (global as any).__SERVER_URL__;
    }
    return this.serverUrl;
  }

  /**
   * Check if server is running
   */
  static isServerRunning(): boolean {
    return this.server !== null && !this.server.killed;
  }

  /**
   * Check if port is available
   */
  private static async checkPortAvailable(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const net = require('net');
      const server = net.createServer();
      
      server.listen(port, () => {
        server.once('close', () => {
          resolve();
        });
        server.close();
      });
      
      server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`Port ${port} is already in use`));
        } else {
          reject(err);
        }
      });
    });
  }

  /**
   * Get server health status
   */
  static async getServerHealth(): Promise<{ status: string; uptime?: number }> {
    try {
      const response = await this.makeRequest({
        method: 'GET',
        url: '/api/health',
        timeout: 5000
      });
      
      return {
        status: response.status === 200 ? 'healthy' : 'unhealthy',
        uptime: response.data?.data?.uptime
      };
    } catch (error) {
      return { status: 'unreachable' };
    }
  }

  /**
   * Wait for specific endpoint to be available
   */
  static async waitForEndpoint(endpoint: string, maxAttempts: number = 10): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await this.makeRequest({
          method: 'GET',
          url: endpoint,
          timeout: 2000
        });
        return; // Endpoint is available
      } catch (error) {
        if (i === maxAttempts - 1) {
          throw new Error(`Endpoint ${endpoint} not available after ${maxAttempts} attempts`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Make request with retry logic
   */
  static async makeRequestWithRetry(
    options: RequestOptions, 
    maxRetries: number = 3
  ): Promise<Response> {
    let lastError: any;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await this.makeRequest(options);
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on client errors (4xx)
        if (error.response?.status >= 400 && error.response?.status < 500) {
          throw error;
        }
        
        if (i < maxRetries) {
          const delay = Math.pow(2, i) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }
}
// API client for making HTTP requests during load testing

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { IApiClient } from '../types/interfaces';
import { Logger } from './helpers';

export class ApiClient implements IApiClient {
  private client: AxiosInstance;
  private baseUrl: string = 'http://localhost:8100';
  private authToken?: string;
  private requestTimeout: number = 30000; // 30 seconds default

  constructor(baseUrl?: string) {
    if (baseUrl) {
      this.baseUrl = baseUrl;
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.requestTimeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LoadTester/1.0'
      }
    });

    this.setupInterceptors();
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url;
    this.client.defaults.baseURL = url;
  }

  setAuthToken(token: string): void {
    this.authToken = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  setRequestTimeout(timeout: number): void {
    this.requestTimeout = timeout;
    this.client.defaults.timeout = timeout;
  }

  async get<T = any>(endpoint: string, params?: any): Promise<{ data: T; duration: number; statusCode: number }> {
    const startTime = Date.now();
    
    try {
      const response: AxiosResponse<T> = await this.client.get(endpoint, { params });
      const duration = Date.now() - startTime;
      
      return {
        data: response.data,
        duration,
        statusCode: response.status
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      throw this.handleError(error as AxiosError, duration);
    }
  }

  async post<T = any>(endpoint: string, data?: any): Promise<{ data: T; duration: number; statusCode: number }> {
    const startTime = Date.now();
    
    try {
      const response: AxiosResponse<T> = await this.client.post(endpoint, data);
      const duration = Date.now() - startTime;
      
      return {
        data: response.data,
        duration,
        statusCode: response.status
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      throw this.handleError(error as AxiosError, duration);
    }
  }

  async put<T = any>(endpoint: string, data?: any): Promise<{ data: T; duration: number; statusCode: number }> {
    const startTime = Date.now();
    
    try {
      const response: AxiosResponse<T> = await this.client.put(endpoint, data);
      const duration = Date.now() - startTime;
      
      return {
        data: response.data,
        duration,
        statusCode: response.status
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      throw this.handleError(error as AxiosError, duration);
    }
  }

  async delete<T = any>(endpoint: string): Promise<{ data: T; duration: number; statusCode: number }> {
    const startTime = Date.now();
    
    try {
      const response: AxiosResponse<T> = await this.client.delete(endpoint);
      const duration = Date.now() - startTime;
      
      return {
        data: response.data,
        duration,
        statusCode: response.status
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      throw this.handleError(error as AxiosError, duration);
    }
  }

  // Convenience methods for common API patterns
  async authenticate(username: string, password: string): Promise<{ token: string; user: any; duration: number }> {
    const result = await this.post<{ success: boolean; data: { token: string; user: any } }>('/api/auth/login', {
      username,
      password
    });

    if (result.data.success && result.data.data.token) {
      this.setAuthToken(result.data.data.token);
      return {
        token: result.data.data.token,
        user: result.data.data.user,
        duration: result.duration
      };
    }

    throw new Error('Authentication failed');
  }

  async register(userData: any): Promise<{ user: any; duration: number }> {
    const result = await this.post<{ success: boolean; data: { user: any } }>('/api/auth/register', userData);

    if (result.data.success) {
      return {
        user: result.data.data.user,
        duration: result.duration
      };
    }

    throw new Error('Registration failed');
  }

  // Health check method
  async healthCheck(): Promise<{ status: string; duration: number }> {
    const result = await this.get<{ status: string }>('/api/health');
    return {
      status: result.data.status || 'unknown',
      duration: result.duration
    };
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config: any) => {
        Logger.debug(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
        return config;
      },
      (error: any) => {
        Logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: any) => {
        Logger.debug(`Response ${response.status} from ${response.config.url}`);
        return response;
      },
      (error: any) => {
        Logger.debug(`Response error ${error.response?.status} from ${error.config?.url}`);
        return Promise.reject(error);
      }
    );
  }

  private handleError(error: AxiosError, duration: number): Error {
    const enhancedError = new Error();
    
    if (error.response) {
      // Server responded with error status
      enhancedError.message = `HTTP ${error.response.status}: ${error.response.statusText}`;
      (enhancedError as any).statusCode = error.response.status;
      (enhancedError as any).responseData = error.response.data;
    } else if (error.request) {
      // Request was made but no response received
      enhancedError.message = 'No response received from server';
      (enhancedError as any).statusCode = 0;
    } else {
      // Something else happened
      enhancedError.message = error.message || 'Unknown error occurred';
      (enhancedError as any).statusCode = 0;
    }

    (enhancedError as any).duration = duration;
    (enhancedError as any).originalError = error;

    return enhancedError;
  }

  // Utility method to create multiple clients for concurrent testing
  static createPool(count: number, baseUrl?: string): ApiClient[] {
    const clients: ApiClient[] = [];
    for (let i = 0; i < count; i++) {
      clients.push(new ApiClient(baseUrl));
    }
    return clients;
  }

  // Method to test connectivity
  async testConnection(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      Logger.error('Connection test failed:', error);
      return false;
    }
  }

  // Method to clear authentication
  clearAuth(): void {
    this.authToken = undefined;
    delete this.client.defaults.headers.common['Authorization'];
  }

  // Get current configuration
  getConfig(): { baseUrl: string; timeout: number; hasAuth: boolean } {
    return {
      baseUrl: this.baseUrl,
      timeout: this.requestTimeout,
      hasAuth: !!this.authToken
    };
  }
}
import api from './api';
import { secureStorage } from './secureStorage';
import { logger } from './logger';

interface RefreshResponse {
  token: string;
  refreshToken?: string;
  expiresIn?: number;
}

class TokenRefreshService {
  private refreshPromise: Promise<string> | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private readonly REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes before expiry

  constructor() {
    this.setupAutoRefresh();
  }

  /**
   * Set up automatic token refresh based on expiration time
   */
  private setupAutoRefresh(): void {
    const tokenInfo = secureStorage.getTokenExpirationInfo();
    
    if (!tokenInfo.expiresAt || tokenInfo.isExpired) {
      return;
    }

    const timeUntilRefresh = (tokenInfo.timeUntilExpiry || 0) - this.REFRESH_THRESHOLD_MS;
    
    if (timeUntilRefresh > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshTokenIfNeeded();
      }, timeUntilRefresh);
      
      logger.debug('Auto-refresh scheduled', { 
        refreshIn: Math.round(timeUntilRefresh / 1000 / 60),
        unit: 'minutes'
      });
    }
  }

  /**
   * Clear the auto-refresh timer
   */
  private clearAutoRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Check if token needs refresh and refresh if necessary
   */
  async refreshTokenIfNeeded(): Promise<string | null> {
    const tokenInfo = secureStorage.getTokenExpirationInfo();
    
    // If token is already expired, don't attempt refresh
    if (tokenInfo.isExpired) {
      logger.debug('Token already expired, cannot refresh');
      return null;
    }

    // If token doesn't need refresh yet, return current token
    const timeUntilExpiry = tokenInfo.timeUntilExpiry || 0;
    if (timeUntilExpiry > this.REFRESH_THRESHOLD_MS) {
      return secureStorage.getToken();
    }

    // Refresh the token
    return this.refreshToken();
  }

  /**
   * Refresh the authentication token
   */
  async refreshToken(): Promise<string | null> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      logger.debug('Token refresh already in progress, waiting...');
      return this.refreshPromise;
    }

    const refreshToken = secureStorage.getRefreshToken();
    if (!refreshToken) {
      logger.warn('No refresh token available, cannot refresh');
      return null;
    }

    this.refreshPromise = this.performTokenRefresh(refreshToken);
    
    try {
      const newToken = await this.refreshPromise;
      this.refreshPromise = null;
      return newToken;
    } catch (error) {
      this.refreshPromise = null;
      throw error;
    }
  }

  /**
   * Perform the actual token refresh API call
   */
  private async performTokenRefresh(refreshToken: string): Promise<string> {
    try {
      logger.debug('Attempting token refresh');
      
      // Note: This endpoint may not exist in the current backend
      // This is a placeholder for when the backend implements token refresh
      const response = await api.post('/auth/refresh', {
        refreshToken
      });

      const { token: newToken, refreshToken: newRefreshToken, expiresIn }: RefreshResponse = response.data.data;
      
      // Store the new token securely
      secureStorage.setToken(newToken, expiresIn, newRefreshToken || refreshToken);
      
      // Update the API default headers
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      // Setup next auto-refresh
      this.setupAutoRefresh();
      
      logger.info('Token refreshed successfully');
      return newToken;
      
    } catch (error: any) {
      logger.error('Token refresh failed', error);
      
      // If refresh fails, clear all tokens and force re-authentication
      if (error.response?.status === 401 || error.response?.status === 403) {
        logger.warn('Refresh token invalid, clearing all tokens');
        this.clearTokens();
      }
      
      throw new Error('Failed to refresh authentication token');
    }
  }

  /**
   * Initialize token refresh service with current token
   */
  initializeWithToken(token: string, expiresIn?: number, refreshToken?: string): void {
    // Clear any existing refresh timer
    this.clearAutoRefresh();
    
    // Store token securely
    secureStorage.setToken(token, expiresIn, refreshToken);
    
    // Setup auto-refresh for the new token
    this.setupAutoRefresh();
    
    logger.debug('Token refresh service initialized', { 
      hasRefreshToken: !!refreshToken,
      expiresIn: expiresIn || 'default'
    });
  }

  /**
   * Clear all tokens and stop auto-refresh
   */
  clearTokens(): void {
    this.clearAutoRefresh();
    secureStorage.clearAll();
    delete api.defaults.headers.common['Authorization'];
    logger.debug('All tokens cleared');
  }

  /**
   * Get current token, refreshing if necessary
   */
  async getValidToken(): Promise<string | null> {
    const currentToken = secureStorage.getToken();
    
    if (!currentToken) {
      return null;
    }

    // Check if token needs refresh
    const tokenInfo = secureStorage.getTokenExpirationInfo();
    const timeUntilExpiry = tokenInfo.timeUntilExpiry || 0;
    
    if (timeUntilExpiry <= this.REFRESH_THRESHOLD_MS) {
      logger.debug('Token needs refresh, attempting refresh');
      return this.refreshTokenIfNeeded();
    }

    return currentToken;
  }

  /**
   * Check if we have a valid token (not expired)
   */
  hasValidToken(): boolean {
    return secureStorage.isTokenValid();
  }

  /**
   * Get token expiration information
   */
  getTokenInfo() {
    return secureStorage.getTokenExpirationInfo();
  }
}

// Create and export singleton instance
export const tokenRefreshService = new TokenRefreshService();
export default tokenRefreshService;

// Make available globally for testing in development
if (process.env.NODE_ENV === 'development') {
  (window as any).tokenRefreshService = tokenRefreshService;
}
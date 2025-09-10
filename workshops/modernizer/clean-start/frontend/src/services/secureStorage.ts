import CryptoJS from 'crypto-js';
import { logger } from './logger';

interface TokenData {
  token: string;
  expiresAt: number;
  refreshToken?: string | undefined;
}

interface SecureStorageService {
  setToken(token: string, expiresIn?: number, refreshToken?: string): void;
  getToken(): string | null;
  removeToken(): void;
  isTokenValid(): boolean;
  getRefreshToken(): string | null;
  setRefreshToken(refreshToken: string): void;
  clearAll(): void;
}

class SecureTokenStorage implements SecureStorageService {
  private readonly TOKEN_KEY = 'secure_auth_token';
  private readonly REFRESH_TOKEN_KEY = 'secure_refresh_token';
  private readonly ENCRYPTION_KEY: string;

  constructor() {
    // Generate a consistent encryption key based on browser fingerprint
    // This provides some security while being recoverable across sessions
    this.ENCRYPTION_KEY = this.generateEncryptionKey();
  }

  private generateEncryptionKey(): string {
    // Create a browser-specific key using available browser characteristics
    const browserInfo = [
      navigator.userAgent,
      navigator.language,
      window.screen.width.toString(),
      window.screen.height.toString(),
      new Date().getTimezoneOffset().toString()
    ].join('|');
    
    // Hash the browser info to create a consistent key
    return CryptoJS.SHA256(browserInfo).toString();
  }

  private encrypt(data: string): string {
    try {
      return CryptoJS.AES.encrypt(data, this.ENCRYPTION_KEY).toString();
    } catch (error) {
      logger.error('Encryption failed', error as Error);
      throw new Error('Failed to encrypt data');
    }
  }

  private decrypt(encryptedData: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.ENCRYPTION_KEY);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decrypted) {
        throw new Error('Decryption resulted in empty string');
      }
      
      return decrypted;
    } catch (error) {
      logger.error('Decryption failed', error as Error);
      throw new Error('Failed to decrypt data');
    }
  }

  private calculateExpirationTime(expiresIn?: number): number {
    // Default to 24 hours if no expiration provided
    const defaultExpirationHours = 24;
    const expirationMs = (expiresIn || defaultExpirationHours * 60 * 60) * 1000;
    return Date.now() + expirationMs;
  }

  setToken(token: string, expiresIn?: number, refreshToken?: string): void {
    try {
      const tokenData: TokenData = {
        token,
        expiresAt: this.calculateExpirationTime(expiresIn),
        refreshToken
      };

      const encryptedData = this.encrypt(JSON.stringify(tokenData));
      sessionStorage.setItem(this.TOKEN_KEY, encryptedData);
      
      logger.debug('Token stored securely', { 
        expiresAt: new Date(tokenData.expiresAt).toISOString(),
        hasRefreshToken: !!refreshToken 
      });
    } catch (error) {
      logger.error('Failed to store token securely', error as Error);
      throw new Error('Failed to store authentication token');
    }
  }

  getToken(): string | null {
    try {
      const encryptedData = sessionStorage.getItem(this.TOKEN_KEY);
      if (!encryptedData) {
        return null;
      }

      const decryptedData = this.decrypt(encryptedData);
      const tokenData: TokenData = JSON.parse(decryptedData);

      // Check if token is expired
      if (Date.now() >= tokenData.expiresAt) {
        logger.debug('Token expired, removing from storage');
        this.removeToken();
        return null;
      }

      return tokenData.token;
    } catch (error) {
      logger.error('Failed to retrieve token', error as Error);
      // Clear corrupted data
      this.removeToken();
      return null;
    }
  }

  isTokenValid(): boolean {
    try {
      const encryptedData = sessionStorage.getItem(this.TOKEN_KEY);
      if (!encryptedData) {
        return false;
      }

      const decryptedData = this.decrypt(encryptedData);
      const tokenData: TokenData = JSON.parse(decryptedData);

      // Check if token is not expired
      return Date.now() < tokenData.expiresAt;
    } catch (error) {
      logger.error('Failed to validate token', error as Error);
      // Clear corrupted data
      this.removeToken();
      return false;
    }
  }

  getRefreshToken(): string | null {
    try {
      const encryptedData = sessionStorage.getItem(this.TOKEN_KEY);
      if (!encryptedData) {
        return null;
      }

      const decryptedData = this.decrypt(encryptedData);
      const tokenData: TokenData = JSON.parse(decryptedData);

      return tokenData.refreshToken || null;
    } catch (error) {
      logger.error('Failed to retrieve refresh token', error as Error);
      return null;
    }
  }

  setRefreshToken(refreshToken: string): void {
    try {
      const encryptedData = sessionStorage.getItem(this.TOKEN_KEY);
      if (!encryptedData) {
        logger.warn('No existing token data found when setting refresh token');
        return;
      }

      const decryptedData = this.decrypt(encryptedData);
      const tokenData: TokenData = JSON.parse(decryptedData);
      
      tokenData.refreshToken = refreshToken;
      
      const updatedEncryptedData = this.encrypt(JSON.stringify(tokenData));
      sessionStorage.setItem(this.TOKEN_KEY, updatedEncryptedData);
      
      logger.debug('Refresh token updated securely');
    } catch (error) {
      logger.error('Failed to update refresh token', error as Error);
      throw new Error('Failed to update refresh token');
    }
  }

  removeToken(): void {
    try {
      sessionStorage.removeItem(this.TOKEN_KEY);
      sessionStorage.removeItem(this.REFRESH_TOKEN_KEY);
      logger.debug('Tokens removed from secure storage');
    } catch (error) {
      logger.error('Failed to remove tokens', error as Error);
    }
  }

  clearAll(): void {
    try {
      sessionStorage.clear();
      logger.debug('All secure storage cleared');
    } catch (error) {
      logger.error('Failed to clear secure storage', error as Error);
    }
  }

  // Utility method to get token expiration info
  getTokenExpirationInfo(): { expiresAt: Date | null; isExpired: boolean; timeUntilExpiry: number | null } {
    try {
      const encryptedData = sessionStorage.getItem(this.TOKEN_KEY);
      if (!encryptedData) {
        return { expiresAt: null, isExpired: true, timeUntilExpiry: null };
      }

      const decryptedData = this.decrypt(encryptedData);
      const tokenData: TokenData = JSON.parse(decryptedData);
      
      const expiresAt = new Date(tokenData.expiresAt);
      const now = Date.now();
      const isExpired = now >= tokenData.expiresAt;
      const timeUntilExpiry = isExpired ? 0 : tokenData.expiresAt - now;

      return {
        expiresAt,
        isExpired,
        timeUntilExpiry
      };
    } catch (error) {
      logger.error('Failed to get token expiration info', error as Error);
      return { expiresAt: null, isExpired: true, timeUntilExpiry: null };
    }
  }
}

// Create and export singleton instance
export const secureStorage = new SecureTokenStorage();
export default secureStorage;

// Make available globally for testing in development
if (process.env.NODE_ENV === 'development') {
  (window as any).secureStorage = secureStorage;
}
/**
 * Integration test for secure storage functionality
 * This test verifies that the secure storage works correctly in a real browser environment
 */

import { secureStorage } from '../secureStorage';

describe('SecureStorage Integration', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
  });

  afterEach(() => {
    // Clean up after each test
    sessionStorage.clear();
  });

  it('should store and retrieve token securely', () => {
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
    const expiresIn = 3600; // 1 hour
    const refreshToken = 'refresh_token_123';

    // Store token
    secureStorage.setToken(testToken, expiresIn, refreshToken);

    // Verify token is stored and can be retrieved
    const retrievedToken = secureStorage.getToken();
    expect(retrievedToken).toBe(testToken);

    // Verify token is valid
    expect(secureStorage.isTokenValid()).toBe(true);

    // Verify refresh token can be retrieved
    const retrievedRefreshToken = secureStorage.getRefreshToken();
    expect(retrievedRefreshToken).toBe(refreshToken);
  });

  it('should handle token expiration correctly', () => {
    const testToken = 'expired_token';
    const expiresIn = -1; // Already expired

    // Store expired token
    secureStorage.setToken(testToken, expiresIn);

    // Verify token is considered invalid
    expect(secureStorage.isTokenValid()).toBe(false);

    // Verify getToken returns null for expired token
    const retrievedToken = secureStorage.getToken();
    expect(retrievedToken).toBeNull();
  });

  it('should clear all tokens correctly', () => {
    const testToken = 'test_token';
    const refreshToken = 'refresh_token';

    // Store tokens
    secureStorage.setToken(testToken, 3600, refreshToken);

    // Verify tokens are stored
    expect(secureStorage.getToken()).toBe(testToken);
    expect(secureStorage.getRefreshToken()).toBe(refreshToken);

    // Clear all tokens
    secureStorage.clearAll();

    // Verify tokens are cleared
    expect(secureStorage.getToken()).toBeNull();
    expect(secureStorage.getRefreshToken()).toBeNull();
    expect(secureStorage.isTokenValid()).toBe(false);
  });

  it('should provide accurate token expiration info', () => {
    const testToken = 'test_token';
    const expiresIn = 3600; // 1 hour

    // Store token
    secureStorage.setToken(testToken, expiresIn);

    // Get expiration info
    const tokenInfo = secureStorage.getTokenExpirationInfo();

    expect(tokenInfo.expiresAt).toBeInstanceOf(Date);
    expect(tokenInfo.isExpired).toBe(false);
    expect(tokenInfo.timeUntilExpiry).toBeGreaterThan(0);
    expect(tokenInfo.timeUntilExpiry).toBeLessThanOrEqual(expiresIn * 1000);
  });

  it('should handle corrupted data gracefully', () => {
    // Manually insert corrupted data
    sessionStorage.setItem('secure_auth_token', 'corrupted_data');

    // Verify it handles corruption gracefully
    expect(secureStorage.getToken()).toBeNull();
    expect(secureStorage.isTokenValid()).toBe(false);
    expect(secureStorage.getRefreshToken()).toBeNull();

    // Verify corrupted data is cleaned up
    expect(sessionStorage.getItem('secure_auth_token')).toBeNull();
  });

  it('should encrypt data in sessionStorage', () => {
    const testToken = 'test_token_for_encryption';
    
    // Store token
    secureStorage.setToken(testToken, 3600);

    // Verify raw data in sessionStorage is encrypted (not plain text)
    const rawData = sessionStorage.getItem('secure_auth_token');
    expect(rawData).not.toBeNull();
    expect(rawData).not.toContain(testToken);
    expect(rawData).not.toContain('test_token_for_encryption');
  });
});
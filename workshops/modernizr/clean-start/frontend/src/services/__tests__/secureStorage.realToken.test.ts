/**
 * Test secure storage with real JWT tokens from backend
 */

import { secureStorage } from '../secureStorage';

describe('SecureStorage with Real JWT Tokens', () => {
  // Real JWT token from backend (this would be from actual login response)
  const realJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc1NDA2OTI1NywiZXhwIjoxNzU0MTU1NjU3fQ.6g74vBc678GoASBPjzoe6gxANrOtcemZTVhqCkBXt_0';
  const realRefreshToken = 'refresh_token_from_backend';

  beforeEach(() => {
    // Clear storage before each test
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up after each test
    sessionStorage.clear();
    localStorage.clear();
  });

  it('should handle real JWT token storage and retrieval', () => {
    const expiresIn = 86400; // 24 hours (typical JWT expiration)

    // Store the real JWT token
    secureStorage.setToken(realJwtToken, expiresIn, realRefreshToken);

    // Verify token is stored and retrievable
    const retrievedToken = secureStorage.getToken();
    expect(retrievedToken).toBe(realJwtToken);

    // Verify token is considered valid
    expect(secureStorage.isTokenValid()).toBe(true);

    // Verify refresh token is stored
    const retrievedRefreshToken = secureStorage.getRefreshToken();
    expect(retrievedRefreshToken).toBe(realRefreshToken);

    // Verify the JWT token is properly encrypted in storage
    const rawStoredData = sessionStorage.getItem('secure_auth_token');
    expect(rawStoredData).not.toBeNull();
    expect(rawStoredData).not.toContain(realJwtToken);
    expect(rawStoredData).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(rawStoredData).not.toContain(realRefreshToken);
  });

  it('should handle JWT token expiration correctly', () => {
    // Store token with very short expiration
    secureStorage.setToken(realJwtToken, 1); // 1 second

    // Initially should be valid
    expect(secureStorage.isTokenValid()).toBe(true);
    expect(secureStorage.getToken()).toBe(realJwtToken);

    // Wait for expiration and test again
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(secureStorage.isTokenValid()).toBe(false);
        expect(secureStorage.getToken()).toBeNull();
        resolve();
      }, 1100); // Wait 1.1 seconds
    });
  });

  it('should provide accurate expiration info for real tokens', () => {
    const expiresIn = 3600; // 1 hour
    
    secureStorage.setToken(realJwtToken, expiresIn, realRefreshToken);

    const tokenInfo = secureStorage.getTokenExpirationInfo();
    
    expect(tokenInfo.expiresAt).toBeInstanceOf(Date);
    expect(tokenInfo.isExpired).toBe(false);
    expect(tokenInfo.timeUntilExpiry).toBeGreaterThan(3590000); // Should be close to 1 hour in ms
    expect(tokenInfo.timeUntilExpiry).toBeLessThanOrEqual(3600000);
  });

  it('should provide token expiration details correctly', () => {
    const expiresIn = 3600; // 1 hour
    
    // Store token
    secureStorage.setToken(realJwtToken, expiresIn, realRefreshToken);

    // Verify token info is accessible
    const tokenInfo = secureStorage.getTokenExpirationInfo();
    expect(tokenInfo.isExpired).toBe(false);
    expect(tokenInfo.timeUntilExpiry).toBeGreaterThan(0);

    // Clear tokens
    secureStorage.clearAll();
    expect(secureStorage.isTokenValid()).toBe(false);
  });

  it('should handle JWT token format validation', () => {
    // Test with properly formatted JWT
    expect(() => {
      secureStorage.setToken(realJwtToken, 3600);
    }).not.toThrow();

    // Test with malformed token (should still store but might not be valid JWT)
    const malformedToken = 'not.a.valid.jwt.token';
    expect(() => {
      secureStorage.setToken(malformedToken, 3600);
    }).not.toThrow();

    // Verify malformed token is still stored (storage doesn't validate JWT format)
    expect(secureStorage.getToken()).toBe(malformedToken);
  });

  it('should maintain security with real token data', () => {
    const expiresIn = 3600;
    
    // Store real token
    secureStorage.setToken(realJwtToken, expiresIn, realRefreshToken);

    // Verify encryption is working
    const rawData = sessionStorage.getItem('secure_auth_token');
    expect(rawData).not.toBeNull();
    
    // Ensure no part of the JWT is visible in raw storage
    const jwtParts = realJwtToken.split('.');
    jwtParts.forEach(part => {
      expect(rawData).not.toContain(part);
    });

    // Ensure refresh token is not visible
    expect(rawData).not.toContain(realRefreshToken);

    // Verify data can still be decrypted correctly
    expect(secureStorage.getToken()).toBe(realJwtToken);
    expect(secureStorage.getRefreshToken()).toBe(realRefreshToken);
  });

  it('should handle token refresh scenario with real tokens', async () => {
    // Store initial token that would need refresh soon
    const shortExpiresIn = 300; // 5 minutes
    secureStorage.setToken(realJwtToken, shortExpiresIn, realRefreshToken);

    // Verify initial state
    expect(secureStorage.getToken()).toBe(realJwtToken);
    expect(secureStorage.getRefreshToken()).toBe(realRefreshToken);

    // Simulate token refresh by storing new token
    const newJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc1NDA2OTI1NywiZXhwIjoxNzU0MTU1NjU3fQ.new_signature_here';
    const newRefreshToken = 'new_refresh_token';
    
    secureStorage.setToken(newJwtToken, 3600, newRefreshToken);

    // Verify new tokens are stored
    expect(secureStorage.getToken()).toBe(newJwtToken);
    expect(secureStorage.getRefreshToken()).toBe(newRefreshToken);

    // Verify old token is no longer accessible
    expect(secureStorage.getToken()).not.toBe(realJwtToken);
  });

  it('should handle concurrent access to real token data', async () => {
    const expiresIn = 3600;
    secureStorage.setToken(realJwtToken, expiresIn, realRefreshToken);

    // Simulate concurrent access
    const concurrentOperations = Array.from({ length: 10 }, () => {
      return new Promise<string | null>((resolve) => {
        setTimeout(() => {
          resolve(secureStorage.getToken());
        }, Math.random() * 100); // Random delay up to 100ms
      });
    });

    const results = await Promise.all(concurrentOperations);

    // All operations should return the same token
    results.forEach(result => {
      expect(result).toBe(realJwtToken);
    });
  });
});
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';
import { logger } from '../services/logger';
import { secureStorage } from '../services/secureStorage';
import { tokenRefreshService } from '../services/tokenRefreshService';

interface User {
  id: number;
  username: string;
  email: string;
  is_seller: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  loading: boolean;
  refreshToken: () => Promise<boolean>;
  isTokenValid: () => boolean;
  getTokenInfo: () => { expiresAt: Date | null; isExpired: boolean; timeUntilExpiry: number | null };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored token on app initialization
    const storedToken = secureStorage.getToken();
    const storedUser = localStorage.getItem('user'); // Keep user data in localStorage for now
    
    if (storedToken && storedUser && storedUser !== 'undefined') {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // Set default authorization header
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        
        logger.debug('Authentication restored from secure storage', { 
          userId: JSON.parse(storedUser).id,
          tokenValid: secureStorage.isTokenValid()
        });
      } catch (error) {
        logger.error('Error parsing stored user data', error as Error);
        // Clear invalid data
        secureStorage.removeToken();
        localStorage.removeItem('user');
      }
    } else if (storedToken && !secureStorage.isTokenValid()) {
      // Token exists but is expired, clear it
      logger.debug('Stored token is expired, clearing authentication');
      secureStorage.removeToken();
      localStorage.removeItem('user');
    }
    
    setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    try {
      logger.info('Login attempt for user', { username });
      const response = await api.post('/auth/login', {
        username,
        password
      });

      logger.debug('Login response received', { success: response.data.success });
      const { token: newToken, user: userData, expiresIn, refreshToken } = response.data.data;
      
      // Use backend user data directly (no transformation needed)
      logger.debug('User authentication successful', { userId: userData.id, username: userData.username });
      
      setToken(newToken);
      setUser(userData);
      
      // Store token securely and user data in localStorage
      secureStorage.setToken(newToken, expiresIn, refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Initialize token refresh service
      tokenRefreshService.initializeWithToken(newToken, expiresIn, refreshToken);
      
      // Set default authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      logger.info('Login successful, user state updated with secure storage');
    } catch (error) {
      logger.authenticationFailure(username, 'Login failed');
      logger.error('Login error', error as Error);
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string): Promise<void> => {
    try {
      const response = await api.post('/auth/register', {
        username,
        email,
        password
      });

      const { token: newToken, user: userData, expiresIn, refreshToken } = response.data.data;
      
      setToken(newToken);
      setUser(userData);
      
      // Store token securely and user data in localStorage
      secureStorage.setToken(newToken, expiresIn, refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Initialize token refresh service
      tokenRefreshService.initializeWithToken(newToken, expiresIn, refreshToken);
      
      // Set default authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      logger.info('Registration successful, user state updated with secure storage');
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    
    // Clear secure storage and user data
    tokenRefreshService.clearTokens();
    localStorage.removeItem('user');
    
    // Remove authorization header
    delete api.defaults.headers.common['Authorization'];
    
    logger.info('User logged out, all tokens cleared');
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const newToken = await tokenRefreshService.refreshToken();
      if (newToken) {
        setToken(newToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        logger.info('Token refreshed successfully in AuthContext');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Token refresh failed in AuthContext', error as Error);
      // If refresh fails, logout the user
      logout();
      return false;
    }
  };

  const isTokenValid = (): boolean => {
    return secureStorage.isTokenValid();
  };

  const getTokenInfo = () => {
    return secureStorage.getTokenExpirationInfo();
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    setUser,
    isAuthenticated: !!user,
    loading,
    refreshToken,
    isTokenValid,
    getTokenInfo
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
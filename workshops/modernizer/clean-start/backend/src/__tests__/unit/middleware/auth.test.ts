import { Request, Response, NextFunction } from 'express';

// Mock the AuthService
const mockVerifyToken = jest.fn();
jest.mock('../../../services/AuthService', () => {
  return {
    AuthService: jest.fn().mockImplementation(() => ({
      verifyToken: mockVerifyToken
    }))
  };
});

import { authenticate, optionalAuthenticate } from '../../../middleware/auth';

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyToken.mockClear();

    mockRequest = {
      headers: {}
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
  });

  describe('authenticate middleware', () => {
    it('should authenticate user with valid Bearer token', () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer valid_token'
      };
      mockVerifyToken.mockReturnValue({ userId: 1 });

      // Act
      authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockVerifyToken).toHaveBeenCalledWith('valid_token');
      expect(mockRequest.user).toEqual({ userId: 1 });
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should authenticate user with token without Bearer prefix', () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'valid_token'
      };
      mockVerifyToken.mockReturnValue({ userId: 1 });

      // Act
      authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockVerifyToken).toHaveBeenCalledWith('valid_token');
      expect(mockRequest.user).toEqual({ userId: 1 });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 when authorization header is missing', () => {
      // Arrange
      mockRequest.headers = {};

      // Act
      authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'AuthenticationError',
          message: 'Authorization header is required'
        },
        timestamp: expect.any(String)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token is empty after Bearer', () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer '
      };

      // Act
      authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'AuthenticationError',
          message: 'Token is required'
        },
        timestamp: expect.any(String)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer invalid_token'
      };
      mockVerifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act
      authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'AuthenticationError',
          message: 'Invalid token'
        },
        timestamp: expect.any(String)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle non-Error exceptions', () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer invalid_token'
      };
      mockVerifyToken.mockImplementation(() => {
        throw 'String error';
      });

      // Act
      authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'AuthenticationError',
          message: 'Authentication failed'
        },
        timestamp: expect.any(String)
      });
    });
  });

  describe('optionalAuthenticate middleware', () => {
    it('should authenticate user with valid token', () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer valid_token'
      };
      mockVerifyToken.mockReturnValue({ userId: 1 });

      // Act
      optionalAuthenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockVerifyToken).toHaveBeenCalledWith('valid_token');
      expect(mockRequest.user).toEqual({ userId: 1 });
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication when no header provided', () => {
      // Arrange
      mockRequest.headers = {};

      // Act
      optionalAuthenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockVerifyToken).not.toHaveBeenCalled();
      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication when empty token', () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer '
      };

      // Act
      optionalAuthenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockVerifyToken).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without authentication when token is invalid', () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer invalid_token'
      };
      mockVerifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act
      optionalAuthenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockVerifyToken).toHaveBeenCalledWith('invalid_token');
      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle exceptions gracefully', () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer valid_token'
      };
      mockVerifyToken.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      // Act
      optionalAuthenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
});
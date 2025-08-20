import { Request, Response, NextFunction } from 'express';
import { SellerMiddleware } from '../../../middleware/seller';
import { AuthService } from '../../../services/AuthService';

// Mock AuthService
jest.mock('../../../services/AuthService');

const mockAuthService = AuthService as jest.MockedClass<typeof AuthService>;

describe('SellerMiddleware', () => {
  let sellerMiddleware: SellerMiddleware;
  let mockAuthServiceInstance: jest.Mocked<AuthService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockAuthServiceInstance = {
      getUserProfile: jest.fn(),
    } as any;

    mockAuthService.mockImplementation(() => mockAuthServiceInstance);
    sellerMiddleware = new SellerMiddleware();

    mockRequest = {
      user: { userId: 1 },
      params: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('requireSeller', () => {
    it('should allow access for valid seller', async () => {
      const mockSellerUser = {
        id: 1,
        username: 'selleruser',
        email: 'seller@example.com',
        first_name: 'Seller',
        last_name: 'User',
        is_seller: true,
        super_admin: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockAuthServiceInstance.getUserProfile.mockResolvedValueOnce(mockSellerUser);

      await sellerMiddleware.requireSeller(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthServiceInstance.getUserProfile).toHaveBeenCalledWith(1);
      expect(mockRequest.seller).toEqual({
        id: 1,
        username: 'selleruser',
        email: 'seller@example.com',
        first_name: 'Seller',
        last_name: 'User',
      });
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access for non-seller user', async () => {
      const mockRegularUser = {
        id: 1,
        username: 'regularuser',
        email: 'regular@example.com',
        first_name: 'Regular',
        last_name: 'User',
        is_seller: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockAuthServiceInstance.getUserProfile.mockResolvedValueOnce(mockRegularUser);

      await sellerMiddleware.requireSeller(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'AuthorizationError',
          message: 'Seller account required to access this resource',
        },
        timestamp: expect.any(String),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await sellerMiddleware.requireSeller(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'AuthenticationError',
          message: 'Authentication required',
        },
        timestamp: expect.any(String),
      });
      expect(mockAuthServiceInstance.getUserProfile).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle user not found error', async () => {
      mockAuthServiceInstance.getUserProfile.mockRejectedValueOnce(
        new Error('User not found')
      );

      await sellerMiddleware.requireSeller(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'Error',
          message: 'User not found',
        },
        timestamp: expect.any(String),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockAuthServiceInstance.getUserProfile.mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      await sellerMiddleware.requireSeller(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'Error',
          message: 'Database connection failed',
        },
        timestamp: expect.any(String),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle seller with minimal profile information', async () => {
      const mockSellerUser = {
        id: 1,
        username: 'selleruser',
        email: 'seller@example.com',
        first_name: undefined,
        last_name: undefined,
        is_seller: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockAuthServiceInstance.getUserProfile.mockResolvedValueOnce(mockSellerUser);

      await sellerMiddleware.requireSeller(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.seller).toEqual({
        id: 1,
        username: 'selleruser',
        email: 'seller@example.com',
        first_name: undefined,
        last_name: undefined,
      });
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireResourceOwnership', () => {
    it('should set up resource ownership validation with default parameter', async () => {
      mockRequest.params = { id: '123' };

      const middleware = sellerMiddleware.requireResourceOwnership();
      
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.resourceOwnership).toEqual({
        userId: 1,
        resourceId: 123,
        resourceIdParam: 'id',
      });
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should set up resource ownership validation with custom parameter', async () => {
      mockRequest.params = { productId: '456' };

      const middleware = sellerMiddleware.requireResourceOwnership('productId');
      
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.resourceOwnership).toEqual({
        userId: 1,
        resourceId: 456,
        resourceIdParam: 'productId',
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: '123' };

      const middleware = sellerMiddleware.requireResourceOwnership();
      
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'AuthenticationError',
          message: 'Authentication required',
        },
        timestamp: expect.any(String),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when resource ID parameter is missing', async () => {
      mockRequest.params = {}; // No id parameter

      const middleware = sellerMiddleware.requireResourceOwnership();
      
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'ValidationError',
          message: "Resource ID parameter 'id' is required",
        },
        timestamp: expect.any(String),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when custom resource ID parameter is missing', async () => {
      mockRequest.params = { id: '123' }; // Has 'id' but looking for 'productId'

      const middleware = sellerMiddleware.requireResourceOwnership('productId');
      
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: 'ValidationError',
          message: "Resource ID parameter 'productId' is required",
        },
        timestamp: expect.any(String),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle non-numeric resource ID', async () => {
      mockRequest.params = { id: 'abc' };

      const middleware = sellerMiddleware.requireResourceOwnership();
      
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.resourceOwnership).toEqual({
        userId: 1,
        resourceId: NaN,
        resourceIdParam: 'id',
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Simulate an error by making params undefined
      mockRequest.params = undefined as any;

      const middleware = sellerMiddleware.requireResourceOwnership();
      
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          type: expect.any(String),
          message: 'Failed to verify resource ownership',
        },
        timestamp: expect.any(String),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
import { AuthService } from '../../../services/AuthService';
import { UserRepository } from '../../../repositories/UserRepository';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../../repositories/UserRepository');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const MockedUserRepository = UserRepository as jest.MockedClass<typeof UserRepository>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock instance
    mockUserRepository = new MockedUserRepository() as jest.Mocked<UserRepository>;
    
    // Create service instance
    authService = new AuthService();
    
    // Replace the repository instance
    (authService as any).userRepository = mockUserRepository;
  });

  describe('register', () => {
    const validUserData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      first_name: 'Test',
      last_name: 'User'
    };

    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hashed_password',
      first_name: 'Test',
      last_name: 'User',
      is_seller: false,
      created_at: new Date(),
      updated_at: new Date()
    };

    it('should register a new user successfully', async () => {
      // Arrange
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashed_password' as never);
      mockUserRepository.create.mockResolvedValue(mockUser);
      mockedJwt.sign.mockReturnValue('mock_jwt_token' as never);

      // Act
      const result = await authService.register(validUserData);

      // Assert
      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith('testuser');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        ...validUserData,
        password_hash: 'hashed_password'
      });
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        { userId: 1 },
        expect.any(String),
        expect.any(Object)
      );
      expect(result).toEqual({
        user: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          is_seller: false,
          created_at: mockUser.created_at,
          updated_at: mockUser.updated_at
        },
        token: 'mock_jwt_token'
      });
    });

    it('should throw error if username already exists', async () => {
      // Arrange
      mockUserRepository.findByUsername.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(authService.register(validUserData))
        .rejects.toThrow('Username already exists');
      
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if email already exists', async () => {
      // Arrange
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(authService.register(validUserData))
        .rejects.toThrow('Email already exists');
      
      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error for invalid username', async () => {
      // Arrange
      const invalidUserData = { ...validUserData, username: 'ab' };

      // Act & Assert
      await expect(authService.register(invalidUserData))
        .rejects.toThrow('Username must be at least 3 characters long');
    });

    it('should throw error for invalid email', async () => {
      // Arrange
      const invalidUserData = { ...validUserData, email: 'invalid-email' };

      // Act & Assert
      await expect(authService.register(invalidUserData))
        .rejects.toThrow('Valid email is required');
    });

    it('should throw error for short password', async () => {
      // Arrange
      const invalidUserData = { ...validUserData, password: '123' };

      // Act & Assert
      await expect(authService.register(invalidUserData))
        .rejects.toThrow('Password must be at least 6 characters long');
    });

    it('should throw error for username with invalid characters', async () => {
      // Arrange
      const invalidUserData = { ...validUserData, username: 'test@user' };

      // Act & Assert
      await expect(authService.register(invalidUserData))
        .rejects.toThrow('Username can only contain letters, numbers, and underscores');
    });
  });

  describe('login', () => {
    const loginData = {
      username: 'testuser',
      password: 'password123'
    };

    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hashed_password',
      first_name: 'Test',
      last_name: 'User',
      is_seller: false,
      created_at: new Date(),
      updated_at: new Date()
    };

    it('should login user successfully with valid credentials', async () => {
      // Arrange
      mockUserRepository.findByUsername.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockedJwt.sign.mockReturnValue('mock_jwt_token' as never);

      // Act
      const result = await authService.login(loginData);

      // Assert
      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith('testuser');
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_password');
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        { userId: 1 },
        expect.any(String),
        expect.any(Object)
      );
      expect(result).toEqual({
        user: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          is_seller: false,
          created_at: mockUser.created_at,
          updated_at: mockUser.updated_at
        },
        token: 'mock_jwt_token'
      });
    });

    it('should throw error for non-existent user', async () => {
      // Arrange
      mockUserRepository.findByUsername.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(loginData))
        .rejects.toThrow('Invalid username or password');
      
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw error for invalid password', async () => {
      // Arrange
      mockUserRepository.findByUsername.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      // Act & Assert
      await expect(authService.login(loginData))
        .rejects.toThrow('Invalid username or password');
    });

    it('should throw error for empty username', async () => {
      // Arrange
      const invalidLoginData = { ...loginData, username: '' };

      // Act & Assert
      await expect(authService.login(invalidLoginData))
        .rejects.toThrow('Username is required');
    });

    it('should throw error for empty password', async () => {
      // Arrange
      const invalidLoginData = { ...loginData, password: '' };

      // Act & Assert
      await expect(authService.login(invalidLoginData))
        .rejects.toThrow('Password is required');
    });
  });

  describe('getUserProfile', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hashed_password',
      first_name: 'Test',
      last_name: 'User',
      is_seller: false,
      created_at: new Date(),
      updated_at: new Date()
    };

    it('should return user profile successfully', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await authService.getUserProfile(1);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        is_seller: false,
        created_at: mockUser.created_at,
        updated_at: mockUser.updated_at
      });
      expect(result).not.toHaveProperty('password_hash');
    });

    it('should throw error for non-existent user', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.getUserProfile(999))
        .rejects.toThrow('User not found');
    });
  });

  describe('updateUserProfile', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hashed_password',
      first_name: 'Test',
      last_name: 'User',
      is_seller: false,
      created_at: new Date(),
      updated_at: new Date()
    };

    const updateData = {
      first_name: 'Updated',
      last_name: 'Name',
      email: 'updated@example.com'
    };

    it('should update user profile successfully', async () => {
      // Arrange
      const updatedUser = { ...mockUser, ...updateData };
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      // Act
      const result = await authService.updateUserProfile(1, updateData);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('updated@example.com');
      expect(mockUserRepository.update).toHaveBeenCalledWith(1, updateData);
      expect(result).toEqual({
        id: 1,
        username: 'testuser',
        email: 'updated@example.com',
        first_name: 'Updated',
        last_name: 'Name',
        is_seller: false,
        created_at: mockUser.created_at,
        updated_at: mockUser.updated_at
      });
    });

    it('should throw error if email is already taken by another user', async () => {
      // Arrange
      const anotherUser = { ...mockUser, id: 2 };
      mockUserRepository.findByEmail.mockResolvedValue(anotherUser);

      // Act & Assert
      await expect(authService.updateUserProfile(1, updateData))
        .rejects.toThrow('Email already exists');
      
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('should allow updating to same email', async () => {
      // Arrange
      const updatedUser = { ...mockUser, ...updateData };
      mockUserRepository.findByEmail.mockResolvedValue(mockUser); // Same user
      mockUserRepository.update.mockResolvedValue(updatedUser);

      // Act
      const result = await authService.updateUserProfile(1, updateData);

      // Assert
      expect(mockUserRepository.update).toHaveBeenCalledWith(1, updateData);
      expect(result).toBeDefined();
    });
  });

  describe('upgradeToSeller', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hashed_password',
      first_name: 'Test',
      last_name: 'User',
      is_seller: false,
      created_at: new Date(),
      updated_at: new Date()
    };

    it('should upgrade user to seller successfully', async () => {
      // Arrange
      const sellerUser = { ...mockUser, is_seller: true };
      mockUserRepository.upgradeToSeller.mockResolvedValue(sellerUser);

      // Act
      const result = await authService.upgradeToSeller(1);

      // Assert
      expect(mockUserRepository.upgradeToSeller).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        is_seller: true,
        created_at: mockUser.created_at,
        updated_at: mockUser.updated_at
      });
    });

    it('should throw error for non-existent user', async () => {
      // Arrange
      mockUserRepository.upgradeToSeller.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.upgradeToSeller(999))
        .rejects.toThrow('User not found');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token successfully', () => {
      // Arrange
      const mockDecoded = { userId: 1 };
      mockedJwt.verify.mockReturnValue(mockDecoded as never);

      // Act
      const result = authService.verifyToken('valid_token');

      // Assert
      expect(mockedJwt.verify).toHaveBeenCalledWith('valid_token', expect.any(String));
      expect(result).toEqual({ userId: 1 });
    });

    it('should throw error for invalid token', () => {
      // Arrange
      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      expect(() => authService.verifyToken('invalid_token'))
        .toThrow('Invalid or expired token');
    });
  });
});
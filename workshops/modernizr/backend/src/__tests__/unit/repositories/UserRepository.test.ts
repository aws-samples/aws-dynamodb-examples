import { UserRepository } from '../../../repositories/UserRepository';
import { pool } from '../../../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Mock the database pool
jest.mock('../../../config/database', () => ({
  pool: {
    execute: jest.fn()
  }
}));

const mockedPool = pool as jest.Mocked<typeof pool>;

describe('UserRepository', () => {
  let userRepository: UserRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    userRepository = new UserRepository();
  });

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

  describe('findById', () => {
    it('should return user when found', async () => {
      // Arrange
      const mockRows = [mockUser] as RowDataPacket[];
      mockedPool.execute.mockResolvedValue([mockRows, []]);

      // Act
      const result = await userRepository.findById(1);

      // Assert
      expect(mockedPool.execute).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = ?',
        [1]
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      // Arrange
      const mockRows = [] as RowDataPacket[];
      mockedPool.execute.mockResolvedValue([mockRows, []]);

      // Act
      const result = await userRepository.findById(999);

      // Assert
      expect(result).toBeNull();
    });

    it('should throw error on database error', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      mockedPool.execute.mockRejectedValue(dbError);

      // Act & Assert
      await expect(userRepository.findById(1)).rejects.toThrow('Database connection failed');
    });
  });

  describe('findByUsername', () => {
    it('should return user when found', async () => {
      // Arrange
      const mockRows = [mockUser] as RowDataPacket[];
      mockedPool.execute.mockResolvedValue([mockRows, []]);

      // Act
      const result = await userRepository.findByUsername('testuser');

      // Assert
      expect(mockedPool.execute).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE username = ?',
        ['testuser']
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      // Arrange
      const mockRows = [] as RowDataPacket[];
      mockedPool.execute.mockResolvedValue([mockRows, []]);

      // Act
      const result = await userRepository.findByUsername('nonexistent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      // Arrange
      const mockRows = [mockUser] as RowDataPacket[];
      mockedPool.execute.mockResolvedValue([mockRows, []]);

      // Act
      const result = await userRepository.findByEmail('test@example.com');

      // Assert
      expect(mockedPool.execute).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = ?',
        ['test@example.com']
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      // Arrange
      const mockRows = [] as RowDataPacket[];
      mockedPool.execute.mockResolvedValue([mockRows, []]);

      // Act
      const result = await userRepository.findByEmail('nonexistent@example.com');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    const createUserData = {
      username: 'newuser',
      email: 'new@example.com',
      password: 'password123',
      password_hash: 'hashed_password',
      first_name: 'New',
      last_name: 'User'
    };

    it('should create user successfully', async () => {
      // Arrange
      const mockResult = { insertId: 1 } as ResultSetHeader;
      const mockRows = [{ ...mockUser, id: 1 }] as RowDataPacket[];
      
      mockedPool.execute
        .mockResolvedValueOnce([mockResult, []])  // INSERT
        .mockResolvedValueOnce([mockRows, []]);   // SELECT

      // Act
      const result = await userRepository.create(createUserData);

      // Assert
      expect(mockedPool.execute).toHaveBeenCalledWith(
        `INSERT INTO users (username, email, password_hash, first_name, last_name, role) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['newuser', 'new@example.com', 'hashed_password', 'New', 'User', 'customer']
      );
      expect(mockedPool.execute).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = ?',
        [1]
      );
      expect(result).toEqual({ ...mockUser, id: 1 });
    });

    it('should handle null optional fields', async () => {
      // Arrange
      const createUserDataWithNulls = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        password_hash: 'hashed_password'
      };
      const mockResult = { insertId: 1 } as ResultSetHeader;
      const mockRows = [mockUser] as RowDataPacket[];
      
      mockedPool.execute
        .mockResolvedValueOnce([mockResult, []])
        .mockResolvedValueOnce([mockRows, []]);

      // Act
      const result = await userRepository.create(createUserDataWithNulls);

      // Assert
      expect(mockedPool.execute).toHaveBeenCalledWith(
        expect.any(String),
        ['newuser', 'new@example.com', 'hashed_password', '', '', 'customer']
      );
      expect(result).toBeDefined();
    });

    it('should throw error if user creation fails', async () => {
      // Arrange
      const mockResult = { insertId: 1 } as ResultSetHeader;
      const mockRows = [] as RowDataPacket[];
      
      mockedPool.execute
        .mockResolvedValueOnce([mockResult, []])
        .mockResolvedValueOnce([mockRows, []]);

      // Act & Assert
      await expect(userRepository.create(createUserData))
        .rejects.toThrow('Failed to retrieve created user');
    });
  });

  describe('update', () => {
    const updateData = {
      first_name: 'Updated',
      last_name: 'Name',
      email: 'updated@example.com'
    };

    it('should update user successfully', async () => {
      // Arrange
      const updatedUser = { ...mockUser, ...updateData };
      const mockRows = [updatedUser] as RowDataPacket[];
      
      mockedPool.execute
        .mockResolvedValueOnce([{} as ResultSetHeader, []])  // UPDATE
        .mockResolvedValueOnce([mockRows, []]);              // SELECT

      // Act
      const result = await userRepository.update(1, updateData);

      // Assert
      expect(mockedPool.execute).toHaveBeenCalledWith(
        'UPDATE users SET first_name = ?, last_name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['Updated', 'Name', 'updated@example.com', 1]
      );
      expect(result).toEqual(updatedUser);
    });

    it('should handle partial updates', async () => {
      // Arrange
      const partialUpdateData = { first_name: 'Updated' };
      const mockRows = [mockUser] as RowDataPacket[];
      
      mockedPool.execute
        .mockResolvedValueOnce([{} as ResultSetHeader, []])
        .mockResolvedValueOnce([mockRows, []]);

      // Act
      const result = await userRepository.update(1, partialUpdateData);

      // Assert
      expect(mockedPool.execute).toHaveBeenCalledWith(
        'UPDATE users SET first_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['Updated', 1]
      );
      expect(result).toBeDefined();
    });

    it('should return existing user if no fields to update', async () => {
      // Arrange
      const mockRows = [mockUser] as RowDataPacket[];
      mockedPool.execute.mockResolvedValue([mockRows, []]);

      // Act
      const result = await userRepository.update(1, {});

      // Assert
      expect(mockedPool.execute).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = ?',
        [1]
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe('upgradeToSeller', () => {
    it('should upgrade user to seller successfully', async () => {
      // Arrange
      const sellerDbRow = { ...mockUser, role: 'seller' };
      const expectedSellerUser = { ...mockUser, is_seller: true };
      const mockRows = [sellerDbRow] as RowDataPacket[];
      
      mockedPool.execute
        .mockResolvedValueOnce([{} as ResultSetHeader, []])  // UPDATE
        .mockResolvedValueOnce([mockRows, []]);              // SELECT

      // Act
      const result = await userRepository.upgradeToSeller(1);

      // Assert
      expect(mockedPool.execute).toHaveBeenCalledWith(
        'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['seller', 1]
      );
      expect(result).toEqual(expectedSellerUser);
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      // Arrange
      const mockResult = { affectedRows: 1 } as ResultSetHeader;
      mockedPool.execute.mockResolvedValue([mockResult, []]);

      // Act
      const result = await userRepository.delete(1);

      // Assert
      expect(mockedPool.execute).toHaveBeenCalledWith(
        'DELETE FROM users WHERE id = ?',
        [1]
      );
      expect(result).toBe(true);
    });

    it('should return false if user not found', async () => {
      // Arrange
      const mockResult = { affectedRows: 0 } as ResultSetHeader;
      mockedPool.execute.mockResolvedValue([mockResult, []]);

      // Act
      const result = await userRepository.delete(999);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('existsByUsername', () => {
    it('should return true if username exists', async () => {
      // Arrange
      const mockRows = [{ count: 1 }] as RowDataPacket[];
      mockedPool.execute.mockResolvedValue([mockRows, []]);

      // Act
      const result = await userRepository.existsByUsername('testuser');

      // Assert
      expect(mockedPool.execute).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM users WHERE username = ?',
        ['testuser']
      );
      expect(result).toBe(true);
    });

    it('should return false if username does not exist', async () => {
      // Arrange
      const mockRows = [{ count: 0 }] as RowDataPacket[];
      mockedPool.execute.mockResolvedValue([mockRows, []]);

      // Act
      const result = await userRepository.existsByUsername('nonexistent');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('existsByEmail', () => {
    it('should return true if email exists', async () => {
      // Arrange
      const mockRows = [{ count: 1 }] as RowDataPacket[];
      mockedPool.execute.mockResolvedValue([mockRows, []]);

      // Act
      const result = await userRepository.existsByEmail('test@example.com');

      // Assert
      expect(mockedPool.execute).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM users WHERE email = ?',
        ['test@example.com']
      );
      expect(result).toBe(true);
    });

    it('should return false if email does not exist', async () => {
      // Arrange
      const mockRows = [{ count: 0 }] as RowDataPacket[];
      mockedPool.execute.mockResolvedValue([mockRows, []]);

      // Act
      const result = await userRepository.existsByEmail('nonexistent@example.com');

      // Assert
      expect(result).toBe(false);
    });
  });
});
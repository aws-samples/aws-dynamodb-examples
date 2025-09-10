import { MySQLUserRepository } from '../../../../../database/implementations/mysql/MySQLUserRepository';
import { UserRepository } from '../../../../../repositories/UserRepository';

// Mock the UserRepository
jest.mock('../../../../../repositories/UserRepository');

describe('MySQLUserRepository', () => {
  let mysqlUserRepository: MySQLUserRepository;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockUserRepository = new UserRepository() as jest.Mocked<UserRepository>;
    mysqlUserRepository = new MySQLUserRepository();
    // Replace the internal repository with our mock
    (mysqlUserRepository as any).userRepository = mockUserRepository;
  });

  describe('findById', () => {
    it('should delegate to UserRepository.findById', async () => {
      const mockUser = { id: 1, username: 'test', email: 'test@example.com' };
      mockUserRepository.findById.mockResolvedValue(mockUser as any);

      const result = await mysqlUserRepository.findById(1);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(1);
      expect(result).toBe(mockUser);
    });

    it('should return null when UserRepository returns null', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await mysqlUserRepository.findById(999);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(999);
      expect(result).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should delegate to UserRepository.findByUsername', async () => {
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
      mockUserRepository.findByUsername.mockResolvedValue(mockUser as any);

      const result = await mysqlUserRepository.findByUsername('testuser');

      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith('testuser');
      expect(result).toBe(mockUser);
    });
  });

  describe('create', () => {
    it('should delegate to UserRepository.create', async () => {
      const userData = { username: 'newuser', email: 'new@example.com', password: 'password', password_hash: 'hash' };
      const mockUser = { id: 1, ...userData };
      mockUserRepository.create.mockResolvedValue(mockUser as any);

      const result = await mysqlUserRepository.create(userData);

      expect(mockUserRepository.create).toHaveBeenCalledWith(userData);
      expect(result).toBe(mockUser);
    });
  });

  describe('update', () => {
    it('should delegate to UserRepository.update', async () => {
      const updateData = { email: 'updated@example.com' };
      const mockUser = { id: 1, username: 'test', email: 'updated@example.com' };
      mockUserRepository.update.mockResolvedValue(mockUser as any);

      const result = await mysqlUserRepository.update(1, updateData);

      expect(mockUserRepository.update).toHaveBeenCalledWith(1, updateData);
      expect(result).toBe(mockUser);
    });
  });

  describe('delete', () => {
    it('should delegate to UserRepository.delete', async () => {
      mockUserRepository.delete.mockResolvedValue(true);

      const result = await mysqlUserRepository.delete(1);

      expect(mockUserRepository.delete).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });
  });

  describe('upgradeToSeller', () => {
    it('should delegate to UserRepository.upgradeToSeller', async () => {
      const mockUser = { id: 1, username: 'test', is_seller: true };
      mockUserRepository.upgradeToSeller.mockResolvedValue(mockUser as any);

      const result = await mysqlUserRepository.upgradeToSeller(1);

      expect(mockUserRepository.upgradeToSeller).toHaveBeenCalledWith(1);
      expect(result).toBe(mockUser);
    });
  });

  describe('existsByUsername', () => {
    it('should delegate to UserRepository.existsByUsername', async () => {
      mockUserRepository.existsByUsername.mockResolvedValue(true);

      const result = await mysqlUserRepository.existsByUsername('testuser');

      expect(mockUserRepository.existsByUsername).toHaveBeenCalledWith('testuser');
      expect(result).toBe(true);
    });
  });

  describe('existsByEmail', () => {
    it('should delegate to UserRepository.existsByEmail', async () => {
      mockUserRepository.existsByEmail.mockResolvedValue(false);

      const result = await mysqlUserRepository.existsByEmail('test@example.com');

      expect(mockUserRepository.existsByEmail).toHaveBeenCalledWith('test@example.com');
      expect(result).toBe(false);
    });
  });
});

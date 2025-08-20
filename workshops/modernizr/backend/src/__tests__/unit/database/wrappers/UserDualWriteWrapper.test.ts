import { UserDualWriteWrapper } from '../../../../database/wrappers/UserDualWriteWrapper';
import { IUserRepository } from '../../../../database/interfaces/IUserRepository';
import { FeatureFlagService } from '../../../../services/FeatureFlagService';
import { User } from '../../../../models/User';

describe('UserDualWriteWrapper', () => {
  let wrapper: UserDualWriteWrapper;
  let mysqlRepo: jest.Mocked<IUserRepository>;
  let dynamodbRepo: jest.Mocked<IUserRepository>;
  let featureFlagService: FeatureFlagService;

  const mockUser: User = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password_hash: 'hashedpassword',
    first_name: 'Test',
    last_name: 'User',
    is_seller: false,
    super_admin: false,
    created_at: new Date(),
    updated_at: new Date()
  };

  beforeEach(() => {
    mysqlRepo = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upgradeToSeller: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      existsByUsername: jest.fn(),
      existsByEmail: jest.fn()
    };

    dynamodbRepo = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upgradeToSeller: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      existsByUsername: jest.fn(),
      existsByEmail: jest.fn()
    };

    featureFlagService = new FeatureFlagService();
    wrapper = new UserDualWriteWrapper(mysqlRepo, dynamodbRepo, featureFlagService);
    FeatureFlagService.reset();
  });

  describe('create', () => {
    it('should execute dual-write when enabled', async () => {
      FeatureFlagService.setFlag('dual_write_enabled', true);
      mysqlRepo.create.mockResolvedValue(mockUser);
      dynamodbRepo.create.mockResolvedValue(mockUser);

      const result = await wrapper.create({ username: 'testuser', email: 'test@example.com', password_hash: 'hashedpassword', first_name: 'Test', last_name: 'User' });

      expect(result).toBeDefined();
      
      expect(mysqlRepo.create).toHaveBeenCalledTimes(1);
      expect(dynamodbRepo.create).toHaveBeenCalledTimes(1);
    });

    it('should rollback on DynamoDB failure', async () => {
      FeatureFlagService.setFlag('dual_write_enabled', true);
      mysqlRepo.create.mockResolvedValue(mockUser);
      mysqlRepo.delete.mockResolvedValue(true);
      dynamodbRepo.create.mockRejectedValue(new Error('DynamoDB failed'));

      await expect(wrapper.create({ username: 'testuser', email: 'test@example.com', password_hash: 'hashedpassword', first_name: 'Test', last_name: 'User' })).rejects.toThrow('DynamoDB failed');
      expect(mysqlRepo.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('should execute dual-write when enabled', async () => {
      FeatureFlagService.setFlag('dual_write_enabled', true);
      mysqlRepo.update.mockResolvedValue(mockUser);
      dynamodbRepo.update.mockResolvedValue(mockUser);

      const result = await wrapper.update(1, { first_name: 'Updated' });

      expect(result).toBeDefined();
      expect(mysqlRepo.update).toHaveBeenCalledWith(1, { first_name: 'Updated' });
      expect(dynamodbRepo.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete', () => {
    it('should execute dual-write when enabled', async () => {
      FeatureFlagService.setFlag('dual_write_enabled', true);
      mysqlRepo.findById.mockResolvedValue(mockUser);
      mysqlRepo.delete.mockResolvedValue(true);
      dynamodbRepo.delete.mockResolvedValue(true);

      const result = await wrapper.delete(1);

      expect(result).toBeDefined();
      expect(mysqlRepo.delete).toHaveBeenCalledWith(1);
      expect(dynamodbRepo.delete).toHaveBeenCalledWith(1);
    });

    it('should fail if user not found', async () => {
      mysqlRepo.findById.mockResolvedValue(null);

      const result = await wrapper.delete(1);

      expect(result).toBe(false);
    });
  });

  describe('upgradeToSeller', () => {
    it('should execute dual-write when enabled', async () => {
      FeatureFlagService.setFlag('dual_write_enabled', true);
      const sellerUser = { ...mockUser, is_seller: true };
      mysqlRepo.upgradeToSeller.mockResolvedValue(sellerUser);
      dynamodbRepo.update.mockResolvedValue(sellerUser);

      const result = await wrapper.upgradeToSeller(1);

      expect(result).toBeDefined();
      expect(mysqlRepo.upgradeToSeller).toHaveBeenCalledWith(1);
      expect(dynamodbRepo.update).toHaveBeenCalledTimes(1);
    });
  });
});

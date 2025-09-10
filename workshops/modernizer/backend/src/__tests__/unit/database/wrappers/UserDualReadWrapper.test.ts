import { UserDualReadWrapper } from '../../../../database/wrappers/UserDualReadWrapper';
import { IUserRepository } from '../../../../database/interfaces/IUserRepository';
import { FeatureFlagService } from '../../../../services/FeatureFlagService';
import { User } from '../../../../models/User';

describe('UserDualReadWrapper', () => {
  let wrapper: UserDualReadWrapper;
  let mysqlRepo: jest.Mocked<IUserRepository>;
  let dynamodbRepo: jest.Mocked<IUserRepository>;
  let featureFlagService: FeatureFlagService;

  const sampleUser: User = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password_hash: 'hashed_password',
    first_name: 'Test',
    last_name: 'User',
    is_seller: false,
    super_admin: false,
    created_at: new Date('2023-01-01T00:00:00Z'),
    updated_at: new Date('2023-01-01T00:00:00Z')
  };

  beforeEach(() => {
    mysqlRepo = {
      findById: jest.fn(),
      findByUsername: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upgradeToSeller: jest.fn(),
      existsByUsername: jest.fn(),
      existsByEmail: jest.fn()
    };

    dynamodbRepo = {
      findById: jest.fn(),
      findByUsername: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upgradeToSeller: jest.fn(),
      existsByUsername: jest.fn(),
      existsByEmail: jest.fn(),
      promoteToSuperAdmin: jest.fn(),
      demoteFromSuperAdmin: jest.fn(),
      findAllSuperAdmins: jest.fn()
    };

    featureFlagService = new FeatureFlagService();
    wrapper = new UserDualReadWrapper(mysqlRepo, dynamodbRepo, featureFlagService);
    FeatureFlagService.reset();
  });

  describe('findById with dual-read validation', () => {
    it('should return MySQL result when data matches between databases', async () => {
      // Arrange
      FeatureFlagService.setFlag('dual_read_enabled', true);
      FeatureFlagService.setFlag('validation_enabled', true);
      
      mysqlRepo.findById.mockResolvedValue(sampleUser);
      dynamodbRepo.findById.mockResolvedValue(sampleUser);

      // Act
      const result = await wrapper.findById(1);

      // Assert
      expect(result).toEqual(sampleUser);
      expect(mysqlRepo.findById).toHaveBeenCalledWith(1);
      expect(dynamodbRepo.findById).toHaveBeenCalledWith(1);
    });

    it('should throw error when validation fails due to attribute mismatch', async () => {
      // Arrange
      FeatureFlagService.setFlag('dual_read_enabled', true);
      FeatureFlagService.setFlag('validation_enabled', true);
      
      const mysqlUser = { ...sampleUser };
      const dynamodbUser = { ...sampleUser, username: 'different_username' };
      
      mysqlRepo.findById.mockResolvedValue(mysqlUser);
      dynamodbRepo.findById.mockResolvedValue(dynamodbUser);

      // Act & Assert
      await expect(wrapper.findById(1)).rejects.toThrow(
        'Data validation failed for User ID 1: username mismatch: MySQL="testuser", DynamoDB="different_username"'
      );
    });

    it('should throw error when validation fails due to multiple attribute mismatches', async () => {
      // Arrange
      FeatureFlagService.setFlag('dual_read_enabled', true);
      FeatureFlagService.setFlag('validation_enabled', true);
      
      const mysqlUser = { ...sampleUser };
      const dynamodbUser = { 
        ...sampleUser, 
        username: 'different_username',
        email: 'different@example.com',
        is_seller: true
      };
      
      mysqlRepo.findById.mockResolvedValue(mysqlUser);
      dynamodbRepo.findById.mockResolvedValue(dynamodbUser);

      // Act & Assert
      await expect(wrapper.findById(1)).rejects.toThrow(
        'Data validation failed for User ID 1'
      );
      
      try {
        await wrapper.findById(1);
      } catch (error) {
        expect((error as Error).message).toContain('username mismatch');
        expect((error as Error).message).toContain('email mismatch');
        expect((error as Error).message).toContain('is_seller mismatch');
      }
    });

    it('should handle date comparison correctly', async () => {
      // Arrange
      FeatureFlagService.setFlag('dual_read_enabled', true);
      FeatureFlagService.setFlag('validation_enabled', true);
      
      const mysqlUser = { ...sampleUser };
      const dynamodbUser = { 
        ...sampleUser, 
        created_at: new Date('2023-01-02T00:00:00Z') // Different date
      };
      
      mysqlRepo.findById.mockResolvedValue(mysqlUser);
      dynamodbRepo.findById.mockResolvedValue(dynamodbUser);

      // Act & Assert
      await expect(wrapper.findById(1)).rejects.toThrow(
        'created_at mismatch'
      );
    });

    it('should handle null results correctly', async () => {
      // Arrange
      FeatureFlagService.setFlag('dual_read_enabled', true);
      FeatureFlagService.setFlag('validation_enabled', true);
      
      mysqlRepo.findById.mockResolvedValue(null);
      dynamodbRepo.findById.mockResolvedValue(null);

      // Act
      const result = await wrapper.findById(1);

      // Assert
      expect(result).toBeNull();
    });

    it('should throw error when one result is null and other is not', async () => {
      // Arrange
      FeatureFlagService.setFlag('dual_read_enabled', true);
      FeatureFlagService.setFlag('validation_enabled', true);
      
      mysqlRepo.findById.mockResolvedValue(null);
      dynamodbRepo.findById.mockResolvedValue(sampleUser);

      // Act & Assert
      await expect(wrapper.findById(1)).rejects.toThrow(
        'Data validation failed for User ID 1: MySQL result is null but DynamoDB result is not null'
      );
    });
  });

  describe('findByUsername with dual-read validation', () => {
    it('should validate username search results', async () => {
      // Arrange
      FeatureFlagService.setFlag('dual_read_enabled', true);
      FeatureFlagService.setFlag('validation_enabled', true);
      
      const mysqlUser = { ...sampleUser };
      const dynamodbUser = { ...sampleUser, email: 'different@example.com' };
      
      mysqlRepo.findByUsername.mockResolvedValue(mysqlUser);
      dynamodbRepo.findByUsername.mockResolvedValue(dynamodbUser);

      // Act & Assert
      await expect(wrapper.findByUsername('testuser')).rejects.toThrow(
        'Data validation failed for User ID testuser: email mismatch'
      );
    });
  });

  describe('findByEmail with dual-read validation', () => {
    it('should validate email search results', async () => {
      // Arrange
      FeatureFlagService.setFlag('dual_read_enabled', true);
      FeatureFlagService.setFlag('validation_enabled', true);
      
      const mysqlUser = { ...sampleUser };
      const dynamodbUser = { ...sampleUser, first_name: 'Different' };
      
      mysqlRepo.findByEmail.mockResolvedValue(mysqlUser);
      dynamodbRepo.findByEmail.mockResolvedValue(dynamodbUser);

      // Act & Assert
      await expect(wrapper.findByEmail('test@example.com')).rejects.toThrow(
        'Data validation failed for User ID test@example.com: first_name mismatch'
      );
    });
  });

  describe('MySQL-only read mode', () => {
    it('should read from MySQL only when dual_read_enabled=false', async () => {
      // Arrange
      FeatureFlagService.setFlag('dual_read_enabled', false);
      FeatureFlagService.setFlag('read_from_dynamodb', false);
      
      mysqlRepo.findById.mockResolvedValue(sampleUser);

      // Act
      const result = await wrapper.findById(1);

      // Assert
      expect(result).toEqual(sampleUser);
      expect(mysqlRepo.findById).toHaveBeenCalledWith(1);
      expect(dynamodbRepo.findById).not.toHaveBeenCalled();
    });
  });

  describe('DynamoDB-only read mode', () => {
    it('should read from DynamoDB only when read_from_dynamodb=true', async () => {
      // Arrange
      FeatureFlagService.setFlag('dual_read_enabled', false);
      FeatureFlagService.setFlag('read_from_dynamodb', true);
      
      dynamodbRepo.findById.mockResolvedValue(sampleUser);

      // Act
      const result = await wrapper.findById(1);

      // Assert
      expect(result).toEqual(sampleUser);
      expect(dynamodbRepo.findById).toHaveBeenCalledWith(1);
      expect(mysqlRepo.findById).not.toHaveBeenCalled();
    });
  });

  describe('Write operations delegation', () => {
    it('should delegate write operations to MySQL repository', async () => {
      // Arrange
      const createData = { 
        username: 'new', 
        email: 'new@example.com', 
        password: 'plaintext',
        password_hash: 'hash' 
      };
      mysqlRepo.create.mockResolvedValue(sampleUser);

      // Act
      const result = await wrapper.create(createData);

      // Assert
      expect(result).toEqual(sampleUser);
      expect(mysqlRepo.create).toHaveBeenCalledWith(createData);
    });
  });
});

import { UserDualReadWrapper } from '../../../../database/wrappers/UserDualReadWrapper';
import { IUserRepository } from '../../../../database/interfaces/IUserRepository';
import { FeatureFlagService } from '../../../../services/FeatureFlagService';
import { User } from '../../../../models/User';

describe('DualReadValidation - Comprehensive Testing', () => {
  let wrapper: UserDualReadWrapper;
  let mysqlRepo: jest.Mocked<IUserRepository>;
  let dynamodbRepo: jest.Mocked<IUserRepository>;
  let featureFlagService: FeatureFlagService;

  const baseUser: User = {
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
    FeatureFlagService.setFlag('dual_read_enabled', true);
    FeatureFlagService.setFlag('validation_enabled', true);
  });

  describe('Identical Data Validation', () => {
    it('should pass validation when all attributes match exactly', async () => {
      // Arrange
      const identicalUser = { ...baseUser };
      mysqlRepo.findById.mockResolvedValue(identicalUser);
      dynamodbRepo.findById.mockResolvedValue(identicalUser);

      // Act
      const result = await wrapper.findById(1);

      // Assert
      expect(result).toEqual(identicalUser);
      expect(mysqlRepo.findById).toHaveBeenCalledWith(1);
      expect(dynamodbRepo.findById).toHaveBeenCalledWith(1);
    });

    it('should pass validation with identical null values', async () => {
      // Arrange
      mysqlRepo.findById.mockResolvedValue(null);
      dynamodbRepo.findById.mockResolvedValue(null);

      // Act
      const result = await wrapper.findById(1);

      // Assert
      expect(result).toBeNull();
    });

    it('should pass validation with identical optional fields as undefined', async () => {
      // Arrange
      const userWithUndefined = {
        ...baseUser,
        first_name: undefined,
        last_name: undefined
      };
      mysqlRepo.findById.mockResolvedValue(userWithUndefined);
      dynamodbRepo.findById.mockResolvedValue(userWithUndefined);

      // Act
      const result = await wrapper.findById(1);

      // Assert
      expect(result).toEqual(userWithUndefined);
    });

    it('should pass validation with identical dates', async () => {
      // Arrange
      const specificDate = new Date('2023-06-15T14:30:45.123Z');
      const userWithSpecificDates = {
        ...baseUser,
        created_at: specificDate,
        updated_at: specificDate
      };
      mysqlRepo.findById.mockResolvedValue(userWithSpecificDates);
      dynamodbRepo.findById.mockResolvedValue(userWithSpecificDates);

      // Act
      const result = await wrapper.findById(1);

      // Assert
      expect(result).toEqual(userWithSpecificDates);
    });
  });

  describe('Different Data Detection', () => {
    it('should detect ID mismatch', async () => {
      // Arrange
      const mysqlUser = { ...baseUser, id: 1 };
      const dynamodbUser = { ...baseUser, id: 2 };
      mysqlRepo.findById.mockResolvedValue(mysqlUser);
      dynamodbRepo.findById.mockResolvedValue(dynamodbUser);

      // Act & Assert
      await expect(wrapper.findById(1)).rejects.toThrow(
        'id mismatch: MySQL=1, DynamoDB=2'
      );
    });

    it('should detect username mismatch', async () => {
      // Arrange
      const mysqlUser = { ...baseUser, username: 'user1' };
      const dynamodbUser = { ...baseUser, username: 'user2' };
      mysqlRepo.findById.mockResolvedValue(mysqlUser);
      dynamodbRepo.findById.mockResolvedValue(dynamodbUser);

      // Act & Assert
      await expect(wrapper.findById(1)).rejects.toThrow(
        'username mismatch: MySQL="user1", DynamoDB="user2"'
      );
    });

    it('should detect email mismatch', async () => {
      // Arrange
      const mysqlUser = { ...baseUser, email: 'email1@test.com' };
      const dynamodbUser = { ...baseUser, email: 'email2@test.com' };
      mysqlRepo.findById.mockResolvedValue(mysqlUser);
      dynamodbRepo.findById.mockResolvedValue(dynamodbUser);

      // Act & Assert
      await expect(wrapper.findById(1)).rejects.toThrow(
        'email mismatch: MySQL="email1@test.com", DynamoDB="email2@test.com"'
      );
    });

    it('should detect boolean mismatch', async () => {
      // Arrange
      const mysqlUser = { ...baseUser, is_seller: false };
      const dynamodbUser = { ...baseUser, is_seller: true };
      mysqlRepo.findById.mockResolvedValue(mysqlUser);
      dynamodbRepo.findById.mockResolvedValue(dynamodbUser);

      // Act & Assert
      await expect(wrapper.findById(1)).rejects.toThrow(
        'is_seller mismatch: MySQL=false, DynamoDB=true'
      );
    });

    it('should detect date mismatch', async () => {
      // Arrange
      const mysqlUser = { ...baseUser, created_at: new Date('2023-01-01T00:00:00Z') };
      const dynamodbUser = { ...baseUser, created_at: new Date('2023-01-02T00:00:00Z') };
      mysqlRepo.findById.mockResolvedValue(mysqlUser);
      dynamodbRepo.findById.mockResolvedValue(dynamodbUser);

      // Act & Assert
      await expect(wrapper.findById(1)).rejects.toThrow(
        'created_at mismatch'
      );
    });

    it('should detect multiple attribute mismatches', async () => {
      // Arrange
      const mysqlUser = { 
        ...baseUser, 
        username: 'mysql_user',
        email: 'mysql@test.com',
        is_seller: false
      };
      const dynamodbUser = { 
        ...baseUser, 
        username: 'dynamo_user',
        email: 'dynamo@test.com',
        is_seller: true
      };
      mysqlRepo.findById.mockResolvedValue(mysqlUser);
      dynamodbRepo.findById.mockResolvedValue(dynamodbUser);

      // Act & Assert
      const errorPromise = wrapper.findById(1);
      await expect(errorPromise).rejects.toThrow('Data validation failed for User ID 1');
      
      try {
        await errorPromise;
      } catch (error) {
        expect((error as Error).message).toContain('username mismatch');
        expect((error as Error).message).toContain('email mismatch');
        expect((error as Error).message).toContain('is_seller mismatch');
      }
    });
  });

  describe('Null Value Edge Cases', () => {
    it('should detect null vs non-null mismatch (MySQL null)', async () => {
      // Arrange
      mysqlRepo.findById.mockResolvedValue(null);
      dynamodbRepo.findById.mockResolvedValue(baseUser);

      // Act & Assert
      await expect(wrapper.findById(1)).rejects.toThrow(
        'MySQL result is null but DynamoDB result is not null'
      );
    });

    it('should detect null vs non-null mismatch (DynamoDB null)', async () => {
      // Arrange
      mysqlRepo.findById.mockResolvedValue(baseUser);
      dynamodbRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(wrapper.findById(1)).rejects.toThrow(
        'DynamoDB result is null but MySQL result is not null'
      );
    });

    it('should detect optional field undefined vs string mismatch', async () => {
      // Arrange
      const mysqlUser = { ...baseUser, first_name: undefined };
      const dynamodbUser = { ...baseUser, first_name: 'John' };
      mysqlRepo.findById.mockResolvedValue(mysqlUser);
      dynamodbRepo.findById.mockResolvedValue(dynamodbUser);

      // Act & Assert
      await expect(wrapper.findById(1)).rejects.toThrow(
        'first_name mismatch'
      );
    });

    it('should detect optional field string vs undefined mismatch', async () => {
      // Arrange
      const mysqlUser = { ...baseUser, last_name: 'Smith' };
      const dynamodbUser = { ...baseUser, last_name: undefined };
      mysqlRepo.findById.mockResolvedValue(mysqlUser);
      dynamodbRepo.findById.mockResolvedValue(dynamodbUser);

      // Act & Assert
      await expect(wrapper.findById(1)).rejects.toThrow(
        'last_name mismatch'
      );
    });
  });

  describe('Empty String Edge Cases', () => {
    it('should detect empty string vs undefined mismatch', async () => {
      // Arrange
      const mysqlUser = { ...baseUser, first_name: '' };
      const dynamodbUser = { ...baseUser, first_name: undefined };
      mysqlRepo.findById.mockResolvedValue(mysqlUser);
      dynamodbRepo.findById.mockResolvedValue(dynamodbUser);

      // Act & Assert
      await expect(wrapper.findById(1)).rejects.toThrow(
        'first_name mismatch'
      );
    });

    it('should detect empty string vs non-empty string mismatch', async () => {
      // Arrange
      const mysqlUser = { ...baseUser, first_name: '' };
      const dynamodbUser = { ...baseUser, first_name: 'John' };
      mysqlRepo.findById.mockResolvedValue(mysqlUser);
      dynamodbRepo.findById.mockResolvedValue(dynamodbUser);

      // Act & Assert
      await expect(wrapper.findById(1)).rejects.toThrow(
        'first_name mismatch: MySQL="", DynamoDB="John"'
      );
    });

    it('should pass validation with identical empty strings', async () => {
      // Arrange
      const userWithEmptyStrings = {
        ...baseUser,
        first_name: '',
        last_name: ''
      };
      mysqlRepo.findById.mockResolvedValue(userWithEmptyStrings);
      dynamodbRepo.findById.mockResolvedValue(userWithEmptyStrings);

      // Act
      const result = await wrapper.findById(1);

      // Assert
      expect(result).toEqual(userWithEmptyStrings);
    });
  });

  describe('Date Type Edge Cases', () => {
    it('should detect date vs null mismatch', async () => {
      // Arrange
      const mysqlUser = { ...baseUser, created_at: new Date('2023-01-01T00:00:00Z') };
      const dynamodbUser = { ...baseUser, created_at: null as any };
      mysqlRepo.findById.mockResolvedValue(mysqlUser);
      dynamodbRepo.findById.mockResolvedValue(dynamodbUser);

      // Act & Assert
      await expect(wrapper.findById(1)).rejects.toThrow(
        'created_at mismatch'
      );
    });

    it('should detect microsecond differences in dates', async () => {
      // Arrange
      const mysqlUser = { ...baseUser, created_at: new Date('2023-01-01T00:00:00.123Z') };
      const dynamodbUser = { ...baseUser, created_at: new Date('2023-01-01T00:00:00.124Z') };
      mysqlRepo.findById.mockResolvedValue(mysqlUser);
      dynamodbRepo.findById.mockResolvedValue(dynamodbUser);

      // Act & Assert
      await expect(wrapper.findById(1)).rejects.toThrow(
        'created_at mismatch'
      );
    });

    it('should pass validation with same date in different timezone representations', async () => {
      // Arrange - Same moment in time, different representations
      const utcDate = new Date('2023-01-01T00:00:00.000Z');
      const mysqlUser = { ...baseUser, created_at: utcDate };
      const dynamodbUser = { ...baseUser, created_at: new Date(utcDate.getTime()) };
      mysqlRepo.findById.mockResolvedValue(mysqlUser);
      dynamodbRepo.findById.mockResolvedValue(dynamodbUser);

      // Act
      const result = await wrapper.findById(1);

      // Assert
      expect(result).toEqual(mysqlUser);
    });
  });

  describe('Password Hash Security', () => {
    it('should detect password hash mismatch without logging actual values', async () => {
      // Arrange
      const mysqlUser = { ...baseUser, password_hash: 'hash1' };
      const dynamodbUser = { ...baseUser, password_hash: 'hash2' };
      mysqlRepo.findById.mockResolvedValue(mysqlUser);
      dynamodbRepo.findById.mockResolvedValue(dynamodbUser);

      // Act & Assert
      await expect(wrapper.findById(1)).rejects.toThrow(
        'password_hash mismatch: values differ (security: not logged)'
      );
    });
  });

  describe('Performance and Error Handling', () => {
    it('should handle MySQL read errors gracefully', async () => {
      // Arrange
      const error = new Error('MySQL connection timeout');
      mysqlRepo.findById.mockRejectedValue(error);
      dynamodbRepo.findById.mockResolvedValue(baseUser);

      // Act & Assert
      await expect(wrapper.findById(1)).rejects.toThrow('MySQL connection timeout');
    });

    it('should handle DynamoDB read errors gracefully', async () => {
      // Arrange
      const error = new Error('DynamoDB throttling');
      mysqlRepo.findById.mockResolvedValue(baseUser);
      dynamodbRepo.findById.mockRejectedValue(error);

      // Act & Assert
      await expect(wrapper.findById(1)).rejects.toThrow('DynamoDB throttling');
    });

    it('should handle both databases failing', async () => {
      // Arrange
      const mysqlError = new Error('MySQL down');
      const dynamodbError = new Error('DynamoDB down');
      mysqlRepo.findById.mockRejectedValue(mysqlError);
      dynamodbRepo.findById.mockRejectedValue(dynamodbError);

      // Act & Assert
      await expect(wrapper.findById(1)).rejects.toThrow('MySQL down');
    });
  });

  describe('Flag Combinations', () => {
    it('should skip validation when validation_enabled=false', async () => {
      // Arrange
      FeatureFlagService.setFlag('validation_enabled', false);
      const mysqlUser = { ...baseUser, username: 'mysql_user' };
      const dynamodbUser = { ...baseUser, username: 'dynamo_user' };
      mysqlRepo.findById.mockResolvedValue(mysqlUser);
      dynamodbRepo.findById.mockResolvedValue(dynamodbUser);

      // Act
      const result = await wrapper.findById(1);

      // Assert - Should return MySQL result without validation error
      expect(result).toEqual(mysqlUser);
    });

    it('should read from MySQL only when dual_read_enabled=false', async () => {
      // Arrange
      FeatureFlagService.setFlag('dual_read_enabled', false);
      FeatureFlagService.setFlag('read_from_dynamodb', false);
      mysqlRepo.findById.mockResolvedValue(baseUser);

      // Act
      const result = await wrapper.findById(1);

      // Assert
      expect(result).toEqual(baseUser);
      expect(mysqlRepo.findById).toHaveBeenCalledWith(1);
      expect(dynamodbRepo.findById).not.toHaveBeenCalled();
    });

    it('should read from DynamoDB only when read_from_dynamodb=true', async () => {
      // Arrange
      FeatureFlagService.setFlag('dual_read_enabled', false);
      FeatureFlagService.setFlag('read_from_dynamodb', true);
      dynamodbRepo.findById.mockResolvedValue(baseUser);

      // Act
      const result = await wrapper.findById(1);

      // Assert
      expect(result).toEqual(baseUser);
      expect(dynamodbRepo.findById).toHaveBeenCalledWith(1);
      expect(mysqlRepo.findById).not.toHaveBeenCalled();
    });
  });
});

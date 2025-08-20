import { UserDualReadWrapper } from '../../../../database/wrappers/UserDualReadWrapper';
import { UserDualWriteWrapper } from '../../../../database/wrappers/UserDualWriteWrapper';
import { IUserRepository } from '../../../../database/interfaces/IUserRepository';
import { FeatureFlagService } from '../../../../services/FeatureFlagService';
import { User } from '../../../../models/User';

describe('Migration Phases - Complete System Testing', () => {
  let readWrapper: UserDualReadWrapper;
  let writeWrapper: UserDualWriteWrapper;
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

  const createUserData = {
    username: 'newuser',
    email: 'new@example.com',
    password: 'password',
    password_hash: 'new_hash'
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
    readWrapper = new UserDualReadWrapper(mysqlRepo, dynamodbRepo, featureFlagService);
    writeWrapper = new UserDualWriteWrapper(mysqlRepo, dynamodbRepo, featureFlagService);
    
    FeatureFlagService.reset();
  });

  describe('Phase 1: MySQL Only (Baseline)', () => {
    beforeEach(() => {
      FeatureFlagService.setMigrationPhase(1);
    });

    it('should have correct flag configuration for Phase 1', () => {
      const flags = FeatureFlagService.getAllFlags();
      expect(flags.migration_phase).toBe(1);
      expect(flags.dual_write_enabled).toBe(false);
      expect(flags.dual_read_enabled).toBe(false);
      expect(flags.read_from_dynamodb).toBe(false);
      expect(flags.validation_enabled).toBe(false);
    });

    it('should read from MySQL only in Phase 1', async () => {
      // Arrange
      mysqlRepo.findById.mockResolvedValue(sampleUser);

      // Act
      const result = await readWrapper.findById(1);

      // Assert
      expect(result).toEqual(sampleUser);
      expect(mysqlRepo.findById).toHaveBeenCalledWith(1);
      expect(dynamodbRepo.findById).not.toHaveBeenCalled();
    });

    it('should write to MySQL only in Phase 1', async () => {
      // Arrange
      mysqlRepo.create.mockResolvedValue(sampleUser);

      // Act
      const result = await writeWrapper.create(createUserData);

      // Assert
      expect(result).toEqual(sampleUser);
      expect(mysqlRepo.create).toHaveBeenCalledWith(createUserData);
      expect(dynamodbRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('Phase 5: DynamoDB Only (Final State)', () => {
    beforeEach(() => {
      FeatureFlagService.setMigrationPhase(5);
    });

    it('should have correct flag configuration for Phase 5', () => {
      const flags = FeatureFlagService.getAllFlags();
      expect(flags.migration_phase).toBe(5);
      expect(flags.dual_write_enabled).toBe(false);
      expect(flags.dual_read_enabled).toBe(false);
      expect(flags.read_from_dynamodb).toBe(true);
      expect(flags.validation_enabled).toBe(false);
    });

    it('should read from DynamoDB only in Phase 5', async () => {
      // Arrange
      dynamodbRepo.findById.mockResolvedValue(sampleUser);

      // Act
      const result = await readWrapper.findById(1);

      // Assert
      expect(result).toEqual(sampleUser);
      expect(dynamodbRepo.findById).toHaveBeenCalledWith(1);
      expect(mysqlRepo.findById).not.toHaveBeenCalled();
    });

    it('should write to DynamoDB only in Phase 5', async () => {
      // Arrange
      dynamodbRepo.create.mockResolvedValue(sampleUser);

      // Act
      const result = await writeWrapper.create(createUserData);

      // Assert
      expect(result).toEqual(sampleUser);
      expect(dynamodbRepo.create).toHaveBeenCalledWith(createUserData);
      expect(mysqlRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('Phase 2: Dual Write + MySQL Read (Safety Phase)', () => {
    beforeEach(() => {
      FeatureFlagService.setMigrationPhase(2);
    });

    it('should have correct flag configuration for Phase 2', () => {
      const flags = FeatureFlagService.getAllFlags();
      expect(flags.migration_phase).toBe(2);
      expect(flags.dual_write_enabled).toBe(true);
      expect(flags.dual_read_enabled).toBe(false);
      expect(flags.read_from_dynamodb).toBe(false);
      expect(flags.validation_enabled).toBe(false);
    });

    it('should read from MySQL only in Phase 2', async () => {
      // Arrange
      mysqlRepo.findById.mockResolvedValue(sampleUser);

      // Act
      const result = await readWrapper.findById(1);

      // Assert
      expect(result).toEqual(sampleUser);
      expect(mysqlRepo.findById).toHaveBeenCalledWith(1);
      expect(dynamodbRepo.findById).not.toHaveBeenCalled();
    });

    it('should write to both databases in Phase 2', async () => {
      // Arrange
      mysqlRepo.create.mockResolvedValue(sampleUser);
      dynamodbRepo.create.mockResolvedValue(sampleUser);

      // Act
      const result = await writeWrapper.create(createUserData);

      // Assert
      expect(result).toEqual(sampleUser);
      expect(mysqlRepo.create).toHaveBeenCalledWith(createUserData);
      expect(dynamodbRepo.create).toHaveBeenCalled();
    });
  });

  describe('Phase 4: Dual Write + DynamoDB Read (Transition Phase)', () => {
    beforeEach(() => {
      FeatureFlagService.setMigrationPhase(4);
    });

    it('should have correct flag configuration for Phase 4', () => {
      const flags = FeatureFlagService.getAllFlags();
      expect(flags.migration_phase).toBe(4);
      expect(flags.dual_write_enabled).toBe(true);
      expect(flags.dual_read_enabled).toBe(false);
      expect(flags.read_from_dynamodb).toBe(true);
      expect(flags.validation_enabled).toBe(false);
    });

    it('should read from DynamoDB only in Phase 4', async () => {
      // Arrange
      dynamodbRepo.findById.mockResolvedValue(sampleUser);

      // Act
      const result = await readWrapper.findById(1);

      // Assert
      expect(result).toEqual(sampleUser);
      expect(dynamodbRepo.findById).toHaveBeenCalledWith(1);
      expect(mysqlRepo.findById).not.toHaveBeenCalled();
    });

    it('should write to both databases in Phase 4', async () => {
      // Arrange
      mysqlRepo.create.mockResolvedValue(sampleUser);
      dynamodbRepo.create.mockResolvedValue(sampleUser);

      // Act
      const result = await writeWrapper.create(createUserData);

      // Assert
      expect(result).toEqual(sampleUser);
      expect(mysqlRepo.create).toHaveBeenCalledWith(createUserData);
      expect(dynamodbRepo.create).toHaveBeenCalled();
    });
  });

  describe('Phase 3: Dual Write + Dual Read with Validation (Validation Phase)', () => {
    beforeEach(() => {
      FeatureFlagService.setMigrationPhase(3);
    });

    it('should have correct flag configuration for Phase 3', () => {
      const flags = FeatureFlagService.getAllFlags();
      expect(flags.migration_phase).toBe(3);
      expect(flags.dual_write_enabled).toBe(true);
      expect(flags.dual_read_enabled).toBe(true);
      expect(flags.read_from_dynamodb).toBe(false);
      expect(flags.validation_enabled).toBe(true);
    });

    it('should read from both databases with validation in Phase 3', async () => {
      // Arrange
      mysqlRepo.findById.mockResolvedValue(sampleUser);
      dynamodbRepo.findById.mockResolvedValue(sampleUser);

      // Act
      const result = await readWrapper.findById(1);

      // Assert
      expect(result).toEqual(sampleUser);
      expect(mysqlRepo.findById).toHaveBeenCalledWith(1);
      expect(dynamodbRepo.findById).toHaveBeenCalledWith(1);
    });

    it('should write to both databases in Phase 3', async () => {
      // Arrange
      mysqlRepo.create.mockResolvedValue(sampleUser);
      dynamodbRepo.create.mockResolvedValue(sampleUser);

      // Act
      const result = await writeWrapper.create(createUserData);

      // Assert
      expect(result).toEqual(sampleUser);
      expect(mysqlRepo.create).toHaveBeenCalledWith(createUserData);
      expect(dynamodbRepo.create).toHaveBeenCalled();
    });

    it('should detect validation errors in Phase 3', async () => {
      // Arrange
      const mysqlUser = { ...sampleUser, username: 'mysql_user' };
      const dynamodbUser = { ...sampleUser, username: 'dynamo_user' };
      mysqlRepo.findById.mockResolvedValue(mysqlUser);
      dynamodbRepo.findById.mockResolvedValue(dynamodbUser);

      // Act & Assert
      await expect(readWrapper.findById(1)).rejects.toThrow(
        'Data validation failed for User ID 1'
      );
    });
  });

  describe('Phase Transitions', () => {
    it('should transition correctly from Phase 1 to Phase 5', async () => {
      // Start in Phase 1
      FeatureFlagService.setMigrationPhase(1);
      mysqlRepo.findById.mockResolvedValue(sampleUser);
      
      let result = await readWrapper.findById(1);
      expect(result).toEqual(sampleUser);
      expect(mysqlRepo.findById).toHaveBeenCalledWith(1);
      expect(dynamodbRepo.findById).not.toHaveBeenCalled();

      // Clear mocks
      jest.clearAllMocks();

      // Transition to Phase 5
      FeatureFlagService.setMigrationPhase(5);
      dynamodbRepo.findById.mockResolvedValue(sampleUser);
      
      result = await readWrapper.findById(1);
      expect(result).toEqual(sampleUser);
      expect(dynamodbRepo.findById).toHaveBeenCalledWith(1);
      expect(mysqlRepo.findById).not.toHaveBeenCalled();
    });

    it('should handle invalid phase numbers', () => {
      expect(() => FeatureFlagService.setMigrationPhase(0)).toThrow(
        'Migration phase must be between 1 and 5'
      );
      expect(() => FeatureFlagService.setMigrationPhase(6)).toThrow(
        'Migration phase must be between 1 and 5'
      );
    });
  });

  describe('Complete Migration Flow', () => {
    it('should work correctly through all phases in sequence', async () => {
      const phases = [1, 2, 3, 4, 5];
      
      for (const phase of phases) {
        FeatureFlagService.setMigrationPhase(phase);
        const flags = FeatureFlagService.getAllFlags();
        
        // Verify phase is set correctly
        expect(flags.migration_phase).toBe(phase);
        
        // Verify flag combinations are correct for each phase
        switch (phase) {
          case 1:
            expect(flags.dual_write_enabled).toBe(false);
            expect(flags.dual_read_enabled).toBe(false);
            expect(flags.read_from_dynamodb).toBe(false);
            expect(flags.validation_enabled).toBe(false);
            break;
          case 2:
            expect(flags.dual_write_enabled).toBe(true);
            expect(flags.dual_read_enabled).toBe(false);
            expect(flags.read_from_dynamodb).toBe(false);
            expect(flags.validation_enabled).toBe(false);
            break;
          case 3:
            expect(flags.dual_write_enabled).toBe(true);
            expect(flags.dual_read_enabled).toBe(true);
            expect(flags.read_from_dynamodb).toBe(false);
            expect(flags.validation_enabled).toBe(true);
            break;
          case 4:
            expect(flags.dual_write_enabled).toBe(true);
            expect(flags.dual_read_enabled).toBe(false);
            expect(flags.read_from_dynamodb).toBe(true);
            expect(flags.validation_enabled).toBe(false);
            break;
          case 5:
            expect(flags.dual_write_enabled).toBe(false);
            expect(flags.dual_read_enabled).toBe(false);
            expect(flags.read_from_dynamodb).toBe(true);
            expect(flags.validation_enabled).toBe(false);
            break;
        }
      }
    });
  });
});

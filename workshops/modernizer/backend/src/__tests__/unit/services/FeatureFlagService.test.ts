import { FeatureFlagService } from '../../../services/FeatureFlagService';

describe('FeatureFlagService', () => {
  beforeEach(() => {
    FeatureFlagService.reset();
  });

  describe('getFlag', () => {
    it('should return default flag values', () => {
      expect(FeatureFlagService.getFlag('dual_write_enabled')).toBe(false);
      expect(FeatureFlagService.getFlag('dual_read_enabled')).toBe(false);
      expect(FeatureFlagService.getFlag('read_from_dynamodb')).toBe(false);
      expect(FeatureFlagService.getFlag('migration_phase')).toBe(1);
      expect(FeatureFlagService.getFlag('validation_enabled')).toBe(false);
    });
  });

  describe('setFlag', () => {
    it('should set individual flags correctly', () => {
      FeatureFlagService.setFlag('dual_write_enabled', true);
      expect(FeatureFlagService.getFlag('dual_write_enabled')).toBe(true);

      FeatureFlagService.setFlag('migration_phase', 3);
      expect(FeatureFlagService.getFlag('migration_phase')).toBe(3);
    });
  });

  describe('getAllFlags', () => {
    it('should return all flags', () => {
      const flags = FeatureFlagService.getAllFlags();
      expect(flags).toEqual({
        dual_write_enabled: false,
        dual_read_enabled: false,
        read_from_dynamodb: false,
        migration_phase: 1,
        validation_enabled: false,
      });
    });

    it('should return a copy of flags', () => {
      const flags = FeatureFlagService.getAllFlags();
      flags.dual_write_enabled = true;
      expect(FeatureFlagService.getFlag('dual_write_enabled')).toBe(false);
    });
  });

  describe('setMigrationPhase', () => {
    it('should set Phase 1 flags correctly', () => {
      FeatureFlagService.setMigrationPhase(1);
      expect(FeatureFlagService.getFlag('migration_phase')).toBe(1);
      expect(FeatureFlagService.getFlag('dual_write_enabled')).toBe(false);
      expect(FeatureFlagService.getFlag('dual_read_enabled')).toBe(false);
      expect(FeatureFlagService.getFlag('read_from_dynamodb')).toBe(false);
      expect(FeatureFlagService.getFlag('validation_enabled')).toBe(false);
    });

    it('should set Phase 2 flags correctly', () => {
      FeatureFlagService.setMigrationPhase(2);
      expect(FeatureFlagService.getFlag('migration_phase')).toBe(2);
      expect(FeatureFlagService.getFlag('dual_write_enabled')).toBe(true);
      expect(FeatureFlagService.getFlag('dual_read_enabled')).toBe(false);
      expect(FeatureFlagService.getFlag('read_from_dynamodb')).toBe(false);
      expect(FeatureFlagService.getFlag('validation_enabled')).toBe(false);
    });

    it('should set Phase 3 flags correctly', () => {
      FeatureFlagService.setMigrationPhase(3);
      expect(FeatureFlagService.getFlag('migration_phase')).toBe(3);
      expect(FeatureFlagService.getFlag('dual_write_enabled')).toBe(true);
      expect(FeatureFlagService.getFlag('dual_read_enabled')).toBe(true);
      expect(FeatureFlagService.getFlag('read_from_dynamodb')).toBe(false);
      expect(FeatureFlagService.getFlag('validation_enabled')).toBe(true);
    });

    it('should set Phase 4 flags correctly', () => {
      FeatureFlagService.setMigrationPhase(4);
      expect(FeatureFlagService.getFlag('migration_phase')).toBe(4);
      expect(FeatureFlagService.getFlag('dual_write_enabled')).toBe(true);
      expect(FeatureFlagService.getFlag('dual_read_enabled')).toBe(false);
      expect(FeatureFlagService.getFlag('read_from_dynamodb')).toBe(true);
      expect(FeatureFlagService.getFlag('validation_enabled')).toBe(false);
    });

    it('should set Phase 5 flags correctly', () => {
      FeatureFlagService.setMigrationPhase(5);
      expect(FeatureFlagService.getFlag('migration_phase')).toBe(5);
      expect(FeatureFlagService.getFlag('dual_write_enabled')).toBe(false);
      expect(FeatureFlagService.getFlag('dual_read_enabled')).toBe(false);
      expect(FeatureFlagService.getFlag('read_from_dynamodb')).toBe(true);
      expect(FeatureFlagService.getFlag('validation_enabled')).toBe(false);
    });

    it('should throw error for invalid phase', () => {
      expect(() => FeatureFlagService.setMigrationPhase(0)).toThrow('Migration phase must be between 1 and 5');
      expect(() => FeatureFlagService.setMigrationPhase(6)).toThrow('Migration phase must be between 1 and 5');
    });
  });

  describe('reset', () => {
    it('should reset all flags to defaults', () => {
      FeatureFlagService.setFlag('dual_write_enabled', true);
      FeatureFlagService.setFlag('migration_phase', 3);
      
      FeatureFlagService.reset();
      
      expect(FeatureFlagService.getFlag('dual_write_enabled')).toBe(false);
      expect(FeatureFlagService.getFlag('migration_phase')).toBe(1);
    });
  });
});

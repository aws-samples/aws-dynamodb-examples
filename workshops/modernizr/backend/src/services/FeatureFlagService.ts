export interface FeatureFlags {
  dual_write_enabled: boolean;
  dual_read_enabled: boolean;
  read_from_dynamodb: boolean;
  migration_phase: number;
  validation_enabled: boolean;
}

export class FeatureFlagService {
  private static flags: FeatureFlags = {
    dual_write_enabled: false,
    dual_read_enabled: false,
    read_from_dynamodb: false,
    migration_phase: 1,
    validation_enabled: false,
  };

  static getFlag<K extends keyof FeatureFlags>(flagName: K): FeatureFlags[K] {
    return this.flags[flagName];
  }

  static setFlag<K extends keyof FeatureFlags>(flagName: K, value: FeatureFlags[K]): void {
    this.flags[flagName] = value;
  }

  static getAllFlags(): FeatureFlags {
    return { ...this.flags };
  }

  static setMigrationPhase(phase: number): void {
    if (phase < 1 || phase > 5) {
      throw new Error('Migration phase must be between 1 and 5');
    }
    
    this.flags.migration_phase = phase;
    
    // Set flags based on migration phase
    switch (phase) {
      case 1: // MySQL Only
        this.flags.dual_write_enabled = false;
        this.flags.dual_read_enabled = false;
        this.flags.read_from_dynamodb = false;
        this.flags.validation_enabled = false;
        break;
      case 2: // Dual Write + MySQL Read
        this.flags.dual_write_enabled = true;
        this.flags.dual_read_enabled = false;
        this.flags.read_from_dynamodb = false;
        this.flags.validation_enabled = false;
        break;
      case 3: // Dual Write + Dual Read with validation
        this.flags.dual_write_enabled = true;
        this.flags.dual_read_enabled = true;
        this.flags.read_from_dynamodb = false;
        this.flags.validation_enabled = true;
        break;
      case 4: // Dual Write + DynamoDB Read
        this.flags.dual_write_enabled = true;
        this.flags.dual_read_enabled = false;
        this.flags.read_from_dynamodb = true;
        this.flags.validation_enabled = false;
        break;
      case 5: // DynamoDB Only
        this.flags.dual_write_enabled = false;
        this.flags.dual_read_enabled = false;
        this.flags.read_from_dynamodb = true;
        this.flags.validation_enabled = false;
        break;
    }
  }

  static reset(): void {
    this.flags = {
      dual_write_enabled: false,
      dual_read_enabled: false,
      read_from_dynamodb: false,
      migration_phase: 1,
      validation_enabled: false,
    };
  }
}

import { Request, Response } from 'express';
import { FeatureFlagService, FeatureFlags } from '../services/FeatureFlagService';
import { DatabaseFactory } from '../database/factory/DatabaseFactory';

export class AdminController {
  // GET /admin/flags/status - Get current feature flag status and migration phase
  async getFlagsStatus(req: Request, res: Response): Promise<void> {
    try {
      const flags = FeatureFlagService.getAllFlags();
      
      res.json({
        success: true,
        data: {
          flags,
          migration_phase: flags.migration_phase,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          type: 'InternalServerError',
          message: error instanceof Error ? error.message : 'Failed to get flags status'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // POST /admin/flags/set - Set individual feature flags
  async setFlags(req: Request, res: Response): Promise<void> {
    try {
      const { flags } = req.body;

      if (!flags || typeof flags !== 'object') {
        res.status(400).json({
          success: false,
          error: {
            type: 'ValidationError',
            message: 'flags object is required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate and set each flag
      const validFlags: (keyof FeatureFlags)[] = [
        'dual_write_enabled',
        'dual_read_enabled', 
        'read_from_dynamodb',
        'migration_phase',
        'validation_enabled'
      ];

      const updatedFlags: Partial<FeatureFlags> = {};

      for (const [key, value] of Object.entries(flags)) {
        if (!validFlags.includes(key as keyof FeatureFlags)) {
          res.status(400).json({
            success: false,
            error: {
              type: 'ValidationError',
              message: `Invalid flag: ${key}. Valid flags: ${validFlags.join(', ')}`
            },
            timestamp: new Date().toISOString()
          });
          return;
        }

        // Validate migration_phase range
        if (key === 'migration_phase') {
          if (typeof value !== 'number' || value < 1 || value > 5) {
            res.status(400).json({
              success: false,
              error: {
                type: 'ValidationError',
                message: 'migration_phase must be a number between 1 and 5'
              },
              timestamp: new Date().toISOString()
            });
            return;
          }
        }

        // Validate boolean flags
        if (key !== 'migration_phase' && typeof value !== 'boolean') {
          res.status(400).json({
            success: false,
            error: {
              type: 'ValidationError',
              message: `${key} must be a boolean value`
            },
            timestamp: new Date().toISOString()
          });
          return;
        }

        FeatureFlagService.setFlag(key as keyof FeatureFlags, value as any);
        (updatedFlags as any)[key] = value;
      }

      console.log(`[ADMIN] Flags updated by user ${req.user?.userId}:`, updatedFlags);

      res.json({
        success: true,
        data: {
          updated_flags: updatedFlags,
          current_flags: FeatureFlagService.getAllFlags(),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          type: 'InternalServerError',
          message: error instanceof Error ? error.message : 'Failed to set flags'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // POST /admin/migration/phase - Change migration phase with validation
  async setMigrationPhase(req: Request, res: Response): Promise<void> {
    try {
      const { phase } = req.body;

      if (typeof phase !== 'number' || phase < 1 || phase > 5) {
        res.status(400).json({
          success: false,
          error: {
            type: 'ValidationError',
            message: 'phase must be a number between 1 and 5'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const previousPhase = FeatureFlagService.getFlag('migration_phase');
      
      FeatureFlagService.setMigrationPhase(phase);
      
      console.log(`[ADMIN] Migration phase changed by user ${req.user?.userId}: ${previousPhase} → ${phase}`);

      res.json({
        success: true,
        data: {
          previous_phase: previousPhase,
          new_phase: phase,
          flags: FeatureFlagService.getAllFlags(),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          type: 'InternalServerError',
          message: error instanceof Error ? error.message : 'Failed to set migration phase'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // GET /admin/migration/status - Get detailed migration status
  async getMigrationStatus(req: Request, res: Response): Promise<void> {
    try {
      const flags = FeatureFlagService.getAllFlags();
      
      // Determine migration phase description
      const phaseDescriptions = {
        1: 'MySQL Only - Baseline state',
        2: 'Dual Write + MySQL Read - Safety phase',
        3: 'Dual Write + Dual Read with Validation - Validation phase',
        4: 'Dual Write + DynamoDB Read - Transition phase',
        5: 'DynamoDB Only - Final state'
      };

      res.json({
        success: true,
        data: {
          current_phase: flags.migration_phase,
          phase_description: phaseDescriptions[flags.migration_phase as keyof typeof phaseDescriptions],
          flags,
          database_status: {
            mysql_active: !flags.read_from_dynamodb || flags.dual_write_enabled,
            dynamodb_active: flags.read_from_dynamodb || flags.dual_write_enabled,
            dual_write_active: flags.dual_write_enabled,
            dual_read_active: flags.dual_read_enabled,
            validation_active: flags.validation_enabled
          },
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          type: 'InternalServerError',
          message: error instanceof Error ? error.message : 'Failed to get migration status'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // POST /admin/migration/validate - Trigger manual data validation
  async validateMigration(req: Request, res: Response): Promise<void> {
    try {
      // This is a placeholder for manual validation trigger
      // In a real implementation, this would trigger validation jobs
      
      console.log(`[ADMIN] Manual validation triggered by user ${req.user?.userId}`);

      res.json({
        success: true,
        data: {
          message: 'Manual validation triggered',
          validation_status: 'initiated',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          type: 'InternalServerError',
          message: error instanceof Error ? error.message : 'Failed to trigger validation'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // GET /admin/migration/logs - Get migration operation logs
  async getMigrationLogs(req: Request, res: Response): Promise<void> {
    try {
      // This is a placeholder for log retrieval
      // In a real implementation, this would fetch logs from a logging system
      
      const logs = [
        {
          timestamp: new Date().toISOString(),
          level: 'INFO',
          message: 'Migration phase changed to 1',
          user_id: req.user?.userId
        }
      ];

      res.json({
        success: true,
        data: {
          logs,
          total_count: logs.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          type: 'InternalServerError',
          message: error instanceof Error ? error.message : 'Failed to get migration logs'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // POST /admin/migration/rollback - Rollback to previous migration phase
  async rollbackMigration(req: Request, res: Response): Promise<void> {
    try {
      const currentPhase = FeatureFlagService.getFlag('migration_phase');
      
      if (currentPhase <= 1) {
        res.status(400).json({
          success: false,
          error: {
            type: 'ValidationError',
            message: 'Cannot rollback from phase 1'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const previousPhase = currentPhase - 1;
      FeatureFlagService.setMigrationPhase(previousPhase);
      
      console.log(`[ADMIN] Migration rollback by user ${req.user?.userId}: ${currentPhase} → ${previousPhase}`);

      res.json({
        success: true,
        data: {
          previous_phase: currentPhase,
          new_phase: previousPhase,
          flags: FeatureFlagService.getAllFlags(),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          type: 'InternalServerError',
          message: error instanceof Error ? error.message : 'Failed to rollback migration'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // POST /admin/users/:id/promote - Promote user to super admin
  async promoteToSuperAdmin(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          error: {
            type: 'ValidationError',
            message: 'Invalid user ID'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const userRepository = DatabaseFactory.createUserRepository();
      const user = await userRepository.findById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NotFoundError',
            message: 'User not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (user.super_admin) {
        res.status(400).json({
          success: false,
          error: {
            type: 'ValidationError',
            message: 'User is already a super admin'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const updatedUser = await userRepository.promoteToSuperAdmin(userId);
      console.log(`[ADMIN] User ${userId} promoted to super admin by user ${req.user?.userId}`);

      res.json({
        success: true,
        data: {
          message: `User ${userId} promoted to super admin`,
          user_id: userId,
          user: updatedUser,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          type: 'InternalServerError',
          message: error instanceof Error ? error.message : 'Failed to promote user'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // POST /admin/users/:id/demote - Remove super admin privileges
  async demoteFromSuperAdmin(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          error: {
            type: 'ValidationError',
            message: 'Invalid user ID'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const userRepository = DatabaseFactory.createUserRepository();
      const user = await userRepository.findById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NotFoundError',
            message: 'User not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!user.super_admin) {
        res.status(400).json({
          success: false,
          error: {
            type: 'ValidationError',
            message: 'User is not a super admin'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const updatedUser = await userRepository.demoteFromSuperAdmin(userId);
      console.log(`[ADMIN] User ${userId} demoted from super admin by user ${req.user?.userId}`);

      res.json({
        success: true,
        data: {
          message: `User ${userId} demoted from super admin`,
          user_id: userId,
          user: updatedUser,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          type: 'InternalServerError',
          message: error instanceof Error ? error.message : 'Failed to demote user'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // GET /admin/users/super-admins - List all super admin users
  async getSuperAdmins(req: Request, res: Response): Promise<void> {
    try {
      const userRepository = DatabaseFactory.createUserRepository();
      const superAdmins = await userRepository.findAllSuperAdmins();
      
      // Remove password_hash from response
      const sanitizedSuperAdmins = superAdmins.map(user => {
        const { password_hash, ...userResponse } = user;
        return userResponse;
      });

      res.json({
        success: true,
        data: {
          super_admins: sanitizedSuperAdmins,
          total_count: sanitizedSuperAdmins.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          type: 'InternalServerError',
          message: error instanceof Error ? error.message : 'Failed to get super admins'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
}

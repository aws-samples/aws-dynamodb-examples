import api from './api';

export interface FeatureFlags {
  dual_write_enabled: boolean;
  dual_read_enabled: boolean;
  read_from_dynamodb: boolean;
  migration_phase: number;
  validation_enabled: boolean;
}

export interface FlagsStatusResponse {
  success: boolean;
  data: {
    flags: FeatureFlags;
    migration_phase: number;
    timestamp: string;
  };
}

export interface SuperAdminUser {
  id: number;
  username: string;
  email: string;
  super_admin: boolean;
}

export const adminService = {
  // Flag management
  async getFlagsStatus(): Promise<FlagsStatusResponse> {
    const response = await api.get('/admin/flags/status');
    return response.data;
  },

  async setFlags(flags: Partial<FeatureFlags>): Promise<void> {
    await api.post('/admin/flags/set', { flags });
  },

  // Migration control
  async setMigrationPhase(phase: number): Promise<void> {
    await api.post('/admin/migration/phase', { phase });
  },

  async getMigrationStatus(): Promise<any> {
    const response = await api.get('/admin/migration/status');
    return response.data;
  },

  async validateMigration(): Promise<any> {
    const response = await api.post('/admin/migration/validate');
    return response.data;
  },

  async getMigrationLogs(): Promise<any> {
    const response = await api.get('/admin/migration/logs');
    return response.data;
  },

  async rollbackMigration(): Promise<void> {
    await api.post('/admin/migration/rollback');
  },

  // Super admin management
  async promoteToSuperAdmin(userId: number): Promise<void> {
    await api.post(`/admin/users/${userId}/promote`);
  },

  async demoteFromSuperAdmin(userId: number): Promise<void> {
    await api.post(`/admin/users/${userId}/demote`);
  },

  async getSuperAdmins(): Promise<SuperAdminUser[]> {
    const response = await api.get('/admin/users/super-admins');
    return response.data.data;
  }
};

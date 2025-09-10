import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { adminService, FeatureFlags } from '../services/adminService';
import { logger } from '../services/logger';

const AdminMigrationControlPage: React.FC = () => {
  const { user } = useAuth();
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.super_admin) {
      loadFlagsStatus();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Check super admin access
  if (!user?.super_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You must be a super admin to access this page.</p>
        </div>
      </div>
    );
  }

  const loadFlagsStatus = async () => {
    try {
      setLoading(true);
      const response = await adminService.getFlagsStatus();
      setFlags(response.data.flags);
      setError(null);
    } catch (err) {
      setError('Failed to load flags status');
      logger.error('Failed to load flags status:', err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleFlagChange = async (flagName: keyof FeatureFlags, value: boolean | number) => {
    try {
      await adminService.setFlags({ [flagName]: value });
      await loadFlagsStatus();
    } catch (err) {
      setError(`Failed to update ${flagName}`);
      logger.error(`Failed to update ${flagName}:`, err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handlePhaseChange = async (phase: number) => {
    try {
      await adminService.setMigrationPhase(phase);
      await loadFlagsStatus();
    } catch (err) {
      setError(`Failed to set migration phase ${phase}`);
      logger.error(`Failed to set migration phase ${phase}:`, err instanceof Error ? err : new Error(String(err)));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Migration Control Panel</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {flags && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Status */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Current Status</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Migration Phase:</span>
                  <span className="font-bold text-blue-600">{flags.migration_phase}</span>
                </div>
                <div className="flex justify-between">
                  <span>Dual Write:</span>
                  <span className={flags.dual_write_enabled ? 'text-green-600' : 'text-red-600'}>
                    {flags.dual_write_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Dual Read:</span>
                  <span className={flags.dual_read_enabled ? 'text-green-600' : 'text-red-600'}>
                    {flags.dual_read_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Read from DynamoDB:</span>
                  <span className={flags.read_from_dynamodb ? 'text-green-600' : 'text-red-600'}>
                    {flags.read_from_dynamodb ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Validation:</span>
                  <span className={flags.validation_enabled ? 'text-green-600' : 'text-red-600'}>
                    {flags.validation_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Migration Phases */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Migration Phases</h2>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(phase => (
                  <button
                    key={phase}
                    onClick={() => handlePhaseChange(phase)}
                    className={`w-full text-left px-4 py-2 rounded ${
                      flags.migration_phase === phase
                        ? 'bg-blue-100 border-2 border-blue-500 text-blue-800'
                        : 'bg-gray-100 hover:bg-gray-200 border border-gray-300'
                    }`}
                  >
                    Phase {phase}: {getPhaseDescription(phase)}
                  </button>
                ))}
              </div>
            </div>

            {/* Individual Flag Controls */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Individual Flag Controls</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Dual Write Enabled</label>
                  <input
                    type="checkbox"
                    checked={flags.dual_write_enabled}
                    onChange={(e) => handleFlagChange('dual_write_enabled', e.target.checked)}
                    className="h-4 w-4 text-blue-600"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Dual Read Enabled</label>
                  <input
                    type="checkbox"
                    checked={flags.dual_read_enabled}
                    onChange={(e) => handleFlagChange('dual_read_enabled', e.target.checked)}
                    className="h-4 w-4 text-blue-600"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Read from DynamoDB</label>
                  <input
                    type="checkbox"
                    checked={flags.read_from_dynamodb}
                    onChange={(e) => handleFlagChange('read_from_dynamodb', e.target.checked)}
                    className="h-4 w-4 text-blue-600"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Validation Enabled</label>
                  <input
                    type="checkbox"
                    checked={flags.validation_enabled}
                    onChange={(e) => handleFlagChange('validation_enabled', e.target.checked)}
                    className="h-4 w-4 text-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={loadFlagsStatus}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Refresh Status
                </button>
                <button
                  onClick={() => adminService.validateMigration()}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Validate Migration
                </button>
                <button
                  onClick={() => adminService.rollbackMigration()}
                  className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Rollback Migration
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const getPhaseDescription = (phase: number): string => {
  switch (phase) {
    case 1: return 'MySQL Only';
    case 2: return 'Dual Write + MySQL Read';
    case 3: return 'Dual Write + Dual Read';
    case 4: return 'Dual Write + DynamoDB Read';
    case 5: return 'DynamoDB Only';
    default: return 'Unknown';
  }
};

export default AdminMigrationControlPage;

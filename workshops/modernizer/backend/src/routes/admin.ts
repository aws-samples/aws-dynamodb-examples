import express from 'express';
import { AdminController } from '../controllers/AdminController';
import { authenticate } from '../middleware/auth';
import { requireSuperAdmin } from '../middleware/superAdmin';

const router = express.Router();
const adminController = new AdminController();

// All admin routes require authentication and super admin privileges
router.use(authenticate);
router.use(requireSuperAdmin);

// Feature flag management endpoints
router.get('/flags/status', adminController.getFlagsStatus.bind(adminController));
router.post('/flags/set', adminController.setFlags.bind(adminController));

// Migration control endpoints
router.post('/migration/phase', adminController.setMigrationPhase.bind(adminController));
router.get('/migration/status', adminController.getMigrationStatus.bind(adminController));
router.post('/migration/validate', adminController.validateMigration.bind(adminController));
router.get('/migration/logs', adminController.getMigrationLogs.bind(adminController));
router.post('/migration/rollback', adminController.rollbackMigration.bind(adminController));

// Super admin user management endpoints
router.post('/users/:id/promote', adminController.promoteToSuperAdmin.bind(adminController));
router.post('/users/:id/demote', adminController.demoteFromSuperAdmin.bind(adminController));
router.get('/users/super-admins', adminController.getSuperAdmins.bind(adminController));

export default router;

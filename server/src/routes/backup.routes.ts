import { Router } from 'express';
import { backupController } from '../controllers/backup.controller';
import { authenticate } from '../middleware/auth';
import { attachBusiness, requirePermission } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { PERMISSIONS } from '../models/BusinessMember';
import { restoreBackupSchema } from '../validators/backup.validator';

export const backupRouter = Router();

// POST /api/backup/create - Create backup
backupRouter.post(
  '/create',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.BACKUP_CREATE),
  backupController.create
);

// GET /api/backup - List backups
backupRouter.get(
  '/',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.BACKUP_CREATE),
  backupController.list
);

// POST /api/backup/restore - Restore backup (destructive operation)
backupRouter.post(
  '/restore',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.BACKUP_RESTORE),
  validateBody(restoreBackupSchema),
  backupController.restore
);

export default backupRouter;

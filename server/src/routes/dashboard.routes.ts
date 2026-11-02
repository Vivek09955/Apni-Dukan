import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';
import { attachBusiness, requirePermission } from '../middleware/rbac';
import { PERMISSIONS } from '../models/BusinessMember';

export const dashboardRouter = Router();

// GET /api/dashboard - Aggregate business analytics & dashboard data
dashboardRouter.get(
  '/',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.REPORT_VIEW),
  dashboardController.getDashboard
);

export default dashboardRouter;

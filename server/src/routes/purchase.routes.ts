import { Router } from 'express';
import { purchaseController } from '../controllers/purchase.controller';
import { authenticate } from '../middleware/auth';
import { attachBusiness, requirePermission } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { PERMISSIONS } from '../models/BusinessMember';
import {
  createPurchaseBillSchema,
  cancelBillSchema,
} from '../validators/purchase.validator';

export const purchaseRouter = Router();

// POST /api/purchases - Create purchase bill
purchaseRouter.post(
  '/',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.PURCHASE_CREATE),
  validateBody(createPurchaseBillSchema),
  purchaseController.create
);

// GET /api/purchases - List purchase bills
purchaseRouter.get(
  '/',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.PURCHASE_VIEW),
  purchaseController.list
);

// GET /api/purchases/summary - Purchase summary (must be above :id)
purchaseRouter.get(
  '/summary',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.PURCHASE_VIEW),
  purchaseController.getSummary
);

// GET /api/purchases/:id - Single bill details
purchaseRouter.get(
  '/:id',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.PURCHASE_VIEW),
  purchaseController.getById
);

// PATCH /api/purchases/:id/receive - Mark draft bill as received
purchaseRouter.patch(
  '/:id/receive',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.PURCHASE_EDIT),
  purchaseController.receive
);

// PATCH /api/purchases/:id/cancel - Cancel bill
purchaseRouter.patch(
  '/:id/cancel',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.PURCHASE_DELETE),
  validateBody(cancelBillSchema),
  purchaseController.cancel
);

export default purchaseRouter;

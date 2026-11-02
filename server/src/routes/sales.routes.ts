import { Router } from 'express';
import { salesController } from '../controllers/sales.controller';
import { authenticate } from '../middleware/auth';
import { attachBusiness, requirePermission } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { PERMISSIONS } from '../models/BusinessMember';
import {
  createInvoiceSchema,
  cancelInvoiceSchema,
} from '../validators/sales.validator';

export const salesRouter = Router();

// POST /api/sales - Create invoice
salesRouter.post(
  '/',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.SALES_CREATE),
  validateBody(createInvoiceSchema),
  salesController.create
);

// GET /api/sales - List invoices
salesRouter.get(
  '/',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.SALES_VIEW),
  salesController.list
);

// GET /api/sales/summary - Invoices dashboard summary (must be above :id)
salesRouter.get(
  '/summary',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.SALES_VIEW),
  salesController.getSummary
);

// GET /api/sales/:id - Single invoice details
salesRouter.get(
  '/:id',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.SALES_VIEW),
  salesController.getById
);

// PATCH /api/sales/:id/issue - Issue draft invoice
salesRouter.patch(
  '/:id/issue',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.SALES_EDIT),
  salesController.issue
);

// PATCH /api/sales/:id/cancel - Cancel invoice
salesRouter.patch(
  '/:id/cancel',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.SALES_DELETE),
  validateBody(cancelInvoiceSchema),
  salesController.cancel
);

export default salesRouter;

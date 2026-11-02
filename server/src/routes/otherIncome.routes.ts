import { Router } from 'express';
import * as otherIncomeController from '../controllers/otherIncome.controller';
import { authenticate } from '../middleware/auth';
import { attachBusiness, requirePermission } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { PERMISSIONS } from '../models/BusinessMember';
import {
  createOtherIncomeSchema,
  cancelOtherIncomeSchema,
} from '../validators/otherIncome.validator';

export const otherIncomeRouter = Router();

// POST /api/income - Create income entry
otherIncomeRouter.post(
  '/',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.ACCOUNTING_CREATE),
  validateBody(createOtherIncomeSchema),
  otherIncomeController.create
);

// GET /api/income - List income entries
otherIncomeRouter.get(
  '/',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.ACCOUNTING_VIEW),
  otherIncomeController.list
);

// GET /api/income/categories - List standard income categories (must be before /:id)
otherIncomeRouter.get(
  '/categories',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.ACCOUNTING_VIEW),
  otherIncomeController.getCategories
);

// GET /api/income/:id - Single income entry details
otherIncomeRouter.get(
  '/:id',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.ACCOUNTING_VIEW),
  otherIncomeController.getById
);

// PATCH /api/income/:id/cancel - Cancel income entry
otherIncomeRouter.patch(
  '/:id/cancel',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.ACCOUNTING_CREATE),
  validateBody(cancelOtherIncomeSchema),
  otherIncomeController.cancel
);

export default otherIncomeRouter;

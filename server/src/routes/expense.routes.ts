import { Router } from 'express';
import * as expenseController from '../controllers/expense.controller';
import { authenticate } from '../middleware/auth';
import { attachBusiness, requirePermission } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { PERMISSIONS } from '../models/BusinessMember';
import {
  createExpenseSchema,
  cancelExpenseSchema,
} from '../validators/expense.validator';

export const expenseRouter = Router();

// POST /api/expenses - Create expense (EXPENSE_CREATE)
expenseRouter.post(
  '/',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.EXPENSE_CREATE),
  validateBody(createExpenseSchema),
  expenseController.create
);

// GET /api/expenses - List expenses (EXPENSE_VIEW)
expenseRouter.get(
  '/',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.EXPENSE_VIEW),
  expenseController.list
);

// GET /api/expenses/categories - Get categories (EXPENSE_VIEW) - Must be before /:id
expenseRouter.get(
  '/categories',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.EXPENSE_VIEW),
  expenseController.getCategories
);

// GET /api/expenses/summary - Category wise summary (EXPENSE_VIEW) - Must be before /:id
expenseRouter.get(
  '/summary',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.EXPENSE_VIEW),
  expenseController.getCategoryWiseSummary
);

// GET /api/expenses/:id - Get expense by ID (EXPENSE_VIEW)
expenseRouter.get(
  '/:id',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.EXPENSE_VIEW),
  expenseController.getById
);

// PATCH /api/expenses/:id/cancel - Cancel expense (EXPENSE_EDIT)
expenseRouter.patch(
  '/:id/cancel',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.EXPENSE_EDIT),
  validateBody(cancelExpenseSchema),
  expenseController.cancel
);

export default expenseRouter;

import { Router } from 'express';
import { customerController } from '../controllers/customer.controller';
import { authenticate } from '../middleware/auth';
import { attachBusiness, requirePermission } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { PERMISSIONS } from '../models/BusinessMember';
import {
  createCustomerSchema,
  updateCustomerSchema,
} from '../validators/customer.validator';

export const customerRouter = Router();

// POST /api/customers - Create customer
customerRouter.post(
  '/',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.CUSTOMER_CREATE),
  validateBody(createCustomerSchema),
  customerController.create
);

// GET /api/customers - List customers
customerRouter.get(
  '/',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.CUSTOMER_VIEW),
  customerController.list
);

// GET /api/customers/:id - Single customer details
customerRouter.get(
  '/:id',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.CUSTOMER_VIEW),
  customerController.getById
);

// PATCH /api/customers/:id - Update customer
customerRouter.patch(
  '/:id',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.CUSTOMER_EDIT),
  validateBody(updateCustomerSchema),
  customerController.update
);

// DELETE /api/customers/:id - Soft delete customer
customerRouter.delete(
  '/:id',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.CUSTOMER_DELETE),
  customerController.deleteCustomer
);

// GET /api/customers/:id/ledger - Customer account ledger
customerRouter.get(
  '/:id/ledger',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.CUSTOMER_VIEW),
  customerController.getLedger
);

// GET /api/customers/:id/outstanding - Customer outstanding balance
customerRouter.get(
  '/:id/outstanding',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.CUSTOMER_VIEW),
  customerController.getOutstanding
);

export default customerRouter;

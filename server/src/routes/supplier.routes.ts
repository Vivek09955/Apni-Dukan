import { Router } from 'express';
import { supplierController } from '../controllers/supplier.controller';
import { authenticate } from '../middleware/auth';
import { attachBusiness, requirePermission } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { PERMISSIONS } from '../models/BusinessMember';
import {
  createSupplierSchema,
  updateSupplierSchema,
} from '../validators/supplier.validator';

export const supplierRouter = Router();

// POST /api/suppliers - Create supplier
supplierRouter.post(
  '/',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.SUPPLIER_CREATE),
  validateBody(createSupplierSchema),
  supplierController.create
);

// GET /api/suppliers - List suppliers
supplierRouter.get(
  '/',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.SUPPLIER_VIEW),
  supplierController.list
);

// GET /api/suppliers/:id - Single supplier details
supplierRouter.get(
  '/:id',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.SUPPLIER_VIEW),
  supplierController.getById
);

// PATCH /api/suppliers/:id - Update supplier
supplierRouter.patch(
  '/:id',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.SUPPLIER_EDIT),
  validateBody(updateSupplierSchema),
  supplierController.update
);

// DELETE /api/suppliers/:id - Soft delete supplier
supplierRouter.delete(
  '/:id',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.SUPPLIER_DELETE),
  supplierController.deleteSupplier
);

// GET /api/suppliers/:id/ledger - Supplier account ledger
supplierRouter.get(
  '/:id/ledger',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.SUPPLIER_VIEW),
  supplierController.getLedger
);

// GET /api/suppliers/:id/outstanding - Supplier outstanding balance
supplierRouter.get(
  '/:id/outstanding',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.SUPPLIER_VIEW),
  supplierController.getOutstanding
);

export default supplierRouter;

import { Router } from 'express';
import { salesOrderController } from '../controllers/salesOrder.controller';
import { authenticate } from '../middleware/auth';
import { attachBusiness, requirePermission } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { PERMISSIONS } from '../models/BusinessMember';
import {
  createSalesOrderSchema,
  updateSalesOrderStatusSchema,
  convertSalesOrderSchema,
} from '../validators/salesOrder.validator';

export const salesOrderRouter = Router();

// POST /api/sales-orders - Create sales order
salesOrderRouter.post(
  '/',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.SALES_CREATE),
  validateBody(createSalesOrderSchema),
  salesOrderController.create
);

// GET /api/sales-orders - List sales orders
salesOrderRouter.get(
  '/',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.SALES_VIEW),
  salesOrderController.list
);

// GET /api/sales-orders/:id - Single sales order details
salesOrderRouter.get(
  '/:id',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.SALES_VIEW),
  salesOrderController.getById
);

// PATCH /api/sales-orders/:id/status - Update sales order status
salesOrderRouter.patch(
  '/:id/status',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.SALES_EDIT),
  validateBody(updateSalesOrderStatusSchema),
  salesOrderController.updateStatus
);

// POST /api/sales-orders/:id/convert - Convert sales order to Sales Invoice
salesOrderRouter.post(
  '/:id/convert',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.SALES_CREATE),
  validateBody(convertSalesOrderSchema),
  salesOrderController.convertToInvoice
);

export default salesOrderRouter;

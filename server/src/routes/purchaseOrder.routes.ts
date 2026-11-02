import { Router } from 'express';
import { purchaseOrderController } from '../controllers/purchaseOrder.controller';
import { authenticate } from '../middleware/auth';
import { attachBusiness, requirePermission } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { PERMISSIONS } from '../models/BusinessMember';
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderStatusSchema,
  convertPurchaseOrderSchema,
} from '../validators/purchaseOrder.validator';

export const purchaseOrderRouter = Router();

// POST /api/purchase-orders - Create purchase order
purchaseOrderRouter.post(
  '/',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.PURCHASE_CREATE),
  validateBody(createPurchaseOrderSchema),
  purchaseOrderController.create
);

// GET /api/purchase-orders - List purchase orders
purchaseOrderRouter.get(
  '/',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.PURCHASE_VIEW),
  purchaseOrderController.list
);

// GET /api/purchase-orders/:id - Single purchase order details
purchaseOrderRouter.get(
  '/:id',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.PURCHASE_VIEW),
  purchaseOrderController.getById
);

// PATCH /api/purchase-orders/:id/status - Update purchase order status
purchaseOrderRouter.patch(
  '/:id/status',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.PURCHASE_EDIT),
  validateBody(updatePurchaseOrderStatusSchema),
  purchaseOrderController.updateStatus
);

// POST /api/purchase-orders/:id/convert - Convert purchase order to Purchase Bill
purchaseOrderRouter.post(
  '/:id/convert',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.PURCHASE_CREATE),
  validateBody(convertPurchaseOrderSchema),
  purchaseOrderController.convertToBill
);

export default purchaseOrderRouter;

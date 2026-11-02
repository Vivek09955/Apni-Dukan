import { Router } from 'express';
import { deliveryChallanController } from '../controllers/deliveryChallan.controller';
import { authenticate } from '../middleware/auth';
import { attachBusiness, requirePermission } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { PERMISSIONS } from '../models/BusinessMember';
import {
  createDeliveryChallanSchema,
  updateDeliveryChallanStatusSchema,
} from '../validators/deliveryChallan.validator';

export const deliveryChallanRouter = Router();

// POST /api/delivery-challans - Create delivery challan
deliveryChallanRouter.post(
  '/',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.SALES_CREATE),
  validateBody(createDeliveryChallanSchema),
  deliveryChallanController.create
);

// GET /api/delivery-challans - List delivery challans
deliveryChallanRouter.get(
  '/',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.SALES_VIEW),
  deliveryChallanController.list
);

// GET /api/delivery-challans/:id - Single delivery challan details
deliveryChallanRouter.get(
  '/:id',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.SALES_VIEW),
  deliveryChallanController.getById
);

// PATCH /api/delivery-challans/:id/status - Update delivery challan status
deliveryChallanRouter.patch(
  '/:id/status',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.SALES_EDIT),
  validateBody(updateDeliveryChallanStatusSchema),
  deliveryChallanController.updateStatus
);

export default deliveryChallanRouter;

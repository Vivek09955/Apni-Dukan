import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth';
import { attachBusiness, requirePermission } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { PERMISSIONS } from '../models/BusinessMember';
import {
  createPaymentSchema,
  cancelPaymentSchema,
} from '../validators/payment.validator';

export const paymentRouter = Router();

// POST /api/payments - Create payment (PAYMENT_CREATE)
paymentRouter.post(
  '/',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.PAYMENT_CREATE),
  validateBody(createPaymentSchema),
  paymentController.createPayment
);

// GET /api/payments - List payments (PAYMENT_VIEW)
paymentRouter.get(
  '/',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.PAYMENT_VIEW),
  paymentController.list
);

// GET /api/payments/outstanding - Outstanding invoices (PAYMENT_VIEW) - Must be before /:id
paymentRouter.get(
  '/outstanding',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.PAYMENT_VIEW),
  paymentController.getOutstanding
);

// GET /api/payments/:id - Single payment by ID (PAYMENT_VIEW)
paymentRouter.get(
  '/:id',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.PAYMENT_VIEW),
  paymentController.getById
);

// PATCH /api/payments/:id/cancel - Cancel payment (PAYMENT_EDIT)
paymentRouter.patch(
  '/:id/cancel',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.PAYMENT_EDIT),
  validateBody(cancelPaymentSchema),
  paymentController.cancel
);

export default paymentRouter;

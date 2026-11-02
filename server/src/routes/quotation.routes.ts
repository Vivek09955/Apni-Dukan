import { Router } from 'express';
import { quotationController } from '../controllers/quotation.controller';
import { authenticate } from '../middleware/auth';
import { attachBusiness, requirePermission } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { PERMISSIONS } from '../models/BusinessMember';
import {
  createQuotationSchema,
  updateQuotationStatusSchema,
  convertQuotationSchema,
} from '../validators/quotation.validator';

export const quotationRouter = Router();

// POST /api/quotations - Create quotation
quotationRouter.post(
  '/',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.SALES_CREATE),
  validateBody(createQuotationSchema),
  quotationController.create
);

// GET /api/quotations - List quotations
quotationRouter.get(
  '/',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.SALES_VIEW),
  quotationController.list
);

// GET /api/quotations/:id - Single quotation details
quotationRouter.get(
  '/:id',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.SALES_VIEW),
  quotationController.getById
);

// PATCH /api/quotations/:id/status - Update quotation status
quotationRouter.patch(
  '/:id/status',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.SALES_EDIT),
  validateBody(updateQuotationStatusSchema),
  quotationController.updateStatus
);

// POST /api/quotations/:id/convert - Convert quotation to Sales Invoice
quotationRouter.post(
  '/:id/convert',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.SALES_CREATE),
  validateBody(convertQuotationSchema),
  quotationController.convertToInvoice
);

export default quotationRouter;

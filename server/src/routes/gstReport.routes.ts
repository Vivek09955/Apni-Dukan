import { Router } from 'express';
import { gstReportController } from '../controllers/gstReport.controller';
import { authenticate } from '../middleware/auth';
import { attachBusiness, requirePermission } from '../middleware/rbac';
import { PERMISSIONS } from '../models/BusinessMember';

export const gstReportRouter = Router();

// GET /api/gst/gstr1 - GSTR-1 outward supplies report
gstReportRouter.get(
  '/gstr1',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.REPORT_VIEW),
  gstReportController.getGSTR1
);

// GET /api/gst/gstr3b - GSTR-3B monthly summary report
gstReportRouter.get(
  '/gstr3b',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.REPORT_VIEW),
  gstReportController.getGSTR3B
);

// GET /api/gst/hsn-summary - HSN summary report
gstReportRouter.get(
  '/hsn-summary',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.REPORT_VIEW),
  gstReportController.getHSNSummary
);

// GET /api/gst/tax-rate-summary - Tax rate-wise breakdown report
gstReportRouter.get(
  '/tax-rate-summary',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.REPORT_VIEW),
  gstReportController.getTaxRateSummary
);

export default gstReportRouter;

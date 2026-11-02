import { Router } from 'express';
import * as accountingController from '../controllers/accounting.controller';
import { authenticate } from '../middleware/auth';
import { attachBusiness, requirePermission } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { PERMISSIONS } from '../models/BusinessMember';
import {
  createAccountSchema,
  updateAccountSchema,
  createJournalEntrySchema,
} from '../validators/accounting.validator';

export const accountingRouter = Router();

// ==========================================
// Chart of Accounts Routes
// ==========================================

// GET /api/accounting/accounts - List chart of accounts (ACCOUNTING_VIEW)
accountingRouter.get(
  '/accounts',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.ACCOUNTING_VIEW),
  accountingController.listAccounts
);

// POST /api/accounting/accounts - Create custom account (ACCOUNTING_CREATE)
accountingRouter.post(
  '/accounts',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.ACCOUNTING_CREATE),
  validateBody(createAccountSchema),
  accountingController.createAccount
);

// PATCH /api/accounting/accounts/:id - Update account (ACCOUNTING_CREATE)
accountingRouter.patch(
  '/accounts/:id',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.ACCOUNTING_CREATE),
  validateBody(updateAccountSchema),
  accountingController.updateAccount
);

// ==========================================
// Journal Entry Routes
// ==========================================

// POST /api/accounting/journal - Create manual journal entry (ACCOUNTING_CREATE)
accountingRouter.post(
  '/journal',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.ACCOUNTING_CREATE),
  validateBody(createJournalEntrySchema),
  accountingController.createJournalEntry
);

// GET /api/accounting/journal - List journal entries (ACCOUNTING_VIEW)
accountingRouter.get(
  '/journal',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.ACCOUNTING_VIEW),
  accountingController.listJournalEntries
);

// GET /api/accounting/journal/:id - Single journal entry details (ACCOUNTING_VIEW)
accountingRouter.get(
  '/journal/:id',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.ACCOUNTING_VIEW),
  accountingController.getJournalEntryById
);

// PATCH /api/accounting/journal/:id/reverse - Reverse journal entry (ACCOUNTING_CREATE)
accountingRouter.patch(
  '/journal/:id/reverse',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.ACCOUNTING_CREATE),
  accountingController.reverseJournalEntry
);

// ==========================================
// Ledger & Financial Reports Routes
// ==========================================

// GET /api/accounting/ledger/:accountId - Account ledger with running balance (ACCOUNTING_VIEW)
accountingRouter.get(
  '/ledger/:accountId',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.ACCOUNTING_VIEW),
  accountingController.getAccountLedger
);

// GET /api/accounting/trial-balance - Trial Balance report (REPORT_VIEW)
accountingRouter.get(
  '/trial-balance',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.REPORT_VIEW),
  accountingController.getTrialBalance
);

// GET /api/accounting/profit-loss - Profit & Loss statement (REPORT_VIEW)
accountingRouter.get(
  '/profit-loss',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.REPORT_VIEW),
  accountingController.getProfitAndLoss
);

// GET /api/accounting/balance-sheet - Balance Sheet statement (REPORT_VIEW)
accountingRouter.get(
  '/balance-sheet',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.REPORT_VIEW),
  accountingController.getBalanceSheet
);

// GET /api/accounting/day-book - Day Book report (REPORT_VIEW)
accountingRouter.get(
  '/day-book',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.REPORT_VIEW),
  accountingController.getDayBook
);

// GET /api/accounting/cash-book - Cash Book report (account 1001) (REPORT_VIEW)
accountingRouter.get(
  '/cash-book',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.REPORT_VIEW),
  accountingController.getCashBook
);

// GET /api/accounting/bank-book - Bank Book report (account 1002) (REPORT_VIEW)
accountingRouter.get(
  '/bank-book',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.REPORT_VIEW),
  accountingController.getBankBook
);

export default accountingRouter;

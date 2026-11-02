import mongoose, { ClientSession, Types } from 'mongoose';
import { Account, IAccount, AccountType } from '../models/Account';
import { JournalEntry, IJournalEntry, IJournalLine } from '../models/JournalEntry';
import { ISalesInvoice } from '../models/SalesInvoice';
import { IPurchaseBill } from '../models/PurchaseBill';
import { IPayment } from '../models/Payment';
import { IExpense } from '../models/Expense';
import { IOtherIncome } from '../models/OtherIncome';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { createAuditLog } from '../middleware/auditLog';
import { getNextJournalNumber } from '../utils/invoiceNumberGenerator';
import { createDefaultAccounts } from '../utils/defaultChartOfAccounts';
import {
  CreateAccountInput,
  UpdateAccountInput,
  CreateJournalEntryInput,
} from '../validators/accounting.validator';

export interface LedgerFilterParams {
  fromDate?: Date | string;
  toDate?: Date | string;
  page?: number | string;
  limit?: number | string;
}

export interface JournalFilterParams {
  startDate?: Date | string;
  endDate?: Date | string;
  referenceType?: string;
  isReversed?: boolean;
  page?: number | string;
  limit?: number | string;
  search?: string;
}

export class AccountingService {
  /**
   * Helper to retrieve or lazy-initialize an account by its standard code
   */
  async getAccountByCode(
    businessId: string | Types.ObjectId,
    code: string,
    session?: ClientSession
  ): Promise<IAccount> {
    let account = await Account.findOne({ businessId, code }).session(session || null);
    if (!account) {
      await createDefaultAccounts(businessId, session);
      account = await Account.findOne({ businessId, code }).session(session || null);
    }
    if (!account) {
      throw new NotFoundError(`Account with code ${code} not found for this business`);
    }
    return account;
  }

  /**
   * Create a manual journal entry with balanced debit/credit lines
   */
  async createJournalEntry(
    businessId: string,
    userId: string,
    data: CreateJournalEntryInput,
    session?: ClientSession,
    ipAddress?: string
  ): Promise<IJournalEntry> {
    const totalDebit = data.lines.reduce((sum, line) => sum + (Math.round(line.debit) || 0), 0);
    const totalCredit = data.lines.reduce((sum, line) => sum + (Math.round(line.credit) || 0), 0);

    if (totalDebit === 0 || totalCredit === 0) {
      throw new BadRequestError('Journal entry amount cannot be zero');
    }

    if (totalDebit !== totalCredit) {
      throw new BadRequestError(
        `Journal entry must be balanced. Total Debits (${totalDebit}) must equal Total Credits (${totalCredit})`
      );
    }

    // Verify all account IDs exist and belong to this business
    for (const line of data.lines) {
      const account = await Account.findOne({
        _id: line.accountId,
        businessId,
        isActive: true,
      }).session(session || null);

      if (!account) {
        throw new NotFoundError(`Account ${line.accountId} not found or inactive`);
      }
    }

    const entryNumber = await getNextJournalNumber(businessId, session);

    const journalEntry = new JournalEntry({
      businessId: new Types.ObjectId(businessId),
      entryNumber,
      date: data.date || new Date(),
      narration: data.narration,
      lines: data.lines.map((l) => ({
        accountId: new Types.ObjectId(l.accountId),
        debit: Math.round(l.debit || 0),
        credit: Math.round(l.credit || 0),
        description: l.description,
      })),
      referenceType: data.referenceType || 'adjustment',
      referenceId: data.referenceId ? new Types.ObjectId(data.referenceId) : undefined,
      isPosted: true,
      createdBy: new Types.ObjectId(userId),
    });

    await journalEntry.save({ session });

    await createAuditLog(
      businessId,
      userId,
      'created',
      'JournalEntry',
      journalEntry._id as Types.ObjectId,
      { entryNumber, totalAmount: totalDebit, narration: data.narration },
      ipAddress
    );

    return journalEntry;
  }

  /**
   * Auto-create journal entry when a sales invoice is issued:
   * DR Accounts Receivable (1003)    = finalAmount
   * DR Discount Given (5008)         = totalDiscount (if any)
   * CR Sales Revenue (4001)          = taxableAmount + totalDiscount (or taxableAmount if no discount)
   * CR CGST Payable (2002)           = totalCgst
   * CR SGST Payable (2003)           = totalSgst
   * CR IGST Payable (2004)           = totalIgst
   * DR/CR Round Off (5009)           = roundOff (if any)
   */
  async createSalesJournalEntry(
    businessId: string,
    userId: string,
    invoice: ISalesInvoice,
    session?: ClientSession
  ): Promise<IJournalEntry> {
    const accReceivable = await this.getAccountByCode(businessId, '1003', session);
    const accSalesRevenue = await this.getAccountByCode(businessId, '4001', session);
    const accCgst = await this.getAccountByCode(businessId, '2002', session);
    const accSgst = await this.getAccountByCode(businessId, '2003', session);
    const accIgst = await this.getAccountByCode(businessId, '2004', session);
    const accRoundOff = await this.getAccountByCode(businessId, '5009', session);
    const accDiscount = await this.getAccountByCode(businessId, '5008', session);

    const lines: IJournalLine[] = [];

    // DR Accounts Receivable
    lines.push({
      accountId: accReceivable._id as Types.ObjectId,
      debit: invoice.finalAmount,
      credit: 0,
      description: `Invoice #${invoice.invoiceNumber} receivable`,
    });

    // DR Discount Given if any
    const discount = Math.round(invoice.totalDiscount || 0);
    if (discount > 0) {
      lines.push({
        accountId: accDiscount._id as Types.ObjectId,
        debit: discount,
        credit: 0,
        description: `Trade discount on Invoice #${invoice.invoiceNumber}`,
      });
      // CR Sales Revenue with gross sales before discount
      lines.push({
        accountId: accSalesRevenue._id as Types.ObjectId,
        debit: 0,
        credit: invoice.taxableAmount + discount,
        description: `Sales revenue for Invoice #${invoice.invoiceNumber}`,
      });
    } else {
      // CR Sales Revenue
      lines.push({
        accountId: accSalesRevenue._id as Types.ObjectId,
        debit: 0,
        credit: invoice.taxableAmount,
        description: `Sales revenue for Invoice #${invoice.invoiceNumber}`,
      });
    }

    // CR GST Payables
    if (invoice.totalCgst > 0) {
      lines.push({
        accountId: accCgst._id as Types.ObjectId,
        debit: 0,
        credit: invoice.totalCgst,
        description: `CGST Output on Invoice #${invoice.invoiceNumber}`,
      });
    }

    if (invoice.totalSgst > 0) {
      lines.push({
        accountId: accSgst._id as Types.ObjectId,
        debit: 0,
        credit: invoice.totalSgst,
        description: `SGST Output on Invoice #${invoice.invoiceNumber}`,
      });
    }

    if (invoice.totalIgst > 0) {
      lines.push({
        accountId: accIgst._id as Types.ObjectId,
        debit: 0,
        credit: invoice.totalIgst,
        description: `IGST Output on Invoice #${invoice.invoiceNumber}`,
      });
    }

    // DR or CR Round Off
    const roundOff = invoice.roundOff || 0;
    if (roundOff > 0) {
      lines.push({
        accountId: accRoundOff._id as Types.ObjectId,
        debit: 0,
        credit: roundOff,
        description: `Round off income on Invoice #${invoice.invoiceNumber}`,
      });
    } else if (roundOff < 0) {
      lines.push({
        accountId: accRoundOff._id as Types.ObjectId,
        debit: Math.abs(roundOff),
        credit: 0,
        description: `Round off expense on Invoice #${invoice.invoiceNumber}`,
      });
    }

    const entryNumber = await getNextJournalNumber(businessId, session);

    const entry = new JournalEntry({
      businessId: new Types.ObjectId(businessId),
      entryNumber,
      date: invoice.invoiceDate || new Date(),
      narration: `Sales Invoice #${invoice.invoiceNumber}`,
      lines,
      referenceType: 'invoice',
      referenceId: invoice._id,
      isPosted: true,
      createdBy: new Types.ObjectId(userId),
    });

    await entry.save({ session });
    return entry;
  }

  /**
   * Auto-create journal entry when a purchase bill is received:
   * DR Purchase Expense (5002)       = taxableAmount
   * DR CGST Input Credit (2005)      = totalCgst
   * DR SGST Input Credit (2006)      = totalSgst
   * DR IGST Input Credit (2007)      = totalIgst
   * DR/CR Round Off (5009)           = roundOff (if any)
   * CR Accounts Payable (2001)       = finalAmount
   */
  async createPurchaseJournalEntry(
    businessId: string,
    userId: string,
    bill: IPurchaseBill,
    session?: ClientSession
  ): Promise<IJournalEntry> {
    const accPayable = await this.getAccountByCode(businessId, '2001', session);
    const accPurchase = await this.getAccountByCode(businessId, '5002', session);
    const accCgstInput = await this.getAccountByCode(businessId, '2005', session);
    const accSgstInput = await this.getAccountByCode(businessId, '2006', session);
    const accIgstInput = await this.getAccountByCode(businessId, '2007', session);
    const accRoundOff = await this.getAccountByCode(businessId, '5009', session);

    const lines: IJournalLine[] = [];

    // DR Purchase Expense
    lines.push({
      accountId: accPurchase._id as Types.ObjectId,
      debit: bill.taxableAmount,
      credit: 0,
      description: `Purchase Expense for Bill #${bill.billNumber}`,
    });

    // DR Input Tax Credits
    if (bill.totalCgst > 0) {
      lines.push({
        accountId: accCgstInput._id as Types.ObjectId,
        debit: bill.totalCgst,
        credit: 0,
        description: `CGST Input Credit on Bill #${bill.billNumber}`,
      });
    }

    if (bill.totalSgst > 0) {
      lines.push({
        accountId: accSgstInput._id as Types.ObjectId,
        debit: bill.totalSgst,
        credit: 0,
        description: `SGST Input Credit on Bill #${bill.billNumber}`,
      });
    }

    if (bill.totalIgst > 0) {
      lines.push({
        accountId: accIgstInput._id as Types.ObjectId,
        debit: bill.totalIgst,
        credit: 0,
        description: `IGST Input Credit on Bill #${bill.billNumber}`,
      });
    }

    // DR / CR Round Off
    const roundOff = bill.roundOff || 0;
    if (roundOff > 0) {
      lines.push({
        accountId: accRoundOff._id as Types.ObjectId,
        debit: roundOff,
        credit: 0,
        description: `Round off expense on Bill #${bill.billNumber}`,
      });
    } else if (roundOff < 0) {
      lines.push({
        accountId: accRoundOff._id as Types.ObjectId,
        debit: 0,
        credit: Math.abs(roundOff),
        description: `Round off income on Bill #${bill.billNumber}`,
      });
    }

    // CR Accounts Payable
    lines.push({
      accountId: accPayable._id as Types.ObjectId,
      debit: 0,
      credit: bill.finalAmount,
      description: `Payable to supplier for Bill #${bill.billNumber}`,
    });

    const entryNumber = await getNextJournalNumber(businessId, session);

    const entry = new JournalEntry({
      businessId: new Types.ObjectId(businessId),
      entryNumber,
      date: bill.billDate || new Date(),
      narration: `Purchase Bill #${bill.billNumber}`,
      lines,
      referenceType: 'bill',
      referenceId: bill._id,
      isPosted: true,
      createdBy: new Types.ObjectId(userId),
    });

    await entry.save({ session });
    return entry;
  }

  /**
   * Auto-create journal entry for Payment In (receipt from customer):
   * DR Cash/Bank (1001/1002)         = amount
   * CR Accounts Receivable (1003)    = amount
   */
  async createPaymentInJournalEntry(
    businessId: string,
    userId: string,
    payment: IPayment,
    session?: ClientSession
  ): Promise<IJournalEntry> {
    const cashOrBankCode = payment.paymentMethod === 'cash' ? '1001' : '1002';
    const accCashOrBank = await this.getAccountByCode(businessId, cashOrBankCode, session);
    const accReceivable = await this.getAccountByCode(businessId, '1003', session);

    const lines: IJournalLine[] = [
      {
        accountId: accCashOrBank._id as Types.ObjectId,
        debit: payment.amount,
        credit: 0,
        description: `Receipt via ${payment.paymentMethod} (Payment #${payment.paymentNumber})`,
      },
      {
        accountId: accReceivable._id as Types.ObjectId,
        debit: 0,
        credit: payment.amount,
        description: `Settlement of receivable (Payment #${payment.paymentNumber})`,
      },
    ];

    const entryNumber = await getNextJournalNumber(businessId, session);

    const entry = new JournalEntry({
      businessId: new Types.ObjectId(businessId),
      entryNumber,
      date: payment.paymentDate || new Date(),
      narration: `Payment In #${payment.paymentNumber}`,
      lines,
      referenceType: 'payment',
      referenceId: payment._id,
      isPosted: true,
      createdBy: new Types.ObjectId(userId),
    });

    await entry.save({ session });
    return entry;
  }

  /**
   * Auto-create journal entry for Payment Out (payment to supplier):
   * DR Accounts Payable (2001)       = amount
   * CR Cash/Bank (1001/1002)         = amount
   */
  async createPaymentOutJournalEntry(
    businessId: string,
    userId: string,
    payment: IPayment,
    session?: ClientSession
  ): Promise<IJournalEntry> {
    const cashOrBankCode = payment.paymentMethod === 'cash' ? '1001' : '1002';
    const accCashOrBank = await this.getAccountByCode(businessId, cashOrBankCode, session);
    const accPayable = await this.getAccountByCode(businessId, '2001', session);

    const lines: IJournalLine[] = [
      {
        accountId: accPayable._id as Types.ObjectId,
        debit: payment.amount,
        credit: 0,
        description: `Settlement of payable (Payment #${payment.paymentNumber})`,
      },
      {
        accountId: accCashOrBank._id as Types.ObjectId,
        debit: 0,
        credit: payment.amount,
        description: `Disbursement via ${payment.paymentMethod} (Payment #${payment.paymentNumber})`,
      },
    ];

    const entryNumber = await getNextJournalNumber(businessId, session);

    const entry = new JournalEntry({
      businessId: new Types.ObjectId(businessId),
      entryNumber,
      date: payment.paymentDate || new Date(),
      narration: `Payment Out #${payment.paymentNumber}`,
      lines,
      referenceType: 'payment',
      referenceId: payment._id,
      isPosted: true,
      createdBy: new Types.ObjectId(userId),
    });

    await entry.save({ session });
    return entry;
  }

  /**
   * Map expense category to standard chart of accounts code
   */
  getExpenseAccountCode(category: string): string {
    const cat = category.toLowerCase().trim();
    switch (cat) {
      case 'rent':
        return '5003';
      case 'salary':
      case 'salaries':
      case 'wages':
        return '5004';
      case 'electricity':
      case 'utilities':
        return '5005';
      case 'transport':
      case 'freight':
        return '5006';
      case 'office':
      case 'admin':
        return '5007';
      case 'purchase':
        return '5002';
      default:
        return '5010';
    }
  }

  /**
   * Auto-create journal entry for Expense:
   * DR Expense Category Account      = amount
   * CR Cash/Bank (1001/1002)         = amount
   */
  async createExpenseJournalEntry(
    businessId: string,
    userId: string,
    expense: IExpense,
    session?: ClientSession
  ): Promise<IJournalEntry> {
    const cashOrBankCode = expense.paymentMethod === 'cash' ? '1001' : '1002';
    const accCashOrBank = await this.getAccountByCode(businessId, cashOrBankCode, session);
    const expenseCode = this.getExpenseAccountCode(expense.category);
    const accExpense = await this.getAccountByCode(businessId, expenseCode, session);

    const lines: IJournalLine[] = [
      {
        accountId: accExpense._id as Types.ObjectId,
        debit: expense.amount,
        credit: 0,
        description: `Expense (${expense.category}) #${expense.expenseNumber}`,
      },
      {
        accountId: accCashOrBank._id as Types.ObjectId,
        debit: 0,
        credit: expense.amount,
        description: `Paid via ${expense.paymentMethod} for Expense #${expense.expenseNumber}`,
      },
    ];

    const entryNumber = await getNextJournalNumber(businessId, session);

    const entry = new JournalEntry({
      businessId: new Types.ObjectId(businessId),
      entryNumber,
      date: expense.expenseDate || new Date(),
      narration: `Expense #${expense.expenseNumber} - ${expense.category}`,
      lines,
      referenceType: 'expense',
      referenceId: expense._id,
      isPosted: true,
      createdBy: new Types.ObjectId(userId),
    });

    await entry.save({ session });
    return entry;
  }

  /**
   * Auto-create journal entry for Other Income:
   * DR Cash/Bank (1001/1002)         = amount
   * CR Other Income (4002/4003)      = amount
   */
  async createOtherIncomeJournalEntry(
    businessId: string,
    userId: string,
    income: IOtherIncome,
    session?: ClientSession
  ): Promise<IJournalEntry> {
    const cashOrBankCode = income.paymentMethod === 'cash' ? '1001' : '1002';
    const accCashOrBank = await this.getAccountByCode(businessId, cashOrBankCode, session);
    const incomeCode = income.category === 'discount_received' ? '4003' : '4002';
    const accIncome = await this.getAccountByCode(businessId, incomeCode, session);

    const lines: IJournalLine[] = [
      {
        accountId: accCashOrBank._id as Types.ObjectId,
        debit: income.amount,
        credit: 0,
        description: `Received via ${income.paymentMethod} for Income #${income.incomeNumber}`,
      },
      {
        accountId: accIncome._id as Types.ObjectId,
        debit: 0,
        credit: income.amount,
        description: `Income (${income.category}) #${income.incomeNumber}`,
      },
    ];

    const entryNumber = await getNextJournalNumber(businessId, session);

    const entry = new JournalEntry({
      businessId: new Types.ObjectId(businessId),
      entryNumber,
      date: income.incomeDate || new Date(),
      narration: `Other Income #${income.incomeNumber} - ${income.category}`,
      lines,
      referenceType: 'other_income',
      referenceId: income._id,
      isPosted: true,
      createdBy: new Types.ObjectId(userId),
    });

    await entry.save({ session });
    return entry;
  }

  /**
   * Reverse an existing journal entry:
   * Creates a new entry with inverted debits and credits, marks original as isReversed.
   */
  async reverseJournalEntry(
    businessId: string,
    userId: string,
    entryId: string | Types.ObjectId,
    session?: ClientSession,
    ipAddress?: string
  ): Promise<IJournalEntry> {
    const originalEntry = await JournalEntry.findOne({
      _id: entryId,
      businessId,
    }).session(session || null);

    if (!originalEntry) {
      throw new NotFoundError('Journal entry not found');
    }

    if (originalEntry.isReversed) {
      throw new BadRequestError(`Journal entry ${originalEntry.entryNumber} is already reversed`);
    }

    const reversedLines: IJournalLine[] = originalEntry.lines.map((line) => ({
      accountId: line.accountId,
      debit: line.credit,
      credit: line.debit,
      description: `Reversal: ${line.description || ''}`.trim(),
    }));

    const entryNumber = await getNextJournalNumber(businessId, session);

    const reversedEntry = new JournalEntry({
      businessId: new Types.ObjectId(businessId),
      entryNumber,
      date: new Date(),
      narration: `Reversal of entry #${originalEntry.entryNumber}: ${originalEntry.narration}`,
      lines: reversedLines,
      referenceType: originalEntry.referenceType,
      referenceId: originalEntry.referenceId,
      isPosted: true,
      createdBy: new Types.ObjectId(userId),
    });

    await reversedEntry.save({ session });

    originalEntry.isReversed = true;
    originalEntry.reversedBy = reversedEntry._id as Types.ObjectId;
    await originalEntry.save({ session });

    await createAuditLog(
      businessId,
      userId,
      'reversed',
      'JournalEntry',
      originalEntry._id as Types.ObjectId,
      {
        originalEntryNumber: originalEntry.entryNumber,
        reversedByEntryNumber: reversedEntry.entryNumber,
      },
      ipAddress
    );

    return reversedEntry;
  }

  /**
   * Trial Balance Report
   * Aggregates all journal entry lines up to asOfDate grouped by account, adds opening balances.
   */
  async getTrialBalance(businessId: string, asOfDate?: Date | string) {
    const dateLimit = asOfDate ? new Date(asOfDate) : new Date();

    // Ensure accounts are present
    const accounts = await Account.find({ businessId, isActive: true }).sort({ code: 1 });

    const journalAgg = await JournalEntry.aggregate([
      {
        $match: {
          businessId: new Types.ObjectId(businessId),
          isPosted: true,
          date: { $lte: dateLimit },
        },
      },
      { $unwind: '$lines' },
      {
        $group: {
          _id: '$lines.accountId',
          totalDebit: { $sum: '$lines.debit' },
          totalCredit: { $sum: '$lines.credit' },
        },
      },
    ]);

    const lineMap = new Map<string, { totalDebit: number; totalCredit: number }>();
    for (const item of journalAgg) {
      lineMap.set(item._id.toString(), {
        totalDebit: item.totalDebit,
        totalCredit: item.totalCredit,
      });
    }

    let grandDebitBalance = 0;
    let grandCreditBalance = 0;

    const reportRows = accounts.map((acc) => {
      const activity = lineMap.get(acc._id.toString()) || { totalDebit: 0, totalCredit: 0 };
      const opening = acc.openingBalance || 0;

      let debitBalance = 0;
      let creditBalance = 0;

      if (acc.type === 'asset' || acc.type === 'expense') {
        // Normal balance is debit
        const net = opening + (activity.totalDebit - activity.totalCredit);
        if (net >= 0) {
          debitBalance = net;
        } else {
          creditBalance = Math.abs(net);
        }
      } else {
        // liability, equity, revenue - Normal balance is credit
        const net = opening + (activity.totalCredit - activity.totalDebit);
        if (net >= 0) {
          creditBalance = net;
        } else {
          debitBalance = Math.abs(net);
        }
      }

      grandDebitBalance += debitBalance;
      grandCreditBalance += creditBalance;

      return {
        accountId: acc._id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        subType: acc.subType,
        openingBalance: opening,
        totalDebit: activity.totalDebit,
        totalCredit: activity.totalCredit,
        debitBalance,
        creditBalance,
      };
    });

    return {
      asOfDate: dateLimit,
      accounts: reportRows,
      totalDebitBalance: grandDebitBalance,
      totalCreditBalance: grandCreditBalance,
      isBalanced: grandDebitBalance === grandCreditBalance,
    };
  }

  /**
   * Profit & Loss Statement (Income Statement)
   * Net Profit = Total Revenue (credits - debits) - Total Expenses (debits - credits)
   */
  async getProfitAndLoss(businessId: string, fromDate?: Date | string, toDate?: Date | string) {
    const start = fromDate ? new Date(fromDate) : new Date(new Date().getFullYear(), 3, 1); // 1st April
    const end = toDate ? new Date(toDate) : new Date();

    const accounts = await Account.find({
      businessId,
      type: { $in: ['revenue', 'expense'] },
      isActive: true,
    }).sort({ code: 1 });

    const journalAgg = await JournalEntry.aggregate([
      {
        $match: {
          businessId: new Types.ObjectId(businessId),
          isPosted: true,
          date: { $gte: start, $lte: end },
        },
      },
      { $unwind: '$lines' },
      {
        $group: {
          _id: '$lines.accountId',
          totalDebit: { $sum: '$lines.debit' },
          totalCredit: { $sum: '$lines.credit' },
        },
      },
    ]);

    const activityMap = new Map<string, { totalDebit: number; totalCredit: number }>();
    for (const item of journalAgg) {
      activityMap.set(item._id.toString(), {
        totalDebit: item.totalDebit,
        totalCredit: item.totalCredit,
      });
    }

    const revenueAccounts: any[] = [];
    const expenseAccounts: any[] = [];
    let totalRevenue = 0;
    let totalExpense = 0;

    for (const acc of accounts) {
      const activity = activityMap.get(acc._id.toString()) || { totalDebit: 0, totalCredit: 0 };

      if (acc.type === 'revenue') {
        const netRevenue = activity.totalCredit - activity.totalDebit;
        totalRevenue += netRevenue;
        revenueAccounts.push({
          accountId: acc._id,
          code: acc.code,
          name: acc.name,
          subType: acc.subType,
          totalDebit: activity.totalDebit,
          totalCredit: activity.totalCredit,
          netAmount: netRevenue,
        });
      } else {
        const netExpense = activity.totalDebit - activity.totalCredit;
        totalExpense += netExpense;
        expenseAccounts.push({
          accountId: acc._id,
          code: acc.code,
          name: acc.name,
          subType: acc.subType,
          totalDebit: activity.totalDebit,
          totalCredit: activity.totalCredit,
          netAmount: netExpense,
        });
      }
    }

    const netProfit = totalRevenue - totalExpense;

    return {
      fromDate: start,
      toDate: end,
      revenueAccounts,
      totalRevenue,
      expenseAccounts,
      totalExpense,
      netProfit,
    };
  }

  /**
   * Balance Sheet Statement
   * Assets = Liabilities + Equity (including net profit)
   */
  async getBalanceSheet(businessId: string, asOfDate?: Date | string) {
    const dateLimit = asOfDate ? new Date(asOfDate) : new Date();

    const accounts = await Account.find({
      businessId,
      isActive: true,
    }).sort({ code: 1 });

    const journalAgg = await JournalEntry.aggregate([
      {
        $match: {
          businessId: new Types.ObjectId(businessId),
          isPosted: true,
          date: { $lte: dateLimit },
        },
      },
      { $unwind: '$lines' },
      {
        $group: {
          _id: '$lines.accountId',
          totalDebit: { $sum: '$lines.debit' },
          totalCredit: { $sum: '$lines.credit' },
        },
      },
    ]);

    const activityMap = new Map<string, { totalDebit: number; totalCredit: number }>();
    for (const item of journalAgg) {
      activityMap.set(item._id.toString(), {
        totalDebit: item.totalDebit,
        totalCredit: item.totalCredit,
      });
    }

    const assets: any[] = [];
    const liabilities: any[] = [];
    const equity: any[] = [];
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    let cumulativeRevenue = 0;
    let cumulativeExpense = 0;

    for (const acc of accounts) {
      const activity = activityMap.get(acc._id.toString()) || { totalDebit: 0, totalCredit: 0 };
      const opening = acc.openingBalance || 0;

      if (acc.type === 'asset') {
        const balance = opening + (activity.totalDebit - activity.totalCredit);
        totalAssets += balance;
        assets.push({
          accountId: acc._id,
          code: acc.code,
          name: acc.name,
          subType: acc.subType,
          balance,
        });
      } else if (acc.type === 'liability') {
        const balance = opening + (activity.totalCredit - activity.totalDebit);
        totalLiabilities += balance;
        liabilities.push({
          accountId: acc._id,
          code: acc.code,
          name: acc.name,
          subType: acc.subType,
          balance,
        });
      } else if (acc.type === 'equity') {
        const balance = opening + (activity.totalCredit - activity.totalDebit);
        totalEquity += balance;
        equity.push({
          accountId: acc._id,
          code: acc.code,
          name: acc.name,
          subType: acc.subType,
          balance,
        });
      } else if (acc.type === 'revenue') {
        cumulativeRevenue += opening + (activity.totalCredit - activity.totalDebit);
      } else if (acc.type === 'expense') {
        cumulativeExpense += opening + (activity.totalDebit - activity.totalCredit);
      }
    }

    const netProfitToDate = cumulativeRevenue - cumulativeExpense;
    const finalEquity = totalEquity + netProfitToDate;
    const totalLiabilitiesAndEquity = totalLiabilities + finalEquity;

    return {
      asOfDate: dateLimit,
      assets: {
        accounts: assets,
        total: totalAssets,
      },
      liabilities: {
        accounts: liabilities,
        total: totalLiabilities,
      },
      equity: {
        accounts: equity,
        total: totalEquity,
        netProfitToDate,
        totalWithProfit: finalEquity,
      },
      totalLiabilitiesAndEquity,
      isBalanced: totalAssets === totalLiabilitiesAndEquity,
    };
  }

  /**
   * Account Ledger with running balance
   */
  async getAccountLedger(
    businessId: string,
    accountId: string,
    params: LedgerFilterParams
  ) {
    if (!Types.ObjectId.isValid(accountId)) {
      throw new BadRequestError('Invalid Account ID');
    }

    const account = await Account.findOne({ _id: accountId, businessId });
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    const fromDate = params.fromDate ? new Date(params.fromDate) : undefined;
    const toDate = params.toDate ? new Date(params.toDate) : undefined;

    // Calculate opening balance before fromDate
    let openingBalance = account.openingBalance || 0;

    if (fromDate) {
      const priorAgg = await JournalEntry.aggregate([
        {
          $match: {
            businessId: new Types.ObjectId(businessId),
            isPosted: true,
            date: { $lt: fromDate },
            'lines.accountId': new Types.ObjectId(accountId),
          },
        },
        { $unwind: '$lines' },
        {
          $match: {
            'lines.accountId': new Types.ObjectId(accountId),
          },
        },
        {
          $group: {
            _id: null,
            totalDebit: { $sum: '$lines.debit' },
            totalCredit: { $sum: '$lines.credit' },
          },
        },
      ]);

      const priorDebit = priorAgg[0]?.totalDebit || 0;
      const priorCredit = priorAgg[0]?.totalCredit || 0;

      if (account.type === 'asset' || account.type === 'expense') {
        openingBalance += priorDebit - priorCredit;
      } else {
        openingBalance += priorCredit - priorDebit;
      }
    }

    // Query entries within the period
    const matchQuery: any = {
      businessId: new Types.ObjectId(businessId),
      isPosted: true,
      'lines.accountId': new Types.ObjectId(accountId),
    };

    if (fromDate || toDate) {
      matchQuery.date = {};
      if (fromDate) matchQuery.date.$gte = fromDate;
      if (toDate) matchQuery.date.$lte = toDate;
    }

    const entries = await JournalEntry.find(matchQuery).sort({ date: 1, entryNumber: 1 });

    let currentBalance = openingBalance;
    let periodDebit = 0;
    let periodCredit = 0;

    const transactions = entries.map((entry) => {
      const matchingLine = entry.lines.find(
        (l) => l.accountId.toString() === account._id.toString()
      );
      const debit = matchingLine?.debit || 0;
      const credit = matchingLine?.credit || 0;

      periodDebit += debit;
      periodCredit += credit;

      if (account.type === 'asset' || account.type === 'expense') {
        currentBalance += debit - credit;
      } else {
        currentBalance += credit - debit;
      }

      return {
        journalEntryId: entry._id,
        entryNumber: entry.entryNumber,
        date: entry.date,
        narration: entry.narration,
        lineDescription: matchingLine?.description,
        referenceType: entry.referenceType,
        referenceId: entry.referenceId,
        debit,
        credit,
        runningBalance: currentBalance,
      };
    });

    return {
      account: {
        _id: account._id,
        code: account.code,
        name: account.name,
        type: account.type,
        subType: account.subType,
      },
      fromDate,
      toDate,
      openingBalance,
      closingBalance: currentBalance,
      periodDebit,
      periodCredit,
      transactions,
    };
  }

  /**
   * Day Book: All journal entries for a given date
   */
  async getDayBook(businessId: string, dateStr?: Date | string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const entries = await JournalEntry.find({
      businessId,
      date: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate('lines.accountId', 'code name type')
      .populate('createdBy', 'name email')
      .sort({ entryNumber: 1 });

    const totalDebit = entries.reduce(
      (sum, e) => sum + e.lines.reduce((s, l) => s + (l.debit || 0), 0),
      0
    );
    const totalCredit = entries.reduce(
      (sum, e) => sum + e.lines.reduce((s, l) => s + (l.credit || 0), 0),
      0
    );

    return {
      date: targetDate,
      count: entries.length,
      totalDebit,
      totalCredit,
      entries,
    };
  }

  /**
   * Cash Book (Ledger for account 1001)
   */
  async getCashBook(businessId: string, params: LedgerFilterParams) {
    const cashAccount = await this.getAccountByCode(businessId, '1001');
    return this.getAccountLedger(businessId, cashAccount._id.toString(), params);
  }

  /**
   * Bank Book (Ledger for account 1002)
   */
  async getBankBook(businessId: string, params: LedgerFilterParams) {
    const bankAccount = await this.getAccountByCode(businessId, '1002');
    return this.getAccountLedger(businessId, bankAccount._id.toString(), params);
  }

  /**
   * Get Chart of Accounts
   */
  async getAccounts(businessId: string) {
    let accounts = await Account.find({ businessId }).sort({ code: 1 });
    if (accounts.length === 0) {
      await createDefaultAccounts(businessId);
      accounts = await Account.find({ businessId }).sort({ code: 1 });
    }
    return accounts;
  }

  /**
   * Create custom account
   */
  async createAccount(
    businessId: string,
    userId: string,
    data: CreateAccountInput,
    ipAddress?: string
  ): Promise<IAccount> {
    const existing = await Account.findOne({ businessId, code: data.code });
    if (existing) {
      throw new BadRequestError(`Account with code ${data.code} already exists`);
    }

    const account = new Account({
      businessId: new Types.ObjectId(businessId),
      name: data.name,
      code: data.code,
      type: data.type,
      subType: data.subType,
      parentAccount: data.parentAccount ? new Types.ObjectId(data.parentAccount) : undefined,
      description: data.description,
      openingBalance: data.openingBalance || 0,
      isSystemAccount: false,
      isActive: true,
    });

    await account.save();

    await createAuditLog(
      businessId,
      userId,
      'created',
      'Account',
      account._id as Types.ObjectId,
      { code: account.code, name: account.name, type: account.type },
      ipAddress
    );

    return account;
  }

  /**
   * Update account
   */
  async updateAccount(
    businessId: string,
    userId: string,
    accountId: string,
    data: UpdateAccountInput,
    ipAddress?: string
  ): Promise<IAccount> {
    if (!Types.ObjectId.isValid(accountId)) {
      throw new BadRequestError('Invalid Account ID');
    }

    const account = await Account.findOne({ _id: accountId, businessId });
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    if (data.name !== undefined) account.name = data.name;
    if (data.subType !== undefined) account.subType = data.subType;
    if (data.description !== undefined) account.description = data.description;
    if (data.isActive !== undefined) {
      if (account.isSystemAccount && data.isActive === false) {
        throw new BadRequestError('System accounts cannot be deactivated');
      }
      account.isActive = data.isActive;
    }
    if (data.parentAccount !== undefined) {
      account.parentAccount = data.parentAccount
        ? new Types.ObjectId(data.parentAccount)
        : undefined;
    }

    await account.save();

    await createAuditLog(
      businessId,
      userId,
      'updated',
      'Account',
      account._id as Types.ObjectId,
      { code: account.code, name: account.name },
      ipAddress
    );

    return account;
  }

  /**
   * Get journal entries with pagination and filters
   */
  async getJournalEntries(businessId: string, filters: JournalFilterParams) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const query: any = { businessId: new Types.ObjectId(businessId) };

    if (filters.referenceType) {
      query.referenceType = filters.referenceType;
    }

    if (filters.isReversed !== undefined) {
      query.isReversed = filters.isReversed;
    }

    if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) query.date.$gte = new Date(filters.startDate);
      if (filters.endDate) query.date.$lte = new Date(filters.endDate);
    }

    if (filters.search) {
      query.$or = [
        { entryNumber: { $regex: filters.search, $options: 'i' } },
        { narration: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [entries, total] = await Promise.all([
      JournalEntry.find(query)
        .populate('lines.accountId', 'code name type')
        .populate('createdBy', 'name email')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      JournalEntry.countDocuments(query),
    ]);

    return {
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single journal entry by ID
   */
  async getJournalEntryById(businessId: string, entryId: string): Promise<IJournalEntry> {
    if (!Types.ObjectId.isValid(entryId)) {
      throw new BadRequestError('Invalid Journal Entry ID');
    }

    const entry = await JournalEntry.findOne({ _id: entryId, businessId })
      .populate('lines.accountId', 'code name type')
      .populate('createdBy', 'name email');

    if (!entry) {
      throw new NotFoundError('Journal entry not found');
    }

    return entry;
  }
}

export const accountingService = new AccountingService();
export default accountingService;

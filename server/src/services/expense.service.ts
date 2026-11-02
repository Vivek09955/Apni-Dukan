import mongoose, { Types } from 'mongoose';
import { Expense, IExpense, ExpensePaymentMethod } from '../models/Expense';
import { Supplier } from '../models/Supplier';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { createAuditLog } from '../middleware/auditLog';
import { getNextExpenseNumber } from '../utils/invoiceNumberGenerator';
import { accountingService } from './accounting.service';
import { CreateExpenseInput } from '../validators/expense.validator';

export interface ExpenseFilterParams {
  category?: string;
  paymentMethod?: ExpensePaymentMethod;
  vendorId?: string;
  isRecurring?: boolean;
  isCancelled?: boolean;
  startDate?: Date | string;
  endDate?: Date | string;
  search?: string;
  page?: number | string;
  limit?: number | string;
}

export const EXPENSE_CATEGORIES = [
  { key: 'rent', label: 'Rent', defaultAccountCode: '5003' },
  { key: 'salary', label: 'Salaries & Wages', defaultAccountCode: '5004' },
  { key: 'electricity', label: 'Electricity & Utilities', defaultAccountCode: '5005' },
  { key: 'transport', label: 'Transport & Freight', defaultAccountCode: '5006' },
  { key: 'office', label: 'Office & Admin Expenses', defaultAccountCode: '5007' },
  { key: 'purchase', label: 'Purchase / Direct Expense', defaultAccountCode: '5002' },
  { key: 'other', label: 'Other Operating Expenses', defaultAccountCode: '5010' },
];

export class ExpenseService {
  /**
   * Return standard expense categories
   */
  getExpenseCategories() {
    return EXPENSE_CATEGORIES;
  }

  /**
   * Create an expense and auto-generate the corresponding double-entry journal entry
   */
  async createExpense(
    businessId: string,
    userId: string,
    data: CreateExpenseInput,
    ipAddress?: string
  ): Promise<IExpense> {
    if (data.vendorId && Types.ObjectId.isValid(data.vendorId)) {
      const vendor = await Supplier.findOne({
        _id: data.vendorId,
        businessId,
        isActive: true,
      });
      if (!vendor) {
        throw new NotFoundError('Vendor supplier not found or inactive');
      }
    }

    const expenseNumber = await getNextExpenseNumber(businessId);

    const expense = new Expense({
      businessId: new Types.ObjectId(businessId),
      expenseNumber,
      category: data.category.toLowerCase().trim(),
      amount: data.amount,
      expenseDate: data.expenseDate || new Date(),
      paymentMethod: data.paymentMethod,
      vendorName: data.vendorName,
      vendorId: data.vendorId ? new Types.ObjectId(data.vendorId) : undefined,
      description: data.description,
      notes: data.notes,
      isRecurring: data.isRecurring || false,
      recurringInterval: data.recurringInterval,
      isCancelled: false,
    });

    await expense.save();

    // Create journal entry: DR Expense Account, CR Cash/Bank
    const journalEntry = await accountingService.createExpenseJournalEntry(
      businessId,
      userId,
      expense
    );

    expense.journalEntryId = journalEntry._id as Types.ObjectId;
    await expense.save();

    await createAuditLog(
      businessId,
      userId,
      'created',
      'Expense',
      expense._id as Types.ObjectId,
      {
        expenseNumber,
        category: expense.category,
        amount: expense.amount,
        paymentMethod: expense.paymentMethod,
      },
      ipAddress
    );

    return expense;
  }

  /**
   * List expenses with filters, search, and pagination
   */
  async getExpenses(businessId: string, filters: ExpenseFilterParams) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const query: any = { businessId: new Types.ObjectId(businessId) };

    if (filters.category) {
      query.category = filters.category.toLowerCase().trim();
    }

    if (filters.paymentMethod) {
      query.paymentMethod = filters.paymentMethod;
    }

    if (filters.vendorId && Types.ObjectId.isValid(filters.vendorId)) {
      query.vendorId = new Types.ObjectId(filters.vendorId);
    }

    if (filters.isRecurring !== undefined) {
      query.isRecurring = filters.isRecurring;
    }

    if (filters.isCancelled !== undefined) {
      query.isCancelled = filters.isCancelled;
    }

    if (filters.startDate || filters.endDate) {
      query.expenseDate = {};
      if (filters.startDate) query.expenseDate.$gte = new Date(filters.startDate);
      if (filters.endDate) query.expenseDate.$lte = new Date(filters.endDate);
    }

    if (filters.search) {
      query.$or = [
        { expenseNumber: { $regex: filters.search, $options: 'i' } },
        { vendorName: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { notes: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [expenses, total] = await Promise.all([
      Expense.find(query)
        .populate('vendorId', 'name phone email companyName')
        .sort({ expenseDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Expense.countDocuments(query),
    ]);

    return {
      expenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single expense by ID
   */
  async getExpenseById(businessId: string, expenseId: string): Promise<IExpense> {
    if (!Types.ObjectId.isValid(expenseId)) {
      throw new BadRequestError('Invalid Expense ID');
    }

    const expense = await Expense.findOne({ _id: expenseId, businessId })
      .populate('vendorId', 'name phone email companyName')
      .populate('journalEntryId');

    if (!expense) {
      throw new NotFoundError('Expense not found');
    }

    return expense;
  }

  /**
   * Cancel an expense and reverse its journal entry
   */
  async cancelExpense(
    businessId: string,
    userId: string,
    expenseId: string,
    reason?: string,
    ipAddress?: string
  ): Promise<IExpense> {
    if (!Types.ObjectId.isValid(expenseId)) {
      throw new BadRequestError('Invalid Expense ID');
    }

    const expense = await Expense.findOne({ _id: expenseId, businessId });
    if (!expense) {
      throw new NotFoundError('Expense not found');
    }

    if (expense.isCancelled) {
      throw new BadRequestError('Expense is already cancelled');
    }

    if (expense.journalEntryId) {
      await accountingService.reverseJournalEntry(
        businessId,
        userId,
        expense.journalEntryId,
        undefined,
        ipAddress
      );
    }

    expense.isCancelled = true;
    expense.cancelledAt = new Date();
    expense.cancelReason = reason || 'Cancelled by user';
    await expense.save();

    await createAuditLog(
      businessId,
      userId,
      'cancelled',
      'Expense',
      expense._id as Types.ObjectId,
      { expenseNumber: expense.expenseNumber, reason },
      ipAddress
    );

    return expense;
  }

  /**
   * Aggregate expenses by category for a given date range
   */
  async getCategoryWiseSummary(businessId: string, fromDate?: Date | string, toDate?: Date | string) {
    const matchQuery: any = {
      businessId: new Types.ObjectId(businessId),
      isCancelled: false,
    };

    if (fromDate || toDate) {
      matchQuery.expenseDate = {};
      if (fromDate) matchQuery.expenseDate.$gte = new Date(fromDate);
      if (toDate) matchQuery.expenseDate.$lte = new Date(toDate);
    }

    const summary = await Expense.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    const totalExpense = summary.reduce((sum, item) => sum + item.totalAmount, 0);

    return {
      fromDate,
      toDate,
      totalExpense,
      breakdown: summary.map((item) => ({
        category: item._id,
        totalAmount: item.totalAmount,
        count: item.count,
        percentage: totalExpense > 0 ? Math.round((item.totalAmount / totalExpense) * 10000) / 100 : 0,
      })),
    };
  }
}

export const expenseService = new ExpenseService();
export default expenseService;

import mongoose, { Types } from 'mongoose';
import { OtherIncome, IOtherIncome, IncomeCategory } from '../models/OtherIncome';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { createAuditLog } from '../middleware/auditLog';
import { getNextIncomeNumber } from '../utils/invoiceNumberGenerator';
import { accountingService } from './accounting.service';
import { CreateOtherIncomeInput } from '../validators/otherIncome.validator';

export interface IncomeFilterParams {
  category?: string;
  paymentMethod?: string;
  isCancelled?: boolean;
  startDate?: Date | string;
  endDate?: Date | string;
  search?: string;
  page?: number | string;
  limit?: number | string;
}

export const INCOME_CATEGORIES = [
  { key: 'interest', label: 'Interest Received', defaultAccountCode: '4002' },
  { key: 'rent_received', label: 'Rent Received', defaultAccountCode: '4002' },
  { key: 'commission', label: 'Commission Received', defaultAccountCode: '4002' },
  { key: 'discount_received', label: 'Discount Received', defaultAccountCode: '4003' },
  { key: 'other', label: 'Other Miscellaneous Income', defaultAccountCode: '4002' },
];

export class OtherIncomeService {
  /**
   * Return standard income categories
   */
  getIncomeCategories() {
    return INCOME_CATEGORIES;
  }

  /**
   * Create an other income entry and auto-generate the double-entry journal entry
   */
  async createIncome(
    businessId: string,
    userId: string,
    data: CreateOtherIncomeInput,
    ipAddress?: string
  ): Promise<IOtherIncome> {
    const incomeNumber = await getNextIncomeNumber(businessId);

    const income = new OtherIncome({
      businessId: new Types.ObjectId(businessId),
      incomeNumber,
      category: data.category.toLowerCase().trim(),
      amount: data.amount,
      incomeDate: data.incomeDate || new Date(),
      paymentMethod: data.paymentMethod || 'cash',
      description: data.description,
      isCancelled: false,
    });

    await income.save();

    // Create journal entry: DR Cash/Bank, CR Other Income Account
    const journalEntry = await accountingService.createOtherIncomeJournalEntry(
      businessId,
      userId,
      income
    );

    income.journalEntryId = journalEntry._id as Types.ObjectId;
    await income.save();

    await createAuditLog(
      businessId,
      userId,
      'created',
      'OtherIncome',
      income._id as Types.ObjectId,
      {
        incomeNumber,
        category: income.category,
        amount: income.amount,
        paymentMethod: income.paymentMethod,
      },
      ipAddress
    );

    return income;
  }

  /**
   * List other income records with filters and pagination
   */
  async getIncomes(businessId: string, filters: IncomeFilterParams) {
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

    if (filters.isCancelled !== undefined) {
      query.isCancelled = filters.isCancelled;
    }

    if (filters.startDate || filters.endDate) {
      query.incomeDate = {};
      if (filters.startDate) query.incomeDate.$gte = new Date(filters.startDate);
      if (filters.endDate) query.incomeDate.$lte = new Date(filters.endDate);
    }

    if (filters.search) {
      query.$or = [
        { incomeNumber: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [incomes, total] = await Promise.all([
      OtherIncome.find(query)
        .sort({ incomeDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      OtherIncome.countDocuments(query),
    ]);

    return {
      incomes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single income by ID
   */
  async getIncomeById(businessId: string, incomeId: string): Promise<IOtherIncome> {
    if (!Types.ObjectId.isValid(incomeId)) {
      throw new BadRequestError('Invalid Income ID');
    }

    const income = await OtherIncome.findOne({ _id: incomeId, businessId }).populate(
      'journalEntryId'
    );

    if (!income) {
      throw new NotFoundError('Other income entry not found');
    }

    return income;
  }

  /**
   * Cancel an other income record and reverse its journal entry
   */
  async cancelIncome(
    businessId: string,
    userId: string,
    incomeId: string,
    reason?: string,
    ipAddress?: string
  ): Promise<IOtherIncome> {
    if (!Types.ObjectId.isValid(incomeId)) {
      throw new BadRequestError('Invalid Income ID');
    }

    const income = await OtherIncome.findOne({ _id: incomeId, businessId });
    if (!income) {
      throw new NotFoundError('Other income entry not found');
    }

    if (income.isCancelled) {
      throw new BadRequestError('Income entry is already cancelled');
    }

    if (income.journalEntryId) {
      await accountingService.reverseJournalEntry(
        businessId,
        userId,
        income.journalEntryId,
        undefined,
        ipAddress
      );
    }

    income.isCancelled = true;
    income.cancelledAt = new Date();
    income.cancelReason = reason || 'Cancelled by user';
    await income.save();

    await createAuditLog(
      businessId,
      userId,
      'cancelled',
      'OtherIncome',
      income._id as Types.ObjectId,
      { incomeNumber: income.incomeNumber, reason },
      ipAddress
    );

    return income;
  }
}

export const otherIncomeService = new OtherIncomeService();
export default otherIncomeService;

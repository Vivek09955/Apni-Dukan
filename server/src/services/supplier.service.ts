import { Types } from 'mongoose';
import { Supplier, ISupplier } from '../models/Supplier';
import { PurchaseBill } from '../models/PurchaseBill';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { createAuditLog } from '../middleware/auditLog';
import { CreateSupplierInput, UpdateSupplierInput } from '../validators/supplier.validator';

export interface SupplierFilterParams {
  search?: string;
  group?: string;
  isActive?: boolean | string;
  page?: number | string;
  limit?: number | string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class SupplierService {
  /**
   * Create a new supplier
   */
  async createSupplier(
    businessId: string,
    data: CreateSupplierInput,
    userId?: string,
    ipAddress?: string
  ): Promise<ISupplier> {
    const supplier = new Supplier({
      ...data,
      businessId,
    });

    await supplier.save();

    if (userId) {
      await createAuditLog(
        businessId,
        userId,
        'created',
        'Supplier',
        supplier._id as Types.ObjectId,
        { name: supplier.name, phone: supplier.phone, openingBalance: supplier.openingBalance },
        ipAddress
      );
    }

    return supplier;
  }

  /**
   * List suppliers with search, pagination, and sorting
   */
  async getSuppliers(businessId: string, params: SupplierFilterParams = {}) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = { businessId };

    if (params.isActive !== undefined && params.isActive !== '') {
      query.isActive = String(params.isActive) === 'true';
    }

    if (params.group) {
      query.group = params.group;
    }

    if (params.search && params.search.trim()) {
      const searchRegex = new RegExp(params.search.trim(), 'i');
      query.$or = [{ name: searchRegex }, { phone: searchRegex }, { email: searchRegex }];
    }

    const sortField = params.sortBy || 'createdAt';
    const sortDir = params.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortField]: sortDir };

    const [suppliers, total] = await Promise.all([
      Supplier.find(query).sort(sort).skip(skip).limit(limit).lean(),
      Supplier.countDocuments(query),
    ]);

    return {
      suppliers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single supplier by ID
   */
  async getSupplierById(businessId: string, supplierId: string): Promise<ISupplier> {
    if (!Types.ObjectId.isValid(supplierId)) {
      throw new BadRequestError('Invalid Supplier ID');
    }

    const supplier = await Supplier.findOne({ _id: supplierId, businessId });
    if (!supplier) {
      throw new NotFoundError('Supplier not found');
    }

    return supplier;
  }

  /**
   * Update supplier details
   */
  async updateSupplier(
    businessId: string,
    supplierId: string,
    data: UpdateSupplierInput,
    userId?: string,
    ipAddress?: string
  ): Promise<ISupplier> {
    if (!Types.ObjectId.isValid(supplierId)) {
      throw new BadRequestError('Invalid Supplier ID');
    }

    const supplier = await Supplier.findOne({ _id: supplierId, businessId });
    if (!supplier) {
      throw new NotFoundError('Supplier not found');
    }

    const allowedFields: (keyof UpdateSupplierInput)[] = [
      'name',
      'phone',
      'email',
      'gstin',
      'address',
      'openingBalance',
      'creditDays',
      'group',
      'tags',
      'isActive',
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        (supplier as any)[field] = data[field];
      }
    }

    await supplier.save();

    if (userId) {
      await createAuditLog(
        businessId,
        userId,
        'updated',
        'Supplier',
        supplier._id as Types.ObjectId,
        data,
        ipAddress
      );
    }

    return supplier;
  }

  /**
   * Soft delete supplier
   */
  async deleteSupplier(businessId: string, supplierId: string, userId?: string, ipAddress?: string) {
    if (!Types.ObjectId.isValid(supplierId)) {
      throw new BadRequestError('Invalid Supplier ID');
    }

    const supplier = await Supplier.findOne({ _id: supplierId, businessId });
    if (!supplier) {
      throw new NotFoundError('Supplier not found');
    }

    // Check if supplier has unpaid bills
    const activeBills = await PurchaseBill.countDocuments({
      businessId,
      supplierId,
      status: { $in: ['received', 'partially_paid'] },
      balanceDue: { $gt: 0 },
    });

    if (activeBills > 0) {
      throw new BadRequestError('Cannot delete supplier with active unpaid purchase bills');
    }

    supplier.isActive = false;
    await supplier.save();

    if (userId) {
      await createAuditLog(
        businessId,
        userId,
        'deleted',
        'Supplier',
        supplier._id as Types.ObjectId,
        { name: supplier.name, isActive: false },
        ipAddress
      );
    }

    return { success: true, message: 'Supplier deactivated successfully' };
  }

  /**
   * Get supplier account ledger with running balance
   */
  async getSupplierLedger(
    businessId: string,
    supplierId: string,
    dateRange?: { startDate?: string | Date; endDate?: string | Date }
  ) {
    if (!Types.ObjectId.isValid(supplierId)) {
      throw new BadRequestError('Invalid Supplier ID');
    }

    const supplier = await Supplier.findOne({ _id: supplierId, businessId }).lean();
    if (!supplier) {
      throw new NotFoundError('Supplier not found');
    }

    const billQuery: Record<string, any> = {
      businessId,
      supplierId,
      status: { $ne: 'cancelled' },
    };

    if (dateRange?.startDate || dateRange?.endDate) {
      billQuery.billDate = {};
      if (dateRange.startDate) {
        billQuery.billDate.$gte = new Date(dateRange.startDate);
      }
      if (dateRange.endDate) {
        billQuery.billDate.$lte = new Date(dateRange.endDate);
      }
    }

    const bills = await PurchaseBill.find(billQuery)
      .sort({ billDate: 1, createdAt: 1 })
      .lean();

    let runningBalance = supplier.openingBalance || 0;
    const entries: Array<{
      date: Date;
      type: 'opening' | 'bill' | 'payment';
      reference: string;
      description: string;
      credit: number; // paise payable to supplier increases
      debit: number; // paise paid to supplier decreases payable
      balance: number;
    }> = [];

    // Opening balance entry
    entries.push({
      date: supplier.createdAt,
      type: 'opening',
      reference: 'OPENING',
      description: 'Opening Balance',
      credit: supplier.openingBalance > 0 ? supplier.openingBalance : 0,
      debit: supplier.openingBalance < 0 ? Math.abs(supplier.openingBalance) : 0,
      balance: runningBalance,
    });

    for (const bill of bills) {
      runningBalance += bill.finalAmount;
      entries.push({
        date: bill.billDate,
        type: 'bill',
        reference: bill.billNumber,
        description: `Purchase Bill #${bill.billNumber}`,
        credit: bill.finalAmount,
        debit: 0,
        balance: runningBalance,
      });

      if (bill.paidAmount > 0) {
        runningBalance -= bill.paidAmount;
        entries.push({
          date: bill.billDate,
          type: 'payment',
          reference: `${bill.billNumber}-PAY`,
          description: `Payment for Bill #${bill.billNumber}`,
          credit: 0,
          debit: bill.paidAmount,
          balance: runningBalance,
        });
      }
    }

    return {
      supplier: {
        id: supplier._id,
        name: supplier.name,
        phone: supplier.phone,
        email: supplier.email,
        openingBalance: supplier.openingBalance,
      },
      entries,
      currentBalance: runningBalance,
    };
  }

  /**
   * Get supplier total outstanding payable summary
   */
  async getSupplierOutstanding(businessId: string, supplierId: string) {
    if (!Types.ObjectId.isValid(supplierId)) {
      throw new BadRequestError('Invalid Supplier ID');
    }

    const supplier = await Supplier.findOne({ _id: supplierId, businessId }).lean();
    if (!supplier) {
      throw new NotFoundError('Supplier not found');
    }

    const bills = await PurchaseBill.find({
      businessId,
      supplierId,
      status: { $in: ['received', 'partially_paid'] },
    }).lean();

    const billBalanceDue = bills.reduce((sum, b) => sum + b.balanceDue, 0);
    const totalOutstanding = (supplier.openingBalance || 0) + billBalanceDue;

    return {
      supplierId: supplier._id,
      supplierName: supplier.name,
      openingBalance: supplier.openingBalance || 0,
      billBalanceDue,
      totalOutstanding,
      unpaidBillsCount: bills.length,
    };
  }
}

export const supplierService = new SupplierService();
export default supplierService;

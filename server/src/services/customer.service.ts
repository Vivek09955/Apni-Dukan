import { Types } from 'mongoose';
import { Customer, ICustomer } from '../models/Customer';
import { SalesInvoice } from '../models/SalesInvoice';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { createAuditLog } from '../middleware/auditLog';
import { CreateCustomerInput, UpdateCustomerInput } from '../validators/customer.validator';

export interface CustomerFilterParams {
  search?: string;
  group?: string;
  isActive?: boolean | string;
  page?: number | string;
  limit?: number | string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class CustomerService {
  /**
   * Create a new customer
   */
  async createCustomer(
    businessId: string,
    data: CreateCustomerInput,
    userId?: string,
    ipAddress?: string
  ): Promise<ICustomer> {
    const customer = new Customer({
      ...data,
      businessId,
    });

    await customer.save();

    if (userId) {
      await createAuditLog(
        businessId,
        userId,
        'created',
        'Customer',
        customer._id as Types.ObjectId,
        { name: customer.name, phone: customer.phone, openingBalance: customer.openingBalance },
        ipAddress
      );
    }

    return customer;
  }

  /**
   * List customers with search, pagination, and sorting
   */
  async getCustomers(businessId: string, params: CustomerFilterParams = {}) {
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

    const [customers, total] = await Promise.all([
      Customer.find(query).sort(sort).skip(skip).limit(limit).lean(),
      Customer.countDocuments(query),
    ]);

    return {
      customers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single customer by ID
   */
  async getCustomerById(businessId: string, customerId: string): Promise<ICustomer> {
    if (!Types.ObjectId.isValid(customerId)) {
      throw new BadRequestError('Invalid Customer ID');
    }

    const customer = await Customer.findOne({ _id: customerId, businessId });
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    return customer;
  }

  /**
   * Update customer details
   */
  async updateCustomer(
    businessId: string,
    customerId: string,
    data: UpdateCustomerInput,
    userId?: string,
    ipAddress?: string
  ): Promise<ICustomer> {
    if (!Types.ObjectId.isValid(customerId)) {
      throw new BadRequestError('Invalid Customer ID');
    }

    const customer = await Customer.findOne({ _id: customerId, businessId });
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    const allowedFields: (keyof UpdateCustomerInput)[] = [
      'name',
      'phone',
      'email',
      'gstin',
      'billingAddress',
      'shippingAddress',
      'openingBalance',
      'creditLimit',
      'creditDays',
      'group',
      'tags',
      'isActive',
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        (customer as any)[field] = data[field];
      }
    }

    await customer.save();

    if (userId) {
      await createAuditLog(
        businessId,
        userId,
        'updated',
        'Customer',
        customer._id as Types.ObjectId,
        data,
        ipAddress
      );
    }

    return customer;
  }

  /**
   * Soft delete customer
   */
  async deleteCustomer(businessId: string, customerId: string, userId?: string, ipAddress?: string) {
    if (!Types.ObjectId.isValid(customerId)) {
      throw new BadRequestError('Invalid Customer ID');
    }

    const customer = await Customer.findOne({ _id: customerId, businessId });
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Check if customer has outstanding invoices
    const activeInvoices = await SalesInvoice.countDocuments({
      businessId,
      customerId,
      status: { $in: ['issued', 'partially_paid', 'overdue'] },
      balanceDue: { $gt: 0 },
    });

    if (activeInvoices > 0) {
      throw new BadRequestError('Cannot delete customer with outstanding balance on active invoices');
    }

    customer.isActive = false;
    await customer.save();

    if (userId) {
      await createAuditLog(
        businessId,
        userId,
        'deleted',
        'Customer',
        customer._id as Types.ObjectId,
        { name: customer.name, isActive: false },
        ipAddress
      );
    }

    return { success: true, message: 'Customer deactivated successfully' };
  }

  /**
   * Get customer account ledger with running balance
   */
  async getCustomerLedger(
    businessId: string,
    customerId: string,
    dateRange?: { startDate?: string | Date; endDate?: string | Date }
  ) {
    if (!Types.ObjectId.isValid(customerId)) {
      throw new BadRequestError('Invalid Customer ID');
    }

    const customer = await Customer.findOne({ _id: customerId, businessId }).lean();
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    const invoiceQuery: Record<string, any> = {
      businessId,
      customerId,
      status: { $ne: 'cancelled' },
    };

    if (dateRange?.startDate || dateRange?.endDate) {
      invoiceQuery.invoiceDate = {};
      if (dateRange.startDate) {
        invoiceQuery.invoiceDate.$gte = new Date(dateRange.startDate);
      }
      if (dateRange.endDate) {
        invoiceQuery.invoiceDate.$lte = new Date(dateRange.endDate);
      }
    }

    const invoices = await SalesInvoice.find(invoiceQuery)
      .sort({ invoiceDate: 1, createdAt: 1 })
      .lean();

    let runningBalance = customer.openingBalance || 0;
    const entries: Array<{
      date: Date;
      type: 'opening' | 'invoice' | 'payment';
      reference: string;
      description: string;
      debit: number; // paise added to receivable
      credit: number; // paise paid by customer
      balance: number;
    }> = [];

    // Opening balance entry
    entries.push({
      date: customer.createdAt,
      type: 'opening',
      reference: 'OPENING',
      description: 'Opening Balance',
      debit: customer.openingBalance > 0 ? customer.openingBalance : 0,
      credit: customer.openingBalance < 0 ? Math.abs(customer.openingBalance) : 0,
      balance: runningBalance,
    });

    for (const inv of invoices) {
      // Invoice bill entry (increases receivable)
      runningBalance += inv.finalAmount;
      entries.push({
        date: inv.invoiceDate,
        type: 'invoice',
        reference: inv.invoiceNumber,
        description: `Sales Invoice #${inv.invoiceNumber}`,
        debit: inv.finalAmount,
        credit: 0,
        balance: runningBalance,
      });

      // If any amount was paid at creation / recording
      if (inv.paidAmount > 0) {
        runningBalance -= inv.paidAmount;
        entries.push({
          date: inv.invoiceDate,
          type: 'payment',
          reference: `${inv.invoiceNumber}-PAY`,
          description: `Payment for Invoice #${inv.invoiceNumber}`,
          debit: 0,
          credit: inv.paidAmount,
          balance: runningBalance,
        });
      }
    }

    return {
      customer: {
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        openingBalance: customer.openingBalance,
      },
      entries,
      currentBalance: runningBalance,
    };
  }

  /**
   * Get customer outstanding balance summary
   */
  async getCustomerOutstanding(businessId: string, customerId: string) {
    if (!Types.ObjectId.isValid(customerId)) {
      throw new BadRequestError('Invalid Customer ID');
    }

    const customer = await Customer.findOne({ _id: customerId, businessId }).lean();
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    const invoices = await SalesInvoice.find({
      businessId,
      customerId,
      status: { $in: ['issued', 'partially_paid', 'overdue'] },
    }).lean();

    const invoiceBalanceDue = invoices.reduce((sum, inv) => sum + inv.balanceDue, 0);
    const totalOutstanding = (customer.openingBalance || 0) + invoiceBalanceDue;

    return {
      customerId: customer._id,
      customerName: customer.name,
      openingBalance: customer.openingBalance || 0,
      invoiceBalanceDue,
      totalOutstanding,
      unpaidInvoicesCount: invoices.length,
      creditLimit: customer.creditLimit || 0,
      creditLimitExceeded: customer.creditLimit > 0 && totalOutstanding > customer.creditLimit,
    };
  }
}

export const customerService = new CustomerService();
export default customerService;

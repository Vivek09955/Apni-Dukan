import mongoose, { Types } from 'mongoose';
import { Payment, IPayment, PaymentType, PartyType } from '../models/Payment';
import { SalesInvoice } from '../models/SalesInvoice';
import { PurchaseBill } from '../models/PurchaseBill';
import { Customer } from '../models/Customer';
import { Supplier } from '../models/Supplier';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { createAuditLog } from '../middleware/auditLog';
import { getNextPaymentNumber } from '../utils/invoiceNumberGenerator';
import { accountingService } from './accounting.service';
import { CreatePaymentInput } from '../validators/payment.validator';

export interface PaymentFilterParams {
  type?: PaymentType;
  partyType?: PartyType;
  partyId?: string;
  paymentMethod?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  isCancelled?: boolean;
  page?: number | string;
  limit?: number | string;
  search?: string;
}

export class PaymentService {
  /**
   * Create a new payment with MongoDB transaction, invoice balance reconciliation,
   * double-entry journal entry generation, and audit logging.
   */
  async createPayment(
    businessId: string,
    userId: string,
    data: CreatePaymentInput,
    ipAddress?: string
  ): Promise<IPayment> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Verify party exists
      if (data.partyType === 'customer') {
        const customer = await Customer.findOne({
          _id: data.partyId,
          businessId,
          isActive: true,
        }).session(session);

        if (!customer) {
          throw new NotFoundError('Customer not found or inactive');
        }
      } else {
        const supplier = await Supplier.findOne({
          _id: data.partyId,
          businessId,
          isActive: true,
        }).session(session);

        if (!supplier) {
          throw new NotFoundError('Supplier not found or inactive');
        }
      }

      // 2. Validate allocations sum vs payment amount
      const allocations = data.invoiceAllocations || [];
      const totalAllocated = allocations.reduce((sum, a) => sum + (a.allocatedAmount || 0), 0);

      if (totalAllocated > data.amount) {
        throw new BadRequestError(
          `Total allocated amount (${totalAllocated}) cannot exceed payment amount (${data.amount})`
        );
      }

      // 3. Process each allocation and adjust invoice balances
      const processedAllocations: Array<{
        invoiceId: Types.ObjectId;
        invoiceType: 'sales_invoice' | 'purchase_bill';
        allocatedAmount: number;
      }> = [];

      for (const alloc of allocations) {
        if (alloc.invoiceType === 'sales_invoice') {
          const invoice = await SalesInvoice.findOne({
            _id: alloc.invoiceId,
            businessId,
          }).session(session);

          if (!invoice) {
            throw new NotFoundError(`Sales invoice not found: ${alloc.invoiceId}`);
          }

          if (invoice.status === 'cancelled') {
            throw new BadRequestError(`Cannot allocate payment to cancelled invoice #${invoice.invoiceNumber}`);
          }

          if (alloc.allocatedAmount > invoice.balanceDue) {
            throw new BadRequestError(
              `Allocated amount (${alloc.allocatedAmount}) exceeds balance due (${invoice.balanceDue}) for invoice #${invoice.invoiceNumber}`
            );
          }

          invoice.paidAmount += alloc.allocatedAmount;
          invoice.balanceDue = invoice.finalAmount - invoice.paidAmount;
          invoice.status = invoice.balanceDue === 0 ? 'paid' : 'partially_paid';
          await invoice.save({ session });

          processedAllocations.push({
            invoiceId: invoice._id as Types.ObjectId,
            invoiceType: 'sales_invoice',
            allocatedAmount: alloc.allocatedAmount,
          });
        } else {
          const bill = await PurchaseBill.findOne({
            _id: alloc.invoiceId,
            businessId,
          }).session(session);

          if (!bill) {
            throw new NotFoundError(`Purchase bill not found: ${alloc.invoiceId}`);
          }

          if (bill.status === 'cancelled') {
            throw new BadRequestError(`Cannot allocate payment to cancelled bill #${bill.billNumber}`);
          }

          if (alloc.allocatedAmount > bill.balanceDue) {
            throw new BadRequestError(
              `Allocated amount (${alloc.allocatedAmount}) exceeds balance due (${bill.balanceDue}) for bill #${bill.billNumber}`
            );
          }

          bill.paidAmount += alloc.allocatedAmount;
          bill.balanceDue = bill.finalAmount - bill.paidAmount;
          bill.status = bill.balanceDue === 0 ? 'paid' : 'partially_paid';
          await bill.save({ session });

          processedAllocations.push({
            invoiceId: bill._id as Types.ObjectId,
            invoiceType: 'purchase_bill',
            allocatedAmount: alloc.allocatedAmount,
          });
        }
      }

      // 4. Generate payment number
      const paymentNumber = await getNextPaymentNumber(businessId, session);

      // 5. Create Payment record
      const payment = new Payment({
        businessId: new Types.ObjectId(businessId),
        paymentNumber,
        type: data.type,
        partyType: data.partyType,
        partyId: new Types.ObjectId(data.partyId),
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        paymentDate: data.paymentDate || new Date(),
        referenceNumber: data.referenceNumber,
        bankName: data.bankName,
        invoiceAllocations: processedAllocations,
        isAdvance: data.isAdvance ?? (allocations.length === 0 || totalAllocated < data.amount),
        notes: data.notes,
        isCancelled: false,
      });

      await payment.save({ session });

      // 6. Create double-entry journal entry
      let journalEntry;
      if (payment.type === 'payment_in') {
        journalEntry = await accountingService.createPaymentInJournalEntry(
          businessId,
          userId,
          payment,
          session
        );
      } else {
        journalEntry = await accountingService.createPaymentOutJournalEntry(
          businessId,
          userId,
          payment,
          session
        );
      }

      payment.journalEntryId = journalEntry._id as Types.ObjectId;
      await payment.save({ session });

      await session.commitTransaction();

      // 7. Audit log outside transaction
      await createAuditLog(
        businessId,
        userId,
        'created',
        'Payment',
        payment._id as Types.ObjectId,
        {
          paymentNumber,
          type: payment.type,
          amount: payment.amount,
          partyType: payment.partyType,
          partyId: payment.partyId,
        },
        ipAddress
      );

      return payment;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * List payments with filtering, pagination and party details
   */
  async getPayments(businessId: string, filters: PaymentFilterParams) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const query: any = { businessId: new Types.ObjectId(businessId) };

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.partyType) {
      query.partyType = filters.partyType;
    }

    if (filters.partyId && Types.ObjectId.isValid(filters.partyId)) {
      query.partyId = new Types.ObjectId(filters.partyId);
    }

    if (filters.paymentMethod) {
      query.paymentMethod = filters.paymentMethod;
    }

    if (filters.isCancelled !== undefined) {
      query.isCancelled = filters.isCancelled;
    }

    if (filters.startDate || filters.endDate) {
      query.paymentDate = {};
      if (filters.startDate) query.paymentDate.$gte = new Date(filters.startDate);
      if (filters.endDate) query.paymentDate.$lte = new Date(filters.endDate);
    }

    if (filters.search) {
      query.$or = [
        { paymentNumber: { $regex: filters.search, $options: 'i' } },
        { referenceNumber: { $regex: filters.search, $options: 'i' } },
        { bankName: { $regex: filters.search, $options: 'i' } },
        { notes: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate('partyId', 'name phone email companyName')
        .sort({ paymentDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(query),
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single payment by ID
   */
  async getPaymentById(businessId: string, paymentId: string): Promise<IPayment> {
    if (!Types.ObjectId.isValid(paymentId)) {
      throw new BadRequestError('Invalid Payment ID');
    }

    const payment = await Payment.findOne({ _id: paymentId, businessId })
      .populate('partyId', 'name phone email companyName')
      .populate('journalEntryId');

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    return payment;
  }

  /**
   * Cancel payment:
   * Reverses invoice balances, reverses journal entry, and marks payment as cancelled.
   */
  async cancelPayment(
    businessId: string,
    userId: string,
    paymentId: string,
    reason: string,
    ipAddress?: string
  ): Promise<IPayment> {
    if (!Types.ObjectId.isValid(paymentId)) {
      throw new BadRequestError('Invalid Payment ID');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const payment = await Payment.findOne({ _id: paymentId, businessId }).session(session);

      if (!payment) {
        throw new NotFoundError('Payment not found');
      }

      if (payment.isCancelled) {
        throw new BadRequestError('Payment is already cancelled');
      }

      // 1. Reverse invoice allocations
      for (const alloc of payment.invoiceAllocations) {
        if (alloc.invoiceType === 'sales_invoice') {
          const invoice = await SalesInvoice.findOne({
            _id: alloc.invoiceId,
            businessId,
          }).session(session);

          if (invoice && invoice.status !== 'cancelled') {
            invoice.paidAmount = Math.max(0, invoice.paidAmount - alloc.allocatedAmount);
            invoice.balanceDue = invoice.finalAmount - invoice.paidAmount;
            invoice.status = invoice.paidAmount === 0 ? 'issued' : 'partially_paid';
            await invoice.save({ session });
          }
        } else {
          const bill = await PurchaseBill.findOne({
            _id: alloc.invoiceId,
            businessId,
          }).session(session);

          if (bill && bill.status !== 'cancelled') {
            bill.paidAmount = Math.max(0, bill.paidAmount - alloc.allocatedAmount);
            bill.balanceDue = bill.finalAmount - bill.paidAmount;
            bill.status = bill.paidAmount === 0 ? 'received' : 'partially_paid';
            await bill.save({ session });
          }
        }
      }

      // 2. Reverse journal entry if present
      if (payment.journalEntryId) {
        await accountingService.reverseJournalEntry(
          businessId,
          userId,
          payment.journalEntryId,
          session,
          ipAddress
        );
      }

      // 3. Mark payment as cancelled
      payment.isCancelled = true;
      payment.cancelledAt = new Date();
      payment.cancelReason = reason;
      await payment.save({ session });

      await session.commitTransaction();

      // 4. Audit log
      await createAuditLog(
        businessId,
        userId,
        'cancelled',
        'Payment',
        payment._id as Types.ObjectId,
        { paymentNumber: payment.paymentNumber, reason },
        ipAddress
      );

      return payment;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Get outstanding invoices with balanceDue > 0 for party payment allocation UI
   */
  async getOutstandingInvoices(businessId: string, partyType: PartyType, partyId?: string) {
    if (partyType === 'customer') {
      const query: any = {
        businessId: new Types.ObjectId(businessId),
        status: { $in: ['issued', 'partially_paid', 'overdue'] },
        balanceDue: { $gt: 0 },
      };

      if (partyId && Types.ObjectId.isValid(partyId)) {
        query.customerId = new Types.ObjectId(partyId);
      }

      const invoices = await SalesInvoice.find(query)
        .populate('customerId', 'name phone companyName')
        .select('invoiceNumber invoiceDate dueDate grandTotal finalAmount paidAmount balanceDue customerId')
        .sort({ invoiceDate: 1 });

      return invoices;
    } else {
      const query: any = {
        businessId: new Types.ObjectId(businessId),
        status: { $in: ['received', 'partially_paid'] },
        balanceDue: { $gt: 0 },
      };

      if (partyId && Types.ObjectId.isValid(partyId)) {
        query.supplierId = new Types.ObjectId(partyId);
      }

      const bills = await PurchaseBill.find(query)
        .populate('supplierId', 'name phone companyName')
        .select('billNumber billDate dueDate grandTotal finalAmount paidAmount balanceDue supplierId')
        .sort({ billDate: 1 });

      return bills;
    }
  }
}

export const paymentService = new PaymentService();
export default paymentService;

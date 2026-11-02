import mongoose, { Types } from 'mongoose';
import { SalesInvoice, ISalesInvoice, ISalesInvoiceItem, InvoiceStatus } from '../models/SalesInvoice';
import { Product } from '../models/Product';
import { Customer } from '../models/Customer';
import { Business } from '../models/Business';
import { Warehouse } from '../models/Warehouse';
import { InventoryMovement } from '../models/InventoryMovement';
import { JournalEntry } from '../models/JournalEntry';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { createAuditLog } from '../middleware/auditLog';
import { getNextInvoiceNumber } from '../utils/invoiceNumberGenerator';
import { calculateLineItem, calculateInvoiceTotals } from '../utils/gstCalculator';
import { accountingService } from './accounting.service';
import { CreateInvoiceInput } from '../validators/sales.validator';

export interface InvoiceFilterParams {
  status?: string;
  customerId?: string;
  search?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  page?: number | string;
  limit?: number | string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class SalesService {
  /**
   * Helper to ensure a default warehouse exists
   */
  private async getOrCreateDefaultWarehouse(
    businessId: string,
    session?: mongoose.ClientSession
  ): Promise<Types.ObjectId> {
    let warehouse = await Warehouse.findOne({ businessId, isDefault: true, isActive: true }).session(
      session || null
    );
    if (!warehouse) {
      warehouse = await Warehouse.findOne({ businessId, isActive: true }).session(session || null);
    }
    if (!warehouse) {
      const [created] = await Warehouse.create(
        [
          {
            businessId,
            name: 'Main Warehouse',
            isDefault: true,
            isActive: true,
          },
        ],
        { session }
      );
      return created._id as Types.ObjectId;
    }
    return warehouse._id as Types.ObjectId;
  }

  /**
   * Create a new sales invoice with atomic number generation and GST recalculation
   */
  async createInvoice(
    businessId: string,
    userId: string,
    data: CreateInvoiceInput,
    ipAddress?: string
  ): Promise<ISalesInvoice> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const business = await Business.findById(businessId).session(session);
      if (!business) {
        throw new NotFoundError('Business not found');
      }

      if (!Types.ObjectId.isValid(data.customerId)) {
        throw new BadRequestError('Invalid Customer ID');
      }

      const customer = await Customer.findOne({
        _id: data.customerId,
        businessId,
        isActive: true,
      }).session(session);

      if (!customer) {
        throw new NotFoundError('Customer not found or inactive');
      }

      // Determine Inter-state supply
      const businessState = (business.state || '').trim().toLowerCase();
      const placeOfSupply = (data.placeOfSupply || '').trim().toLowerCase();
      const isInterState = businessState !== placeOfSupply;

      // Atomic invoice number generation
      const invoiceNumber = await getNextInvoiceNumber(businessId, session);

      // Verify and recalculate line items
      const processedItems: ISalesInvoiceItem[] = [];
      const gstResults = [];

      for (const item of data.items) {
        if (!Types.ObjectId.isValid(item.productId)) {
          throw new BadRequestError(`Invalid Product ID: ${item.productId}`);
        }

        const product = await Product.findOne({
          _id: item.productId,
          businessId,
          isActive: true,
        }).session(session);

        if (!product) {
          throw new NotFoundError(`Product not found or inactive: ${item.productId}`);
        }

        const taxRate = item.taxRate !== undefined ? item.taxRate : product.taxRate;
        const lineCalc = calculateLineItem({
          rate: item.rate,
          quantity: item.quantity,
          discountAmount: item.discount,
          discountPercent: item.discountPercent,
          taxRate,
          taxInclusive: product.taxInclusive,
          isInterState,
        });

        gstResults.push(lineCalc);

        processedItems.push({
          productId: product._id as Types.ObjectId,
          name: item.name || product.name,
          hsnCode: item.hsnCode || product.hsnCode,
          quantity: item.quantity,
          unit: item.unit || product.unit,
          rate: item.rate,
          discount: lineCalc.discountAmount,
          discountPercent: item.discountPercent || 0,
          taxableAmount: lineCalc.taxableAmount,
          taxRate,
          cgstAmount: lineCalc.cgstAmount,
          sgstAmount: lineCalc.sgstAmount,
          igstAmount: lineCalc.igstAmount,
          totalAmount: lineCalc.totalAmount,
        });
      }

      // Recalculate invoice totals
      const totals = calculateInvoiceTotals(gstResults, data.roundOff ?? true);

      const requestedPaid = Math.max(0, data.paidAmount || 0);
      const paidAmount = Math.min(totals.finalAmount, requestedPaid);
      const balanceDue = totals.finalAmount - paidAmount;

      let status: InvoiceStatus = data.status || 'draft';
      if (status !== 'draft') {
        if (paidAmount >= totals.finalAmount) {
          status = 'paid';
        } else if (paidAmount > 0) {
          status = 'partially_paid';
        } else {
          status = 'issued';
        }
      }

      const invoice = new SalesInvoice({
        businessId,
        invoiceNumber,
        customerId: customer._id,
        invoiceDate: data.invoiceDate || new Date(),
        dueDate: data.dueDate,
        placeOfSupply: data.placeOfSupply,
        items: processedItems,
        subtotal: totals.subtotal,
        totalDiscount: totals.totalDiscount,
        taxableAmount: totals.taxableAmount,
        totalCgst: totals.totalCgst,
        totalSgst: totals.totalSgst,
        totalIgst: totals.totalIgst,
        totalTax: totals.totalTax,
        grandTotal: totals.grandTotal,
        roundOff: totals.roundOff,
        finalAmount: totals.finalAmount,
        paidAmount,
        balanceDue,
        status,
        paymentTerms: data.paymentTerms,
        notes: data.notes,
        termsAndConditions: data.termsAndConditions,
        bankDetails: data.bankDetails,
        isInterState,
      });

      await invoice.save({ session });

      // If invoice is issued/paid (not draft), deduct stock
      if (status !== 'draft') {
        let warehouseId: Types.ObjectId;
        if (data.warehouseId) {
          warehouseId = new Types.ObjectId(data.warehouseId);
        } else {
          warehouseId = await this.getOrCreateDefaultWarehouse(businessId, session);
        }

        for (const item of processedItems) {
          const product = await Product.findById(item.productId).session(session);
          if (product && product.trackInventory) {
            const stockAgg = await InventoryMovement.aggregate([
              {
                $match: {
                  businessId: new Types.ObjectId(businessId),
                  productId: item.productId,
                  warehouseId,
                },
              },
              { $group: { _id: null, totalStock: { $sum: '$quantity' } } },
            ]).session(session);

            const currentStock = stockAgg[0]?.totalStock || 0;
            const balanceAfter = currentStock - item.quantity;

            await InventoryMovement.create(
              [
                {
                  businessId,
                  productId: item.productId,
                  warehouseId,
                  type: 'sale',
                  quantity: -item.quantity,
                  balanceAfter,
                  unitCost: product.purchasePrice,
                  referenceType: 'invoice',
                  referenceId: invoice._id,
                  notes: `Sold via Invoice #${invoiceNumber}`,
                  date: invoice.invoiceDate,
                },
              ],
              { session }
            );
          }
        }

        // Auto-create double-entry journal entry for the issued/paid sales invoice
        const journalEntry = await accountingService.createSalesJournalEntry(
          businessId,
          userId,
          invoice,
          session
        );
        invoice.journalEntryId = journalEntry._id as Types.ObjectId;
        await invoice.save({ session });
      }

      await session.commitTransaction();

      await createAuditLog(
        businessId,
        userId,
        'created',
        'SalesInvoice',
        invoice._id as Types.ObjectId,
        { invoiceNumber, finalAmount: invoice.finalAmount, status: invoice.status },
        ipAddress
      );

      return invoice;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * List invoices with filtering, search, and pagination
   */
  async getInvoices(businessId: string, params: InvoiceFilterParams = {}) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = { businessId };

    if (params.status) {
      query.status = params.status;
    }

    if (params.customerId && Types.ObjectId.isValid(params.customerId)) {
      query.customerId = params.customerId;
    }

    if (params.search && params.search.trim()) {
      query.invoiceNumber = new RegExp(params.search.trim(), 'i');
    }

    if (params.startDate || params.endDate) {
      query.invoiceDate = {};
      if (params.startDate) {
        query.invoiceDate.$gte = new Date(params.startDate);
      }
      if (params.endDate) {
        query.invoiceDate.$lte = new Date(params.endDate);
      }
    }

    const sortField = params.sortBy || 'invoiceDate';
    const sortDir = params.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortField]: sortDir };

    const [invoices, total] = await Promise.all([
      SalesInvoice.find(query)
        .populate('customerId', 'name phone email gstin')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      SalesInvoice.countDocuments(query),
    ]);

    return {
      invoices,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single invoice with full customer and product details
   */
  async getInvoiceById(businessId: string, invoiceId: string): Promise<ISalesInvoice> {
    if (!Types.ObjectId.isValid(invoiceId)) {
      throw new BadRequestError('Invalid Invoice ID');
    }

    const invoice = await SalesInvoice.findOne({ _id: invoiceId, businessId })
      .populate('customerId', 'name phone email gstin billingAddress shippingAddress')
      .populate('items.productId', 'name sku unit');

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    return invoice;
  }

  /**
   * Issue a draft invoice and deduct inventory
   */
  async issueInvoice(businessId: string, invoiceId: string, userId: string, ipAddress?: string) {
    if (!Types.ObjectId.isValid(invoiceId)) {
      throw new BadRequestError('Invalid Invoice ID');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const invoice = await SalesInvoice.findOne({ _id: invoiceId, businessId }).session(session);
      if (!invoice) {
        throw new NotFoundError('Invoice not found');
      }

      if (invoice.status !== 'draft') {
        throw new BadRequestError(`Only draft invoices can be issued. Current status: ${invoice.status}`);
      }

      const warehouseId = await this.getOrCreateDefaultWarehouse(businessId, session);

      // Deduct inventory
      for (const item of invoice.items) {
        const product = await Product.findById(item.productId).session(session);
        if (product && product.trackInventory) {
          const stockAgg = await InventoryMovement.aggregate([
            {
              $match: {
                businessId: new Types.ObjectId(businessId),
                productId: item.productId,
                warehouseId,
              },
            },
            { $group: { _id: null, totalStock: { $sum: '$quantity' } } },
          ]).session(session);

          const currentStock = stockAgg[0]?.totalStock || 0;
          const balanceAfter = currentStock - item.quantity;

          await InventoryMovement.create(
            [
              {
                businessId,
                productId: item.productId,
                warehouseId,
                type: 'sale',
                quantity: -item.quantity,
                balanceAfter,
                unitCost: product.purchasePrice,
                referenceType: 'invoice',
                referenceId: invoice._id,
                notes: `Issued Invoice #${invoice.invoiceNumber}`,
                date: invoice.invoiceDate,
              },
            ],
            { session }
          );
        }
      }

      invoice.status = invoice.paidAmount >= invoice.finalAmount ? 'paid' : 'issued';

      // Auto-create double-entry journal entry for the issued sales invoice
      const journalEntry = await accountingService.createSalesJournalEntry(
        businessId,
        userId,
        invoice,
        session
      );
      invoice.journalEntryId = journalEntry._id as Types.ObjectId;
      await invoice.save({ session });

      await session.commitTransaction();

      await createAuditLog(
        businessId,
        userId,
        'updated',
        'SalesInvoice',
        invoice._id as Types.ObjectId,
        { action: 'issued', invoiceNumber: invoice.invoiceNumber },
        ipAddress
      );

      return invoice;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Cancel invoice and reverse inventory if previously issued
   */
  async cancelInvoice(
    businessId: string,
    invoiceId: string,
    reason: string,
    userId: string,
    ipAddress?: string
  ) {
    if (!Types.ObjectId.isValid(invoiceId)) {
      throw new BadRequestError('Invalid Invoice ID');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const invoice = await SalesInvoice.findOne({ _id: invoiceId, businessId }).session(session);
      if (!invoice) {
        throw new NotFoundError('Invoice not found');
      }

      if (invoice.status === 'cancelled') {
        throw new BadRequestError('Invoice is already cancelled');
      }

      const wasDeducted = invoice.status !== 'draft';

      // Reverse inventory deduction if invoice was issued
      if (wasDeducted) {
        const warehouseId = await this.getOrCreateDefaultWarehouse(businessId, session);

        for (const item of invoice.items) {
          const product = await Product.findById(item.productId).session(session);
          if (product && product.trackInventory) {
            const stockAgg = await InventoryMovement.aggregate([
              {
                $match: {
                  businessId: new Types.ObjectId(businessId),
                  productId: item.productId,
                  warehouseId,
                },
              },
              { $group: { _id: null, totalStock: { $sum: '$quantity' } } },
            ]).session(session);

            const currentStock = stockAgg[0]?.totalStock || 0;
            const balanceAfter = currentStock + item.quantity;

            await InventoryMovement.create(
              [
                {
                  businessId,
                  productId: item.productId,
                  warehouseId,
                  type: 'sale_return',
                  quantity: item.quantity,
                  balanceAfter,
                  unitCost: product.purchasePrice,
                  referenceType: 'invoice',
                  referenceId: invoice._id,
                  notes: `Reversed for cancelled Invoice #${invoice.invoiceNumber}. Reason: ${reason}`,
                  date: new Date(),
                },
              ],
              { session }
            );
          }
        }
      }

      // Reverse journal entry if present or find by reference
      if (invoice.journalEntryId) {
        await accountingService.reverseJournalEntry(
          businessId,
          userId,
          invoice.journalEntryId,
          session,
          ipAddress
        );
      } else if (wasDeducted) {
        const journalEntry = await JournalEntry.findOne({
          businessId,
          referenceType: 'invoice',
          referenceId: invoice._id,
          isReversed: false,
        }).session(session);

        if (journalEntry) {
          await accountingService.reverseJournalEntry(
            businessId,
            userId,
            journalEntry._id,
            session,
            ipAddress
          );
        }
      }

      invoice.status = 'cancelled';
      invoice.cancelledAt = new Date();
      invoice.cancelReason = reason;
      await invoice.save({ session });

      await session.commitTransaction();

      await createAuditLog(
        businessId,
        userId,
        'cancelled',
        'SalesInvoice',
        invoice._id as Types.ObjectId,
        { invoiceNumber: invoice.invoiceNumber, reason },
        ipAddress
      );

      return invoice;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Get invoice totals summary for reporting / dashboard
   */
  async getInvoiceSummary(
    businessId: string,
    dateRange?: { startDate?: string | Date; endDate?: string | Date }
  ) {
    const matchQuery: Record<string, any> = {
      businessId: new Types.ObjectId(businessId),
      status: { $ne: 'cancelled' },
    };

    if (dateRange?.startDate || dateRange?.endDate) {
      matchQuery.invoiceDate = {};
      if (dateRange.startDate) {
        matchQuery.invoiceDate.$gte = new Date(dateRange.startDate);
      }
      if (dateRange.endDate) {
        matchQuery.invoiceDate.$lte = new Date(dateRange.endDate);
      }
    }

    const summary = await SalesInvoice.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalSales: { $sum: '$finalAmount' },
          totalTax: { $sum: '$totalTax' },
          totalDiscount: { $sum: '$totalDiscount' },
          totalPaid: { $sum: '$paidAmount' },
          totalPending: { $sum: '$balanceDue' },
        },
      },
    ]);

    const result = summary[0] || {
      totalInvoices: 0,
      totalSales: 0,
      totalTax: 0,
      totalDiscount: 0,
      totalPaid: 0,
      totalPending: 0,
    };

    delete result._id;
    return result;
  }
}

export const salesService = new SalesService();
export default salesService;

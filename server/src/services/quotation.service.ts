import mongoose, { Types } from 'mongoose';
import { Quotation, IQuotation, IQuotationItem, QuotationStatus } from '../models/Quotation';
import { SalesInvoice, ISalesInvoice, ISalesInvoiceItem } from '../models/SalesInvoice';
import { Customer } from '../models/Customer';
import { Business } from '../models/Business';
import { Product } from '../models/Product';
import { Warehouse } from '../models/Warehouse';
import { InventoryMovement } from '../models/InventoryMovement';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { createAuditLog } from '../middleware/auditLog';
import { getNextQuotationNumber, getNextInvoiceNumber } from '../utils/invoiceNumberGenerator';
import { calculateLineItem, calculateInvoiceTotals } from '../utils/gstCalculator';
import { accountingService } from './accounting.service';
import {
  CreateQuotationInput,
  ConvertQuotationInput,
} from '../validators/quotation.validator';

export interface QuotationFilterParams {
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

export class QuotationService {
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
   * Create a new quotation with server-calculated GST and totals
   */
  async createQuotation(
    businessId: string,
    userId: string,
    data: CreateQuotationInput,
    ipAddress?: string
  ): Promise<IQuotation> {
    const business = await Business.findById(businessId);
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
    });

    if (!customer) {
      throw new NotFoundError('Customer not found or inactive');
    }

    const businessState = (business.state || '').trim().toLowerCase();
    const placeOfSupply = (data.placeOfSupply || '').trim().toLowerCase();
    const isInterState = businessState !== placeOfSupply;

    const quotationNumber = await getNextQuotationNumber(businessId);

    const processedItems: IQuotationItem[] = [];
    const gstResults = [];

    for (const item of data.items) {
      if (!Types.ObjectId.isValid(item.productId)) {
        throw new BadRequestError(`Invalid Product ID: ${item.productId}`);
      }

      const product = await Product.findOne({
        _id: item.productId,
        businessId,
        isActive: true,
      });

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

    const totals = calculateInvoiceTotals(gstResults, data.roundOff ?? true);

    const quotation = new Quotation({
      businessId,
      quotationNumber,
      customerId: customer._id,
      quotationDate: data.quotationDate || new Date(),
      validUntil: data.validUntil,
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
      isInterState,
      status: 'draft',
      notes: data.notes,
      termsAndConditions: data.termsAndConditions,
    });

    await quotation.save();

    await createAuditLog(
      businessId,
      userId,
      'created',
      'quotation',
      quotation._id.toString(),
      { quotationNumber, finalAmount: quotation.finalAmount },
      ipAddress
    );

    return quotation;
  }

  /**
   * List quotations with pagination, filtering, and search
   */
  async getQuotations(businessId: string, params: QuotationFilterParams = {}) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = { businessId: new Types.ObjectId(businessId) };

    if (params.status) {
      query.status = params.status;
    }

    if (params.customerId && Types.ObjectId.isValid(params.customerId)) {
      query.customerId = new Types.ObjectId(params.customerId);
    }

    if (params.startDate || params.endDate) {
      query.quotationDate = {};
      if (params.startDate) query.quotationDate.$gte = new Date(params.startDate);
      if (params.endDate) query.quotationDate.$lte = new Date(params.endDate);
    }

    if (params.search) {
      const searchRegex = new RegExp(params.search.trim(), 'i');
      query.$or = [{ quotationNumber: searchRegex }, { notes: searchRegex }];
    }

    const sortField = params.sortBy || 'quotationDate';
    const sortDirection = params.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortField]: sortDirection };

    const [quotations, total] = await Promise.all([
      Quotation.find(query)
        .populate('customerId', 'name phone email gstin address')
        .populate('convertedToInvoice', 'invoiceNumber finalAmount status')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Quotation.countDocuments(query),
    ]);

    return {
      quotations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single quotation by ID
   */
  async getQuotationById(businessId: string, quotationId: string): Promise<IQuotation> {
    if (!Types.ObjectId.isValid(quotationId)) {
      throw new BadRequestError('Invalid Quotation ID');
    }

    const quotation = await Quotation.findOne({
      _id: quotationId,
      businessId,
    })
      .populate('customerId', 'name phone email gstin address state')
      .populate('convertedToInvoice', 'invoiceNumber finalAmount status invoiceDate');

    if (!quotation) {
      throw new NotFoundError('Quotation not found');
    }

    return quotation;
  }

  /**
   * Update quotation status
   */
  async updateQuotationStatus(
    businessId: string,
    userId: string,
    quotationId: string,
    status: QuotationStatus,
    ipAddress?: string
  ): Promise<IQuotation> {
    if (!Types.ObjectId.isValid(quotationId)) {
      throw new BadRequestError('Invalid Quotation ID');
    }

    const quotation = await Quotation.findOne({
      _id: quotationId,
      businessId,
    });

    if (!quotation) {
      throw new NotFoundError('Quotation not found');
    }

    if (quotation.status === 'converted') {
      throw new BadRequestError('Cannot change status of a converted quotation');
    }

    quotation.status = status;
    await quotation.save();

    await createAuditLog(
      businessId,
      userId,
      'updated',
      'quotation',
      quotation._id.toString(),
      { newStatus: status },
      ipAddress
    );

    return quotation;
  }

  /**
   * Convert quotation to Sales Invoice atomically within a MongoDB transaction.
   * Copies items, recalculates totals, creates invoice, updates stock/journal if issued,
   * marks quotation as converted, and links convertedToInvoice.
   */
  async convertToInvoice(
    businessId: string,
    userId: string,
    quotationId: string,
    options: ConvertQuotationInput = {},
    ipAddress?: string
  ): Promise<ISalesInvoice> {
    if (!Types.ObjectId.isValid(quotationId)) {
      throw new BadRequestError('Invalid Quotation ID');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const quotation = await Quotation.findOne({
        _id: quotationId,
        businessId,
      }).session(session);

      if (!quotation) {
        throw new NotFoundError('Quotation not found');
      }

      if (quotation.status === 'converted') {
        throw new BadRequestError(
          `Quotation has already been converted to invoice #${quotation.convertedToInvoice}`
        );
      }

      if (quotation.status === 'rejected' || quotation.status === 'expired') {
        throw new BadRequestError(`Cannot convert a quotation with status "${quotation.status}"`);
      }

      const business = await Business.findById(businessId).session(session);
      if (!business) {
        throw new NotFoundError('Business not found');
      }

      const customer = await Customer.findOne({
        _id: quotation.customerId,
        businessId,
        isActive: true,
      }).session(session);

      if (!customer) {
        throw new NotFoundError('Customer not found or inactive');
      }

      const invoiceNumber = await getNextInvoiceNumber(businessId, session);

      // Map quotation items to sales invoice items
      const invoiceItems: ISalesInvoiceItem[] = quotation.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        hsnCode: item.hsnCode,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        discount: item.discount,
        discountPercent: item.discountPercent || 0,
        taxableAmount: item.taxableAmount,
        taxRate: item.taxRate,
        cgstAmount: item.cgstAmount,
        sgstAmount: item.sgstAmount,
        igstAmount: item.igstAmount,
        totalAmount: item.totalAmount,
      }));

      const issueImmediately = options.issueImmediately ?? true;
      const invoiceStatus = issueImmediately ? 'issued' : 'draft';

      const invoice = new SalesInvoice({
        businessId,
        invoiceNumber,
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: options.dueDate,
        placeOfSupply: quotation.placeOfSupply,
        items: invoiceItems,
        subtotal: quotation.subtotal,
        totalDiscount: quotation.totalDiscount,
        taxableAmount: quotation.taxableAmount,
        totalCgst: quotation.totalCgst,
        totalSgst: quotation.totalSgst,
        totalIgst: quotation.totalIgst,
        totalTax: quotation.totalTax,
        grandTotal: quotation.grandTotal,
        roundOff: quotation.roundOff,
        finalAmount: quotation.finalAmount,
        paidAmount: 0,
        balanceDue: quotation.finalAmount,
        status: invoiceStatus,
        notes: options.notes || quotation.notes,
        termsAndConditions: options.termsAndConditions || quotation.termsAndConditions,
        isInterState: quotation.isInterState,
      });

      await invoice.save({ session });

      if (invoiceStatus === 'issued') {
        let warehouseId: Types.ObjectId;
        if (options.warehouseId) {
          warehouseId = new Types.ObjectId(options.warehouseId);
        } else {
          warehouseId = await this.getOrCreateDefaultWarehouse(businessId, session);
        }

        // Deduct inventory
        for (const item of invoiceItems) {
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
                  notes: `Sold via Invoice #${invoiceNumber} (from Quotation #${quotation.quotationNumber})`,
                  date: invoice.invoiceDate,
                },
              ],
              { session }
            );
          }
        }

        // Create double-entry journal entry
        const journalEntry = await accountingService.createSalesJournalEntry(
          businessId,
          userId,
          invoice,
          session
        );
        invoice.journalEntryId = journalEntry._id as Types.ObjectId;
        await invoice.save({ session });
      }

      // Mark quotation as converted
      quotation.status = 'converted';
      quotation.convertedToInvoice = invoice._id as Types.ObjectId;
      await quotation.save({ session });

      await session.commitTransaction();

      await createAuditLog(
        businessId,
        userId,
        'converted',
        'quotation',
        quotation._id.toString(),
        {
          quotationNumber: quotation.quotationNumber,
          invoiceNumber: invoice.invoiceNumber,
          invoiceId: invoice._id.toString(),
        },
        ipAddress
      );

      return invoice;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Expire sent quotations whose validUntil has passed
   */
  async expireQuotations(businessId?: string): Promise<number> {
    const query: Record<string, any> = {
      status: 'sent',
      validUntil: { $lt: new Date() },
    };

    if (businessId) {
      query.businessId = new Types.ObjectId(businessId);
    }

    const result = await Quotation.updateMany(query, {
      $set: { status: 'expired' },
    });

    return result.modifiedCount;
  }
}

export const quotationService = new QuotationService();
export default quotationService;

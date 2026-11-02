import mongoose, { Types } from 'mongoose';
import { PurchaseBill, IPurchaseBill, IPurchaseBillItem, BillStatus } from '../models/PurchaseBill';
import { Product } from '../models/Product';
import { Supplier } from '../models/Supplier';
import { Business } from '../models/Business';
import { Warehouse } from '../models/Warehouse';
import { InventoryMovement } from '../models/InventoryMovement';
import { JournalEntry } from '../models/JournalEntry';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { createAuditLog } from '../middleware/auditLog';
import { getNextPurchaseNumber } from '../utils/invoiceNumberGenerator';
import { calculateLineItem, calculateInvoiceTotals } from '../utils/gstCalculator';
import { accountingService } from './accounting.service';
import { CreatePurchaseBillInput } from '../validators/purchase.validator';

export interface BillFilterParams {
  status?: string;
  supplierId?: string;
  search?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  page?: number | string;
  limit?: number | string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class PurchaseService {
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
   * Create a new purchase bill with atomic number generation and GST recalculation
   */
  async createBill(
    businessId: string,
    userId: string,
    data: CreatePurchaseBillInput,
    ipAddress?: string
  ): Promise<IPurchaseBill> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const business = await Business.findById(businessId).session(session);
      if (!business) {
        throw new NotFoundError('Business not found');
      }

      if (!Types.ObjectId.isValid(data.supplierId)) {
        throw new BadRequestError('Invalid Supplier ID');
      }

      const supplier = await Supplier.findOne({
        _id: data.supplierId,
        businessId,
        isActive: true,
      }).session(session);

      if (!supplier) {
        throw new NotFoundError('Supplier not found or inactive');
      }

      const businessState = (business.state || '').trim().toLowerCase();
      const placeOfSupply = (data.placeOfSupply || '').trim().toLowerCase();
      const isInterState = businessState !== placeOfSupply;

      const billNumber = await getNextPurchaseNumber(businessId, session);

      const processedItems: IPurchaseBillItem[] = [];
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

      const totals = calculateInvoiceTotals(gstResults, data.roundOff ?? true);

      const requestedPaid = Math.max(0, data.paidAmount || 0);
      const paidAmount = Math.min(totals.finalAmount, requestedPaid);
      const balanceDue = totals.finalAmount - paidAmount;

      let status: BillStatus = data.status || 'draft';
      if (status !== 'draft') {
        if (paidAmount >= totals.finalAmount) {
          status = 'paid';
        } else if (paidAmount > 0) {
          status = 'partially_paid';
        } else {
          status = 'received';
        }
      }

      const bill = new PurchaseBill({
        businessId,
        billNumber,
        supplierId: supplier._id,
        billDate: data.billDate || new Date(),
        dueDate: data.dueDate,
        supplierBillNumber: data.supplierBillNumber,
        supplierBillDate: data.supplierBillDate,
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
        isInterState,
      });

      await bill.save({ session });

      // If status is received/paid (not draft), add inventory
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
            const balanceAfter = currentStock + item.quantity;

            await InventoryMovement.create(
              [
                {
                  businessId,
                  productId: item.productId,
                  warehouseId,
                  type: 'purchase',
                  quantity: item.quantity,
                  balanceAfter,
                  unitCost: item.rate,
                  referenceType: 'bill',
                  referenceId: bill._id,
                  notes: `Purchased via Bill #${billNumber}`,
                  date: bill.billDate,
                },
              ],
              { session }
            );
          }
        }

        // Auto-create double-entry journal entry for the received/paid purchase bill
        const journalEntry = await accountingService.createPurchaseJournalEntry(
          businessId,
          userId,
          bill,
          session
        );
        bill.journalEntryId = journalEntry._id as Types.ObjectId;
        await bill.save({ session });
      }

      await session.commitTransaction();

      await createAuditLog(
        businessId,
        userId,
        'created',
        'PurchaseBill',
        bill._id as Types.ObjectId,
        { billNumber, finalAmount: bill.finalAmount, status: bill.status },
        ipAddress
      );

      return bill;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * List purchase bills with filtering, search, and pagination
   */
  async getBills(businessId: string, params: BillFilterParams = {}) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = { businessId };

    if (params.status) {
      query.status = params.status;
    }

    if (params.supplierId && Types.ObjectId.isValid(params.supplierId)) {
      query.supplierId = params.supplierId;
    }

    if (params.search && params.search.trim()) {
      const searchRegex = new RegExp(params.search.trim(), 'i');
      query.$or = [{ billNumber: searchRegex }, { supplierBillNumber: searchRegex }];
    }

    if (params.startDate || params.endDate) {
      query.billDate = {};
      if (params.startDate) {
        query.billDate.$gte = new Date(params.startDate);
      }
      if (params.endDate) {
        query.billDate.$lte = new Date(params.endDate);
      }
    }

    const sortField = params.sortBy || 'billDate';
    const sortDir = params.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortField]: sortDir };

    const [bills, total] = await Promise.all([
      PurchaseBill.find(query)
        .populate('supplierId', 'name phone email gstin')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      PurchaseBill.countDocuments(query),
    ]);

    return {
      bills,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single bill with supplier and item details
   */
  async getBillById(businessId: string, billId: string): Promise<IPurchaseBill> {
    if (!Types.ObjectId.isValid(billId)) {
      throw new BadRequestError('Invalid Bill ID');
    }

    const bill = await PurchaseBill.findOne({ _id: billId, businessId })
      .populate('supplierId', 'name phone email gstin address')
      .populate('items.productId', 'name sku unit');

    if (!bill) {
      throw new NotFoundError('Purchase bill not found');
    }

    return bill;
  }

  /**
   * Receive draft bill and add inventory
   */
  async receiveBill(businessId: string, billId: string, userId: string, ipAddress?: string) {
    if (!Types.ObjectId.isValid(billId)) {
      throw new BadRequestError('Invalid Bill ID');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const bill = await PurchaseBill.findOne({ _id: billId, businessId }).session(session);
      if (!bill) {
        throw new NotFoundError('Purchase bill not found');
      }

      if (bill.status !== 'draft') {
        throw new BadRequestError(`Only draft bills can be marked received. Current status: ${bill.status}`);
      }

      const warehouseId = await this.getOrCreateDefaultWarehouse(businessId, session);

      // Add inventory
      for (const item of bill.items) {
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
                type: 'purchase',
                quantity: item.quantity,
                balanceAfter,
                unitCost: item.rate,
                referenceType: 'bill',
                referenceId: bill._id,
                notes: `Received Bill #${bill.billNumber}`,
                date: bill.billDate,
              },
            ],
            { session }
          );
        }
      }

      bill.status = bill.paidAmount >= bill.finalAmount ? 'paid' : 'received';

      // Auto-create double-entry journal entry for the received purchase bill
      const journalEntry = await accountingService.createPurchaseJournalEntry(
        businessId,
        userId,
        bill,
        session
      );
      bill.journalEntryId = journalEntry._id as Types.ObjectId;
      await bill.save({ session });

      await session.commitTransaction();

      await createAuditLog(
        businessId,
        userId,
        'updated',
        'PurchaseBill',
        bill._id as Types.ObjectId,
        { action: 'received', billNumber: bill.billNumber },
        ipAddress
      );

      return bill;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Cancel bill and reverse stock if received
   */
  async cancelBill(
    businessId: string,
    billId: string,
    reason: string,
    userId: string,
    ipAddress?: string
  ) {
    if (!Types.ObjectId.isValid(billId)) {
      throw new BadRequestError('Invalid Bill ID');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const bill = await PurchaseBill.findOne({ _id: billId, businessId }).session(session);
      if (!bill) {
        throw new NotFoundError('Purchase bill not found');
      }

      if (bill.status === 'cancelled') {
        throw new BadRequestError('Bill is already cancelled');
      }

      const wasReceived = bill.status !== 'draft';

      if (wasReceived) {
        const warehouseId = await this.getOrCreateDefaultWarehouse(businessId, session);

        for (const item of bill.items) {
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
                  type: 'purchase_return',
                  quantity: -item.quantity,
                  balanceAfter,
                  unitCost: item.rate,
                  referenceType: 'bill',
                  referenceId: bill._id,
                  notes: `Reversed for cancelled Bill #${bill.billNumber}. Reason: ${reason}`,
                  date: new Date(),
                },
              ],
              { session }
            );
          }
        }
      }

      // Reverse journal entry if present or find by reference
      if (bill.journalEntryId) {
        await accountingService.reverseJournalEntry(
          businessId,
          userId,
          bill.journalEntryId,
          session,
          ipAddress
        );
      } else if (wasReceived) {
        const journalEntry = await JournalEntry.findOne({
          businessId,
          referenceType: 'bill',
          referenceId: bill._id,
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

      bill.status = 'cancelled';
      bill.cancelledAt = new Date();
      bill.cancelReason = reason;
      await bill.save({ session });

      await session.commitTransaction();

      await createAuditLog(
        businessId,
        userId,
        'cancelled',
        'PurchaseBill',
        bill._id as Types.ObjectId,
        { billNumber: bill.billNumber, reason },
        ipAddress
      );

      return bill;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Get purchase bill totals summary for reporting / dashboard
   */
  async getBillSummary(
    businessId: string,
    dateRange?: { startDate?: string | Date; endDate?: string | Date }
  ) {
    const matchQuery: Record<string, any> = {
      businessId: new Types.ObjectId(businessId),
      status: { $ne: 'cancelled' },
    };

    if (dateRange?.startDate || dateRange?.endDate) {
      matchQuery.billDate = {};
      if (dateRange.startDate) {
        matchQuery.billDate.$gte = new Date(dateRange.startDate);
      }
      if (dateRange.endDate) {
        matchQuery.billDate.$lte = new Date(dateRange.endDate);
      }
    }

    const summary = await PurchaseBill.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalBills: { $sum: 1 },
          totalPurchases: { $sum: '$finalAmount' },
          totalTax: { $sum: '$totalTax' },
          totalDiscount: { $sum: '$totalDiscount' },
          totalPaid: { $sum: '$paidAmount' },
          totalPending: { $sum: '$balanceDue' },
        },
      },
    ]);

    const result = summary[0] || {
      totalBills: 0,
      totalPurchases: 0,
      totalTax: 0,
      totalDiscount: 0,
      totalPaid: 0,
      totalPending: 0,
    };

    delete result._id;
    return result;
  }
}

export const purchaseService = new PurchaseService();
export default purchaseService;

import mongoose, { Types } from 'mongoose';
import { PurchaseOrder, IPurchaseOrder, IPurchaseOrderItem, PurchaseOrderStatus } from '../models/PurchaseOrder';
import { PurchaseBill, IPurchaseBill, IPurchaseBillItem } from '../models/PurchaseBill';
import { Supplier } from '../models/Supplier';
import { Business } from '../models/Business';
import { Product } from '../models/Product';
import { Warehouse } from '../models/Warehouse';
import { InventoryMovement } from '../models/InventoryMovement';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { createAuditLog } from '../middleware/auditLog';
import { getNextPurchaseOrderNumber, getNextPurchaseNumber } from '../utils/invoiceNumberGenerator';
import { calculateLineItem, calculateInvoiceTotals } from '../utils/gstCalculator';
import { accountingService } from './accounting.service';
import {
  CreatePurchaseOrderInput,
  ConvertPurchaseOrderInput,
} from '../validators/purchaseOrder.validator';

export interface PurchaseOrderFilterParams {
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

export class PurchaseOrderService {
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
   * Create a new Purchase Order
   */
  async createOrder(
    businessId: string,
    userId: string,
    data: CreatePurchaseOrderInput,
    ipAddress?: string
  ): Promise<IPurchaseOrder> {
    const business = await Business.findById(businessId);
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
    });

    if (!supplier) {
      throw new NotFoundError('Supplier not found or inactive');
    }

    const businessState = (business.state || '').trim().toLowerCase();
    const placeOfSupply = (data.placeOfSupply || '').trim().toLowerCase();
    const isInterState = businessState !== placeOfSupply;

    const orderNumber = await getNextPurchaseOrderNumber(businessId);

    const processedItems: IPurchaseOrderItem[] = [];
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
        taxInclusive: false,
        isInterState,
      });

      gstResults.push(lineCalc);

      processedItems.push({
        productId: product._id as Types.ObjectId,
        name: item.name || product.name,
        hsnCode: item.hsnCode || product.hsnCode,
        quantity: item.quantity,
        fulfilledQuantity: 0,
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

    const order = new PurchaseOrder({
      businessId,
      orderNumber,
      supplierId: supplier._id,
      orderDate: data.orderDate || new Date(),
      expectedDate: data.expectedDate,
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
      convertedBills: [],
      notes: data.notes,
      termsAndConditions: data.termsAndConditions,
    });

    await order.save();

    await createAuditLog(
      businessId,
      userId,
      'created',
      'purchase_order',
      order._id.toString(),
      { orderNumber, finalAmount: order.finalAmount },
      ipAddress
    );

    return order;
  }

  /**
   * List purchase orders with pagination, filtering, and search
   */
  async getOrders(businessId: string, params: PurchaseOrderFilterParams = {}) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = { businessId: new Types.ObjectId(businessId) };

    if (params.status) {
      query.status = params.status;
    }

    if (params.supplierId && Types.ObjectId.isValid(params.supplierId)) {
      query.supplierId = new Types.ObjectId(params.supplierId);
    }

    if (params.startDate || params.endDate) {
      query.orderDate = {};
      if (params.startDate) query.orderDate.$gte = new Date(params.startDate);
      if (params.endDate) query.orderDate.$lte = new Date(params.endDate);
    }

    if (params.search) {
      const searchRegex = new RegExp(params.search.trim(), 'i');
      query.$or = [{ orderNumber: searchRegex }, { notes: searchRegex }];
    }

    const sortField = params.sortBy || 'orderDate';
    const sortDirection = params.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortField]: sortDirection };

    const [orders, total] = await Promise.all([
      PurchaseOrder.find(query)
        .populate('supplierId', 'name phone email gstin address')
        .populate('convertedBills', 'billNumber finalAmount status billDate')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      PurchaseOrder.countDocuments(query),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single purchase order by ID
   */
  async getOrderById(businessId: string, orderId: string): Promise<IPurchaseOrder> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestError('Invalid Order ID');
    }

    const order = await PurchaseOrder.findOne({
      _id: orderId,
      businessId,
    })
      .populate('supplierId', 'name phone email gstin address state')
      .populate('convertedBills', 'billNumber finalAmount status billDate');

    if (!order) {
      throw new NotFoundError('Purchase Order not found');
    }

    return order;
  }

  /**
   * Update purchase order status
   */
  async updateOrderStatus(
    businessId: string,
    userId: string,
    orderId: string,
    status: PurchaseOrderStatus,
    ipAddress?: string
  ): Promise<IPurchaseOrder> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestError('Invalid Order ID');
    }

    const order = await PurchaseOrder.findOne({
      _id: orderId,
      businessId,
    });

    if (!order) {
      throw new NotFoundError('Purchase Order not found');
    }

    if (order.status === 'fulfilled' || order.status === 'cancelled') {
      throw new BadRequestError(`Cannot change status of a ${order.status} order`);
    }

    order.status = status;
    await order.save();

    await createAuditLog(
      businessId,
      userId,
      'updated',
      'purchase_order',
      order._id.toString(),
      { newStatus: status },
      ipAddress
    );

    return order;
  }

  /**
   * Convert Purchase Order (partial or full) to a Purchase Bill within a transaction
   */
  async convertToBill(
    businessId: string,
    userId: string,
    orderId: string,
    options: ConvertPurchaseOrderInput = {},
    ipAddress?: string
  ): Promise<IPurchaseBill> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestError('Invalid Order ID');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await PurchaseOrder.findOne({
        _id: orderId,
        businessId,
      }).session(session);

      if (!order) {
        throw new NotFoundError('Purchase Order not found');
      }

      if (order.status === 'fulfilled') {
        throw new BadRequestError('This purchase order is already completely fulfilled');
      }

      if (order.status === 'cancelled') {
        throw new BadRequestError('Cannot convert a cancelled purchase order');
      }

      const business = await Business.findById(businessId).session(session);
      if (!business) {
        throw new NotFoundError('Business not found');
      }

      const supplier = await Supplier.findOne({
        _id: order.supplierId,
        businessId,
        isActive: true,
      }).session(session);

      if (!supplier) {
        throw new NotFoundError('Supplier not found or inactive');
      }

      const itemsToFulfill: { orderItemIndex: number; fulfillQty: number }[] = [];

      if (options.items && options.items.length > 0) {
        for (const reqItem of options.items) {
          const idx = order.items.findIndex(
            (it) => it.productId.toString() === reqItem.productId
          );
          if (idx === -1) {
            throw new BadRequestError(
              `Product ${reqItem.productId} does not belong to this purchase order`
            );
          }
          const orderItem = order.items[idx];
          const remaining = orderItem.quantity - orderItem.fulfilledQuantity;
          if (reqItem.quantity > remaining) {
            throw new BadRequestError(
              `Requested quantity ${reqItem.quantity} exceeds remaining quantity ${remaining} for product "${orderItem.name}"`
            );
          }
          itemsToFulfill.push({ orderItemIndex: idx, fulfillQty: reqItem.quantity });
        }
      } else {
        // Fulfill all remaining
        for (let idx = 0; idx < order.items.length; idx++) {
          const orderItem = order.items[idx];
          const remaining = orderItem.quantity - orderItem.fulfilledQuantity;
          if (remaining > 0) {
            itemsToFulfill.push({ orderItemIndex: idx, fulfillQty: remaining });
          }
        }
      }

      if (itemsToFulfill.length === 0) {
        throw new BadRequestError('No items available to fulfill on this order');
      }

      const billNumber = await getNextPurchaseNumber(businessId, session);
      const billItems: IPurchaseBillItem[] = [];
      const gstResults = [];

      for (const itemFulfillment of itemsToFulfill) {
        const orderItem = order.items[itemFulfillment.orderItemIndex];
        const qty = itemFulfillment.fulfillQty;

        const lineCalc = calculateLineItem({
          rate: orderItem.rate,
          quantity: qty,
          taxRate: orderItem.taxRate,
          taxInclusive: false,
          isInterState: order.isInterState,
        });

        gstResults.push(lineCalc);

        billItems.push({
          productId: orderItem.productId,
          name: orderItem.name,
          hsnCode: orderItem.hsnCode,
          quantity: qty,
          unit: orderItem.unit,
          rate: orderItem.rate,
          discount: lineCalc.discountAmount,
          discountPercent: 0,
          taxableAmount: lineCalc.taxableAmount,
          taxRate: orderItem.taxRate,
          cgstAmount: lineCalc.cgstAmount,
          sgstAmount: lineCalc.sgstAmount,
          igstAmount: lineCalc.igstAmount,
          totalAmount: lineCalc.totalAmount,
        });

        orderItem.fulfilledQuantity += qty;
      }

      const totals = calculateInvoiceTotals(gstResults, true);
      const receiveImmediately = options.receiveImmediately ?? true;
      const billStatus = receiveImmediately ? 'received' : 'draft';

      const bill = new PurchaseBill({
        businessId,
        billNumber,
        supplierId: supplier._id,
        billDate: new Date(),
        dueDate: options.dueDate,
        supplierBillNumber: options.supplierBillNumber,
        supplierBillDate: options.supplierBillDate,
        placeOfSupply: order.placeOfSupply,
        items: billItems,
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
        paidAmount: 0,
        balanceDue: totals.finalAmount,
        status: billStatus,
        notes: options.notes || order.notes,
        isInterState: order.isInterState,
      });

      await bill.save({ session });

      if (billStatus === 'received') {
        let warehouseId: Types.ObjectId;
        if (options.warehouseId) {
          warehouseId = new Types.ObjectId(options.warehouseId);
        } else {
          warehouseId = await this.getOrCreateDefaultWarehouse(businessId, session);
        }

        // Increase inventory
        for (const item of billItems) {
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
                  notes: `Received via Bill #${billNumber} (from PO #${order.orderNumber})`,
                  date: bill.billDate,
                },
              ],
              { session }
            );
          }
        }

        // Accounting journal entry
        const journalEntry = await accountingService.createPurchaseJournalEntry(
          businessId,
          userId,
          bill,
          session
        );
        bill.journalEntryId = journalEntry._id as Types.ObjectId;
        await bill.save({ session });
      }

      const allFulfilled = order.items.every(
        (it) => it.fulfilledQuantity >= it.quantity
      );
      order.status = allFulfilled ? 'fulfilled' : 'partially_fulfilled';
      order.convertedBills.push(bill._id as Types.ObjectId);
      await order.save({ session });

      await session.commitTransaction();

      await createAuditLog(
        businessId,
        userId,
        'converted',
        'purchase_order',
        order._id.toString(),
        {
          orderNumber: order.orderNumber,
          billNumber: bill.billNumber,
          billId: bill._id.toString(),
          allFulfilled,
        },
        ipAddress
      );

      return bill;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

export const purchaseOrderService = new PurchaseOrderService();
export default purchaseOrderService;

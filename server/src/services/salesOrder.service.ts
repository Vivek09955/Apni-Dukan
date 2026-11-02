import mongoose, { Types } from 'mongoose';
import { SalesOrder, ISalesOrder, ISalesOrderItem, SalesOrderStatus } from '../models/SalesOrder';
import { SalesInvoice, ISalesInvoice, ISalesInvoiceItem } from '../models/SalesInvoice';
import { Customer } from '../models/Customer';
import { Business } from '../models/Business';
import { Product } from '../models/Product';
import { Warehouse } from '../models/Warehouse';
import { InventoryMovement } from '../models/InventoryMovement';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { createAuditLog } from '../middleware/auditLog';
import { getNextSalesOrderNumber, getNextInvoiceNumber } from '../utils/invoiceNumberGenerator';
import { calculateLineItem, calculateInvoiceTotals } from '../utils/gstCalculator';
import { accountingService } from './accounting.service';
import {
  CreateSalesOrderInput,
  ConvertSalesOrderInput,
} from '../validators/salesOrder.validator';

export interface SalesOrderFilterParams {
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

export class SalesOrderService {
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
   * Create a new Sales Order
   */
  async createOrder(
    businessId: string,
    userId: string,
    data: CreateSalesOrderInput,
    ipAddress?: string
  ): Promise<ISalesOrder> {
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

    const orderNumber = await getNextSalesOrderNumber(businessId);

    const processedItems: ISalesOrderItem[] = [];
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

    const order = new SalesOrder({
      businessId,
      orderNumber,
      customerId: customer._id,
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
      convertedInvoices: [],
      notes: data.notes,
      termsAndConditions: data.termsAndConditions,
    });

    await order.save();

    await createAuditLog(
      businessId,
      userId,
      'created',
      'sales_order',
      order._id.toString(),
      { orderNumber, finalAmount: order.finalAmount },
      ipAddress
    );

    return order;
  }

  /**
   * List sales orders with pagination, filtering, and search
   */
  async getOrders(businessId: string, params: SalesOrderFilterParams = {}) {
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
      SalesOrder.find(query)
        .populate('customerId', 'name phone email gstin address')
        .populate('convertedInvoices', 'invoiceNumber finalAmount status invoiceDate')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      SalesOrder.countDocuments(query),
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
   * Get single sales order by ID
   */
  async getOrderById(businessId: string, orderId: string): Promise<ISalesOrder> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestError('Invalid Order ID');
    }

    const order = await SalesOrder.findOne({
      _id: orderId,
      businessId,
    })
      .populate('customerId', 'name phone email gstin address state')
      .populate('convertedInvoices', 'invoiceNumber finalAmount status invoiceDate');

    if (!order) {
      throw new NotFoundError('Sales Order not found');
    }

    return order;
  }

  /**
   * Update sales order status
   */
  async updateOrderStatus(
    businessId: string,
    userId: string,
    orderId: string,
    status: SalesOrderStatus,
    ipAddress?: string
  ): Promise<ISalesOrder> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestError('Invalid Order ID');
    }

    const order = await SalesOrder.findOne({
      _id: orderId,
      businessId,
    });

    if (!order) {
      throw new NotFoundError('Sales Order not found');
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
      'sales_order',
      order._id.toString(),
      { newStatus: status },
      ipAddress
    );

    return order;
  }

  /**
   * Convert Sales Order (partial or full) to a Sales Invoice within a transaction
   */
  async convertToInvoice(
    businessId: string,
    userId: string,
    orderId: string,
    options: ConvertSalesOrderInput = {},
    ipAddress?: string
  ): Promise<ISalesInvoice> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestError('Invalid Order ID');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await SalesOrder.findOne({
        _id: orderId,
        businessId,
      }).session(session);

      if (!order) {
        throw new NotFoundError('Sales Order not found');
      }

      if (order.status === 'fulfilled') {
        throw new BadRequestError('This sales order is already completely fulfilled');
      }

      if (order.status === 'cancelled') {
        throw new BadRequestError('Cannot convert a cancelled sales order');
      }

      const business = await Business.findById(businessId).session(session);
      if (!business) {
        throw new NotFoundError('Business not found');
      }

      const customer = await Customer.findOne({
        _id: order.customerId,
        businessId,
        isActive: true,
      }).session(session);

      if (!customer) {
        throw new NotFoundError('Customer not found or inactive');
      }

      // Determine items to fulfill
      const itemsToFulfill: { orderItemIndex: number; fulfillQty: number }[] = [];

      if (options.items && options.items.length > 0) {
        for (const reqItem of options.items) {
          const idx = order.items.findIndex(
            (it) => it.productId.toString() === reqItem.productId
          );
          if (idx === -1) {
            throw new BadRequestError(
              `Product ${reqItem.productId} does not belong to this sales order`
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
        // Fulfill all remaining quantities
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

      const invoiceNumber = await getNextInvoiceNumber(businessId, session);
      const invoiceItems: ISalesInvoiceItem[] = [];
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

        invoiceItems.push({
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

        // Update fulfilledQuantity on order
        orderItem.fulfilledQuantity += qty;
      }

      const totals = calculateInvoiceTotals(gstResults, true);
      const issueImmediately = options.issueImmediately ?? true;
      const invoiceStatus = issueImmediately ? 'issued' : 'draft';

      const invoice = new SalesInvoice({
        businessId,
        invoiceNumber,
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: options.dueDate,
        placeOfSupply: order.placeOfSupply,
        items: invoiceItems,
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
        status: invoiceStatus,
        notes: options.notes || order.notes,
        termsAndConditions: options.termsAndConditions || order.termsAndConditions,
        isInterState: order.isInterState,
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
                  notes: `Sold via Invoice #${invoiceNumber} (Fulfilled from Sales Order #${order.orderNumber})`,
                  date: invoice.invoiceDate,
                },
              ],
              { session }
            );
          }
        }

        // Accounting journal entry
        const journalEntry = await accountingService.createSalesJournalEntry(
          businessId,
          userId,
          invoice,
          session
        );
        invoice.journalEntryId = journalEntry._id as Types.ObjectId;
        await invoice.save({ session });
      }

      // Check if all items in the sales order are fulfilled
      const allFulfilled = order.items.every(
        (it) => it.fulfilledQuantity >= it.quantity
      );
      order.status = allFulfilled ? 'fulfilled' : 'partially_fulfilled';
      order.convertedInvoices.push(invoice._id as Types.ObjectId);
      await order.save({ session });

      await session.commitTransaction();

      await createAuditLog(
        businessId,
        userId,
        'converted',
        'sales_order',
        order._id.toString(),
        {
          orderNumber: order.orderNumber,
          invoiceNumber: invoice.invoiceNumber,
          invoiceId: invoice._id.toString(),
          allFulfilled,
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
}

export const salesOrderService = new SalesOrderService();
export default salesOrderService;

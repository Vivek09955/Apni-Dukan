import { Types } from 'mongoose';
import { DeliveryChallan, IDeliveryChallan, IDeliveryChallanItem, ChallanStatus } from '../models/DeliveryChallan';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { SalesOrder } from '../models/SalesOrder';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { createAuditLog } from '../middleware/auditLog';
import { getNextChallanNumber } from '../utils/invoiceNumberGenerator';
import { CreateDeliveryChallanInput } from '../validators/deliveryChallan.validator';

export interface DeliveryChallanFilterParams {
  status?: string;
  customerId?: string;
  salesOrderId?: string;
  search?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  page?: number | string;
  limit?: number | string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class DeliveryChallanService {
  /**
   * Create a new delivery challan
   */
  async createChallan(
    businessId: string,
    userId: string,
    data: CreateDeliveryChallanInput,
    ipAddress?: string
  ): Promise<IDeliveryChallan> {
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

    if (data.salesOrderId) {
      if (!Types.ObjectId.isValid(data.salesOrderId)) {
        throw new BadRequestError('Invalid Sales Order ID');
      }
      const order = await SalesOrder.findOne({
        _id: data.salesOrderId,
        businessId,
      });
      if (!order) {
        throw new NotFoundError('Sales Order not found');
      }
    }

    const challanNumber = await getNextChallanNumber(businessId);

    const processedItems: IDeliveryChallanItem[] = [];
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

      processedItems.push({
        productId: product._id as Types.ObjectId,
        name: item.name || product.name,
        quantity: item.quantity,
        unit: item.unit || product.unit,
      });
    }

    const challan = new DeliveryChallan({
      businessId,
      challanNumber,
      customerId: customer._id,
      challanDate: data.challanDate || new Date(),
      items: processedItems,
      salesOrderId: data.salesOrderId ? new Types.ObjectId(data.salesOrderId) : undefined,
      status: 'draft',
      vehicleNumber: data.vehicleNumber,
      transporterName: data.transporterName,
      notes: data.notes,
    });

    await challan.save();

    await createAuditLog(
      businessId,
      userId,
      'created',
      'delivery_challan',
      challan._id.toString(),
      { challanNumber },
      ipAddress
    );

    return challan;
  }

  /**
   * List delivery challans with pagination, filtering, and search
   */
  async getChallans(businessId: string, params: DeliveryChallanFilterParams = {}) {
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

    if (params.salesOrderId && Types.ObjectId.isValid(params.salesOrderId)) {
      query.salesOrderId = new Types.ObjectId(params.salesOrderId);
    }

    if (params.startDate || params.endDate) {
      query.challanDate = {};
      if (params.startDate) query.challanDate.$gte = new Date(params.startDate);
      if (params.endDate) query.challanDate.$lte = new Date(params.endDate);
    }

    if (params.search) {
      const searchRegex = new RegExp(params.search.trim(), 'i');
      query.$or = [
        { challanNumber: searchRegex },
        { vehicleNumber: searchRegex },
        { transporterName: searchRegex },
        { notes: searchRegex },
      ];
    }

    const sortField = params.sortBy || 'challanDate';
    const sortDirection = params.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortField]: sortDirection };

    const [challans, total] = await Promise.all([
      DeliveryChallan.find(query)
        .populate('customerId', 'name phone email gstin address')
        .populate('salesOrderId', 'orderNumber orderDate status')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      DeliveryChallan.countDocuments(query),
    ]);

    return {
      challans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single delivery challan by ID
   */
  async getChallanById(businessId: string, challanId: string): Promise<IDeliveryChallan> {
    if (!Types.ObjectId.isValid(challanId)) {
      throw new BadRequestError('Invalid Challan ID');
    }

    const challan = await DeliveryChallan.findOne({
      _id: challanId,
      businessId,
    })
      .populate('customerId', 'name phone email gstin address state')
      .populate('salesOrderId', 'orderNumber orderDate status');

    if (!challan) {
      throw new NotFoundError('Delivery Challan not found');
    }

    return challan;
  }

  /**
   * Update delivery challan status
   */
  async updateChallanStatus(
    businessId: string,
    userId: string,
    challanId: string,
    status: ChallanStatus,
    ipAddress?: string
  ): Promise<IDeliveryChallan> {
    if (!Types.ObjectId.isValid(challanId)) {
      throw new BadRequestError('Invalid Challan ID');
    }

    const challan = await DeliveryChallan.findOne({
      _id: challanId,
      businessId,
    });

    if (!challan) {
      throw new NotFoundError('Delivery Challan not found');
    }

    challan.status = status;
    await challan.save();

    await createAuditLog(
      businessId,
      userId,
      'updated',
      'delivery_challan',
      challan._id.toString(),
      { newStatus: status },
      ipAddress
    );

    return challan;
  }
}

export const deliveryChallanService = new DeliveryChallanService();
export default deliveryChallanService;

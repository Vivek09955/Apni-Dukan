import { Types } from 'mongoose';
import { Notification, INotification, NotificationType } from '../models/Notification';
import { Product } from '../models/Product';
import { InventoryMovement } from '../models/InventoryMovement';
import { SalesInvoice } from '../models/SalesInvoice';
import { BadRequestError, NotFoundError } from '../utils/errors';

export interface NotificationFilterParams {
  isRead?: boolean | string;
  type?: NotificationType;
  page?: number | string;
  limit?: number | string;
}

export class NotificationService {
  /**
   * Create a notification (system, trigger, or manual)
   */
  async createNotification(
    businessId: string,
    userId: string | null | undefined,
    type: NotificationType,
    title: string,
    message: string,
    data: Record<string, any> = {}
  ): Promise<INotification> {
    const notification = new Notification({
      businessId: new Types.ObjectId(businessId),
      userId: userId && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null,
      type,
      title,
      message,
      data,
      isRead: false,
    });

    await notification.save();
    return notification;
  }

  /**
   * Get notifications for a business / user with unread first and pagination
   */
  async getNotifications(
    businessId: string,
    userId?: string,
    params: NotificationFilterParams = {}
  ) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = { businessId: new Types.ObjectId(businessId) };

    if (userId && Types.ObjectId.isValid(userId)) {
      query.$or = [{ userId: null }, { userId: new Types.ObjectId(userId) }];
    }

    if (params.isRead !== undefined && params.isRead !== '') {
      query.isRead = String(params.isRead) === 'true';
    }

    if (params.type) {
      query.type = params.type;
    }

    // Sort: unread first (isRead: 1), then newest first (createdAt: -1)
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ isRead: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ ...query, isRead: false }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mark a specific notification as read
   */
  async markAsRead(
    businessId: string,
    notificationId: string,
    userId?: string
  ): Promise<INotification> {
    if (!Types.ObjectId.isValid(notificationId)) {
      throw new BadRequestError('Invalid Notification ID');
    }

    const query: Record<string, any> = {
      _id: new Types.ObjectId(notificationId),
      businessId: new Types.ObjectId(businessId),
    };

    if (userId && Types.ObjectId.isValid(userId)) {
      query.$or = [{ userId: null }, { userId: new Types.ObjectId(userId) }];
    }

    const notification = await Notification.findOne(query);
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    return notification;
  }

  /**
   * Mark all unread notifications as read for a business / user
   */
  async markAllAsRead(businessId: string, userId?: string): Promise<number> {
    const query: Record<string, any> = {
      businessId: new Types.ObjectId(businessId),
      isRead: false,
    };

    if (userId && Types.ObjectId.isValid(userId)) {
      query.$or = [{ userId: null }, { userId: new Types.ObjectId(userId) }];
    }

    const result = await Notification.updateMany(query, {
      $set: { isRead: true, readAt: new Date() },
    });

    return result.modifiedCount;
  }

  /**
   * Get unread notifications count
   */
  async getUnreadCount(businessId: string, userId?: string): Promise<number> {
    const query: Record<string, any> = {
      businessId: new Types.ObjectId(businessId),
      isRead: false,
    };

    if (userId && Types.ObjectId.isValid(userId)) {
      query.$or = [{ userId: null }, { userId: new Types.ObjectId(userId) }];
    }

    return Notification.countDocuments(query);
  }

  /**
   * Check products with stock <= reorderLevel and trigger low stock alerts
   */
  async checkLowStockAlerts(businessId: string): Promise<number> {
    const products = await Product.find({
      businessId: new Types.ObjectId(businessId),
      trackInventory: true,
      isActive: true,
    }).lean();

    if (products.length === 0) return 0;

    const productIds = products.map((p) => p._id);
    const stockAgg = await InventoryMovement.aggregate([
      {
        $match: {
          businessId: new Types.ObjectId(businessId),
          productId: { $in: productIds },
        },
      },
      {
        $group: {
          _id: '$productId',
          totalStock: { $sum: '$quantity' },
        },
      },
    ]);

    const stockMap: Record<string, number> = {};
    for (const item of stockAgg) {
      stockMap[item._id.toString()] = item.totalStock;
    }

    let createdCount = 0;

    for (const product of products) {
      const currentStock = stockMap[product._id.toString()] || 0;
      if (currentStock <= product.reorderLevel) {
        // Prevent spamming duplicate unread notification for the same product
        const existingUnread = await Notification.findOne({
          businessId: new Types.ObjectId(businessId),
          type: 'low_stock',
          'data.productId': product._id.toString(),
          isRead: false,
        });

        if (!existingUnread) {
          await this.createNotification(
            businessId,
            null,
            'low_stock',
            `Low Stock Alert: ${product.name}`,
            `Current stock for "${product.name}" is ${currentStock} ${product.unit}, which is at or below the reorder level of ${product.reorderLevel} ${product.unit}.`,
            {
              productId: product._id.toString(),
              productName: product.name,
              currentStock,
              reorderLevel: product.reorderLevel,
              unit: product.unit,
            }
          );
          createdCount++;
        }
      }
    }

    return createdCount;
  }

  /**
   * Check overdue invoices and trigger alerts
   */
  async checkOverdueInvoices(businessId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueInvoices = await SalesInvoice.find({
      businessId: new Types.ObjectId(businessId),
      dueDate: { $lt: today },
      status: { $nin: ['paid', 'cancelled'] },
    })
      .populate('customerId', 'name')
      .lean();

    let createdCount = 0;

    for (const inv of overdueInvoices) {
      const existingUnread = await Notification.findOne({
        businessId: new Types.ObjectId(businessId),
        type: 'payment_overdue',
        'data.invoiceId': inv._id.toString(),
        isRead: false,
      });

      if (!existingUnread) {
        const customerName = (inv.customerId as any)?.name || 'Customer';
        const dueRupees = (inv.balanceDue / 100).toFixed(2);
        await this.createNotification(
          businessId,
          null,
          'payment_overdue',
          `Payment Overdue: Invoice #${inv.invoiceNumber}`,
          `Payment of ₹${dueRupees} for invoice #${inv.invoiceNumber} from ${customerName} was due on ${new Date(inv.dueDate!).toLocaleDateString()}.`,
          {
            invoiceId: inv._id.toString(),
            invoiceNumber: inv.invoiceNumber,
            balanceDue: inv.balanceDue,
            dueDate: inv.dueDate,
          }
        );
        createdCount++;
      }
    }

    return createdCount;
  }
}

export const notificationService = new NotificationService();
export default notificationService;

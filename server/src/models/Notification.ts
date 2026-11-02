import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type NotificationType =
  | 'low_stock'
  | 'payment_due'
  | 'payment_overdue'
  | 'invoice_created'
  | 'quotation_expiring'
  | 'system';

export interface INotification extends Document {
  businessId: Types.ObjectId;
  userId?: Types.ObjectId; // null or undefined means broadcast to all users in the business
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: {
        values: [
          'low_stock',
          'payment_due',
          'payment_overdue',
          'invoice_created',
          'quotation_expiring',
          'system',
        ],
        message: '{VALUE} is not a valid notification type',
      },
      required: [true, 'Notification type is required'],
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index on [businessId, userId, isRead]
notificationSchema.index({ businessId: 1, userId: 1, isRead: 1 });
notificationSchema.index({ businessId: 1, createdAt: -1 });

export const Notification: Model<INotification> = mongoose.model<INotification>(
  'Notification',
  notificationSchema
);
export default Notification;

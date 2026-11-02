import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type SalesOrderStatus = 'draft' | 'confirmed' | 'partially_fulfilled' | 'fulfilled' | 'cancelled';

export interface ISalesOrderItem {
  productId: Types.ObjectId;
  name: string;
  hsnCode?: string;
  quantity: number;
  fulfilledQuantity: number;
  unit: string;
  rate: number; // paise per unit
  discount: number; // paise total
  discountPercent?: number;
  taxableAmount: number; // paise
  taxRate: number; // percentage
  cgstAmount: number; // paise
  sgstAmount: number; // paise
  igstAmount: number; // paise
  totalAmount: number; // paise
}

export interface ISalesOrder extends Document {
  businessId: Types.ObjectId;
  orderNumber: string;
  customerId: Types.ObjectId;
  orderDate: Date;
  expectedDate?: Date;
  placeOfSupply: string;
  items: ISalesOrderItem[];
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalTax: number;
  grandTotal: number;
  roundOff: number;
  finalAmount: number;
  isInterState: boolean;
  status: SalesOrderStatus;
  convertedInvoices: Types.ObjectId[];
  notes?: string;
  termsAndConditions?: string;
  createdAt: Date;
  updatedAt: Date;
}

const salesOrderItemSchema = new Schema<ISalesOrderItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    hsnCode: {
      type: String,
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0.001, 'Quantity must be positive'],
    },
    fulfilledQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      default: 'pcs',
      trim: true,
    },
    rate: {
      type: Number,
      required: [true, 'Rate is required'],
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxableAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    taxRate: {
      type: Number,
      default: 18,
      min: 0,
    },
    cgstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    sgstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    igstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const salesOrderSchema = new Schema<ISalesOrder>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],
      trim: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required'],
    },
    orderDate: {
      type: Date,
      required: [true, 'Order date is required'],
      default: Date.now,
    },
    expectedDate: {
      type: Date,
    },
    placeOfSupply: {
      type: String,
      required: [true, 'Place of supply is required'],
      trim: true,
    },
    items: {
      type: [salesOrderItemSchema],
      required: [true, 'Order items are required'],
      validate: {
        validator: function (items: ISalesOrderItem[]) {
          return items && items.length > 0;
        },
        message: 'At least one order item is required',
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    totalDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxableAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    totalCgst: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSgst: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalIgst: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalTax: {
      type: Number,
      default: 0,
      min: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    roundOff: {
      type: Number,
      default: 0,
    },
    finalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    isInterState: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'confirmed', 'partially_fulfilled', 'fulfilled', 'cancelled'],
        message: '{VALUE} is not a valid order status',
      },
      default: 'draft',
    },
    convertedInvoices: [
      {
        type: Schema.Types.ObjectId,
        ref: 'SalesInvoice',
      },
    ],
    notes: {
      type: String,
      trim: true,
    },
    termsAndConditions: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index on [businessId, orderNumber]
salesOrderSchema.index({ businessId: 1, orderNumber: 1 }, { unique: true });
salesOrderSchema.index({ businessId: 1, customerId: 1 });
salesOrderSchema.index({ businessId: 1, status: 1 });
salesOrderSchema.index({ businessId: 1, orderDate: -1 });

export const SalesOrder: Model<ISalesOrder> = mongoose.model<ISalesOrder>('SalesOrder', salesOrderSchema);
export default SalesOrder;

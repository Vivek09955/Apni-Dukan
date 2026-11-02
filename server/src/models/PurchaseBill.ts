import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type BillStatus = 'draft' | 'received' | 'partially_paid' | 'paid' | 'cancelled';

export interface IPurchaseBillItem {
  productId: Types.ObjectId;
  name: string;
  hsnCode?: string;
  quantity: number;
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

export interface IPurchaseBill extends Document {
  businessId: Types.ObjectId;
  billNumber: string;
  supplierId: Types.ObjectId;
  billDate: Date;
  dueDate?: Date;
  supplierBillNumber?: string;
  supplierBillDate?: Date;
  placeOfSupply: string;
  items: IPurchaseBillItem[];
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
  paidAmount: number;
  balanceDue: number;
  status: BillStatus;
  paymentTerms?: string;
  notes?: string;
  isInterState: boolean;
  journalEntryId?: Types.ObjectId;
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseBillItemSchema = new Schema<IPurchaseBillItem>(
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

const purchaseBillSchema = new Schema<IPurchaseBill>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    billNumber: {
      type: String,
      required: [true, 'Bill number is required'],
      trim: true,
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier ID is required'],
    },
    billDate: {
      type: Date,
      required: [true, 'Bill date is required'],
      default: Date.now,
    },
    dueDate: {
      type: Date,
    },
    supplierBillNumber: {
      type: String,
      trim: true,
    },
    supplierBillDate: {
      type: Date,
    },
    placeOfSupply: {
      type: String,
      required: [true, 'Place of supply is required'],
      trim: true,
    },
    items: {
      type: [purchaseBillItemSchema],
      required: [true, 'Bill items are required'],
      validate: {
        validator: function (items: IPurchaseBillItem[]) {
          return items && items.length > 0;
        },
        message: 'At least one bill item is required',
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
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    balanceDue: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'received', 'partially_paid', 'paid', 'cancelled'],
        message: '{VALUE} is not a valid bill status',
      },
      default: 'draft',
    },
    paymentTerms: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    isInterState: {
      type: Boolean,
      default: false,
    },
    journalEntryId: {
      type: Schema.Types.ObjectId,
      ref: 'JournalEntry',
    },
    cancelledAt: {
      type: Date,
    },
    cancelReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index on [businessId, billNumber]
purchaseBillSchema.index({ businessId: 1, billNumber: 1 }, { unique: true });

// Index on [businessId, supplierId]
purchaseBillSchema.index({ businessId: 1, supplierId: 1 });

// Index on [businessId, status]
purchaseBillSchema.index({ businessId: 1, status: 1 });

// Index on [businessId, billDate]
purchaseBillSchema.index({ businessId: 1, billDate: -1 });

export const PurchaseBill: Model<IPurchaseBill> = mongoose.model<IPurchaseBill>(
  'PurchaseBill',
  purchaseBillSchema
);
export default PurchaseBill;

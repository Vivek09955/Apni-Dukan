import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

export interface ISalesInvoiceBankDetails {
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  upiId?: string;
}

export interface ISalesInvoiceItem {
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

export interface ISalesInvoice extends Document {
  businessId: Types.ObjectId;
  invoiceNumber: string;
  customerId: Types.ObjectId;
  invoiceDate: Date;
  dueDate?: Date;
  placeOfSupply: string;
  items: ISalesInvoiceItem[];
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
  status: InvoiceStatus;
  paymentTerms?: string;
  notes?: string;
  termsAndConditions?: string;
  bankDetails?: ISalesInvoiceBankDetails;
  isInterState: boolean;
  journalEntryId?: Types.ObjectId;
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const salesInvoiceItemSchema = new Schema<ISalesInvoiceItem>(
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

const bankDetailsSchema = new Schema<ISalesInvoiceBankDetails>(
  {
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifsc: { type: String, trim: true },
    upiId: { type: String, trim: true },
  },
  { _id: false }
);

const salesInvoiceSchema = new Schema<ISalesInvoice>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      trim: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required'],
    },
    invoiceDate: {
      type: Date,
      required: [true, 'Invoice date is required'],
      default: Date.now,
    },
    dueDate: {
      type: Date,
    },
    placeOfSupply: {
      type: String,
      required: [true, 'Place of supply is required'],
      trim: true,
    },
    items: {
      type: [salesInvoiceItemSchema],
      required: [true, 'Invoice items are required'],
      validate: {
        validator: function (items: ISalesInvoiceItem[]) {
          return items && items.length > 0;
        },
        message: 'At least one invoice item is required',
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
        values: ['draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled'],
        message: '{VALUE} is not a valid invoice status',
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
    termsAndConditions: {
      type: String,
      trim: true,
    },
    bankDetails: {
      type: bankDetailsSchema,
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

// Compound unique index on [businessId, invoiceNumber]
salesInvoiceSchema.index({ businessId: 1, invoiceNumber: 1 }, { unique: true });

// Index on [businessId, customerId]
salesInvoiceSchema.index({ businessId: 1, customerId: 1 });

// Index on [businessId, status]
salesInvoiceSchema.index({ businessId: 1, status: 1 });

// Index on [businessId, invoiceDate]
salesInvoiceSchema.index({ businessId: 1, invoiceDate: -1 });

export const SalesInvoice: Model<ISalesInvoice> = mongoose.model<ISalesInvoice>(
  'SalesInvoice',
  salesInvoiceSchema
);
export default SalesInvoice;

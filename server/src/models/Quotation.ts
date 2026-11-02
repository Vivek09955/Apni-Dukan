import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';

export interface IQuotationItem {
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

export interface IQuotation extends Document {
  businessId: Types.ObjectId;
  quotationNumber: string;
  customerId: Types.ObjectId;
  quotationDate: Date;
  validUntil?: Date;
  placeOfSupply: string;
  items: IQuotationItem[];
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
  status: QuotationStatus;
  convertedToInvoice?: Types.ObjectId;
  notes?: string;
  termsAndConditions?: string;
  createdAt: Date;
  updatedAt: Date;
}

const quotationItemSchema = new Schema<IQuotationItem>(
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

const quotationSchema = new Schema<IQuotation>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    quotationNumber: {
      type: String,
      required: [true, 'Quotation number is required'],
      trim: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required'],
    },
    quotationDate: {
      type: Date,
      required: [true, 'Quotation date is required'],
      default: Date.now,
    },
    validUntil: {
      type: Date,
    },
    placeOfSupply: {
      type: String,
      required: [true, 'Place of supply is required'],
      trim: true,
    },
    items: {
      type: [quotationItemSchema],
      required: [true, 'Quotation items are required'],
      validate: {
        validator: function (items: IQuotationItem[]) {
          return items && items.length > 0;
        },
        message: 'At least one quotation item is required',
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
        values: ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'],
        message: '{VALUE} is not a valid quotation status',
      },
      default: 'draft',
    },
    convertedToInvoice: {
      type: Schema.Types.ObjectId,
      ref: 'SalesInvoice',
    },
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

// Compound unique index on [businessId, quotationNumber]
quotationSchema.index({ businessId: 1, quotationNumber: 1 }, { unique: true });
quotationSchema.index({ businessId: 1, customerId: 1 });
quotationSchema.index({ businessId: 1, status: 1 });
quotationSchema.index({ businessId: 1, quotationDate: -1 });

export const Quotation: Model<IQuotation> = mongoose.model<IQuotation>('Quotation', quotationSchema);
export default Quotation;

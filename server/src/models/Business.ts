import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IBusinessAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface IBusinessSettings {
  taxInclusive: boolean;
  enableGst: boolean;
  enableDiscount: boolean;
  roundOffTotal: boolean;
  defaultTaxRate: number;
  thermalPrint: boolean;
  showLogo: boolean;
}

export interface IBusiness extends Document {
  name: string;
  logo?: string;
  address?: IBusinessAddress;
  phone: string;
  email: string;
  gstin?: string;
  state: string;
  financialYearStart: number;
  currency: string;
  invoicePrefix: string;
  invoiceNextNumber: number;
  purchasePrefix: string;
  purchaseNextNumber: number;
  quotationPrefix: string;
  quotationNextNumber: number;
  salesOrderPrefix: string;
  salesOrderNextNumber: number;
  purchaseOrderPrefix: string;
  purchaseOrderNextNumber: number;
  challanPrefix: string;
  challanNextNumber: number;
  paymentNextNumber: number;
  expenseNextNumber: number;
  incomeNextNumber: number;
  journalNextNumber: number;
  settings: IBusinessSettings;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<IBusinessAddress>(
  {
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
  },
  { _id: false }
);

const settingsSchema = new Schema<IBusinessSettings>(
  {
    taxInclusive: { type: Boolean, default: false },
    enableGst: { type: Boolean, default: true },
    enableDiscount: { type: Boolean, default: true },
    roundOffTotal: { type: Boolean, default: true },
    defaultTaxRate: { type: Number, default: 18 },
    thermalPrint: { type: Boolean, default: false },
    showLogo: { type: Boolean, default: true },
  },
  { _id: false }
);

const businessSchema = new Schema<IBusiness>(
  {
    name: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      minlength: [2, 'Business name must be at least 2 characters long'],
    },
    logo: {
      type: String,
      trim: true,
    },
    address: {
      type: addressSchema,
      default: () => ({}),
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: function (v: string) {
          if (!v) return true;
          return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
        },
        message: 'Invalid GSTIN format. Should match Indian GST format (e.g., 22AAAAA0000A1Z5)',
      },
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
    },
    financialYearStart: {
      type: Number,
      default: 4, // April
      min: 1,
      max: 12,
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    invoicePrefix: {
      type: String,
      default: 'INV',
      trim: true,
      uppercase: true,
    },
    invoiceNextNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
    purchasePrefix: {
      type: String,
      default: 'BILL',
      trim: true,
      uppercase: true,
    },
    purchaseNextNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
    quotationPrefix: {
      type: String,
      default: 'QTN',
      trim: true,
      uppercase: true,
    },
    quotationNextNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
    salesOrderPrefix: {
      type: String,
      default: 'SO',
      trim: true,
      uppercase: true,
    },
    salesOrderNextNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
    purchaseOrderPrefix: {
      type: String,
      default: 'PO',
      trim: true,
      uppercase: true,
    },
    purchaseOrderNextNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
    challanPrefix: {
      type: String,
      default: 'DC',
      trim: true,
      uppercase: true,
    },
    challanNextNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
    paymentNextNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
    expenseNextNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
    incomeNextNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
    journalNextNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
    settings: {
      type: settingsSchema,
      default: () => ({
        taxInclusive: false,
        enableGst: true,
        enableDiscount: true,
        roundOffTotal: true,
        defaultTaxRate: 18,
        thermalPrint: false,
        showLogo: true,
      }),
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Business: Model<IBusiness> = mongoose.model<IBusiness>('Business', businessSchema);
export default Business;

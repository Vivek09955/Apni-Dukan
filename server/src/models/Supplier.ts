import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface ISupplierAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface ISupplier extends Document {
  businessId: Types.ObjectId;
  name: string;
  phone?: string;
  email?: string;
  gstin?: string;
  address?: ISupplierAddress;
  openingBalance: number;
  creditDays: number;
  group?: string;
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<ISupplierAddress>(
  {
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
  },
  { _id: false }
);

const supplierSchema = new Schema<ISupplier>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
    },
    address: {
      type: addressSchema,
      default: () => ({}),
    },
    openingBalance: {
      type: Number,
      default: 0, // stored in paise, positive = payable
    },
    creditDays: {
      type: Number,
      default: 30,
      min: 0,
    },
    group: {
      type: String,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
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

// Index on [businessId, name]
supplierSchema.index({ businessId: 1, name: 1 });

// Index on [businessId, phone]
supplierSchema.index({ businessId: 1, phone: 1 });

export const Supplier: Model<ISupplier> = mongoose.model<ISupplier>('Supplier', supplierSchema);
export default Supplier;

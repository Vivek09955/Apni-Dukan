import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface ICustomer extends Document {
  businessId: Types.ObjectId;
  name: string;
  phone?: string;
  email?: string;
  gstin?: string;
  billingAddress?: IAddress;
  shippingAddress?: IAddress;
  openingBalance: number;
  creditLimit: number;
  creditDays: number;
  group?: string;
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<IAddress>(
  {
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
  },
  { _id: false }
);

const customerSchema = new Schema<ICustomer>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Customer name is required'],
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
    billingAddress: {
      type: addressSchema,
      default: () => ({}),
    },
    shippingAddress: {
      type: addressSchema,
      default: () => ({}),
    },
    openingBalance: {
      type: Number,
      default: 0, // stored in paise, positive = receivable
    },
    creditLimit: {
      type: Number,
      default: 0, // stored in paise
      min: 0,
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
customerSchema.index({ businessId: 1, name: 1 });

// Index on [businessId, phone]
customerSchema.index({ businessId: 1, phone: 1 });

export const Customer: Model<ICustomer> = mongoose.model<ICustomer>('Customer', customerSchema);
export default Customer;

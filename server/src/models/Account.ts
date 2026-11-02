import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface IAccount extends Document {
  businessId: Types.ObjectId;
  name: string;
  code: string;
  type: AccountType;
  subType?: string;
  parentAccount?: Types.ObjectId;
  description?: string;
  openingBalance: number; // in paise
  isSystemAccount: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const accountSchema = new Schema<IAccount>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Account name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Account code is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: {
        values: ['asset', 'liability', 'equity', 'revenue', 'expense'],
        message: '{VALUE} is not a valid account type',
      },
      required: [true, 'Account type is required'],
    },
    subType: {
      type: String,
      trim: true,
    },
    parentAccount: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
    },
    description: {
      type: String,
      trim: true,
    },
    openingBalance: {
      type: Number,
      default: 0,
    },
    isSystemAccount: {
      type: Boolean,
      default: false,
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

// Compound unique index on [businessId, code]
accountSchema.index({ businessId: 1, code: 1 }, { unique: true });

// Index for querying accounts by type within business
accountSchema.index({ businessId: 1, type: 1 });

export const Account: Model<IAccount> = mongoose.model<IAccount>('Account', accountSchema);
export default Account;

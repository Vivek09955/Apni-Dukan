import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type IncomeCategory =
  | 'interest'
  | 'rent_received'
  | 'commission'
  | 'discount_received'
  | 'other';

export interface IOtherIncome extends Document {
  businessId: Types.ObjectId;
  incomeNumber: string;
  category: IncomeCategory | string;
  amount: number; // in paise
  incomeDate: Date;
  paymentMethod: string;
  description?: string;
  journalEntryId?: Types.ObjectId;
  isCancelled: boolean;
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const otherIncomeSchema = new Schema<IOtherIncome>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    incomeNumber: {
      type: String,
      required: [true, 'Income number is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Income amount must be at least 1 paisa'],
    },
    incomeDate: {
      type: Date,
      required: [true, 'Income date is required'],
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      default: 'cash',
    },
    description: {
      type: String,
      trim: true,
    },
    journalEntryId: {
      type: Schema.Types.ObjectId,
      ref: 'JournalEntry',
    },
    isCancelled: {
      type: Boolean,
      default: false,
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

// Compound unique index on [businessId, incomeNumber]
otherIncomeSchema.index({ businessId: 1, incomeNumber: 1 }, { unique: true });

// Index on [businessId, category, incomeDate]
otherIncomeSchema.index({ businessId: 1, category: 1, incomeDate: -1 });

export const OtherIncome: Model<IOtherIncome> = mongoose.model<IOtherIncome>(
  'OtherIncome',
  otherIncomeSchema
);
export default OtherIncome;

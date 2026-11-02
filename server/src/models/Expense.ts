import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type ExpensePaymentMethod = 'cash' | 'bank_transfer' | 'upi' | 'cheque' | 'other';
export type ExpenseCategory =
  | 'rent'
  | 'salary'
  | 'electricity'
  | 'transport'
  | 'office'
  | 'purchase'
  | 'other';

export interface IExpense extends Document {
  businessId: Types.ObjectId;
  expenseNumber: string;
  category: ExpenseCategory | string;
  amount: number; // in paise
  expenseDate: Date;
  paymentMethod: ExpensePaymentMethod;
  vendorName?: string;
  vendorId?: Types.ObjectId;
  description?: string;
  notes?: string;
  isRecurring: boolean;
  recurringInterval?: 'monthly' | 'quarterly' | 'yearly' | string;
  journalEntryId?: Types.ObjectId;
  isCancelled: boolean;
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    expenseNumber: {
      type: String,
      required: [true, 'Expense number is required'],
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
      min: [1, 'Expense amount must be at least 1 paisa'],
    },
    expenseDate: {
      type: Date,
      required: [true, 'Expense date is required'],
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: {
        values: ['cash', 'bank_transfer', 'upi', 'cheque', 'other'],
        message: '{VALUE} is not a valid payment method',
      },
      required: [true, 'Payment method is required'],
    },
    vendorName: {
      type: String,
      trim: true,
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
    },
    description: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringInterval: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly'],
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

// Compound unique index on [businessId, expenseNumber]
expenseSchema.index({ businessId: 1, expenseNumber: 1 }, { unique: true });

// Index on [businessId, category, expenseDate]
expenseSchema.index({ businessId: 1, category: 1, expenseDate: -1 });

export const Expense: Model<IExpense> = mongoose.model<IExpense>('Expense', expenseSchema);
export default Expense;

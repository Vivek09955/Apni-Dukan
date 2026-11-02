import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IJournalLine {
  accountId: Types.ObjectId;
  debit: number; // in paise
  credit: number; // in paise
  description?: string;
}

export interface IJournalEntry extends Document {
  businessId: Types.ObjectId;
  entryNumber: string;
  date: Date;
  narration: string;
  lines: IJournalLine[];
  referenceType?: string; // invoice, bill, payment, expense, other_income, adjustment
  referenceId?: Types.ObjectId;
  isReversed: boolean;
  reversedBy?: Types.ObjectId;
  isPosted: boolean;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const journalLineSchema = new Schema<IJournalLine>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Account ID is required'],
    },
    debit: {
      type: Number,
      default: 0,
      min: [0, 'Debit cannot be negative'],
    },
    credit: {
      type: Number,
      default: 0,
      min: [0, 'Credit cannot be negative'],
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const journalEntrySchema = new Schema<IJournalEntry>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    entryNumber: {
      type: String,
      required: [true, 'Entry number is required'],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
    },
    narration: {
      type: String,
      required: [true, 'Narration is required'],
      trim: true,
    },
    lines: {
      type: [journalLineSchema],
      required: [true, 'Journal entry lines are required'],
      validate: {
        validator: function (lines: IJournalLine[]) {
          return lines && lines.length >= 2;
        },
        message: 'Journal entry must have at least 2 lines',
      },
    },
    referenceType: {
      type: String,
      trim: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
    },
    isReversed: {
      type: Boolean,
      default: false,
    },
    reversedBy: {
      type: Schema.Types.ObjectId,
      ref: 'JournalEntry',
    },
    isPosted: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save validation hook: Ensure sum of debits == sum of credits
journalEntrySchema.pre('save', function (next) {
  if (!this.lines || this.lines.length < 2) {
    return next(new Error('Journal entry must have at least 2 lines'));
  }

  const totalDebit = this.lines.reduce((sum, line) => sum + (Math.round(line.debit) || 0), 0);
  const totalCredit = this.lines.reduce((sum, line) => sum + (Math.round(line.credit) || 0), 0);

  if (totalDebit === 0 && totalCredit === 0) {
    return next(new Error('Journal entry amount cannot be zero'));
  }

  if (totalDebit !== totalCredit) {
    return next(
      new Error(
        `Journal entry is not balanced. Total Debits: ${totalDebit} paise, Total Credits: ${totalCredit} paise`
      )
    );
  }

  next();
});

// Compound unique index on [businessId, entryNumber]
journalEntrySchema.index({ businessId: 1, entryNumber: 1 }, { unique: true });

// Index on [businessId, date]
journalEntrySchema.index({ businessId: 1, date: -1 });

// Index on [businessId, referenceType, referenceId]
journalEntrySchema.index({ businessId: 1, referenceType: 1, referenceId: 1 });

export const JournalEntry: Model<IJournalEntry> = mongoose.model<IJournalEntry>(
  'JournalEntry',
  journalEntrySchema
);
export default JournalEntry;

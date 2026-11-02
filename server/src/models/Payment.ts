import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type PaymentType = 'payment_in' | 'payment_out';
export type PartyType = 'customer' | 'supplier';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'upi' | 'cheque' | 'other';
export type AllocationInvoiceType = 'sales_invoice' | 'purchase_bill';

export interface IInvoiceAllocation {
  invoiceId: Types.ObjectId;
  invoiceType: AllocationInvoiceType;
  allocatedAmount: number; // in paise
}

export interface IPayment extends Document {
  businessId: Types.ObjectId;
  paymentNumber: string;
  type: PaymentType;
  partyType: PartyType;
  partyId: Types.ObjectId;
  amount: number; // in paise, always positive
  paymentMethod: PaymentMethod;
  paymentDate: Date;
  referenceNumber?: string;
  bankName?: string;
  invoiceAllocations: IInvoiceAllocation[];
  isAdvance: boolean;
  notes?: string;
  journalEntryId?: Types.ObjectId;
  isCancelled: boolean;
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceAllocationSchema = new Schema<IInvoiceAllocation>(
  {
    invoiceId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Invoice ID is required'],
    },
    invoiceType: {
      type: String,
      enum: {
        values: ['sales_invoice', 'purchase_bill'],
        message: '{VALUE} is not a valid invoice type',
      },
      required: [true, 'Invoice type is required'],
    },
    allocatedAmount: {
      type: Number,
      required: [true, 'Allocated amount is required'],
      min: [1, 'Allocated amount must be at least 1 paisa'],
    },
  },
  { _id: false }
);

const paymentSchema = new Schema<IPayment>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    paymentNumber: {
      type: String,
      required: [true, 'Payment number is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: {
        values: ['payment_in', 'payment_out'],
        message: '{VALUE} is not a valid payment type',
      },
      required: [true, 'Payment type is required'],
    },
    partyType: {
      type: String,
      enum: {
        values: ['customer', 'supplier'],
        message: '{VALUE} is not a valid party type',
      },
      required: [true, 'Party type is required'],
    },
    partyId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Party ID is required'],
      refPath: 'partyTypeModel',
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Payment amount must be at least 1 paisa'],
    },
    paymentMethod: {
      type: String,
      enum: {
        values: ['cash', 'bank_transfer', 'upi', 'cheque', 'other'],
        message: '{VALUE} is not a valid payment method',
      },
      required: [true, 'Payment method is required'],
    },
    paymentDate: {
      type: Date,
      required: [true, 'Payment date is required'],
      default: Date.now,
    },
    referenceNumber: {
      type: String,
      trim: true,
    },
    bankName: {
      type: String,
      trim: true,
    },
    invoiceAllocations: {
      type: [invoiceAllocationSchema],
      default: [],
    },
    isAdvance: {
      type: Boolean,
      default: false,
    },
    notes: {
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

// Virtual property for dynamic party reference
paymentSchema.virtual('partyTypeModel').get(function () {
  return this.partyType === 'customer' ? 'Customer' : 'Supplier';
});

// Compound unique index on [businessId, paymentNumber]
paymentSchema.index({ businessId: 1, paymentNumber: 1 }, { unique: true });

// Index on [businessId, partyType, partyId]
paymentSchema.index({ businessId: 1, partyType: 1, partyId: 1 });

// Index on [businessId, paymentDate]
paymentSchema.index({ businessId: 1, paymentDate: -1 });

export const Payment: Model<IPayment> = mongoose.model<IPayment>('Payment', paymentSchema);
export default Payment;

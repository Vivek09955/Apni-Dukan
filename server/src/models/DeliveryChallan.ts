import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type ChallanStatus = 'draft' | 'dispatched' | 'delivered' | 'cancelled';

export interface IDeliveryChallanItem {
  productId: Types.ObjectId;
  name: string;
  quantity: number;
  unit: string;
}

export interface IDeliveryChallan extends Document {
  businessId: Types.ObjectId;
  challanNumber: string;
  customerId: Types.ObjectId;
  challanDate: Date;
  items: IDeliveryChallanItem[];
  salesOrderId?: Types.ObjectId;
  status: ChallanStatus;
  vehicleNumber?: string;
  transporterName?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const deliveryChallanItemSchema = new Schema<IDeliveryChallanItem>(
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
  },
  { _id: false }
);

const deliveryChallanSchema = new Schema<IDeliveryChallan>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    challanNumber: {
      type: String,
      required: [true, 'Challan number is required'],
      trim: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required'],
    },
    challanDate: {
      type: Date,
      required: [true, 'Challan date is required'],
      default: Date.now,
    },
    items: {
      type: [deliveryChallanItemSchema],
      required: [true, 'Challan items are required'],
      validate: {
        validator: function (items: IDeliveryChallanItem[]) {
          return items && items.length > 0;
        },
        message: 'At least one item is required in the challan',
      },
    },
    salesOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'SalesOrder',
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'dispatched', 'delivered', 'cancelled'],
        message: '{VALUE} is not a valid challan status',
      },
      default: 'draft',
    },
    vehicleNumber: {
      type: String,
      trim: true,
    },
    transporterName: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index on [businessId, challanNumber]
deliveryChallanSchema.index({ businessId: 1, challanNumber: 1 }, { unique: true });
deliveryChallanSchema.index({ businessId: 1, customerId: 1 });
deliveryChallanSchema.index({ businessId: 1, status: 1 });
deliveryChallanSchema.index({ businessId: 1, challanDate: -1 });

export const DeliveryChallan: Model<IDeliveryChallan> = mongoose.model<IDeliveryChallan>(
  'DeliveryChallan',
  deliveryChallanSchema
);
export default DeliveryChallan;

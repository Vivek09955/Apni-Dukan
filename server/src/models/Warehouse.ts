import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IWarehouseAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface IWarehouse extends Document {
  businessId: Types.ObjectId;
  name: string;
  address?: IWarehouseAddress;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const warehouseAddressSchema = new Schema<IWarehouseAddress>(
  {
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
  },
  { _id: false }
);

const warehouseSchema = new Schema<IWarehouse>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Warehouse name is required'],
      trim: true,
    },
    address: {
      type: warehouseAddressSchema,
      default: () => ({}),
    },
    isDefault: {
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

warehouseSchema.index({ businessId: 1, name: 1 });

export const Warehouse: Model<IWarehouse> = mongoose.model<IWarehouse>('Warehouse', warehouseSchema);
export default Warehouse;

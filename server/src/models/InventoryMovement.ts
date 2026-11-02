import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type InventoryMovementType =
  | 'sale'
  | 'purchase'
  | 'sale_return'
  | 'purchase_return'
  | 'adjustment'
  | 'transfer_in'
  | 'transfer_out'
  | 'opening';

export type InventoryReferenceType = 'invoice' | 'bill' | 'adjustment' | 'transfer' | string;

export interface IInventoryMovement extends Document {
  businessId: Types.ObjectId;
  productId: Types.ObjectId;
  warehouseId: Types.ObjectId;
  type: InventoryMovementType;
  quantity: number;
  balanceAfter: number;
  unitCost?: number;
  referenceType?: InventoryReferenceType;
  referenceId?: Types.ObjectId;
  notes?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryMovementSchema = new Schema<IInventoryMovement>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Warehouse ID is required'],
    },
    type: {
      type: String,
      enum: {
        values: [
          'sale',
          'purchase',
          'sale_return',
          'purchase_return',
          'adjustment',
          'transfer_in',
          'transfer_out',
          'opening',
        ],
        message: '{VALUE} is not a valid movement type',
      },
      required: [true, 'Movement type is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
    },
    balanceAfter: {
      type: Number,
      required: [true, 'Balance after is required'],
    },
    unitCost: {
      type: Number,
      min: 0,
    },
    referenceType: {
      type: String,
      trim: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
    },
    notes: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index on [businessId, productId, warehouseId]
inventoryMovementSchema.index({ businessId: 1, productId: 1, warehouseId: 1 });

// Index on [businessId, referenceType, referenceId]
inventoryMovementSchema.index({ businessId: 1, referenceType: 1, referenceId: 1 });

export const InventoryMovement: Model<IInventoryMovement> = mongoose.model<IInventoryMovement>(
  'InventoryMovement',
  inventoryMovementSchema
);
export default InventoryMovement;

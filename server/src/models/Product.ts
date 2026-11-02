import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IProduct extends Document {
  businessId: Types.ObjectId;
  name: string;
  sku?: string;
  description?: string;
  category?: Types.ObjectId;
  brand?: string;
  hsnCode?: string;
  sacCode?: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  wholesalePrice?: number;
  taxRate: number;
  taxInclusive: boolean;
  trackInventory: boolean;
  reorderLevel: number;
  openingStock: number;
  images: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      index: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    hsnCode: {
      type: String,
      trim: true,
    },
    sacCode: {
      type: String,
      trim: true,
    },
    unit: {
      type: String,
      default: 'pcs',
      trim: true,
    },
    purchasePrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    sellingPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    wholesalePrice: {
      type: Number,
      min: 0,
    },
    taxRate: {
      type: Number,
      default: 18,
      min: 0,
    },
    taxInclusive: {
      type: Boolean,
      default: false,
    },
    trackInventory: {
      type: Boolean,
      default: true,
    },
    reorderLevel: {
      type: Number,
      default: 0,
      min: 0,
    },
    openingStock: {
      type: Number,
      default: 0,
    },
    images: {
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

// Compound index on [businessId, sku] unique sparse
productSchema.index(
  { businessId: 1, sku: 1 },
  { unique: true, sparse: true, partialFilterExpression: { sku: { $type: 'string' } } }
);

// Index on [businessId, name]
productSchema.index({ businessId: 1, name: 1 });

// Index on [businessId, category]
productSchema.index({ businessId: 1, category: 1 });

export const Product: Model<IProduct> = mongoose.model<IProduct>('Product', productSchema);
export default Product;

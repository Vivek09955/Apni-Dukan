import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface ICategory extends Document {
  businessId: Types.ObjectId;
  name: string;
  parentCategory?: Types.ObjectId;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
    },
    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },
    description: {
      type: String,
      trim: true,
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

// Compound unique index on [businessId, name]
categorySchema.index({ businessId: 1, name: 1 }, { unique: true });

export const Category: Model<ICategory> = mongoose.model<ICategory>('Category', categorySchema);
export default Category;

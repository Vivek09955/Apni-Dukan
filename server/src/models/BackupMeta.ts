import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type BackupStatus = 'completed' | 'failed' | 'restored';

export interface IBackupMeta extends Document {
  businessId: Types.ObjectId;
  filename: string;
  size: number; // in bytes
  collections: string[];
  status: BackupStatus;
  createdAt: Date;
  updatedAt: Date;
}

const backupMetaSchema = new Schema<IBackupMeta>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    filename: {
      type: String,
      required: [true, 'Filename is required'],
      trim: true,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    collections: {
      type: [String],
      required: true,
      default: [],
    },
    status: {
      type: String,
      enum: ['completed', 'failed', 'restored'],
      default: 'completed',
    },
  },
  {
    timestamps: true,
  }
);

backupMetaSchema.index({ businessId: 1, createdAt: -1 });

export const BackupMeta: Model<IBackupMeta> = mongoose.model<IBackupMeta>(
  'BackupMeta',
  backupMetaSchema
);
export default BackupMeta;

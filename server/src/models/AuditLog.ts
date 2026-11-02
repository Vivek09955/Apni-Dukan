import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type AuditAction = 'created' | 'updated' | 'deleted' | 'cancelled' | 'reversed' | string;

export interface IAuditLog extends Document {
  businessId: Types.ObjectId;
  userId: Types.ObjectId;
  action: AuditAction;
  entity: string;
  entityId?: Types.ObjectId;
  changes?: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
    },
    entity: {
      type: String,
      required: [true, 'Entity is required'],
      trim: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
    },
    changes: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index on [businessId, entity, createdAt]
auditLogSchema.index({ businessId: 1, entity: 1, createdAt: -1 });

export const AuditLog: Model<IAuditLog> = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
export default AuditLog;

import mongoose from 'mongoose';
import { AuditLog, AuditAction } from '../models/AuditLog';

export interface CreateAuditLogParams {
  businessId: string | mongoose.Types.ObjectId;
  userId: string | mongoose.Types.ObjectId;
  action: AuditAction;
  entity: string;
  entityId?: string | mongoose.Types.ObjectId;
  changes?: Record<string, any>;
  ipAddress?: string;
}

export const createAuditLog = async (
  businessId: string | mongoose.Types.ObjectId,
  userId: string | mongoose.Types.ObjectId,
  action: AuditAction,
  entity: string,
  entityId?: string | mongoose.Types.ObjectId,
  changes?: Record<string, any>,
  ipAddress?: string
): Promise<void> => {
  try {
    await AuditLog.create({
      businessId,
      userId,
      action,
      entity,
      entityId: entityId ? new mongoose.Types.ObjectId(entityId.toString()) : undefined,
      changes,
      ipAddress,
    });
  } catch (error) {
    console.error('[AuditLog] Failed to record audit log:', error);
  }
};

import fs from 'fs';
import path from 'path';
import os from 'os';
import mongoose, { Types } from 'mongoose';
import { BackupMeta, IBackupMeta } from '../models/BackupMeta';
import { Business } from '../models/Business';
import { BusinessMember } from '../models/BusinessMember';
import { Category } from '../models/Category';
import { Warehouse } from '../models/Warehouse';
import { Product } from '../models/Product';
import { InventoryMovement } from '../models/InventoryMovement';
import { Customer } from '../models/Customer';
import { Supplier } from '../models/Supplier';
import { SalesInvoice } from '../models/SalesInvoice';
import { PurchaseBill } from '../models/PurchaseBill';
import { Account } from '../models/Account';
import { JournalEntry } from '../models/JournalEntry';
import { Payment } from '../models/Payment';
import { Expense } from '../models/Expense';
import { OtherIncome } from '../models/OtherIncome';
import { Quotation } from '../models/Quotation';
import { SalesOrder } from '../models/SalesOrder';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { DeliveryChallan } from '../models/DeliveryChallan';
import { Notification } from '../models/Notification';
import { AuditLog } from '../models/AuditLog';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { createAuditLog } from '../middleware/auditLog';

const BACKUP_COLLECTIONS: Record<string, mongoose.Model<any>> = {
  Category,
  Warehouse,
  Product,
  InventoryMovement,
  Customer,
  Supplier,
  SalesInvoice,
  PurchaseBill,
  Account,
  JournalEntry,
  Payment,
  Expense,
  OtherIncome,
  Quotation,
  SalesOrder,
  PurchaseOrder,
  DeliveryChallan,
  Notification,
};

export class BackupService {
  private backupDir = path.join(os.tmpdir(), 'apni-dukan-backups');

  private async ensureDir() {
    try {
      await fs.promises.mkdir(this.backupDir, { recursive: true });
    } catch {
      // Ignore if exists
    }
  }

  /**
   * Export all business tenant data as JSON to a file and record metadata
   */
  async createBackup(
    businessId: string,
    userId: string,
    ipAddress?: string
  ): Promise<IBackupMeta> {
    await this.ensureDir();

    const bId = new Types.ObjectId(businessId);
    const business = await Business.findById(bId).lean();
    if (!business) {
      throw new NotFoundError('Business not found');
    }

    const exportedData: Record<string, any[]> = {};
    const collectionNames: string[] = [];

    for (const [colName, model] of Object.entries(BACKUP_COLLECTIONS)) {
      const records = await model.find({ businessId: bId }).lean();
      exportedData[colName] = records;
      collectionNames.push(colName);
    }

    const backupPayload = {
      version: '1.0',
      businessId,
      businessDetails: business,
      exportedAt: new Date().toISOString(),
      collections: exportedData,
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    const filename = `backup-${businessId}-${Date.now()}.json`;
    const filePath = path.join(this.backupDir, filename);

    await fs.promises.writeFile(filePath, jsonString, 'utf-8');
    const size = Buffer.byteLength(jsonString, 'utf-8');

    const backupMeta = new BackupMeta({
      businessId: bId,
      filename,
      size,
      collections: collectionNames,
      status: 'completed',
    });

    await backupMeta.save();

    await createAuditLog(
      businessId,
      userId,
      'created',
      'backup',
      backupMeta._id.toString(),
      { filename, size, collectionCount: collectionNames.length },
      ipAddress
    );

    return backupMeta;
  }

  /**
   * List backups for a business
   */
  async getBackups(businessId: string): Promise<IBackupMeta[]> {
    return BackupMeta.find({ businessId: new Types.ObjectId(businessId) })
      .sort({ createdAt: -1 });
  }

  /**
   * Restore business data from backup payload within a MongoDB transaction.
   * Replaces existing business records across collections safely.
   */
  async restoreBackup(
    businessId: string,
    userId: string,
    backupData: Record<string, any>,
    ipAddress?: string
  ): Promise<{ success: boolean; restoredCollections: string[] }> {
    const rawCollections = backupData.collections || backupData;
    if (!rawCollections || typeof rawCollections !== 'object') {
      throw new BadRequestError('Invalid backup payload: missing collections object');
    }

    const bId = new Types.ObjectId(businessId);
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const restoredCollections: string[] = [];

      for (const [colName, model] of Object.entries(BACKUP_COLLECTIONS)) {
        if (Array.isArray(rawCollections[colName])) {
          const items = rawCollections[colName];

          // Clear existing business documents in collection
          await model.deleteMany({ businessId: bId }).session(session);

          if (items.length > 0) {
            // Re-assign businessId to enforce tenant safety
            const sanitized = items.map((doc: any) => ({
              ...doc,
              businessId: bId,
            }));
            await model.insertMany(sanitized, { session });
          }

          restoredCollections.push(colName);
        }
      }

      await session.commitTransaction();

      await createAuditLog(
        businessId,
        userId,
        'updated',
        'backup_restore',
        businessId,
        { restoredCollections },
        ipAddress
      );

      return {
        success: true,
        restoredCollections,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

export const backupService = new BackupService();
export default backupService;

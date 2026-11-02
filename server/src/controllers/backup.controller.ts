import { Request, Response, NextFunction } from 'express';
import { backupService } from '../services/backup.service';
import { UnauthorizedError } from '../utils/errors';

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const backup = await backupService.createBackup(
      req.businessId!.toString(),
      req.user.id,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Business data backup created successfully',
      data: backup,
    });
  } catch (error) {
    next(error);
  }
};

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const backups = await backupService.getBackups(req.businessId!.toString());

    res.status(200).json({
      success: true,
      data: backups,
    });
  } catch (error) {
    next(error);
  }
};

export const restore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const result = await backupService.restoreBackup(
      req.businessId!.toString(),
      req.user.id,
      req.body.backupData,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Business data backup restored successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const backupController = {
  create,
  list,
  restore,
};
export default backupController;

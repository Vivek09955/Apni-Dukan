import { Request, Response, NextFunction } from 'express';
import { purchaseService } from '../services/purchase.service';
import { UnauthorizedError } from '../utils/errors';

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const bill = await purchaseService.createBill(
      req.businessId!.toString(),
      req.user.id,
      req.body,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Purchase bill created successfully',
      data: bill,
    });
  } catch (error) {
    next(error);
  }
};

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await purchaseService.getBills(req.businessId!.toString(), req.query);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bill = await purchaseService.getBillById(
      req.businessId!.toString(),
      req.params.id
    );
    res.status(200).json({
      success: true,
      data: bill,
    });
  } catch (error) {
    next(error);
  }
};

export const receive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const bill = await purchaseService.receiveBill(
      req.businessId!.toString(),
      req.params.id,
      req.user.id,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Purchase bill marked as received',
      data: bill,
    });
  } catch (error) {
    next(error);
  }
};

export const cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const bill = await purchaseService.cancelBill(
      req.businessId!.toString(),
      req.params.id,
      req.body.reason,
      req.user.id,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Purchase bill cancelled successfully',
      data: bill,
    });
  } catch (error) {
    next(error);
  }
};

export const getSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const summary = await purchaseService.getBillSummary(req.businessId!.toString(), {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    });

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

export const purchaseController = {
  create,
  list,
  getById,
  receive,
  cancel,
  getSummary,
};
export default purchaseController;

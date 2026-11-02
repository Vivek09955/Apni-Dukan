import { Request, Response, NextFunction } from 'express';
import { otherIncomeService } from '../services/otherIncome.service';
import { UnauthorizedError } from '../utils/errors';

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const income = await otherIncomeService.createIncome(
      req.businessId!.toString(),
      req.user.id,
      req.body,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Income recorded successfully',
      data: income,
    });
  } catch (error) {
    next(error);
  }
};

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await otherIncomeService.getIncomes(req.businessId!.toString(), req.query);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categories = otherIncomeService.getIncomeCategories();
    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const income = await otherIncomeService.getIncomeById(
      req.businessId!.toString(),
      req.params.id
    );

    res.status(200).json({
      success: true,
      data: income,
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

    const reason = req.body.reason || 'Cancelled by user';
    const income = await otherIncomeService.cancelIncome(
      req.businessId!.toString(),
      req.user.id,
      req.params.id,
      reason,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Income entry cancelled successfully',
      data: income,
    });
  } catch (error) {
    next(error);
  }
};

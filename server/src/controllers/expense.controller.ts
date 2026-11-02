import { Request, Response, NextFunction } from 'express';
import { expenseService } from '../services/expense.service';
import { UnauthorizedError } from '../utils/errors';

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const expense = await expenseService.createExpense(
      req.businessId!.toString(),
      req.user.id,
      req.body,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Expense recorded successfully',
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await expenseService.getExpenses(req.businessId!.toString(), req.query);
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
    const categories = expenseService.getExpenseCategories();
    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

export const getCategoryWiseSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const fromDate = req.query.fromDate as string | undefined;
    const toDate = req.query.toDate as string | undefined;

    const summary = await expenseService.getCategoryWiseSummary(
      req.businessId!.toString(),
      fromDate,
      toDate
    );

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const expense = await expenseService.getExpenseById(
      req.businessId!.toString(),
      req.params.id
    );

    res.status(200).json({
      success: true,
      data: expense,
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
    const expense = await expenseService.cancelExpense(
      req.businessId!.toString(),
      req.user.id,
      req.params.id,
      reason,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Expense cancelled successfully',
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

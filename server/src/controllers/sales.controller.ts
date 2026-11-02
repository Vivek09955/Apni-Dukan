import { Request, Response, NextFunction } from 'express';
import { salesService } from '../services/sales.service';
import { UnauthorizedError } from '../utils/errors';

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const invoice = await salesService.createInvoice(
      req.businessId!.toString(),
      req.user.id,
      req.body,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await salesService.getInvoices(req.businessId!.toString(), req.query);
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
    const invoice = await salesService.getInvoiceById(
      req.businessId!.toString(),
      req.params.id
    );
    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const issue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const invoice = await salesService.issueInvoice(
      req.businessId!.toString(),
      req.params.id,
      req.user.id,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Invoice issued successfully',
      data: invoice,
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

    const invoice = await salesService.cancelInvoice(
      req.businessId!.toString(),
      req.params.id,
      req.body.reason,
      req.user.id,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Invoice cancelled successfully',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const getSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const summary = await salesService.getInvoiceSummary(req.businessId!.toString(), {
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

export const salesController = {
  create,
  list,
  getById,
  issue,
  cancel,
  getSummary,
};
export default salesController;

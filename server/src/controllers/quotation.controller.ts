import { Request, Response, NextFunction } from 'express';
import { quotationService } from '../services/quotation.service';
import { UnauthorizedError } from '../utils/errors';

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const quotation = await quotationService.createQuotation(
      req.businessId!.toString(),
      req.user.id,
      req.body,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Quotation created successfully',
      data: quotation,
    });
  } catch (error) {
    next(error);
  }
};

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await quotationService.getQuotations(
      req.businessId!.toString(),
      req.query
    );

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
    const quotation = await quotationService.getQuotationById(
      req.businessId!.toString(),
      req.params.id
    );

    res.status(200).json({
      success: true,
      data: quotation,
    });
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const quotation = await quotationService.updateQuotationStatus(
      req.businessId!.toString(),
      req.user.id,
      req.params.id,
      req.body.status,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Quotation status updated successfully',
      data: quotation,
    });
  } catch (error) {
    next(error);
  }
};

export const convertToInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const invoice = await quotationService.convertToInvoice(
      req.businessId!.toString(),
      req.user.id,
      req.params.id,
      req.body,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Quotation successfully converted to Sales Invoice',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const quotationController = {
  create,
  list,
  getById,
  updateStatus,
  convertToInvoice,
};
export default quotationController;

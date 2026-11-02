import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { UnauthorizedError } from '../utils/errors';
import { PartyType } from '../models/Payment';

export const createPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const payment = await paymentService.createPayment(
      req.businessId!.toString(),
      req.user.id,
      req.body,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await paymentService.getPayments(req.businessId!.toString(), req.query);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getOutstanding = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const partyType = (req.query.partyType as PartyType) || 'customer';
    const partyId = req.query.partyId as string | undefined;

    const invoices = await paymentService.getOutstandingInvoices(
      req.businessId!.toString(),
      partyType,
      partyId
    );

    res.status(200).json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payment = await paymentService.getPaymentById(
      req.businessId!.toString(),
      req.params.id
    );

    res.status(200).json({
      success: true,
      data: payment,
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
    const payment = await paymentService.cancelPayment(
      req.businessId!.toString(),
      req.user.id,
      req.params.id,
      reason,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Payment cancelled successfully',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

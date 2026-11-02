import { Request, Response, NextFunction } from 'express';
import { salesOrderService } from '../services/salesOrder.service';
import { UnauthorizedError } from '../utils/errors';

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const order = await salesOrderService.createOrder(
      req.businessId!.toString(),
      req.user.id,
      req.body,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Sales Order created successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await salesOrderService.getOrders(
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
    const order = await salesOrderService.getOrderById(
      req.businessId!.toString(),
      req.params.id
    );

    res.status(200).json({
      success: true,
      data: order,
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

    const order = await salesOrderService.updateOrderStatus(
      req.businessId!.toString(),
      req.user.id,
      req.params.id,
      req.body.status,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Sales Order status updated successfully',
      data: order,
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

    const invoice = await salesOrderService.convertToInvoice(
      req.businessId!.toString(),
      req.user.id,
      req.params.id,
      req.body,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Sales Order converted to Sales Invoice successfully',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const salesOrderController = {
  create,
  list,
  getById,
  updateStatus,
  convertToInvoice,
};
export default salesOrderController;

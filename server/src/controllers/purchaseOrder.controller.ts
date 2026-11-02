import { Request, Response, NextFunction } from 'express';
import { purchaseOrderService } from '../services/purchaseOrder.service';
import { UnauthorizedError } from '../utils/errors';

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const order = await purchaseOrderService.createOrder(
      req.businessId!.toString(),
      req.user.id,
      req.body,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Purchase Order created successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await purchaseOrderService.getOrders(
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
    const order = await purchaseOrderService.getOrderById(
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

    const order = await purchaseOrderService.updateOrderStatus(
      req.businessId!.toString(),
      req.user.id,
      req.params.id,
      req.body.status,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Purchase Order status updated successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const convertToBill = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const bill = await purchaseOrderService.convertToBill(
      req.businessId!.toString(),
      req.user.id,
      req.params.id,
      req.body,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Purchase Order converted to Purchase Bill successfully',
      data: bill,
    });
  } catch (error) {
    next(error);
  }
};

export const purchaseOrderController = {
  create,
  list,
  getById,
  updateStatus,
  convertToBill,
};
export default purchaseOrderController;

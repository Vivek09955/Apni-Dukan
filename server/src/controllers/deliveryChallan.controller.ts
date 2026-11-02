import { Request, Response, NextFunction } from 'express';
import { deliveryChallanService } from '../services/deliveryChallan.service';
import { UnauthorizedError } from '../utils/errors';

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const challan = await deliveryChallanService.createChallan(
      req.businessId!.toString(),
      req.user.id,
      req.body,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Delivery Challan created successfully',
      data: challan,
    });
  } catch (error) {
    next(error);
  }
};

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await deliveryChallanService.getChallans(
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
    const challan = await deliveryChallanService.getChallanById(
      req.businessId!.toString(),
      req.params.id
    );

    res.status(200).json({
      success: true,
      data: challan,
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

    const challan = await deliveryChallanService.updateChallanStatus(
      req.businessId!.toString(),
      req.user.id,
      req.params.id,
      req.body.status,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Delivery Challan status updated successfully',
      data: challan,
    });
  } catch (error) {
    next(error);
  }
};

export const deliveryChallanController = {
  create,
  list,
  getById,
  updateStatus,
};
export default deliveryChallanController;

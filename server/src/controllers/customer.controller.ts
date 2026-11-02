import { Request, Response, NextFunction } from 'express';
import { customerService } from '../services/customer.service';

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const customer = await customerService.createCustomer(
      req.businessId!.toString(),
      req.body,
      req.user?.id,
      req.ip
    );
    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await customerService.getCustomers(req.businessId!.toString(), req.query);
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
    const customer = await customerService.getCustomerById(
      req.businessId!.toString(),
      req.params.id
    );
    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const customer = await customerService.updateCustomer(
      req.businessId!.toString(),
      req.params.id,
      req.body,
      req.user?.id,
      req.ip
    );
    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await customerService.deleteCustomer(
      req.businessId!.toString(),
      req.params.id,
      req.user?.id,
      req.ip
    );
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const getLedger = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ledger = await customerService.getCustomerLedger(
      req.businessId!.toString(),
      req.params.id,
      {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      }
    );
    res.status(200).json({
      success: true,
      data: ledger,
    });
  } catch (error) {
    next(error);
  }
};

export const getOutstanding = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const outstanding = await customerService.getCustomerOutstanding(
      req.businessId!.toString(),
      req.params.id
    );
    res.status(200).json({
      success: true,
      data: outstanding,
    });
  } catch (error) {
    next(error);
  }
};

export const customerController = {
  create,
  list,
  getById,
  update,
  deleteCustomer,
  getLedger,
  getOutstanding,
};
export default customerController;

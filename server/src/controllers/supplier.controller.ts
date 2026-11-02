import { Request, Response, NextFunction } from 'express';
import { supplierService } from '../services/supplier.service';

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const supplier = await supplierService.createSupplier(
      req.businessId!.toString(),
      req.body,
      req.user?.id,
      req.ip
    );
    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: supplier,
    });
  } catch (error) {
    next(error);
  }
};

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await supplierService.getSuppliers(req.businessId!.toString(), req.query);
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
    const supplier = await supplierService.getSupplierById(
      req.businessId!.toString(),
      req.params.id
    );
    res.status(200).json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const supplier = await supplierService.updateSupplier(
      req.businessId!.toString(),
      req.params.id,
      req.body,
      req.user?.id,
      req.ip
    );
    res.status(200).json({
      success: true,
      message: 'Supplier updated successfully',
      data: supplier,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSupplier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await supplierService.deleteSupplier(
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
    const ledger = await supplierService.getSupplierLedger(
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
    const outstanding = await supplierService.getSupplierOutstanding(
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

export const supplierController = {
  create,
  list,
  getById,
  update,
  deleteSupplier,
  getLedger,
  getOutstanding,
};
export default supplierController;

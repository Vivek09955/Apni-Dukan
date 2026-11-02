import { Request, Response, NextFunction } from 'express';
import { productService } from '../services/product.service';

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await productService.createProduct(
      req.businessId!.toString(),
      req.body,
      req.user?.id,
      req.ip
    );
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await productService.getProducts(req.businessId!.toString(), req.query);
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
    const product = await productService.getProductById(
      req.businessId!.toString(),
      req.params.id
    );
    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await productService.updateProduct(
      req.businessId!.toString(),
      req.params.id,
      req.body,
      req.user?.id,
      req.ip
    );
    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await productService.deleteProduct(
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

export const adjustStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await productService.adjustStock(
      req.businessId!.toString(),
      req.params.id,
      req.body.warehouseId,
      req.body.quantity,
      req.body.notes,
      req.user?.id,
      req.ip
    );
    res.status(200).json({
      success: true,
      message: 'Stock adjusted successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await productService.getProductStock(
      req.businessId!.toString(),
      req.params.id,
      req.query.warehouseId as string
    );
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const productController = {
  create,
  list,
  getById,
  update,
  deleteProduct,
  adjustStock,
  getStock,
};
export default productController;

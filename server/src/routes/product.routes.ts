import { Router } from 'express';
import { productController } from '../controllers/product.controller';
import { authenticate } from '../middleware/auth';
import { attachBusiness, requirePermission } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { PERMISSIONS } from '../models/BusinessMember';
import {
  createProductSchema,
  updateProductSchema,
  adjustStockSchema,
} from '../validators/product.validator';

export const productRouter = Router();

// POST /api/products - Create product
productRouter.post(
  '/',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.PRODUCT_CREATE),
  validateBody(createProductSchema),
  productController.create
);

// GET /api/products - List products
productRouter.get(
  '/',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.PRODUCT_VIEW),
  productController.list
);

// GET /api/products/:id - Single product details
productRouter.get(
  '/:id',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.PRODUCT_VIEW),
  productController.getById
);

// GET /api/products/:id/stock - Product current stock
productRouter.get(
  '/:id/stock',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.PRODUCT_VIEW),
  productController.getStock
);

// PATCH /api/products/:id - Update product
productRouter.patch(
  '/:id',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.PRODUCT_EDIT),
  validateBody(updateProductSchema),
  productController.update
);

// DELETE /api/products/:id - Soft delete product
productRouter.delete(
  '/:id',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.PRODUCT_DELETE),
  productController.deleteProduct
);

// POST /api/products/:id/adjust-stock - Stock adjustment
productRouter.post(
  '/:id/adjust-stock',
  authenticate,
  attachBusiness,
  requirePermission(PERMISSIONS.PRODUCT_EDIT),
  validateBody(adjustStockSchema),
  productController.adjustStock
);

export default productRouter;

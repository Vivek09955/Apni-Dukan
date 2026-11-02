import mongoose, { Types } from 'mongoose';
import { Product, IProduct } from '../models/Product';
import { Category } from '../models/Category';
import { Warehouse } from '../models/Warehouse';
import { InventoryMovement } from '../models/InventoryMovement';
import { SalesInvoice } from '../models/SalesInvoice';
import { PurchaseBill } from '../models/PurchaseBill';
import { BadRequestError, NotFoundError, ConflictError } from '../utils/errors';
import { createAuditLog } from '../middleware/auditLog';
import { CreateProductInput, UpdateProductInput } from '../validators/product.validator';

export interface ProductFilterParams {
  search?: string;
  category?: string;
  isActive?: boolean | string;
  trackInventory?: boolean | string;
  page?: number | string;
  limit?: number | string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class ProductService {
  /**
   * Helper to ensure a default warehouse exists for the business
   */
  private async getOrCreateDefaultWarehouse(businessId: string): Promise<Types.ObjectId> {
    let warehouse = await Warehouse.findOne({ businessId, isDefault: true, isActive: true });
    if (!warehouse) {
      warehouse = await Warehouse.findOne({ businessId, isActive: true });
    }
    if (!warehouse) {
      warehouse = await Warehouse.create({
        businessId,
        name: 'Main Warehouse',
        isDefault: true,
        isActive: true,
      });
    }
    return warehouse._id as Types.ObjectId;
  }

  /**
   * Create a new product. If trackInventory is true and openingStock > 0, records opening inventory movement.
   */
  async createProduct(
    businessId: string,
    data: CreateProductInput,
    userId?: string,
    ipAddress?: string
  ): Promise<IProduct> {
    if (data.sku) {
      const existingSku = await Product.findOne({
        businessId,
        sku: data.sku.toUpperCase(),
      });
      if (existingSku) {
        throw new ConflictError(`Product with SKU '${data.sku}' already exists in this business`);
      }
    }

    if (data.category) {
      const categoryExists = await Category.findOne({
        _id: data.category,
        businessId,
        isActive: true,
      });
      if (!categoryExists) {
        throw new NotFoundError('Category not found or inactive');
      }
    }

    const product = new Product({
      ...data,
      businessId,
      sku: data.sku ? data.sku.toUpperCase() : undefined,
    });

    await product.save();

    if (product.trackInventory && product.openingStock > 0) {
      let targetWarehouseId: Types.ObjectId;
      if (data.warehouseId) {
        targetWarehouseId = new Types.ObjectId(data.warehouseId);
      } else {
        targetWarehouseId = await this.getOrCreateDefaultWarehouse(businessId);
      }

      await InventoryMovement.create({
        businessId,
        productId: product._id,
        warehouseId: targetWarehouseId,
        type: 'opening',
        quantity: product.openingStock,
        balanceAfter: product.openingStock,
        unitCost: product.purchasePrice,
        referenceType: 'adjustment',
        notes: 'Initial opening stock',
        date: new Date(),
      });
    }

    if (userId) {
      await createAuditLog(
        businessId,
        userId,
        'created',
        'Product',
        product._id as Types.ObjectId,
        { name: product.name, sku: product.sku, sellingPrice: product.sellingPrice },
        ipAddress
      );
    }

    return product;
  }

  /**
   * List products with search, category filtering, pagination, and calculated stock.
   */
  async getProducts(businessId: string, params: ProductFilterParams = {}) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = { businessId };

    if (params.isActive !== undefined && params.isActive !== '') {
      query.isActive = String(params.isActive) === 'true';
    }

    if (params.trackInventory !== undefined && params.trackInventory !== '') {
      query.trackInventory = String(params.trackInventory) === 'true';
    }

    if (params.category) {
      query.category = params.category;
    }

    if (params.search && params.search.trim()) {
      const searchRegex = new RegExp(params.search.trim(), 'i');
      query.$or = [{ name: searchRegex }, { sku: searchRegex }, { brand: searchRegex }];
    }

    const sortField = params.sortBy || 'createdAt';
    const sortDir = params.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortField]: sortDir };

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    // Aggregate stock across warehouses for returned products
    const productIds = products.map((p) => p._id);
    const stockMap: Record<string, number> = {};

    if (productIds.length > 0) {
      const stockAgg = await InventoryMovement.aggregate([
        {
          $match: {
            businessId: new Types.ObjectId(businessId),
            productId: { $in: productIds },
          },
        },
        {
          $group: {
            _id: '$productId',
            totalStock: { $sum: '$quantity' },
          },
        },
      ]);

      for (const item of stockAgg) {
        stockMap[item._id.toString()] = item.totalStock;
      }
    }

    const productsWithStock = products.map((p) => ({
      ...p,
      currentStock: p.trackInventory ? stockMap[p._id.toString()] || 0 : null,
    }));

    return {
      products: productsWithStock,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single product by ID with stock details
   */
  async getProductById(businessId: string, productId: string) {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestError('Invalid Product ID');
    }

    const product = await Product.findOne({ _id: productId, businessId })
      .populate('category', 'name')
      .lean();

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Get stock breakdown per warehouse
    const warehouseStock = await InventoryMovement.aggregate([
      {
        $match: {
          businessId: new Types.ObjectId(businessId),
          productId: new Types.ObjectId(productId),
        },
      },
      {
        $group: {
          _id: '$warehouseId',
          stock: { $sum: '$quantity' },
        },
      },
      {
        $lookup: {
          from: 'warehouses',
          localField: '_id',
          foreignField: '_id',
          as: 'warehouse',
        },
      },
      {
        $unwind: {
          path: '$warehouse',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          warehouseId: '$_id',
          warehouseName: '$warehouse.name',
          stock: 1,
        },
      },
    ]);

    const totalStock = warehouseStock.reduce((sum, item) => sum + item.stock, 0);

    return {
      ...product,
      currentStock: product.trackInventory ? totalStock : null,
      warehouseStock,
    };
  }

  /**
   * Update product
   */
  async updateProduct(
    businessId: string,
    productId: string,
    data: UpdateProductInput,
    userId?: string,
    ipAddress?: string
  ): Promise<IProduct> {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestError('Invalid Product ID');
    }

    const product = await Product.findOne({ _id: productId, businessId });
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    if (data.sku && data.sku.toUpperCase() !== product.sku) {
      const existingSku = await Product.findOne({
        businessId,
        sku: data.sku.toUpperCase(),
        _id: { $ne: productId },
      });
      if (existingSku) {
        throw new ConflictError(`Product with SKU '${data.sku}' already exists`);
      }
      product.sku = data.sku.toUpperCase();
    }

    if (data.category !== undefined) {
      if (data.category && data.category !== '') {
        const categoryExists = await Category.findOne({
          _id: data.category,
          businessId,
          isActive: true,
        });
        if (!categoryExists) {
          throw new NotFoundError('Category not found');
        }
        product.category = new Types.ObjectId(data.category);
      } else {
        product.category = undefined;
      }
    }

    // Apply rest of fields
    const allowedFields: (keyof UpdateProductInput)[] = [
      'name',
      'description',
      'brand',
      'hsnCode',
      'sacCode',
      'unit',
      'purchasePrice',
      'sellingPrice',
      'wholesalePrice',
      'taxRate',
      'taxInclusive',
      'trackInventory',
      'reorderLevel',
      'images',
      'isActive',
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        (product as any)[field] = data[field];
      }
    }

    await product.save();

    if (userId) {
      await createAuditLog(
        businessId,
        userId,
        'updated',
        'Product',
        product._id as Types.ObjectId,
        data,
        ipAddress
      );
    }

    return product;
  }

  /**
   * Soft delete product if no transactions exist
   */
  async deleteProduct(businessId: string, productId: string, userId?: string, ipAddress?: string) {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestError('Invalid Product ID');
    }

    const product = await Product.findOne({ _id: productId, businessId });
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Check if product has sales or purchase transactions
    const [salesCount, purchaseCount, movementCount] = await Promise.all([
      SalesInvoice.countDocuments({
        businessId,
        'items.productId': productId,
        status: { $ne: 'cancelled' },
      }),
      PurchaseBill.countDocuments({
        businessId,
        'items.productId': productId,
        status: { $ne: 'cancelled' },
      }),
      InventoryMovement.countDocuments({
        businessId,
        productId,
        type: { $nin: ['opening'] },
      }),
    ]);

    if (salesCount > 0 || purchaseCount > 0 || movementCount > 0) {
      throw new BadRequestError(
        'Cannot delete product with existing sales, purchases, or inventory movements. Please mark it inactive instead.'
      );
    }

    product.isActive = false;
    await product.save();

    if (userId) {
      await createAuditLog(
        businessId,
        userId,
        'deleted',
        'Product',
        product._id as Types.ObjectId,
        { name: product.name, isActive: false },
        ipAddress
      );
    }

    return { success: true, message: 'Product deleted successfully' };
  }

  /**
   * Get product stock balance for a product (and optional warehouse)
   */
  async getProductStock(businessId: string, productId: string, warehouseId?: string) {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestError('Invalid Product ID');
    }

    const matchQuery: Record<string, any> = {
      businessId: new Types.ObjectId(businessId),
      productId: new Types.ObjectId(productId),
    };

    if (warehouseId) {
      if (!Types.ObjectId.isValid(warehouseId)) {
        throw new BadRequestError('Invalid Warehouse ID');
      }
      matchQuery.warehouseId = new Types.ObjectId(warehouseId);
    }

    const agg = await InventoryMovement.aggregate([
      { $match: matchQuery },
      { $group: { _id: null, totalStock: { $sum: '$quantity' } } },
    ]);

    const currentStock = agg[0]?.totalStock || 0;
    return { productId, warehouseId: warehouseId || null, currentStock };
  }

  /**
   * Adjust stock manually for inventory reconciliation
   */
  async adjustStock(
    businessId: string,
    productId: string,
    warehouseId: string | undefined,
    quantity: number,
    notes?: string,
    userId?: string,
    ipAddress?: string
  ) {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestError('Invalid Product ID');
    }

    const product = await Product.findOne({ _id: productId, businessId });
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    let targetWarehouseId: Types.ObjectId;
    if (warehouseId) {
      if (!Types.ObjectId.isValid(warehouseId)) {
        throw new BadRequestError('Invalid Warehouse ID');
      }
      const wh = await Warehouse.findOne({ _id: warehouseId, businessId, isActive: true });
      if (!wh) {
        throw new NotFoundError('Warehouse not found');
      }
      targetWarehouseId = wh._id as Types.ObjectId;
    } else {
      targetWarehouseId = await this.getOrCreateDefaultWarehouse(businessId);
    }

    // Compute current balance in this warehouse
    const agg = await InventoryMovement.aggregate([
      {
        $match: {
          businessId: new Types.ObjectId(businessId),
          productId: new Types.ObjectId(productId),
          warehouseId: targetWarehouseId,
        },
      },
      { $group: { _id: null, totalStock: { $sum: '$quantity' } } },
    ]);

    const currentStock = agg[0]?.totalStock || 0;
    const balanceAfter = currentStock + quantity;

    if (balanceAfter < 0) {
      throw new BadRequestError(
        `Insufficient stock for adjustment. Current stock is ${currentStock}, adjustment is ${quantity}.`
      );
    }

    const movement = await InventoryMovement.create({
      businessId,
      productId: product._id,
      warehouseId: targetWarehouseId,
      type: 'adjustment',
      quantity,
      balanceAfter,
      unitCost: product.purchasePrice,
      referenceType: 'adjustment',
      notes: notes || 'Manual stock adjustment',
      date: new Date(),
    });

    if (userId) {
      await createAuditLog(
        businessId,
        userId,
        'updated',
        'Product',
        product._id as Types.ObjectId,
        { adjustment: quantity, balanceAfter, warehouseId: targetWarehouseId.toString() },
        ipAddress
      );
    }

    return {
      movement,
      previousStock: currentStock,
      currentStock: balanceAfter,
    };
  }
}

export const productService = new ProductService();
export default productService;

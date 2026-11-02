import { z } from 'zod';

const purchaseOrderItemSchema = z.object({
  productId: z
    .string({ required_error: 'Product ID is required' })
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Product ID'),
  name: z.string().trim().optional(),
  hsnCode: z.string().trim().optional(),
  quantity: z
    .number({ required_error: 'Quantity is required' })
    .positive('Quantity must be greater than zero'),
  unit: z.string().trim().default('pcs').optional(),
  rate: z
    .number({ required_error: 'Rate is required' })
    .int('Rate must be an integer (in paise)')
    .nonnegative('Rate cannot be negative'),
  discount: z.number().int().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  taxRate: z.number().min(0).max(100).optional(),
});

export const createPurchaseOrderSchema = z.object({
  supplierId: z
    .string({ required_error: 'Supplier ID is required' })
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Supplier ID'),
  orderDate: z.coerce.date().default(() => new Date()).optional(),
  expectedDate: z.coerce.date().optional(),
  placeOfSupply: z
    .string({ required_error: 'Place of supply is required' })
    .trim()
    .min(1, 'Place of supply cannot be empty'),
  items: z
    .array(purchaseOrderItemSchema, { required_error: 'Items array is required' })
    .min(1, 'At least one item is required in the purchase order'),
  notes: z.string().trim().max(1000).optional(),
  termsAndConditions: z.string().trim().max(2000).optional(),
  roundOff: z.boolean().default(true).optional(),
});

export const updatePurchaseOrderStatusSchema = z.object({
  status: z.enum(['draft', 'confirmed', 'cancelled']),
});

const fulfillmentItemSchema = z.object({
  productId: z
    .string({ required_error: 'Product ID is required' })
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Product ID'),
  quantity: z
    .number({ required_error: 'Fulfillment quantity is required' })
    .positive('Quantity must be positive'),
});

export const convertPurchaseOrderSchema = z.object({
  items: z.array(fulfillmentItemSchema).optional(),
  warehouseId: z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Warehouse ID').optional(),
  supplierBillNumber: z.string().trim().optional(),
  supplierBillDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  notes: z.string().trim().max(1000).optional(),
  receiveImmediately: z.boolean().default(true).optional(),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderStatusInput = z.infer<typeof updatePurchaseOrderStatusSchema>;
export type ConvertPurchaseOrderInput = z.infer<typeof convertPurchaseOrderSchema>;

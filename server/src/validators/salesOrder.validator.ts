import { z } from 'zod';

const salesOrderItemSchema = z.object({
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

export const createSalesOrderSchema = z.object({
  customerId: z
    .string({ required_error: 'Customer ID is required' })
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Customer ID'),
  orderDate: z.coerce.date().default(() => new Date()).optional(),
  expectedDate: z.coerce.date().optional(),
  placeOfSupply: z
    .string({ required_error: 'Place of supply is required' })
    .trim()
    .min(1, 'Place of supply cannot be empty'),
  items: z
    .array(salesOrderItemSchema, { required_error: 'Items array is required' })
    .min(1, 'At least one item is required in the sales order'),
  notes: z.string().trim().max(1000).optional(),
  termsAndConditions: z.string().trim().max(2000).optional(),
  roundOff: z.boolean().default(true).optional(),
});

export const updateSalesOrderStatusSchema = z.object({
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

export const convertSalesOrderSchema = z.object({
  items: z.array(fulfillmentItemSchema).optional(), // If omitted, fulfill all remaining quantities
  warehouseId: z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Warehouse ID').optional(),
  dueDate: z.coerce.date().optional(),
  notes: z.string().trim().max(1000).optional(),
  termsAndConditions: z.string().trim().max(2000).optional(),
  issueImmediately: z.boolean().default(true).optional(),
});

export type CreateSalesOrderInput = z.infer<typeof createSalesOrderSchema>;
export type UpdateSalesOrderStatusInput = z.infer<typeof updateSalesOrderStatusSchema>;
export type ConvertSalesOrderInput = z.infer<typeof convertSalesOrderSchema>;

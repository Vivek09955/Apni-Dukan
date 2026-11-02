import { z } from 'zod';

const billItemSchema = z.object({
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

export const createPurchaseBillSchema = z.object({
  supplierId: z
    .string({ required_error: 'Supplier ID is required' })
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Supplier ID'),
  billDate: z.coerce.date().default(() => new Date()).optional(),
  dueDate: z.coerce.date().optional(),
  supplierBillNumber: z.string().trim().max(100).optional(),
  supplierBillDate: z.coerce.date().optional(),
  placeOfSupply: z
    .string({ required_error: 'Place of supply is required' })
    .trim()
    .min(1, 'Place of supply cannot be empty'),
  items: z
    .array(billItemSchema, { required_error: 'Items array is required' })
    .min(1, 'At least one item is required in the purchase bill'),
  status: z.enum(['draft', 'received']).default('draft').optional(),
  paidAmount: z.number().int().min(0).default(0).optional(),
  paymentTerms: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
  roundOff: z.boolean().default(true).optional(),
  warehouseId: z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Warehouse ID').optional(),
});

export const cancelBillSchema = z.object({
  reason: z
    .string({ required_error: 'Cancellation reason is required' })
    .trim()
    .min(3, 'Reason must be at least 3 characters long')
    .max(500, 'Reason cannot exceed 500 characters'),
});

export type CreatePurchaseBillInput = z.infer<typeof createPurchaseBillSchema>;
export type CancelBillInput = z.infer<typeof cancelBillSchema>;

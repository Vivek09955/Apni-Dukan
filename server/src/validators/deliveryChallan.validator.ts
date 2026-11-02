import { z } from 'zod';

const challanItemSchema = z.object({
  productId: z
    .string({ required_error: 'Product ID is required' })
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Product ID'),
  name: z.string().trim().optional(),
  quantity: z
    .number({ required_error: 'Quantity is required' })
    .positive('Quantity must be greater than zero'),
  unit: z.string().trim().default('pcs').optional(),
});

export const createDeliveryChallanSchema = z.object({
  customerId: z
    .string({ required_error: 'Customer ID is required' })
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Customer ID'),
  challanDate: z.coerce.date().default(() => new Date()).optional(),
  items: z
    .array(challanItemSchema, { required_error: 'Items array is required' })
    .min(1, 'At least one item is required in the delivery challan'),
  salesOrderId: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Sales Order ID')
    .optional(),
  vehicleNumber: z.string().trim().optional(),
  transporterName: z.string().trim().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const updateDeliveryChallanStatusSchema = z.object({
  status: z.enum(['draft', 'dispatched', 'delivered', 'cancelled']),
});

export type CreateDeliveryChallanInput = z.infer<typeof createDeliveryChallanSchema>;
export type UpdateDeliveryChallanStatusInput = z.infer<typeof updateDeliveryChallanStatusSchema>;

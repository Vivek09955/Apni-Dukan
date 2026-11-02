import { z } from 'zod';

export const createExpenseSchema = z.object({
  category: z
    .string({ required_error: 'Category is required' })
    .trim()
    .min(1, 'Category cannot be empty'),
  amount: z
    .number({ required_error: 'Amount is required' })
    .int('Amount must be an integer (in paise)')
    .positive('Amount must be positive'),
  expenseDate: z.coerce.date().default(() => new Date()).optional(),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'upi', 'cheque', 'other'], {
    required_error: 'Valid payment method is required',
  }),
  vendorName: z.string().trim().optional(),
  vendorId: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Vendor ID')
    .optional(),
  description: z.string().trim().max(1000).optional(),
  notes: z.string().trim().max(1000).optional(),
  isRecurring: z.boolean().default(false).optional(),
  recurringInterval: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
});

export const cancelExpenseSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type CancelExpenseInput = z.infer<typeof cancelExpenseSchema>;

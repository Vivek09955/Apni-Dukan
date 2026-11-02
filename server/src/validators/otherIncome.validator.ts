import { z } from 'zod';

export const createOtherIncomeSchema = z.object({
  category: z
    .string({ required_error: 'Category is required' })
    .trim()
    .min(1, 'Category cannot be empty'),
  amount: z
    .number({ required_error: 'Amount is required' })
    .int('Amount must be an integer (in paise)')
    .positive('Amount must be positive'),
  incomeDate: z.coerce.date().default(() => new Date()).optional(),
  paymentMethod: z.string().trim().default('cash').optional(),
  description: z.string().trim().max(1000).optional(),
});

export const cancelOtherIncomeSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export type CreateOtherIncomeInput = z.infer<typeof createOtherIncomeSchema>;
export type CancelOtherIncomeInput = z.infer<typeof cancelOtherIncomeSchema>;

import { z } from 'zod';

const invoiceAllocationSchema = z.object({
  invoiceId: z
    .string({ required_error: 'Invoice ID is required' })
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Invoice ID'),
  invoiceType: z.enum(['sales_invoice', 'purchase_bill'], {
    required_error: 'Valid invoice type is required',
  }),
  allocatedAmount: z
    .number({ required_error: 'Allocated amount is required' })
    .int('Allocated amount must be an integer (in paise)')
    .positive('Allocated amount must be positive'),
});

export const createPaymentSchema = z.object({
  type: z.enum(['payment_in', 'payment_out'], {
    required_error: 'Payment type (payment_in or payment_out) is required',
  }),
  partyType: z.enum(['customer', 'supplier'], {
    required_error: 'Party type (customer or supplier) is required',
  }),
  partyId: z
    .string({ required_error: 'Party ID is required' })
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Party ID'),
  amount: z
    .number({ required_error: 'Amount is required' })
    .int('Amount must be an integer (in paise)')
    .positive('Amount must be positive'),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'upi', 'cheque', 'other'], {
    required_error: 'Valid payment method is required',
  }),
  paymentDate: z.coerce.date().default(() => new Date()).optional(),
  referenceNumber: z.string().trim().optional(),
  bankName: z.string().trim().optional(),
  invoiceAllocations: z.array(invoiceAllocationSchema).default([]).optional(),
  isAdvance: z.boolean().default(false).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const cancelPaymentSchema = z.object({
  reason: z
    .string({ required_error: 'Cancellation reason is required' })
    .trim()
    .min(3, 'Reason must be at least 3 characters long')
    .max(500, 'Reason cannot exceed 500 characters'),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type CancelPaymentInput = z.infer<typeof cancelPaymentSchema>;

import { z } from 'zod';

export const createNotificationSchema = z.object({
  userId: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid User ID')
    .optional(),
  type: z.enum([
    'low_stock',
    'payment_due',
    'payment_overdue',
    'invoice_created',
    'quotation_expiring',
    'system',
  ]),
  title: z
    .string({ required_error: 'Notification title is required' })
    .trim()
    .min(1, 'Title cannot be empty')
    .max(200, 'Title cannot exceed 200 characters'),
  message: z
    .string({ required_error: 'Notification message is required' })
    .trim()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message cannot exceed 1000 characters'),
  data: z.record(z.any()).optional(),
});

export const getNotificationFilterSchema = z.object({
  isRead: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  type: z
    .enum([
      'low_stock',
      'payment_due',
      'payment_overdue',
      'invoice_created',
      'quotation_expiring',
      'system',
    ])
    .optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type GetNotificationFilterInput = z.infer<typeof getNotificationFilterSchema>;

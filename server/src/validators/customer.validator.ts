import { z } from 'zod';
import { GSTIN_REGEX } from './business.validator';

const addressSchema = z.object({
  line1: z.string().trim().optional(),
  line2: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  pincode: z.string().trim().regex(/^[1-9][0-9]{5}$/, 'Invalid Indian pincode').optional().or(z.literal('')),
});

export const createCustomerSchema = z.object({
  name: z
    .string({ required_error: 'Customer name is required' })
    .trim()
    .min(1, 'Customer name cannot be empty')
    .max(200, 'Customer name cannot exceed 200 characters'),
  phone: z.string().trim().regex(/^[0-9]{10}$/, 'Phone number must be a 10-digit number').optional().or(z.literal('')),
  email: z.string().trim().toLowerCase().email('Invalid email address').optional().or(z.literal('')),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(GSTIN_REGEX, 'Invalid GSTIN format. Example: 27AAAAA0000A1Z5')
    .optional()
    .or(z.literal('')),
  billingAddress: addressSchema.optional(),
  shippingAddress: addressSchema.optional(),
  openingBalance: z.number().int().default(0).optional(),
  creditLimit: z.number().int().min(0).default(0).optional(),
  creditDays: z.number().int().min(0).default(30).optional(),
  group: z.string().trim().max(100).optional().or(z.literal('')),
  tags: z.array(z.string().trim()).default([]).optional(),
  isActive: z.boolean().default(true).optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  phone: z.string().trim().regex(/^[0-9]{10}$/, 'Phone number must be a 10-digit number').optional().or(z.literal('')),
  email: z.string().trim().toLowerCase().email('Invalid email address').optional().or(z.literal('')),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(GSTIN_REGEX, 'Invalid GSTIN format')
    .optional()
    .or(z.literal('')),
  billingAddress: addressSchema.optional(),
  shippingAddress: addressSchema.optional(),
  openingBalance: z.number().int().optional(),
  creditLimit: z.number().int().min(0).optional(),
  creditDays: z.number().int().min(0).optional(),
  group: z.string().trim().max(100).optional().or(z.literal('')),
  tags: z.array(z.string().trim()).optional(),
  isActive: z.boolean().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

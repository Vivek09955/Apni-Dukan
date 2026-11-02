import { z } from 'zod';
import { GSTIN_REGEX } from './business.validator';

const addressSchema = z.object({
  line1: z.string().trim().optional(),
  line2: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  pincode: z.string().trim().regex(/^[1-9][0-9]{5}$/, 'Invalid Indian pincode').optional().or(z.literal('')),
});

export const createSupplierSchema = z.object({
  name: z
    .string({ required_error: 'Supplier name is required' })
    .trim()
    .min(1, 'Supplier name cannot be empty')
    .max(200, 'Supplier name cannot exceed 200 characters'),
  phone: z.string().trim().regex(/^[0-9]{10}$/, 'Phone number must be a 10-digit number').optional().or(z.literal('')),
  email: z.string().trim().toLowerCase().email('Invalid email address').optional().or(z.literal('')),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(GSTIN_REGEX, 'Invalid GSTIN format. Example: 27AAAAA0000A1Z5')
    .optional()
    .or(z.literal('')),
  address: addressSchema.optional(),
  openingBalance: z.number().int().default(0).optional(),
  creditDays: z.number().int().min(0).default(30).optional(),
  group: z.string().trim().max(100).optional().or(z.literal('')),
  tags: z.array(z.string().trim()).default([]).optional(),
  isActive: z.boolean().default(true).optional(),
});

export const updateSupplierSchema = z.object({
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
  address: addressSchema.optional(),
  openingBalance: z.number().int().optional(),
  creditDays: z.number().int().min(0).optional(),
  group: z.string().trim().max(100).optional().or(z.literal('')),
  tags: z.array(z.string().trim()).optional(),
  isActive: z.boolean().optional(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

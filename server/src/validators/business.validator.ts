import { z } from 'zod';

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
] as const;

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const addressSchema = z.object({
  line1: z.string().trim().optional(),
  line2: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  pincode: z.string().trim().regex(/^[1-9][0-9]{5}$/, 'Invalid Indian pincode').optional().or(z.literal('')),
});

const settingsSchema = z.object({
  taxInclusive: z.boolean().optional(),
  enableGst: z.boolean().optional(),
  enableDiscount: z.boolean().optional(),
  roundOffTotal: z.boolean().optional(),
  defaultTaxRate: z.number().min(0).max(100).optional(),
  thermalPrint: z.boolean().optional(),
  showLogo: z.boolean().optional(),
});

export const createBusinessSchema = z.object({
  name: z
    .string({ required_error: 'Business name is required' })
    .trim()
    .min(2, 'Business name must be at least 2 characters long')
    .max(100, 'Business name cannot exceed 100 characters'),
  logo: z.string().trim().url('Invalid logo URL').optional().or(z.literal('')),
  address: addressSchema.optional(),
  phone: z
    .string({ required_error: 'Phone number is required' })
    .trim()
    .regex(/^[0-9]{10}$/, 'Phone number must be a 10-digit number'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please provide a valid business email address'),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(GSTIN_REGEX, 'Invalid GSTIN format. Example: 27AAAAA0000A1Z5')
    .optional()
    .or(z.literal('')),
  state: z.enum(INDIAN_STATES, {
    errorMap: () => ({ message: 'Please select a valid Indian State / Union Territory' }),
  }),
  financialYearStart: z.number().int().min(1).max(12).default(4).optional(),
  currency: z.string().trim().default('INR').optional(),
  invoicePrefix: z.string().trim().toUpperCase().max(10).default('INV').optional(),
  invoiceNextNumber: z.number().int().min(1).default(1).optional(),
  settings: settingsSchema.optional(),
});

export const updateBusinessSchema = z.object({
  name: z.string().trim().min(2, 'Business name must be at least 2 characters long').max(100).optional(),
  logo: z.string().trim().url('Invalid logo URL').optional().or(z.literal('')),
  address: addressSchema.optional(),
  phone: z.string().trim().regex(/^[0-9]{10}$/, 'Phone number must be a 10-digit number').optional(),
  email: z.string().trim().toLowerCase().email('Please provide a valid email address').optional(),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(GSTIN_REGEX, 'Invalid GSTIN format. Example: 27AAAAA0000A1Z5')
    .optional()
    .or(z.literal('')),
  state: z.enum(INDIAN_STATES).optional(),
  financialYearStart: z.number().int().min(1).max(12).optional(),
  currency: z.string().trim().optional(),
  invoicePrefix: z.string().trim().toUpperCase().max(10).optional(),
  invoiceNextNumber: z.number().int().min(1).optional(),
  settings: settingsSchema.optional(),
});

export const addMemberSchema = z.object({
  email: z
    .string({ required_error: 'Member email is required' })
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
  role: z.enum(['owner', 'admin', 'accountant', 'manager', 'staff'], {
    required_error: 'Role is required',
  }),
  permissions: z.array(z.string()).optional(),
});

export const updateMemberSchema = z.object({
  role: z.enum(['owner', 'admin', 'accountant', 'manager', 'staff']).optional(),
  permissions: z.array(z.string()).optional(),
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

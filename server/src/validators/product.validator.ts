import { z } from 'zod';

export const createProductSchema = z.object({
  name: z
    .string({ required_error: 'Product name is required' })
    .trim()
    .min(1, 'Product name cannot be empty')
    .max(200, 'Product name cannot exceed 200 characters'),
  sku: z.string().trim().max(50).optional().or(z.literal('')),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  category: z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Category ID').optional().or(z.literal('')),
  brand: z.string().trim().max(100).optional().or(z.literal('')),
  hsnCode: z
    .string()
    .trim()
    .regex(/^[0-9]{4,8}$/, 'HSN code must be 4 to 8 digits')
    .optional()
    .or(z.literal('')),
  sacCode: z.string().trim().max(10).optional().or(z.literal('')),
  unit: z.string().trim().default('pcs').optional(),
  purchasePrice: z.number().int().min(0, 'Purchase price cannot be negative').default(0).optional(),
  sellingPrice: z.number().int().min(0, 'Selling price cannot be negative').default(0).optional(),
  wholesalePrice: z.number().int().min(0).optional(),
  taxRate: z.number().min(0).max(100).default(18).optional(),
  taxInclusive: z.boolean().default(false).optional(),
  trackInventory: z.boolean().default(true).optional(),
  reorderLevel: z.number().min(0).default(0).optional(),
  openingStock: z.number().default(0).optional(),
  warehouseId: z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Warehouse ID').optional(),
  images: z.array(z.string().trim().url('Invalid image URL')).default([]).optional(),
  isActive: z.boolean().default(true).optional(),
});

export const updateProductSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  sku: z.string().trim().max(50).optional().or(z.literal('')),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  category: z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Category ID').optional().or(z.literal('')).nullable(),
  brand: z.string().trim().max(100).optional().or(z.literal('')),
  hsnCode: z
    .string()
    .trim()
    .regex(/^[0-9]{4,8}$/, 'HSN code must be 4 to 8 digits')
    .optional()
    .or(z.literal('')),
  sacCode: z.string().trim().max(10).optional().or(z.literal('')),
  unit: z.string().trim().optional(),
  purchasePrice: z.number().int().min(0).optional(),
  sellingPrice: z.number().int().min(0).optional(),
  wholesalePrice: z.number().int().min(0).optional().nullable(),
  taxRate: z.number().min(0).max(100).optional(),
  taxInclusive: z.boolean().optional(),
  trackInventory: z.boolean().optional(),
  reorderLevel: z.number().min(0).optional(),
  images: z.array(z.string().trim().url()).optional(),
  isActive: z.boolean().optional(),
});

export const adjustStockSchema = z.object({
  warehouseId: z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Warehouse ID').optional(),
  quantity: z.number({ required_error: 'Adjustment quantity is required' }),
  notes: z.string().trim().max(500).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;

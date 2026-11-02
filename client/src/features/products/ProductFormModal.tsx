import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { createProduct, updateProduct, getCategories } from '../../api/products'
import { rupeesToPaise } from '../../lib/utils'
import type { Product, Category } from '../../types'

const productFormSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  hsnCode: z.string().optional(),
  unit: z.string().min(1, 'Unit is required'),
  sellingPrice: z.coerce.number({ invalid_type_error: 'Must be a number' }).min(0, 'Selling price must be 0 or more'),
  purchasePrice: z.coerce.number().min(0).optional(),
  wholesalePrice: z.coerce.number().min(0).optional(),
  taxRate: z.coerce.number().min(0),
  taxInclusive: z.boolean().default(false),
  trackInventory: z.boolean().default(true),
  reorderLevel: z.coerce.number().min(0).optional(),
  openingStock: z.coerce.number().min(0).optional(),
  description: z.string().optional(),
})

export type ProductFormValues = z.infer<typeof productFormSchema>

export interface ProductFormModalProps {
  isOpen: boolean
  onClose: () => void
  product?: Product | null
}

const UNIT_OPTIONS = [
  { value: 'PCS', label: 'Pieces (PCS)' },
  { value: 'KG', label: 'Kilogram (KG)' },
  { value: 'LTR', label: 'Litre (LTR)' },
  { value: 'BOX', label: 'Box (BOX)' },
  { value: 'MTR', label: 'Metre (MTR)' },
  { value: 'DOZ', label: 'Dozen (DOZ)' },
  { value: 'PAIR', label: 'Pair (PAIR)' },
  { value: 'SET', label: 'Set (SET)' },
]

const TAX_RATE_OPTIONS = [
  { value: '0', label: 'Exempt (0%)' },
  { value: '5', label: 'GST 5%' },
  { value: '12', label: 'GST 12%' },
  { value: '18', label: 'GST 18%' },
  { value: '28', label: 'GST 28%' },
]

export function ProductFormModal({ isOpen, onClose, product }: ProductFormModalProps) {
  const queryClient = useQueryClient()
  const isEditing = Boolean(product?._id)

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(),
    enabled: isOpen,
  })

  const categories: Category[] = categoriesData?.data?.categories || categoriesData?.data || []

  const categoryOptions = [
    { value: '', label: 'None / General' },
    ...categories.map((c) => ({
      value: c._id,
      label: c.name,
    })),
  ]

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema) as any,
    defaultValues: {
      name: '',
      sku: '',
      category: '',
      brand: '',
      hsnCode: '',
      unit: 'PCS',
      sellingPrice: 0,
      purchasePrice: 0,
      wholesalePrice: 0,
      taxRate: 18,
      taxInclusive: false,
      trackInventory: true,
      reorderLevel: 5,
      openingStock: 0,
      description: '',
    },
  })

  const trackInventory = watch('trackInventory')

  useEffect(() => {
    if (product) {
      const catId = typeof product.category === 'object' ? product.category?._id : (product.category || '')
      reset({
        name: product.name || '',
        sku: product.sku || '',
        category: catId,
        brand: product.brand || '',
        hsnCode: product.hsnCode || '',
        unit: product.unit || 'PCS',
        sellingPrice: (product.sellingPrice ?? 0) / 100,
        purchasePrice: (product.purchasePrice ?? 0) / 100,
        wholesalePrice: (product.wholesalePrice ?? 0) / 100,
        taxRate: product.taxRate ?? 18,
        taxInclusive: Boolean(product.taxInclusive),
        trackInventory: product.trackInventory !== false,
        reorderLevel: product.reorderLevel ?? 5,
        openingStock: product.openingStock ?? 0,
        description: product.description || '',
      })
    } else {
      reset({
        name: '',
        sku: '',
        category: '',
        brand: '',
        hsnCode: '',
        unit: 'PCS',
        sellingPrice: 0,
        purchasePrice: 0,
        wholesalePrice: 0,
        taxRate: 18,
        taxInclusive: false,
        trackInventory: true,
        reorderLevel: 5,
        openingStock: 0,
        description: '',
      })
    }
  }, [product, isOpen, reset])

  const mutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      const payload: Record<string, any> = {
        name: data.name.trim(),
        sku: data.sku?.trim() || undefined,
        category: data.category || undefined,
        brand: data.brand?.trim() || undefined,
        hsnCode: data.hsnCode?.trim() || undefined,
        unit: data.unit,
        sellingPrice: rupeesToPaise(data.sellingPrice),
        purchasePrice: rupeesToPaise(data.purchasePrice || 0),
        wholesalePrice: rupeesToPaise(data.wholesalePrice || 0),
        taxRate: Number(data.taxRate),
        taxInclusive: Boolean(data.taxInclusive),
        trackInventory: Boolean(data.trackInventory),
        reorderLevel: Number(data.reorderLevel || 0),
        description: data.description?.trim() || undefined,
      }

      if (!isEditing) {
        payload.openingStock = Number(data.openingStock || 0)
        return createProduct(payload)
      } else if (product?._id) {
        return updateProduct(product._id, payload)
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? 'Product updated successfully' : 'Product added successfully')
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || 'Operation failed')
    },
  })

  const onSubmit = (values: ProductFormValues) => {
    mutation.mutate(values)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Product' : 'Add New Product'}
      size="2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Product Name */}
          <div className="sm:col-span-2">
            <Input
              label="Product Name"
              required
              placeholder="e.g. Wireless Mouse, Basmati Rice 5kg"
              error={errors.name?.message}
              {...register('name')}
            />
          </div>

          {/* SKU */}
          <Input
            label="SKU / Barcode"
            placeholder="e.g. PRD-001"
            error={errors.sku?.message}
            {...register('sku')}
          />

          {/* Brand */}
          <Input
            label="Brand"
            placeholder="e.g. Logitech, Tata, Samsung"
            error={errors.brand?.message}
            {...register('brand')}
          />

          {/* Category */}
          <Select
            label="Category"
            options={categoryOptions}
            error={errors.category?.message}
            {...register('category')}
          />

          {/* HSN Code */}
          <Input
            label="HSN Code"
            placeholder="e.g. 8471"
            error={errors.hsnCode?.message}
            {...register('hsnCode')}
          />

          {/* Unit */}
          <Select
            label="Unit of Measure"
            required
            options={UNIT_OPTIONS}
            error={errors.unit?.message}
            {...register('unit')}
          />

          {/* Tax Rate */}
          <Select
            label="Tax Rate (GST)"
            required
            options={TAX_RATE_OPTIONS}
            error={errors.taxRate?.message}
            {...register('taxRate')}
          />

          {/* Selling Price */}
          <Input
            label="Selling Price (₹)"
            type="number"
            step="0.01"
            required
            placeholder="0.00"
            error={errors.sellingPrice?.message}
            {...register('sellingPrice')}
          />

          {/* Purchase Price */}
          <Input
            label="Purchase Price (₹)"
            type="number"
            step="0.01"
            placeholder="0.00"
            error={errors.purchasePrice?.message}
            {...register('purchasePrice')}
          />

          {/* Wholesale Price */}
          <Input
            label="Wholesale Price (₹)"
            type="number"
            step="0.01"
            placeholder="0.00"
            error={errors.wholesalePrice?.message}
            {...register('wholesalePrice')}
          />

          {/* Opening Stock (Create only) */}
          {!isEditing && (
            <Input
              label="Opening Stock Qty"
              type="number"
              step="any"
              placeholder="0"
              error={errors.openingStock?.message}
              {...register('openingStock')}
            />
          )}

          {/* Reorder Level */}
          <Input
            label="Reorder Alert Level"
            type="number"
            step="any"
            placeholder="5"
            helperText="Alert when stock falls below this quantity"
            error={errors.reorderLevel?.message}
            {...register('reorderLevel')}
          />
        </div>

        {/* Checkboxes: Tax Inclusive & Track Inventory */}
        <div className="flex flex-wrap items-center gap-6 pt-2 pb-1 border-t border-gray-100">
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-gray-700">
            <input
              type="checkbox"
              className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
              {...register('taxInclusive')}
            />
            <span>Selling price is tax inclusive</span>
          </label>

          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-gray-700">
            <input
              type="checkbox"
              className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
              {...register('trackInventory')}
            />
            <span>Track inventory stock</span>
          </label>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Description
          </label>
          <textarea
            rows={2}
            placeholder="Optional product notes or specifications..."
            className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            {...register('description')}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {isEditing ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

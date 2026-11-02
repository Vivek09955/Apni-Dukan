import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { createSupplier, updateSupplier } from '../../api/suppliers'
import { rupeesToPaise } from '../../lib/utils'
import type { Supplier } from '../../types'

const supplierFormSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  gstin: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  openingBalance: z.coerce.number().optional().default(0),
  creditDays: z.coerce.number().optional().default(30),
  group: z.string().optional(),
  tags: z.string().optional(),
})

export type SupplierFormValues = z.infer<typeof supplierFormSchema>

export interface SupplierFormModalProps {
  isOpen: boolean
  onClose: () => void
  supplier?: Supplier | null
  onSuccessCallback?: (created: Supplier) => void
}

export function SupplierFormModal({
  isOpen,
  onClose,
  supplier,
  onSuccessCallback,
}: SupplierFormModalProps) {
  const queryClient = useQueryClient()
  const isEditing = Boolean(supplier?._id)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema) as any,
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      gstin: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pincode: '',
      openingBalance: 0,
      creditDays: 30,
      group: 'Distributor',
      tags: '',
    },
  })

  useEffect(() => {
    if (supplier) {
      reset({
        name: supplier.name || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        gstin: supplier.gstin || '',
        addressLine1: supplier.address?.line1 || '',
        addressLine2: supplier.address?.line2 || '',
        city: supplier.address?.city || '',
        state: supplier.address?.state || '',
        pincode: supplier.address?.pincode || '',
        openingBalance: (supplier.openingBalance ?? 0) / 100,
        creditDays: supplier.creditDays ?? 30,
        group: supplier.group || 'Distributor',
        tags: Array.isArray(supplier.tags) ? supplier.tags.join(', ') : '',
      })
    } else {
      reset({
        name: '',
        phone: '',
        email: '',
        gstin: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        pincode: '',
        openingBalance: 0,
        creditDays: 30,
        group: 'Distributor',
        tags: '',
      })
    }
  }, [supplier, isOpen, reset])

  const mutation = useMutation({
    mutationFn: async (data: SupplierFormValues) => {
      const address = {
        line1: data.addressLine1?.trim() || undefined,
        line2: data.addressLine2?.trim() || undefined,
        city: data.city?.trim() || undefined,
        state: data.state?.trim() || undefined,
        pincode: data.pincode?.trim() || undefined,
      }

      const tags = data.tags
        ? data.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : []

      const payload: Record<string, any> = {
        name: data.name.trim(),
        phone: data.phone?.trim() || undefined,
        email: data.email?.trim() || undefined,
        gstin: data.gstin?.trim() || undefined,
        address,
        openingBalance: rupeesToPaise(data.openingBalance || 0),
        creditDays: Number(data.creditDays || 30),
        group: data.group?.trim() || undefined,
        tags,
      }

      if (isEditing && supplier?._id) {
        return updateSupplier(supplier._id, payload)
      } else {
        return createSupplier(payload)
      }
    },
    onSuccess: (res: any) => {
      toast.success(isEditing ? 'Supplier updated' : 'Supplier added')
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      if (onSuccessCallback && res?.data) {
        onSuccessCallback(res.data)
      }
      onClose()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || 'Operation failed')
    },
  })

  const onSubmit = (values: SupplierFormValues) => {
    mutation.mutate(values)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Supplier' : 'Add New Supplier'}
      size="2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="sm:col-span-2">
            <Input
              label="Supplier / Vendor Name"
              required
              placeholder="e.g. ABC Distributors, National Wholesalers"
              error={errors.name?.message}
              {...register('name')}
            />
          </div>

          <Input
            label="Phone Number"
            type="tel"
            placeholder="e.g. 9876543210"
            error={errors.phone?.message}
            {...register('phone')}
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="vendor@distributor.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="GSTIN (Tax ID)"
            placeholder="e.g. 07AAAAA0000A1Z5"
            error={errors.gstin?.message}
            {...register('gstin')}
          />

          <Input
            label="Supplier Category / Group"
            placeholder="e.g. FMCG, Electronics, Manufacturer"
            error={errors.group?.message}
            {...register('group')}
          />
        </div>

        {/* Address */}
        <div className="pt-2 border-t border-gray-100">
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2.5">
            Office / Godown Address
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Input
                label="Street / Address Line 1"
                placeholder="Building, street, area"
                error={errors.addressLine1?.message}
                {...register('addressLine1')}
              />
            </div>
            <Input label="City" placeholder="City" error={errors.city?.message} {...register('city')} />
            <Input label="State" placeholder="State" error={errors.state?.message} {...register('state')} />
            <Input label="PIN Code" placeholder="PIN Code" error={errors.pincode?.message} {...register('pincode')} />
          </div>
        </div>

        {/* Financial & Terms */}
        <div className="pt-2 border-t border-gray-100">
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2.5">
            Credit Terms & Opening Balance
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Opening Balance (₹)"
              type="number"
              step="0.01"
              placeholder="0.00"
              helperText="Amount you currently owe this supplier"
              error={errors.openingBalance?.message}
              {...register('openingBalance')}
            />
            <Input
              label="Credit Days Allowed"
              type="number"
              placeholder="30"
              error={errors.creditDays?.message}
              {...register('creditDays')}
            />
          </div>
        </div>

        {/* Tags */}
        <div className="pt-2 border-t border-gray-100">
          <Input
            label="Tags (Comma separated)"
            placeholder="e.g. Raw Material, Direct Import, Primary"
            error={errors.tags?.message}
            {...register('tags')}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {isEditing ? 'Save Supplier' : 'Create Supplier'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

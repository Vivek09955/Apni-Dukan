import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { createCustomer, updateCustomer } from '../../api/customers'
import { rupeesToPaise } from '../../lib/utils'
import type { Customer } from '../../types'

const customerFormSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  gstin: z.string().optional(),
  billingLine1: z.string().optional(),
  billingLine2: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingPincode: z.string().optional(),
  sameShipping: z.boolean().default(true),
  shippingLine1: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingState: z.string().optional(),
  shippingPincode: z.string().optional(),
  openingBalance: z.coerce.number().optional().default(0),
  creditLimit: z.coerce.number().optional().default(0),
  creditDays: z.coerce.number().optional().default(30),
  group: z.string().optional(),
  tags: z.string().optional(),
})

export type CustomerFormValues = z.infer<typeof customerFormSchema>

export interface CustomerFormModalProps {
  isOpen: boolean
  onClose: () => void
  customer?: Customer | null
  onSuccessCallback?: (createdCustomer: Customer) => void
}

export function CustomerFormModal({
  isOpen,
  onClose,
  customer,
  onSuccessCallback,
}: CustomerFormModalProps) {
  const queryClient = useQueryClient()
  const isEditing = Boolean(customer?._id)
  const [sameAsBilling, setSameAsBilling] = useState(true)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema) as any,
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      gstin: '',
      billingLine1: '',
      billingLine2: '',
      billingCity: '',
      billingState: '',
      billingPincode: '',
      sameShipping: true,
      shippingLine1: '',
      shippingCity: '',
      shippingState: '',
      shippingPincode: '',
      openingBalance: 0,
      creditLimit: 0,
      creditDays: 30,
      group: 'Retail',
      tags: '',
    },
  })

  useEffect(() => {
    if (customer) {
      reset({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        gstin: customer.gstin || '',
        billingLine1: customer.billingAddress?.line1 || '',
        billingLine2: customer.billingAddress?.line2 || '',
        billingCity: customer.billingAddress?.city || '',
        billingState: customer.billingAddress?.state || '',
        billingPincode: customer.billingAddress?.pincode || '',
        sameShipping: !customer.shippingAddress?.line1,
        shippingLine1: customer.shippingAddress?.line1 || '',
        shippingCity: customer.shippingAddress?.city || '',
        shippingState: customer.shippingAddress?.state || '',
        shippingPincode: customer.shippingAddress?.pincode || '',
        openingBalance: (customer.openingBalance ?? 0) / 100,
        creditLimit: (customer.creditLimit ?? 0) / 100,
        creditDays: customer.creditDays ?? 30,
        group: customer.group || 'Retail',
        tags: Array.isArray(customer.tags) ? customer.tags.join(', ') : '',
      })
      setSameAsBilling(!customer.shippingAddress?.line1)
    } else {
      reset({
        name: '',
        phone: '',
        email: '',
        gstin: '',
        billingLine1: '',
        billingLine2: '',
        billingCity: '',
        billingState: '',
        billingPincode: '',
        sameShipping: true,
        shippingLine1: '',
        shippingCity: '',
        shippingState: '',
        shippingPincode: '',
        openingBalance: 0,
        creditLimit: 0,
        creditDays: 30,
        group: 'Retail',
        tags: '',
      })
      setSameAsBilling(true)
    }
  }, [customer, isOpen, reset])

  const mutation = useMutation({
    mutationFn: async (data: CustomerFormValues) => {
      const billingAddress = {
        line1: data.billingLine1?.trim() || undefined,
        line2: data.billingLine2?.trim() || undefined,
        city: data.billingCity?.trim() || undefined,
        state: data.billingState?.trim() || undefined,
        pincode: data.billingPincode?.trim() || undefined,
      }

      const shippingAddress = sameAsBilling
        ? billingAddress
        : {
            line1: data.shippingLine1?.trim() || undefined,
            city: data.shippingCity?.trim() || undefined,
            state: data.shippingState?.trim() || undefined,
            pincode: data.shippingPincode?.trim() || undefined,
          }

      const tags = data.tags
        ? data.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : []

      const payload: Record<string, any> = {
        name: data.name.trim(),
        phone: data.phone?.trim() || undefined,
        email: data.email?.trim() || undefined,
        gstin: data.gstin?.trim() || undefined,
        billingAddress,
        shippingAddress,
        openingBalance: rupeesToPaise(data.openingBalance || 0),
        creditLimit: rupeesToPaise(data.creditLimit || 0),
        creditDays: Number(data.creditDays || 30),
        group: data.group?.trim() || undefined,
        tags,
      }

      if (isEditing && customer?._id) {
        return updateCustomer(customer._id, payload)
      } else {
        return createCustomer(payload)
      }
    },
    onSuccess: (res: any) => {
      toast.success(isEditing ? 'Customer updated' : 'Customer created')
      queryClient.invalidateQueries({ queryKey: ['customers'] })
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

  const onSubmit = (values: CustomerFormValues) => {
    mutation.mutate(values)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Customer' : 'Add New Customer'}
      size="2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
        {/* Basic Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="sm:col-span-2">
            <Input
              label="Customer Name"
              required
              placeholder="e.g. Ramesh Enterprises, Sharma Ji"
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
            placeholder="customer@domain.com"
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
            label="Customer Group"
            placeholder="e.g. Retail, Wholesale, Corporate"
            error={errors.group?.message}
            {...register('group')}
          />
        </div>

        {/* Billing Address */}
        <div className="pt-2 border-t border-gray-100">
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2.5">
            Billing Address
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Input
                label="Street Address / Line 1"
                placeholder="Shop / House No, Street name"
                error={errors.billingLine1?.message}
                {...register('billingLine1')}
              />
            </div>
            <Input
              label="City"
              placeholder="City / District"
              error={errors.billingCity?.message}
              {...register('billingCity')}
            />
            <Input
              label="State"
              placeholder="State / Union Territory"
              error={errors.billingState?.message}
              {...register('billingState')}
            />
            <Input
              label="PIN Code"
              placeholder="e.g. 110001"
              error={errors.billingPincode?.message}
              {...register('billingPincode')}
            />
          </div>
        </div>

        {/* Shipping Address Checkbox */}
        <div className="pt-2 border-t border-gray-100">
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={sameAsBilling}
              onChange={(e) => {
                setSameAsBilling(e.target.checked)
                setValue('sameShipping', e.target.checked)
              }}
              className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span>Shipping address same as billing</span>
          </label>

          {!sameAsBilling && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div className="sm:col-span-2">
                <Input
                  label="Shipping Street Address"
                  placeholder="Delivery address"
                  {...register('shippingLine1')}
                />
              </div>
              <Input label="Shipping City" placeholder="City" {...register('shippingCity')} />
              <Input label="Shipping State" placeholder="State" {...register('shippingState')} />
              <Input label="Shipping PIN" placeholder="PIN Code" {...register('shippingPincode')} />
            </div>
          )}
        </div>

        {/* Financial & Credit Terms */}
        <div className="pt-2 border-t border-gray-100">
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2.5">
            Credit & Balances
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Opening Balance (₹)"
              type="number"
              step="0.01"
              placeholder="0.00"
              helperText="Positive = Customer owes you"
              error={errors.openingBalance?.message}
              {...register('openingBalance')}
            />
            <Input
              label="Credit Limit (₹)"
              type="number"
              step="0.01"
              placeholder="0.00"
              helperText="Maximum allowed dues"
              error={errors.creditLimit?.message}
              {...register('creditLimit')}
            />
            <Input
              label="Credit Period (Days)"
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
            placeholder="e.g. VIP, Cash-Only, Prompt-Payer"
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
            {isEditing ? 'Save Customer' : 'Create Customer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

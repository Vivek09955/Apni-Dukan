import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { IndianRupee } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { createExpense } from '../../api/expenses'
import { rupeesToPaise } from '../../lib/utils'

const expenseSchema = z.object({
  category: z.string().min(1, 'Expense category is required'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  expenseDate: z.string().min(1, 'Date is required'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  vendorName: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurringInterval: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
})

type ExpenseFormValues = z.infer<typeof expenseSchema>

export interface ExpenseFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export const EXPENSE_CATEGORIES = [
  { value: 'Rent', label: 'Rent & Lease' },
  { value: 'Salary', label: 'Salaries & Staff Wages' },
  { value: 'Electricity', label: 'Electricity & Utilities' },
  { value: 'Transport', label: 'Transport & Freight Charges' },
  { value: 'Office Expenses', label: 'Office Supplies & Stationery' },
  { value: 'Purchase Costs', label: 'Packaging & Handling Costs' },
  { value: 'Marketing', label: 'Advertising & Marketing' },
  { value: 'Maintenance', label: 'Repairs & Maintenance' },
  { value: 'Taxes & Fees', label: 'Bank Fees & Regulatory Charges' },
  { value: 'Other', label: 'Other Operating Expenses' },
]

export function ExpenseFormModal({ isOpen, onClose, onSuccess }: ExpenseFormModalProps) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: {
      category: 'Rent',
      amount: '' as any,
      expenseDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'bank_transfer',
      vendorName: '',
      description: '',
      notes: '',
      isRecurring: false,
      recurringInterval: 'monthly',
    },
  })

  const isRecurring = watch('isRecurring')

  useEffect(() => {
    if (isOpen) {
      reset({
        category: 'Rent',
        amount: '' as any,
        expenseDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'bank_transfer',
        vendorName: '',
        description: '',
        notes: '',
        isRecurring: false,
        recurringInterval: 'monthly',
      })
    }
  }, [isOpen, reset])

  const mutation = useMutation({
    mutationFn: async (data: ExpenseFormValues) => {
      const payload = {
        category: data.category,
        amount: rupeesToPaise(data.amount),
        expenseDate: data.expenseDate,
        paymentMethod: data.paymentMethod,
        vendorName: data.vendorName?.trim() || undefined,
        description: data.description?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
        isRecurring: Boolean(data.isRecurring),
        recurringInterval: data.isRecurring ? data.recurringInterval : undefined,
      }
      return createExpense(payload)
    },
    onSuccess: () => {
      toast.success('Expense recorded successfully')
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['expense-summary'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['accounting'] })
      if (onSuccess) onSuccess()
      onClose()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to record expense')
    },
  })

  const onSubmit = (values: ExpenseFormValues) => {
    mutation.mutate(values)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Store / Operating Expense" size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto px-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Category */}
          <Select
            label="Expense Category"
            required
            options={EXPENSE_CATEGORIES}
            error={errors.category?.message}
            {...register('category')}
          />

          {/* Amount (₹) */}
          <Input
            label="Amount (₹)"
            type="number"
            step="0.01"
            required
            placeholder="0.00"
            icon={<IndianRupee className="w-4 h-4 text-gray-400" />}
            error={errors.amount?.message}
            {...register('amount')}
          />

          {/* Date */}
          <Input
            label="Expense Date"
            type="date"
            required
            error={errors.expenseDate?.message}
            {...register('expenseDate')}
          />

          {/* Payment Method */}
          <Select
            label="Paid Via Method"
            required
            options={[
              { value: 'cash', label: 'Cash In Hand' },
              { value: 'bank_transfer', label: 'Bank Account Transfer' },
              { value: 'upi', label: 'UPI / QR Payment' },
              { value: 'cheque', label: 'Cheque' },
              { value: 'other', label: 'Other' },
            ]}
            error={errors.paymentMethod?.message}
            {...register('paymentMethod')}
          />

          {/* Vendor / Payee Name */}
          <div className="sm:col-span-2">
            <Input
              label="Paid To / Vendor Name (Optional)"
              placeholder="e.g. Landlord, State Electricity Board, Delivery Partner"
              error={errors.vendorName?.message}
              {...register('vendorName')}
            />
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Expense Description / Purpose
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Store rent for the month of November, Diesel for store generator..."
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...register('description')}
            />
          </div>
        </div>

        {/* Recurring Switch */}
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
          <label className="inline-flex items-center gap-2.5 cursor-pointer text-sm font-medium text-gray-800">
            <input
              type="checkbox"
              className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
              {...register('isRecurring')}
            />
            <span>This is a recurring expense</span>
          </label>

          {isRecurring && (
            <div className="pt-2 border-t border-gray-200">
              <Select
                label="Billing Frequency"
                options={[
                  { value: 'monthly', label: 'Monthly (e.g., Rent, Internet, Salary)' },
                  { value: 'quarterly', label: 'Quarterly' },
                  { value: 'yearly', label: 'Yearly (e.g., Software Subscriptions)' },
                ]}
                error={errors.recurringInterval?.message}
                {...register('recurringInterval')}
              />
            </div>
          )}
        </div>

        {/* Internal Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Internal Notes / Bill Ref (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="Reference invoice # or additional details..."
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...register('notes')}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Record Expense
          </Button>
        </div>
      </form>
    </Modal>
  )
}

import { useEffect, useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowDownLeft, ArrowUpRight, Calculator, IndianRupee } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { getCustomers } from '../../api/customers'
import { getSuppliers } from '../../api/suppliers'
import { createPayment, getOutstandingInvoices } from '../../api/payments'
import { getInvoices } from '../../api/sales'
import { getPurchaseBills } from '../../api/purchases'
import { formatCurrency, rupeesToPaise } from '../../lib/utils'
import type { Customer, Supplier, SalesInvoice, PurchaseBill } from '../../types'

const paymentFormSchema = z.object({
  type: z.enum(['payment_in', 'payment_out']),
  partyId: z.string().min(1, 'Party selection is required'),
  amount: z.coerce.number().positive('Payment amount must be greater than 0'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'upi', 'cheque', 'other']),
  referenceNumber: z.string().optional(),
  bankName: z.string().optional(),
  notes: z.string().optional(),
})

type PaymentFormValues = z.infer<typeof paymentFormSchema>

export interface PaymentFormModalProps {
  isOpen: boolean
  onClose: () => void
  initialType?: 'payment_in' | 'payment_out'
  defaultPartyId?: string
  onSuccess?: () => void
}

interface OutstandingRow {
  id: string
  invoiceNumber: string
  date: string
  grandTotal: number
  balanceDue: number
  type: 'sales_invoice' | 'purchase_bill'
}

export function PaymentFormModal({
  isOpen,
  onClose,
  initialType = 'payment_in',
  defaultPartyId,
  onSuccess,
}: PaymentFormModalProps) {
  const queryClient = useQueryClient()
  const [allocations, setAllocations] = useState<Record<string, number>>({}) // invoiceId -> rupee amount allocated
  const [isAllocationsOpen, setIsAllocationsOpen] = useState(true)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema) as any,
    defaultValues: {
      type: initialType,
      partyId: defaultPartyId || '',
      amount: '' as any,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'bank_transfer',
      referenceNumber: '',
      bankName: '',
      notes: '',
    },
  })

  const selectedType = watch('type')
  const selectedPartyId = watch('partyId')
  const enteredAmount = watch('amount') || 0
  const selectedMethod = watch('paymentMethod')

  useEffect(() => {
    if (isOpen) {
      reset({
        type: initialType,
        partyId: defaultPartyId || '',
        amount: '' as any,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'bank_transfer',
        referenceNumber: '',
        bankName: '',
        notes: '',
      })
      setAllocations({})
      setIsAllocationsOpen(true)
    }
  }, [isOpen, initialType, defaultPartyId, reset])

  // Fetch customers
  const { data: customersData } = useQuery({
    queryKey: ['customers', 'list-select'],
    queryFn: () => getCustomers({ limit: 200 }),
    enabled: isOpen && selectedType === 'payment_in',
  })

  // Fetch suppliers
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', 'list-select'],
    queryFn: () => getSuppliers({ limit: 200 }),
    enabled: isOpen && selectedType === 'payment_out',
  })

  const customers: Customer[] = customersData?.data?.customers || customersData?.data || []
  const suppliers: Supplier[] = suppliersData?.data?.suppliers || suppliersData?.data || []

  // Fetch outstanding invoices for the selected party
  const { data: outstandingData, isLoading: isLoadingOutstanding } = useQuery({
    queryKey: ['outstanding-invoices', selectedType, selectedPartyId],
    queryFn: async () => {
      if (!selectedPartyId) return []
      try {
        const res = await getOutstandingInvoices({
          partyType: selectedType === 'payment_in' ? 'customer' : 'supplier',
          partyId: selectedPartyId,
        })
        if (res?.data && Array.isArray(res.data)) {
          return res.data
        }
      } catch {
        // Fallback to direct invoices / purchases query if dedicated endpoint not ready
      }

      if (selectedType === 'payment_in') {
        const invRes = await getInvoices({ customerId: selectedPartyId, limit: 50 })
        const list: SalesInvoice[] = invRes?.data?.invoices || invRes?.data || []
        return list
          .filter((inv) => inv.status !== 'cancelled' && (inv.balanceDue ?? inv.finalAmount) > 0)
          .map((inv) => ({
            id: inv._id,
            invoiceNumber: inv.invoiceNumber,
            date: inv.invoiceDate || inv.createdAt,
            grandTotal: inv.finalAmount,
            balanceDue: inv.balanceDue ?? inv.finalAmount,
            type: 'sales_invoice' as const,
          }))
      } else {
        const billRes = await getPurchaseBills({ supplierId: selectedPartyId, limit: 50 })
        const list: PurchaseBill[] = billRes?.data?.bills || billRes?.data || []
        return list
          .filter((b) => b.status !== 'cancelled' && (b.balanceDue ?? b.finalAmount) > 0)
          .map((b) => ({
            id: b._id,
            invoiceNumber: b.billNumber,
            date: b.billDate || b.createdAt,
            grandTotal: b.finalAmount,
            balanceDue: b.balanceDue ?? b.finalAmount,
            type: 'purchase_bill' as const,
          }))
      }
    },
    enabled: isOpen && Boolean(selectedPartyId),
  })

  const outstandingInvoices: OutstandingRow[] = useMemo(() => {
    if (!outstandingData || !Array.isArray(outstandingData)) return []
    return outstandingData.map((item: any) => ({
      id: item._id || item.id,
      invoiceNumber: item.invoiceNumber || item.billNumber,
      date: item.invoiceDate || item.billDate || item.date || item.createdAt,
      grandTotal: item.finalAmount || item.grandTotal || item.totalAmount || 0,
      balanceDue: item.balanceDue ?? item.finalAmount ?? item.totalAmount ?? 0,
      type: item.type || (selectedType === 'payment_in' ? 'sales_invoice' : 'purchase_bill'),
    }))
  }, [outstandingData, selectedType])

  // Auto allocate helper
  const handleAutoAllocate = () => {
    let remainingPaise = rupeesToPaise(enteredAmount)
    const newAllocations: Record<string, number> = {}

    for (const inv of outstandingInvoices) {
      if (remainingPaise <= 0) break
      const duePaise = inv.balanceDue
      const allocatedPaise = Math.min(remainingPaise, duePaise)
      newAllocations[inv.id] = allocatedPaise / 100
      remainingPaise -= allocatedPaise
    }

    setAllocations(newAllocations)
    toast.success('Allocated sequentially to outstanding invoices')
  }

  // Handle manual allocation change
  const handleAllocationChange = (invId: string, rupeeValue: number, maxPaise: number) => {
    const valPaise = Math.max(0, rupeesToPaise(rupeeValue))
    const clampedPaise = Math.min(valPaise, maxPaise)
    setAllocations((prev) => ({
      ...prev,
      [invId]: clampedPaise / 100,
    }))
  }

  // Calculate totals
  const totalAllocatedPaise = useMemo(() => {
    return Object.values(allocations).reduce((sum, rupee) => sum + rupeesToPaise(rupee), 0)
  }, [allocations])

  const enteredAmountPaise = rupeesToPaise(enteredAmount)
  const advanceAmountPaise = Math.max(0, enteredAmountPaise - totalAllocatedPaise)

  const mutation = useMutation({
    mutationFn: async (data: PaymentFormValues) => {
      const partyType = data.type === 'payment_in' ? 'customer' : 'supplier'
      const invoiceAllocations = Object.entries(allocations)
        .filter(([_, rupees]) => rupees > 0)
        .map(([invId, rupees]) => {
          const inv = outstandingInvoices.find((i) => i.id === invId)
          return {
            invoiceId: invId,
            invoiceType: inv?.type || (data.type === 'payment_in' ? 'sales_invoice' : 'purchase_bill'),
            allocatedAmount: rupeesToPaise(rupees),
          }
        })

      const payload = {
        type: data.type,
        partyType,
        partyId: data.partyId,
        amount: rupeesToPaise(data.amount),
        paymentDate: data.paymentDate,
        paymentMethod: data.paymentMethod,
        referenceNumber: data.referenceNumber?.trim() || undefined,
        bankName: data.bankName?.trim() || undefined,
        invoiceAllocations,
        isAdvance: totalAllocatedPaise === 0 || advanceAmountPaise > 0,
        notes: data.notes?.trim() || undefined,
      }

      return createPayment(payload)
    },
    onSuccess: () => {
      toast.success(
        selectedType === 'payment_in'
          ? 'Payment received and recorded successfully'
          : 'Payment disbursement recorded successfully'
      )
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['salesInvoices'] })
      queryClient.invalidateQueries({ queryKey: ['purchaseBills'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      if (onSuccess) onSuccess()
      onClose()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to record payment')
    },
  })

  const onSubmit = (values: PaymentFormValues) => {
    mutation.mutate(values)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedType === 'payment_in' ? 'Record Payment In (Receipt)' : 'Record Payment Out (Disbursement)'}
      size="3xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto px-1">
        {/* Payment Type Toggle */}
        <div className="grid grid-cols-2 gap-3 p-1.5 bg-gray-100 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setValue('type', 'payment_in')
              setValue('partyId', '')
              setAllocations({})
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              selectedType === 'payment_in'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
            <span>Payment In (Receive from Customer)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setValue('type', 'payment_out')
              setValue('partyId', '')
              setAllocations({})
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              selectedType === 'payment_out'
                ? 'bg-white text-rose-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
            <span>Payment Out (Pay to Supplier)</span>
          </button>
        </div>

        {/* Core Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Party Dropdown */}
          <div className="sm:col-span-2">
            <Select
              label={selectedType === 'payment_in' ? 'Customer' : 'Supplier'}
              required
              placeholder={
                selectedType === 'payment_in'
                  ? '-- Select Customer --'
                  : '-- Select Supplier --'
              }
              options={
                selectedType === 'payment_in'
                  ? customers.map((c) => ({
                      value: c._id,
                      label: `${c.name} ${c.phone ? `(${c.phone})` : ''} ${
                        (c.totalReceivable ?? 0) > 0
                          ? ` - Due: ${formatCurrency(c.totalReceivable)}`
                          : ''
                      }`,
                    }))
                  : suppliers.map((s) => ({
                      value: s._id,
                      label: `${s.name} ${s.phone ? `(${s.phone})` : ''} ${
                        (s.totalPayable ?? 0) > 0
                          ? ` - Due: ${formatCurrency(s.totalPayable)}`
                          : ''
                      }`,
                    }))
              }
              error={errors.partyId?.message}
              {...register('partyId')}
            />
          </div>

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

          {/* Payment Date */}
          <Input
            label="Payment Date"
            type="date"
            required
            error={errors.paymentDate?.message}
            {...register('paymentDate')}
          />

          {/* Payment Method */}
          <Select
            label="Payment Method"
            required
            options={[
              { value: 'cash', label: 'Cash' },
              { value: 'bank_transfer', label: 'Bank Transfer (NEFT/RTGS/IMPS)' },
              { value: 'upi', label: 'UPI / QR Code' },
              { value: 'cheque', label: 'Cheque' },
              { value: 'other', label: 'Other' },
            ]}
            error={errors.paymentMethod?.message}
            {...register('paymentMethod')}
          />

          {/* Reference # */}
          <Input
            label={
              selectedMethod === 'cheque'
                ? 'Cheque Number'
                : selectedMethod === 'upi'
                ? 'UPI Transaction ID / Ref #'
                : 'Reference / UTR Number'
            }
            placeholder="e.g. UTR12345678, CHQ#44091"
            error={errors.referenceNumber?.message}
            {...register('referenceNumber')}
          />

          {/* Bank Name */}
          {(selectedMethod === 'bank_transfer' || selectedMethod === 'cheque') && (
            <div className="sm:col-span-2">
              <Input
                label="Bank Name / Branch"
                placeholder="e.g. State Bank of India, HDFC Bank"
                error={errors.bankName?.message}
                {...register('bankName')}
              />
            </div>
          )}
        </div>

        {/* Invoice Allocation Section */}
        {selectedPartyId && (
          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-gray-800">
                  {selectedType === 'payment_in'
                    ? 'Allocate to Sales Invoices'
                    : 'Allocate to Purchase Bills'}
                </h4>
                {outstandingInvoices.length > 0 && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                    {outstandingInvoices.length} outstanding
                  </span>
                )}
              </div>
              {outstandingInvoices.length > 0 && enteredAmount > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={<Calculator className="w-3.5 h-3.5" />}
                  onClick={handleAutoAllocate}
                >
                  Auto-Allocate
                </Button>
              )}
            </div>

            {isLoadingOutstanding ? (
              <div className="p-4 text-center text-xs text-gray-500 animate-pulse">
                Loading outstanding invoices...
              </div>
            ) : outstandingInvoices.length === 0 ? (
              <div className="p-4 bg-gray-50 rounded-xl text-center text-xs text-gray-500 border border-gray-200">
                No unpaid invoices found for this party. The full amount of{' '}
                <span className="font-semibold text-gray-800">
                  {formatCurrency(enteredAmountPaise)}
                </span>{' '}
                will be treated as an advance payment on account.
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-[11px] border-b border-gray-200">
                    <tr>
                      <th className="px-3.5 py-2.5">Invoice #</th>
                      <th className="px-3.5 py-2.5">Date</th>
                      <th className="px-3.5 py-2.5 text-right">Total</th>
                      <th className="px-3.5 py-2.5 text-right">Balance Due</th>
                      <th className="px-3.5 py-2.5 text-right w-36">Allocate (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {outstandingInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50/50">
                        <td className="px-3.5 py-2.5 font-medium text-gray-900">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-3.5 py-2.5 text-gray-500">
                          {inv.date ? new Date(inv.date).toLocaleDateString('en-IN') : '-'}
                        </td>
                        <td className="px-3.5 py-2.5 text-right text-gray-600">
                          {formatCurrency(inv.grandTotal)}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-semibold text-amber-600">
                          {formatCurrency(inv.balanceDue)}
                        </td>
                        <td className="px-3.5 py-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={(inv.balanceDue / 100).toFixed(2)}
                            value={allocations[inv.id] ?? ''}
                            onChange={(e) =>
                              handleAllocationChange(
                                inv.id,
                                parseFloat(e.target.value) || 0,
                                inv.balanceDue
                              )
                            }
                            placeholder="0.00"
                            className="w-full px-2.5 py-1 text-right text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Allocation Summary Footer */}
            {enteredAmount > 0 && (
              <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-gray-500">Total Payment: </span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(enteredAmountPaise)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Allocated to Invoices: </span>
                  <span className="font-bold text-blue-600">
                    {formatCurrency(totalAllocatedPaise)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Advance / Unallocated: </span>
                  <span
                    className={`font-bold ${
                      advanceAmountPaise > 0 ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                  >
                    {formatCurrency(advanceAmountPaise)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="pt-2 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Notes / Internal Remarks
          </label>
          <textarea
            rows={2}
            placeholder="Add any remarks, cheque clearance details, or references..."
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...register('notes')}
          />
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={mutation.isPending}
            variant={selectedType === 'payment_in' ? 'primary' : 'primary'}
          >
            {selectedType === 'payment_in' ? 'Save & Receive' : 'Save & Disburse'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

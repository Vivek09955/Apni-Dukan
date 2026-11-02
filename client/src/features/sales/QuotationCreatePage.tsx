import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft,
  Plus,
  Trash2,
  UserPlus,
  Building,
  Calendar,
  FileCheck,
  Save,
  Send,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { CustomerFormModal } from '../customers/CustomerFormModal'
import { getCustomers } from '../../api/customers'
import { getProducts } from '../../api/products'
import { createQuotation } from '../../api/quotations'
import { calculateLineItem, calculateInvoiceTotals } from '../../lib/gstCalculator'
import { formatCurrency, rupeesToPaise } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import type { Customer, Product } from '../../types'

const quotationItemSchema = z.object({
  productId: z.string().optional(),
  name: z.string().min(1, 'Item name is required'),
  hsnCode: z.string().optional(),
  quantity: z.number().min(0.01, 'Qty must be > 0'),
  unit: z.string().default('PCS'),
  rate: z.number().min(0, 'Rate must be >= 0'), // in Rupees in form
  discountPercent: z.number().min(0).max(100).default(0),
  taxRate: z.number().default(18),
  taxInclusive: z.boolean().default(false),
})

const quotationFormSchema = z.object({
  customerId: z.string().min(1, 'Please select a customer'),
  quotationDate: z.string().min(1, 'Quotation date is required'),
  validUntil: z.string().optional(),
  placeOfSupply: z.string().min(1, 'Place of supply is required'),
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
  items: z.array(quotationItemSchema).min(1, 'At least one item is required'),
})

type QuotationFormData = z.infer<typeof quotationFormSchema>

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Madhya Pradesh', 'Maharashtra',
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal'
]

export function QuotationCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentBusiness } = useAuthStore()

  const defaultState = currentBusiness?.state || 'Delhi'
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [showTerms, setShowTerms] = useState(false)

  const defaultValidUntil = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 15)
    return d.toISOString().split('T')[0]
  }, [])

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuotationFormData>({
    resolver: zodResolver(quotationFormSchema) as any,
    defaultValues: {
      customerId: '',
      quotationDate: new Date().toISOString().split('T')[0],
      validUntil: defaultValidUntil,
      placeOfSupply: defaultState,
      notes: '',
      termsAndConditions: '1. Quotation valid for 15 days.\n2. Taxes as applicable.\n3. Delivery within 7 days of confirmation.',
      items: [
        {
          productId: '',
          name: '',
          hsnCode: '',
          quantity: 1,
          unit: 'PCS',
          rate: 0,
          discountPercent: 0,
          taxRate: 18,
          taxInclusive: false,
        },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  // Watch values for real-time calculations
  const watchedCustomerId = watch('customerId')
  const watchedPlaceOfSupply = watch('placeOfSupply')
  const watchedItems = watch('items')

  // Fetch Customers
  const { data: customersData } = useQuery({
    queryKey: ['customers', currentBusiness?._id],
    queryFn: () => getCustomers({ limit: 200 }),
  })
  const customers: Customer[] = customersData?.data?.customers || customersData?.data || []

  // Fetch Products
  const { data: productsData } = useQuery({
    queryKey: ['products', currentBusiness?._id],
    queryFn: () => getProducts({ limit: 300 }),
  })
  const products: Product[] = productsData?.data?.products || productsData?.data || []

  // Customer selected
  const selectedCustomer = useMemo(
    () => customers.find((c) => c._id === watchedCustomerId),
    [customers, watchedCustomerId]
  )

  const handleCustomerSelect = (id: string) => {
    setValue('customerId', id)
    const cust = customers.find((c) => c._id === id)
    if (cust?.billingAddress?.state) {
      setValue('placeOfSupply', cust.billingAddress.state)
    }
  }

  // Inter-state check
  const isInterState = useMemo(() => {
    if (!currentBusiness?.state || !watchedPlaceOfSupply) return false
    return currentBusiness.state.trim().toLowerCase() !== watchedPlaceOfSupply.trim().toLowerCase()
  }, [currentBusiness?.state, watchedPlaceOfSupply])

  // Product selection inside line item
  const handleProductSelect = (index: number, prodId: string) => {
    const prod = products.find((p) => p._id === prodId)
    if (prod) {
      setValue(`items.${index}.productId`, prod._id)
      setValue(`items.${index}.name`, prod.name)
      setValue(`items.${index}.hsnCode`, prod.hsnCode || '')
      setValue(`items.${index}.unit`, prod.unit || 'PCS')
      setValue(`items.${index}.rate`, (prod.sellingPrice ?? 0) / 100)
      setValue(`items.${index}.taxRate`, prod.taxRate ?? 18)
      setValue(`items.${index}.taxInclusive`, Boolean(prod.taxInclusive))
    }
  }

  // Calculate line items and totals
  const calculatedItems = useMemo(() => {
    return watchedItems.map((item) => {
      const ratePaise = rupeesToPaise(item.rate)
      return calculateLineItem({
        rate: ratePaise,
        quantity: Number(item.quantity) || 0,
        discountPercent: Number(item.discountPercent) || 0,
        taxRate: Number(item.taxRate) || 0,
        taxInclusive: Boolean(item.taxInclusive),
        isInterState,
      })
    })
  }, [watchedItems, isInterState])

  const totals = useMemo(() => {
    return calculateInvoiceTotals(calculatedItems)
  }, [calculatedItems])

  // Mutation
  const createMutation = useMutation({
    mutationFn: (payload: any) => createQuotation(payload),
    onSuccess: (res) => {
      toast.success('Quotation created successfully!')
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      const quoteId = res?.data?.quotation?._id
      if (quoteId) {
        navigate(`/sales/quotations/${quoteId}`)
      } else {
        navigate('/sales/quotations')
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create quotation')
    },
  })

  const onSubmit = (data: QuotationFormData, status: 'draft' | 'sent') => {
    // Map items to backend payload format with amounts in paise
    const itemsPayload = data.items.map((item, index) => {
      const calc = calculatedItems[index]
      return {
        productId: item.productId || undefined,
        name: item.name,
        hsnCode: item.hsnCode || undefined,
        quantity: Number(item.quantity),
        unit: item.unit || 'PCS',
        rate: rupeesToPaise(item.rate),
        discount: calc.discountAmount,
        discountPercent: Number(item.discountPercent) || 0,
        taxableAmount: calc.taxableAmount,
        taxRate: Number(item.taxRate) || 0,
        cgstAmount: calc.cgstAmount,
        sgstAmount: calc.sgstAmount,
        igstAmount: calc.igstAmount,
        totalAmount: calc.totalAmount,
      }
    })

    const payload = {
      customerId: data.customerId,
      quotationDate: data.quotationDate,
      validUntil: data.validUntil || undefined,
      placeOfSupply: data.placeOfSupply,
      items: itemsPayload,
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      taxableAmount: totals.taxableAmount,
      totalCgst: totals.totalCgst,
      totalSgst: totals.totalSgst,
      totalIgst: totals.totalIgst,
      totalTax: totals.totalTax,
      grandTotal: totals.grandTotal,
      roundOff: totals.roundOff,
      finalAmount: totals.finalAmount,
      isInterState,
      status,
      notes: data.notes,
      termsAndConditions: data.termsAndConditions,
    }

    createMutation.mutate(payload)
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/sales/quotations">
            <Button variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create Quotation</h1>
            <p className="text-sm text-gray-500">
              Generate an official cost estimate for your customer.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={createMutation.isPending}
            onClick={handleSubmit((data) => onSubmit(data as QuotationFormData, 'draft'))}
            icon={<Save className="w-4 h-4" />}
          >
            Save as Draft
          </Button>
          <Button
            type="button"
            disabled={createMutation.isPending}
            onClick={handleSubmit((data) => onSubmit(data as QuotationFormData, 'sent'))}
            icon={<Send className="w-4 h-4" />}
          >
            Save & Send
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Customer & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Selection Card */}
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" />
                Customer Details
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCustomerModalOpen(true)}
                icon={<UserPlus className="w-4 h-4" />}
              >
                New Customer
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Select Customer <span className="text-red-500">*</span>
                </label>
                <select
                  value={watchedCustomerId}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className={`block w-full rounded-lg border text-sm px-3.5 py-2.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                    errors.customerId ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                  }`}
                >
                  <option value="">-- Choose a Customer --</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
                {errors.customerId && (
                  <p className="mt-1 text-xs text-red-600">{errors.customerId.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Place of Supply <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('placeOfSupply')}
                  className="block w-full rounded-lg border border-gray-300 text-sm px-3.5 py-2.5 bg-white text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">
                    Tax Type:{' '}
                    <strong className={isInterState ? 'text-amber-600' : 'text-blue-600'}>
                      {isInterState ? 'IGST (Inter-State)' : 'CGST + SGST (Intra-State)'}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {selectedCustomer && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 grid grid-cols-1 sm:grid-cols-3 gap-2 border border-gray-100">
                <div>
                  <span className="font-semibold text-gray-800">GSTIN:</span>{' '}
                  {selectedCustomer.gstin || 'Unregistered'}
                </div>
                <div>
                  <span className="font-semibold text-gray-800">Phone:</span>{' '}
                  {selectedCustomer.phone || '-'}
                </div>
                <div>
                  <span className="font-semibold text-gray-800">State:</span>{' '}
                  {selectedCustomer.billingAddress?.state || 'Not specified'}
                </div>
              </div>
            )}
          </Card>

          {/* Line Items Card */}
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Quotation Items</h2>
                <p className="text-xs text-gray-500">
                  Add items, quantities, and applicable tax rates.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    productId: '',
                    name: '',
                    hsnCode: '',
                    quantity: 1,
                    unit: 'PCS',
                    rate: 0,
                    discountPercent: 0,
                    taxRate: 18,
                    taxInclusive: false,
                  })
                }
                icon={<Plus className="w-4 h-4" />}
              >
                Add Row
              </Button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => {
                const calc = calculatedItems[index] || {
                  grossAmount: 0,
                  taxableAmount: 0,
                  totalTax: 0,
                  totalAmount: 0,
                }

                return (
                  <div
                    key={field.id}
                    className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-600">
                        Item #{index + 1}
                      </span>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      {/* Product Selector / Item Name */}
                      <div className="sm:col-span-5">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Product / Service
                        </label>
                        <select
                          onChange={(e) => handleProductSelect(index, e.target.value)}
                          className="block w-full rounded-lg border border-gray-300 text-xs px-2.5 py-2 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
                        >
                          <option value="">-- Choose Product or Type Name --</option>
                          {products.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Item Description / Name"
                          {...register(`items.${index}.name` as const)}
                          className="mt-1 block w-full rounded-lg border border-gray-300 text-xs px-2.5 py-1.5 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* HSN */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          HSN/SAC
                        </label>
                        <input
                          type="text"
                          placeholder="HSN"
                          {...register(`items.${index}.hsnCode` as const)}
                          className="block w-full rounded-lg border border-gray-300 text-xs px-2.5 py-2 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Quantity & Unit */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Qty & Unit
                        </label>
                        <div className="flex gap-1">
                          <input
                            type="number"
                            step="any"
                            min="0.01"
                            {...register(`items.${index}.quantity` as const, {
                              valueAsNumber: true,
                            })}
                            className="block w-16 rounded-lg border border-gray-300 text-xs px-2 py-2 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
                          />
                          <input
                            type="text"
                            placeholder="Unit"
                            {...register(`items.${index}.unit` as const)}
                            className="block w-14 rounded-lg border border-gray-300 text-xs px-2 py-2 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Rate (₹) */}
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Rate (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          {...register(`items.${index}.rate` as const, {
                            valueAsNumber: true,
                          })}
                          className="block w-full rounded-lg border border-gray-300 text-xs px-2.5 py-2 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Tax & Discount row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-200/60 items-center">
                      <div>
                        <label className="block text-[11px] text-gray-500 mb-0.5">Discount %</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          {...register(`items.${index}.discountPercent` as const, {
                            valueAsNumber: true,
                          })}
                          className="block w-full rounded-md border border-gray-300 text-xs px-2 py-1 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-500 mb-0.5">GST Rate %</label>
                        <select
                          {...register(`items.${index}.taxRate` as const, {
                            valueAsNumber: true,
                          })}
                          className="block w-full rounded-md border border-gray-300 text-xs px-2 py-1 bg-white"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5 pt-3">
                        <input
                          type="checkbox"
                          id={`tax-inc-${index}`}
                          {...register(`items.${index}.taxInclusive` as const)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor={`tax-inc-${index}`} className="text-xs text-gray-600">
                          Tax Inc.
                        </label>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] text-gray-500 block">Total Amount</span>
                        <span className="text-sm font-bold text-gray-900">
                          {formatCurrency(calc.totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Notes & Terms */}
          <Card className="p-6 bg-white border border-gray-200">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Notes & Terms</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Customer Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes visible to the customer (e.g. Thanks for your interest!)..."
                  {...register('notes')}
                  className="block w-full rounded-lg border border-gray-300 text-sm p-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowTerms(!showTerms)}
                  className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1"
                >
                  {showTerms ? 'Hide' : 'Edit'} Terms & Conditions
                </button>
                {showTerms && (
                  <textarea
                    rows={3}
                    {...register('termsAndConditions')}
                    className="mt-2 block w-full rounded-lg border border-gray-300 text-sm p-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Dates & Summary */}
        <div className="space-y-6">
          {/* Dates Card */}
          <Card className="p-6 bg-white border border-gray-200">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Dates
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Quotation Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  {...register('quotationDate')}
                  className="block w-full rounded-lg border border-gray-300 text-sm px-3.5 py-2.5 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Valid Until
                </label>
                <input
                  type="date"
                  {...register('validUntil')}
                  className="block w-full rounded-lg border border-gray-300 text-sm px-3.5 py-2.5 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Estimate will expire after this date.
                </p>
              </div>
            </div>
          </Card>

          {/* Amount Summary Card */}
          <Card className="p-6 bg-white border border-gray-200">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>

              {totals.totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(totals.totalDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-600">
                <span>Taxable Amount:</span>
                <span>{formatCurrency(totals.taxableAmount)}</span>
              </div>

              {isInterState ? (
                <div className="flex justify-between text-gray-600">
                  <span>IGST:</span>
                  <span>{formatCurrency(totals.totalIgst)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-gray-600">
                    <span>CGST:</span>
                    <span>{formatCurrency(totals.totalCgst)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>SGST:</span>
                    <span>{formatCurrency(totals.totalSgst)}</span>
                  </div>
                </>
              )}

              {totals.roundOff !== 0 && (
                <div className="flex justify-between text-gray-600 text-xs">
                  <span>Round Off:</span>
                  <span>{formatCurrency(totals.roundOff)}</span>
                </div>
              )}

              <div className="pt-3 border-t border-gray-200 flex justify-between font-bold text-gray-900 text-base">
                <span>Grand Total:</span>
                <span className="text-blue-600">{formatCurrency(totals.finalAmount)}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col gap-2">
              <Button
                type="button"
                fullWidth
                disabled={createMutation.isPending}
                onClick={handleSubmit((data) => onSubmit(data as QuotationFormData, 'sent'))}
                icon={<Send className="w-4 h-4" />}
              >
                Save & Send
              </Button>
              <Button
                type="button"
                variant="outline"
                fullWidth
                disabled={createMutation.isPending}
                onClick={handleSubmit((data) => onSubmit(data as QuotationFormData, 'draft'))}
                icon={<Save className="w-4 h-4" />}
              >
                Save as Draft
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Customer Form Modal */}
      {isCustomerModalOpen && (
        <CustomerFormModal
          isOpen={isCustomerModalOpen}
          onClose={() => setIsCustomerModalOpen(false)}
          onSuccessCallback={(newCust: Customer) => {
            setIsCustomerModalOpen(false)
            if (newCust?._id) {
              handleCustomerSelect(newCust._id)
            }
          }}
        />
      )}
    </div>
  )
}

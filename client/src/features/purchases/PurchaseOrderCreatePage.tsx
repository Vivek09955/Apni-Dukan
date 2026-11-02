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
  Save,
  CheckCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SupplierFormModal } from '../suppliers/SupplierFormModal'
import { getSuppliers } from '../../api/suppliers'
import { getProducts } from '../../api/products'
import { createPurchaseOrder } from '../../api/purchaseOrders'
import { calculateLineItem, calculateInvoiceTotals } from '../../lib/gstCalculator'
import { formatCurrency, rupeesToPaise } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import type { Supplier, Product } from '../../types'

const orderItemSchema = z.object({
  productId: z.string().optional(),
  name: z.string().min(1, 'Item name is required'),
  hsnCode: z.string().optional(),
  quantity: z.number().min(0.01, 'Qty must be > 0'),
  unit: z.string().default('PCS'),
  rate: z.number().min(0, 'Rate must be >= 0'),
  discountPercent: z.number().min(0).max(100).default(0),
  taxRate: z.number().default(18),
  taxInclusive: z.boolean().default(false),
})

const purchaseOrderFormSchema = z.object({
  supplierId: z.string().min(1, 'Please select a supplier'),
  orderDate: z.string().min(1, 'Order date is required'),
  expectedDate: z.string().optional(),
  placeOfSupply: z.string().min(1, 'Place of supply is required'),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
})

type PurchaseOrderFormData = z.infer<typeof purchaseOrderFormSchema>

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Madhya Pradesh', 'Maharashtra',
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal'
]

export function PurchaseOrderCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentBusiness } = useAuthStore()

  const defaultState = currentBusiness?.state || 'Delhi'
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false)

  const defaultExpectedDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().split('T')[0]
  }, [])

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderFormSchema) as any,
    defaultValues: {
      supplierId: '',
      orderDate: new Date().toISOString().split('T')[0],
      expectedDate: defaultExpectedDate,
      placeOfSupply: defaultState,
      notes: '',
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

  const watchedSupplierId = watch('supplierId')
  const watchedPlaceOfSupply = watch('placeOfSupply')
  const watchedItems = watch('items')

  // Fetch Suppliers
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', currentBusiness?._id],
    queryFn: () => getSuppliers({ limit: 200 }),
  })
  const suppliers: Supplier[] = suppliersData?.data?.suppliers || suppliersData?.data || []

  // Fetch Products
  const { data: productsData } = useQuery({
    queryKey: ['products', currentBusiness?._id],
    queryFn: () => getProducts({ limit: 300 }),
  })
  const products: Product[] = productsData?.data?.products || productsData?.data || []

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s._id === watchedSupplierId),
    [suppliers, watchedSupplierId]
  )

  const handleSupplierSelect = (id: string) => {
    setValue('supplierId', id)
    const supp = suppliers.find((s) => s._id === id)
    if (supp?.address?.state) {
      setValue('placeOfSupply', supp.address.state)
    }
  }

  const isInterState = useMemo(() => {
    if (!currentBusiness?.state || !watchedPlaceOfSupply) return false
    return currentBusiness.state.trim().toLowerCase() !== watchedPlaceOfSupply.trim().toLowerCase()
  }, [currentBusiness?.state, watchedPlaceOfSupply])

  const handleProductSelect = (index: number, prodId: string) => {
    const prod = products.find((p) => p._id === prodId)
    if (prod) {
      setValue(`items.${index}.productId`, prod._id)
      setValue(`items.${index}.name`, prod.name)
      setValue(`items.${index}.hsnCode`, prod.hsnCode || '')
      setValue(`items.${index}.unit`, prod.unit || 'PCS')
      setValue(`items.${index}.rate`, (prod.purchasePrice ?? 0) / 100)
      setValue(`items.${index}.taxRate`, prod.taxRate ?? 18)
      setValue(`items.${index}.taxInclusive`, Boolean(prod.taxInclusive))
    }
  }

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

  const createMutation = useMutation({
    mutationFn: (payload: any) => createPurchaseOrder(payload),
    onSuccess: () => {
      toast.success('Purchase order created successfully!')
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
      navigate('/purchases/orders')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create purchase order')
    },
  })

  const onSubmit = (data: PurchaseOrderFormData, status: 'draft' | 'confirmed') => {
    const itemsPayload = data.items.map((item, index) => {
      const calc = calculatedItems[index]
      return {
        productId: item.productId || undefined,
        name: item.name,
        hsnCode: item.hsnCode || undefined,
        quantity: Number(item.quantity),
        fulfilledQuantity: 0,
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
      supplierId: data.supplierId,
      orderDate: data.orderDate,
      expectedDate: data.expectedDate || undefined,
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
    }

    createMutation.mutate(payload)
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/purchases/orders">
            <Button variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create Purchase Order</h1>
            <p className="text-sm text-gray-500">
              Send a formal purchase request to a supplier.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={createMutation.isPending}
            onClick={handleSubmit((data) => onSubmit(data as PurchaseOrderFormData, 'draft'))}
            icon={<Save className="w-4 h-4" />}
          >
            Save Draft
          </Button>
          <Button
            type="button"
            disabled={createMutation.isPending}
            onClick={handleSubmit((data) => onSubmit(data as PurchaseOrderFormData, 'confirmed'))}
            icon={<CheckCircle className="w-4 h-4" />}
          >
            Confirm Order
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Supplier Selection */}
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" />
                Supplier Details
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsSupplierModalOpen(true)}
                icon={<UserPlus className="w-4 h-4" />}
              >
                New Supplier
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Select Supplier <span className="text-red-500">*</span>
                </label>
                <select
                  value={watchedSupplierId}
                  onChange={(e) => handleSupplierSelect(e.target.value)}
                  className={`block w-full rounded-lg border text-sm px-3.5 py-2.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                    errors.supplierId ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                  }`}
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} {s.phone ? `(${s.phone})` : ''}
                    </option>
                  ))}
                </select>
                {errors.supplierId && (
                  <p className="mt-1 text-xs text-red-600">{errors.supplierId.message}</p>
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
              </div>
            </div>
          </Card>

          {/* Items */}
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Purchase Items</h2>
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
                const calc = calculatedItems[index] || { totalAmount: 0 }
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
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-5">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Product
                        </label>
                        <select
                          onChange={(e) => handleProductSelect(index, e.target.value)}
                          className="block w-full rounded-lg border border-gray-300 text-xs px-2.5 py-2 bg-white text-gray-900 focus:outline-none"
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
                          placeholder="Item Name"
                          {...register(`items.${index}.name` as const)}
                          className="mt-1 block w-full rounded-lg border border-gray-300 text-xs px-2.5 py-1.5 bg-white text-gray-900"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          HSN
                        </label>
                        <input
                          type="text"
                          placeholder="HSN"
                          {...register(`items.${index}.hsnCode` as const)}
                          className="block w-full rounded-lg border border-gray-300 text-xs px-2.5 py-2 bg-white text-gray-900"
                        />
                      </div>

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
                            className="block w-16 rounded-lg border border-gray-300 text-xs px-2 py-2 bg-white"
                          />
                          <input
                            type="text"
                            placeholder="Unit"
                            {...register(`items.${index}.unit` as const)}
                            className="block w-14 rounded-lg border border-gray-300 text-xs px-2 py-2 bg-white"
                          />
                        </div>
                      </div>

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
                          className="block w-full rounded-lg border border-gray-300 text-xs px-2.5 py-2 bg-white"
                        />
                      </div>
                    </div>

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
                        <label className="block text-[11px] text-gray-500 mb-0.5">GST %</label>
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
                          id={`po-tax-${index}`}
                          {...register(`items.${index}.taxInclusive` as const)}
                          className="rounded text-blue-600"
                        />
                        <label htmlFor={`po-tax-${index}`} className="text-xs text-gray-600">
                          Tax Inc.
                        </label>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] text-gray-500 block">Total</span>
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

          {/* Notes */}
          <Card className="p-6 bg-white border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Purchase Order Notes / Instructions to Vendor
            </label>
            <textarea
              rows={2}
              placeholder="Add instructions or terms..."
              {...register('notes')}
              className="block w-full rounded-lg border border-gray-300 text-sm p-3 focus:outline-none focus:border-blue-500"
            />
          </Card>
        </div>

        {/* Right Col */}
        <div className="space-y-6">
          <Card className="p-6 bg-white border border-gray-200">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              PO Dates
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Order Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  {...register('orderDate')}
                  className="block w-full rounded-lg border border-gray-300 text-sm px-3.5 py-2.5 bg-white text-gray-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Expected Delivery Date
                </label>
                <input
                  type="date"
                  {...register('expectedDate')}
                  className="block w-full rounded-lg border border-gray-300 text-sm px-3.5 py-2.5 bg-white text-gray-900 focus:outline-none"
                />
              </div>
            </div>
          </Card>

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
              <div className="flex justify-between text-gray-600">
                <span>Total Tax:</span>
                <span>{formatCurrency(totals.totalTax)}</span>
              </div>
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
                onClick={handleSubmit((data) => onSubmit(data as PurchaseOrderFormData, 'confirmed'))}
                icon={<CheckCircle className="w-4 h-4" />}
              >
                Confirm Order
              </Button>
              <Button
                type="button"
                variant="outline"
                fullWidth
                disabled={createMutation.isPending}
                onClick={handleSubmit((data) => onSubmit(data as PurchaseOrderFormData, 'draft'))}
                icon={<Save className="w-4 h-4" />}
              >
                Save Draft
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {isSupplierModalOpen && (
        <SupplierFormModal
          isOpen={isSupplierModalOpen}
          onClose={() => setIsSupplierModalOpen(false)}
          onSuccessCallback={(newSupp: Supplier) => {
            setIsSupplierModalOpen(false)
            if (newSupp?._id) {
              handleSupplierSelect(newSupp._id)
            }
          }}
        />
      )}
    </div>
  )
}

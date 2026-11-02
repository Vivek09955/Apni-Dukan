import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Plus,
  Trash2,
  UserPlus,
  Building,
  Calendar,
  FileCheck,
  Save,
  HelpCircle,
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
import { createInvoice, issueInvoice } from '../../api/sales'
import { calculateLineItem, calculateInvoiceTotals } from '../../lib/gstCalculator'
import { formatCurrency, rupeesToPaise } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import type { Customer, Product } from '../../types'

interface InvoiceRowItem {
  id: string
  productId: string
  name: string
  hsnCode: string
  quantity: number
  unit: string
  rate: number // in rupees
  discountPercent: number
  taxRate: number
  taxInclusive: boolean
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Madhya Pradesh', 'Maharashtra',
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal'
]

export function InvoiceCreatePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { currentBusiness } = useAuthStore()

  // Form State
  const defaultState = currentBusiness?.state || 'Delhi'
  const [customerId, setCustomerId] = useState<string>(searchParams.get('customerId') || '')
  const [placeOfSupply, setPlaceOfSupply] = useState<string>(defaultState)
  const [invoiceDate, setInvoiceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0]
  })
  const [notes, setNotes] = useState<string>('')
  const [terms, setTerms] = useState<string>(
    '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged after due date.\n3. Subject to local jurisdiction only.'
  )
  const [showTerms, setShowTerms] = useState<boolean>(false)
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)

  // Items State
  const [items, setItems] = useState<InvoiceRowItem[]>([
    {
      id: 'item-1',
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
  ])

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

  // Selected Customer details
  const selectedCustomer = useMemo(
    () => customers.find((c) => c._id === customerId),
    [customers, customerId]
  )

  // Auto-set place of supply if customer changes and has state
  const handleCustomerChange = (id: string) => {
    setCustomerId(id)
    const cust = customers.find((c) => c._id === id)
    if (cust?.billingAddress?.state) {
      setPlaceOfSupply(cust.billingAddress.state)
    }
  }

  // Inter-state supply check
  const isInterState = useMemo(() => {
    if (!currentBusiness?.state || !placeOfSupply) return false
    return currentBusiness.state.trim().toLowerCase() !== placeOfSupply.trim().toLowerCase()
  }, [currentBusiness?.state, placeOfSupply])

  // Add Item Row
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
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
    ])
  }

  // Remove Item Row
  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      toast.error('Invoice must contain at least one item')
      return
    }
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  // Product Selection in Row
  const handleProductSelect = (index: number, prodId: string) => {
    const prod = products.find((p) => p._id === prodId)
    setItems((prev) => {
      const copy = [...prev]
      if (prod) {
        copy[index] = {
          ...copy[index],
          productId: prod._id,
          name: prod.name,
          hsnCode: prod.hsnCode || '',
          unit: prod.unit || 'PCS',
          rate: (prod.sellingPrice ?? 0) / 100,
          taxRate: prod.taxRate ?? 18,
          taxInclusive: Boolean(prod.taxInclusive),
        }
      } else {
        copy[index] = {
          ...copy[index],
          productId: '',
          name: '',
          rate: 0,
        }
      }
      return copy
    })
  }

  // Row update helper
  const updateRow = (index: number, field: keyof InvoiceRowItem, value: any) => {
    setItems((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  // Line Calculations
  const calculatedItems = useMemo(() => {
    return items.map((item) => {
      const ratePaise = rupeesToPaise(item.rate)
      const res = calculateLineItem({
        rate: ratePaise,
        quantity: Number(item.quantity) || 0,
        discountPercent: Number(item.discountPercent) || 0,
        taxRate: Number(item.taxRate) || 0,
        taxInclusive: item.taxInclusive,
        isInterState,
      })
      return { ...item, ...res }
    })
  }, [items, isInterState])

  // Total invoice calculations
  const totals = useMemo(() => {
    return calculateInvoiceTotals(calculatedItems)
  }, [calculatedItems])

  // Create Invoice Mutation
  const createMutation = useMutation({
    mutationFn: async ({ shouldIssue }: { shouldIssue: boolean }) => {
      if (!customerId) {
        throw new Error('Please select a customer or add a new customer')
      }

      if (items.some((i) => !i.name && !i.productId)) {
        throw new Error('Please enter a description or select a product for all rows')
      }

      if (items.some((i) => Number(i.quantity) <= 0)) {
        throw new Error('Quantity must be greater than zero for all items')
      }

      const invoiceItems = calculatedItems.map((item) => ({
        productId: item.productId || undefined,
        name: item.name || 'Custom Item',
        hsnCode: item.hsnCode || undefined,
        quantity: Number(item.quantity),
        unit: item.unit || 'PCS',
        rate: rupeesToPaise(item.rate),
        discount: item.discountAmount,
        discountPercent: Number(item.discountPercent) || 0,
        taxableAmount: item.taxableAmount,
        taxRate: Number(item.taxRate),
        cgstAmount: item.cgstAmount,
        sgstAmount: item.sgstAmount,
        igstAmount: item.igstAmount,
        totalAmount: item.totalAmount,
      }))

      const payload = {
        customerId,
        invoiceDate,
        dueDate: dueDate || undefined,
        placeOfSupply,
        isInterState,
        items: invoiceItems,
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
        notes: notes.trim() || undefined,
        termsAndConditions: terms.trim() || undefined,
        status: shouldIssue ? 'issued' : 'draft',
      }

      const res = await createInvoice(payload)
      const newInvoice = res.data?.invoice || res.data

      if (shouldIssue && newInvoice?._id) {
        try {
          await issueInvoice(newInvoice._id)
        } catch {
          // if already issued by payload, ignore
        }
      }

      return newInvoice
    },
    onSuccess: (data: any) => {
      toast.success('Invoice created successfully')
      queryClient.invalidateQueries({ queryKey: ['salesInvoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      if (data?._id) {
        navigate(`/sales/${data._id}`)
      } else {
        navigate('/sales')
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || 'Failed to create invoice')
    },
  })

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/sales"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Invoices</span>
        </Link>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => createMutation.mutate({ shouldIssue: false })}
            loading={createMutation.isPending}
            icon={<Save className="w-4 h-4" />}
          >
            Save as Draft
          </Button>
          <Button
            onClick={() => createMutation.mutate({ shouldIssue: true })}
            loading={createMutation.isPending}
            icon={<FileCheck className="w-4 h-4" />}
          >
            Save & Issue
          </Button>
        </div>
      </div>

      {/* Main Billing Form Card */}
      <Card className="border border-gray-200">
        <div className="border-b border-gray-100 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">New Sales Tax Invoice</h1>
            <p className="text-xs text-gray-500">
              Tax invoice compliant with GST rules and auto-ledger balancing
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Invoice Number:</span>
            <span className="font-mono text-xs bg-gray-100 px-2.5 py-1 rounded-md text-gray-700 font-semibold border border-gray-200">
              [Auto-Generated on Save]
            </span>
          </div>
        </div>

        {/* Customer & Document Meta */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Customer Selection */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Customer <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(true)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add Customer</span>
              </button>
            </div>

            <Select
              placeholder="Select or search customer..."
              options={customers.map((c) => ({
                value: c._id,
                label: `${c.name} ${c.phone ? `(${c.phone})` : ''}`,
              }))}
              value={customerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
            />

            {/* Selected Customer Card Preview */}
            {selectedCustomer && (
              <div className="bg-blue-50/50 p-3.5 rounded-lg border border-blue-100 text-xs text-gray-700 space-y-1">
                <div className="flex items-center justify-between font-semibold text-blue-900">
                  <span>{selectedCustomer.name}</span>
                  {selectedCustomer.gstin && (
                    <span className="font-mono bg-blue-100/60 px-1.5 py-0.5 rounded text-[10px]">
                      GSTIN: {selectedCustomer.gstin}
                    </span>
                  )}
                </div>
                {selectedCustomer.phone && <p>Phone: {selectedCustomer.phone}</p>}
                {selectedCustomer.billingAddress?.line1 && (
                  <p className="text-gray-600">
                    Address: {selectedCustomer.billingAddress.line1},{' '}
                    {selectedCustomer.billingAddress.city},{' '}
                    {selectedCustomer.billingAddress.state || ''}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Dates & Supply Place */}
          <div className="space-y-3.5 bg-gray-50/80 p-4 rounded-xl border border-gray-200/80">
            <Input
              label="Invoice Date"
              type="date"
              required
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />

            <Input
              label="Payment Due Date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Place of Supply
                </label>
                <Badge variant={isInterState ? 'info' : 'success'} className="text-[10px]">
                  {isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}
                </Badge>
              </div>
              <Select
                options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
                value={placeOfSupply}
                onChange={(e) => setPlaceOfSupply(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Invoice Items Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Line Items
            </h3>
            <span className="text-xs text-gray-500">
              Amounts auto-calculate with GST & discounts
            </span>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 uppercase border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 w-8">#</th>
                  <th className="px-3 py-3 min-w-[200px]">Item / Product</th>
                  <th className="px-2 py-3 w-20">HSN</th>
                  <th className="px-2 py-3 w-20">Qty</th>
                  <th className="px-2 py-3 w-16">Unit</th>
                  <th className="px-2 py-3 w-28">Rate (₹)</th>
                  <th className="px-2 py-3 w-20">Disc %</th>
                  <th className="px-2 py-3 w-24">Tax</th>
                  <th className="px-3 py-3 w-28 text-right">Taxable (₹)</th>
                  <th className="px-3 py-3 w-28 text-right">Total (₹)</th>
                  <th className="px-2 py-3 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {calculatedItems.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2 text-gray-400 font-mono">{index + 1}</td>

                    {/* Product Selection */}
                    <td className="px-3 py-2">
                      <select
                        className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={item.productId}
                        onChange={(e) => handleProductSelect(index, e.target.value)}
                      >
                        <option value="">-- Choose product or type below --</option>
                        {products.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name} {p.sku ? `[${p.sku}]` : ''} - ₹{(p.sellingPrice / 100).toFixed(2)}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Item name / specification"
                        value={item.name}
                        onChange={(e) => updateRow(index, 'name', e.target.value)}
                        className="w-full text-xs rounded border border-gray-200 py-1 px-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>

                    {/* HSN Code */}
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        placeholder="HSN"
                        value={item.hsnCode}
                        onChange={(e) => updateRow(index, 'hsnCode', e.target.value)}
                        className="w-full text-xs rounded border border-gray-300 py-1.5 px-2 text-center"
                      />
                    </td>

                    {/* Quantity */}
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => updateRow(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full text-xs rounded border border-gray-300 py-1.5 px-2 text-center font-medium"
                      />
                    </td>

                    {/* Unit */}
                    <td className="px-2 py-2">
                      <span className="text-gray-500 font-medium px-2 py-1 bg-gray-100 rounded text-[11px] block text-center">
                        {item.unit || 'PCS'}
                      </span>
                    </td>

                    {/* Rate (₹) */}
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => updateRow(index, 'rate', parseFloat(e.target.value) || 0)}
                        className="w-full text-xs rounded border border-gray-300 py-1.5 px-2 text-right font-medium"
                      />
                    </td>

                    {/* Discount % */}
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        value={item.discountPercent}
                        onChange={(e) =>
                          updateRow(index, 'discountPercent', parseFloat(e.target.value) || 0)
                        }
                        className="w-full text-xs rounded border border-gray-300 py-1.5 px-2 text-center"
                      />
                    </td>

                    {/* Tax Rate Select */}
                    <td className="px-2 py-2">
                      <select
                        value={item.taxRate}
                        onChange={(e) => updateRow(index, 'taxRate', parseFloat(e.target.value) || 0)}
                        className="w-full text-xs rounded border border-gray-300 py-1.5 px-1.5 bg-white text-center"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </td>

                    {/* Taxable Amount */}
                    <td className="px-3 py-2 text-right font-medium text-gray-700">
                      {formatCurrency(item.taxableAmount)}
                    </td>

                    {/* Total Amount */}
                    <td className="px-3 py-2 text-right font-bold text-gray-900">
                      {formatCurrency(item.totalAmount)}
                    </td>

                    {/* Delete Row Button */}
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            icon={<Plus className="w-4 h-4" />}
          >
            Add Another Item
          </Button>
        </div>

        {/* Bottom Section: Notes & Summary Totals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-gray-200 mt-6">
          {/* Notes and Terms */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Customer Notes / Remarks
              </label>
              <textarea
                rows={3}
                placeholder="Notes visible on the invoice, e.g. 'Thank you for your business!' or delivery details"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowTerms(!showTerms)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span>{showTerms ? '− Hide Terms & Conditions' : '+ Edit Terms & Conditions'}</span>
              </button>
              {showTerms && (
                <textarea
                  rows={4}
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="w-full text-xs rounded-lg border border-gray-300 p-2.5 mt-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              )}
            </div>
          </div>

          {/* Right-aligned Totals Box */}
          <div className="bg-gray-50/80 p-5 rounded-xl border border-gray-200/80 space-y-2.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal (Gross):</span>
              <span className="font-medium text-gray-900">{formatCurrency(totals.subtotal)}</span>
            </div>

            {totals.totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Total Discount:</span>
                <span className="font-medium">− {formatCurrency(totals.totalDiscount)}</span>
              </div>
            )}

            <div className="flex justify-between text-gray-600">
              <span>Taxable Value:</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(totals.taxableAmount)}
              </span>
            </div>

            {/* GST breakdown */}
            {!isInterState ? (
              <>
                <div className="flex justify-between text-xs text-gray-500 pl-2">
                  <span>Central GST (CGST):</span>
                  <span>{formatCurrency(totals.totalCgst)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 pl-2">
                  <span>State GST (SGST):</span>
                  <span>{formatCurrency(totals.totalSgst)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-xs text-gray-500 pl-2">
                <span>Integrated GST (IGST):</span>
                <span>{formatCurrency(totals.totalIgst)}</span>
              </div>
            )}

            <div className="flex justify-between text-gray-600">
              <span>Total Tax:</span>
              <span className="font-medium text-gray-900">{formatCurrency(totals.totalTax)}</span>
            </div>

            {totals.roundOff !== 0 && (
              <div className="flex justify-between text-xs text-gray-500">
                <span>Round Off:</span>
                <span>{formatCurrency(totals.roundOff)}</span>
              </div>
            )}

            <div className="pt-3 border-t border-gray-200 flex justify-between items-baseline">
              <span className="text-base font-bold text-gray-900">Final Invoice Amount:</span>
              <span className="text-2xl font-extrabold text-blue-600">
                {formatCurrency(totals.finalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-6">
          <Button
            variant="outline"
            onClick={() => navigate('/sales')}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={() => createMutation.mutate({ shouldIssue: false })}
            loading={createMutation.isPending}
          >
            Save as Draft
          </Button>
          <Button
            onClick={() => createMutation.mutate({ shouldIssue: true })}
            loading={createMutation.isPending}
            icon={<FileCheck className="w-4 h-4" />}
          >
            Save & Issue Invoice
          </Button>
        </div>
      </Card>

      {/* Customer Create Modal */}
      <CustomerFormModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSuccessCallback={(newCust) => {
          if (newCust?._id) {
            handleCustomerChange(newCust._id)
          }
        }}
      />
    </div>
  )
}

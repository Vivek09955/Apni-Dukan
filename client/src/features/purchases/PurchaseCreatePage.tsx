import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Plus,
  Trash2,
  UserPlus,
  Save,
  CheckCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { SupplierFormModal } from '../suppliers/SupplierFormModal'
import { getSuppliers } from '../../api/suppliers'
import { getProducts } from '../../api/products'
import { createPurchaseBill } from '../../api/purchases'
import { calculateLineItem, calculateInvoiceTotals } from '../../lib/gstCalculator'
import { formatCurrency, rupeesToPaise } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import type { Supplier, Product } from '../../types'

interface PurchaseRowItem {
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

export function PurchaseCreatePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { currentBusiness } = useAuthStore()

  const defaultState = currentBusiness?.state || 'Delhi'
  const [supplierId, setSupplierId] = useState<string>(searchParams.get('supplierId') || '')
  const [billNumber, setBillNumber] = useState<string>('')
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState<string>('')
  const [billDate, setBillDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0]
  })
  const [placeOfSupply, setPlaceOfSupply] = useState<string>(defaultState)
  const [notes, setNotes] = useState<string>('')
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false)

  // Items State
  const [items, setItems] = useState<PurchaseRowItem[]>([
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
    () => suppliers.find((s) => s._id === supplierId),
    [suppliers, supplierId]
  )

  const handleSupplierChange = (id: string) => {
    setSupplierId(id)
    const sup = suppliers.find((s) => s._id === id)
    if (sup?.address?.state) {
      setPlaceOfSupply(sup.address.state)
    }
  }

  const isInterState = useMemo(() => {
    if (!currentBusiness?.state || !placeOfSupply) return false
    return currentBusiness.state.trim().toLowerCase() !== placeOfSupply.trim().toLowerCase()
  }, [currentBusiness?.state, placeOfSupply])

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

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      toast.error('Bill must contain at least one item')
      return
    }
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const handleProductSelect = (index: number, prodId: string) => {
    const prod = products.find((p) => p._id === prodId)
    setItems((prev) => {
      const copy = [...prev]
      if (prod) {
        const pRate = (prod.purchasePrice ?? 0) > 0 ? prod.purchasePrice / 100 : (prod.sellingPrice ?? 0) / 100
        copy[index] = {
          ...copy[index],
          productId: prod._id,
          name: prod.name,
          hsnCode: prod.hsnCode || '',
          unit: prod.unit || 'PCS',
          rate: pRate,
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

  const updateRow = (index: number, field: keyof PurchaseRowItem, value: any) => {
    setItems((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

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

  const totals = useMemo(() => {
    return calculateInvoiceTotals(calculatedItems)
  }, [calculatedItems])

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!supplierId) {
        throw new Error('Please select a supplier or add a new supplier')
      }

      if (items.some((i) => !i.name && !i.productId)) {
        throw new Error('Please select a product or enter item names for all rows')
      }

      if (items.some((i) => Number(i.quantity) <= 0)) {
        throw new Error('Quantity must be greater than zero for all items')
      }

      const billItems = calculatedItems.map((item) => ({
        productId: item.productId || undefined,
        name: item.name || 'Procurement Item',
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
        supplierId,
        billNumber: billNumber.trim() || undefined,
        supplierInvoiceNumber: supplierInvoiceNumber.trim() || undefined,
        billDate,
        dueDate: dueDate || undefined,
        placeOfSupply,
        isInterState,
        items: billItems,
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
        status: 'received',
      }

      const res = await createPurchaseBill(payload)
      return res.data?.bill || res.data
    },
    onSuccess: (data: any) => {
      toast.success('Purchase bill recorded successfully')
      queryClient.invalidateQueries({ queryKey: ['purchaseBills'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      if (data?._id) {
        navigate(`/purchases/${data._id}`)
      } else {
        navigate('/purchases')
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || 'Failed to record bill')
    },
  })

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <Link
          to="/purchases"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Purchase Bills</span>
        </Link>
        <Button
          onClick={() => createMutation.mutate()}
          loading={createMutation.isPending}
          icon={<Save className="w-4 h-4" />}
        >
          Save Purchase Bill
        </Button>
      </div>

      <Card className="border border-gray-200">
        <div className="border-b border-gray-100 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Record Vendor Purchase Bill</h1>
            <p className="text-xs text-gray-500">
              Procurement entry with automated inventory replenishment & ITC tracking
            </p>
          </div>
          <Badge variant="info">Inward Procurement</Badge>
        </div>

        {/* Supplier & Meta Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Supplier Select */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Supplier / Vendor <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(true)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add Supplier</span>
              </button>
            </div>

            <Select
              placeholder="Select vendor..."
              options={suppliers.map((s) => ({
                value: s._id,
                label: `${s.name} ${s.phone ? `(${s.phone})` : ''}`,
              }))}
              value={supplierId}
              onChange={(e) => handleSupplierChange(e.target.value)}
            />

            {selectedSupplier && (
              <div className="bg-emerald-50/50 p-3.5 rounded-lg border border-emerald-100 text-xs text-gray-700 space-y-1">
                <div className="flex items-center justify-between font-semibold text-emerald-900">
                  <span>{selectedSupplier.name}</span>
                  {selectedSupplier.gstin && (
                    <span className="font-mono bg-emerald-100/60 px-1.5 py-0.5 rounded text-[10px]">
                      GSTIN: {selectedSupplier.gstin}
                    </span>
                  )}
                </div>
                {selectedSupplier.phone && <p>Phone: {selectedSupplier.phone}</p>}
                {selectedSupplier.address?.line1 && (
                  <p className="text-gray-600">
                    Address: {selectedSupplier.address.line1}, {selectedSupplier.address.city},{' '}
                    {selectedSupplier.address.state || ''}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Input
                label="Vendor Bill Number"
                placeholder="e.g. INV-98214"
                helperText="Invoice number printed on supplier's bill"
                value={supplierInvoiceNumber}
                onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
              />
              <Input
                label="Internal Bill Reference #"
                placeholder="Auto-generated if left blank"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Dates & Supply Place */}
          <div className="space-y-3.5 bg-gray-50/80 p-4 rounded-xl border border-gray-200/80">
            <Input
              label="Bill Date"
              type="date"
              required
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
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

        {/* Line Items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Procured Items
            </h3>
            <span className="text-xs text-gray-500">
              Stock will be added to products upon saving
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
                    <td className="px-3 py-2">
                      <select
                        className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={item.productId}
                        onChange={(e) => handleProductSelect(index, e.target.value)}
                      >
                        <option value="">-- Select Product or Type Below --</option>
                        {products.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name} {p.sku ? `[${p.sku}]` : ''}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Item name / raw material"
                        value={item.name}
                        onChange={(e) => updateRow(index, 'name', e.target.value)}
                        className="w-full text-xs rounded border border-gray-200 py-1 px-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        placeholder="HSN"
                        value={item.hsnCode}
                        onChange={(e) => updateRow(index, 'hsnCode', e.target.value)}
                        className="w-full text-xs rounded border border-gray-300 py-1.5 px-2 text-center"
                      />
                    </td>
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
                    <td className="px-2 py-2">
                      <span className="text-gray-500 font-medium px-2 py-1 bg-gray-100 rounded text-[11px] block text-center">
                        {item.unit || 'PCS'}
                      </span>
                    </td>
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
                    <td className="px-3 py-2 text-right font-medium text-gray-700">
                      {formatCurrency(item.taxableAmount)}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-gray-900">
                      {formatCurrency(item.totalAmount)}
                    </td>
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

        {/* Totals & Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-gray-200 mt-6">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Purchase Notes & Logistics Info
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Transport details, LR number, receiving warehouse..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

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
              <span>Taxable Purchase Value:</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(totals.taxableAmount)}
              </span>
            </div>

            {!isInterState ? (
              <>
                <div className="flex justify-between text-xs text-gray-500 pl-2">
                  <span>Input CGST:</span>
                  <span>{formatCurrency(totals.totalCgst)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 pl-2">
                  <span>Input SGST:</span>
                  <span>{formatCurrency(totals.totalSgst)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-xs text-gray-500 pl-2">
                <span>Input IGST:</span>
                <span>{formatCurrency(totals.totalIgst)}</span>
              </div>
            )}

            <div className="flex justify-between text-gray-600">
              <span>Total Input Tax Credit (ITC):</span>
              <span className="font-medium text-gray-900">{formatCurrency(totals.totalTax)}</span>
            </div>

            {totals.roundOff !== 0 && (
              <div className="flex justify-between text-xs text-gray-500">
                <span>Round Off:</span>
                <span>{formatCurrency(totals.roundOff)}</span>
              </div>
            )}

            <div className="pt-3 border-t border-gray-200 flex justify-between items-baseline">
              <span className="text-base font-bold text-gray-900">Total Bill Payable:</span>
              <span className="text-2xl font-extrabold text-emerald-600">
                {formatCurrency(totals.finalAmount)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-6">
          <Button
            variant="outline"
            onClick={() => navigate('/purchases')}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            loading={createMutation.isPending}
            icon={<Save className="w-4 h-4" />}
          >
            Save Purchase Bill
          </Button>
        </div>
      </Card>

      <SupplierFormModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSuccessCallback={(newSup) => {
          if (newSup?._id) {
            handleSupplierChange(newSup._id)
          }
        }}
      />
    </div>
  )
}

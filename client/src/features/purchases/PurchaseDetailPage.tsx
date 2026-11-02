import { useState, useEffect } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Printer,
  Ban,
  Building,
  Calendar,
  FileText,
  DollarSign,
  Download,
  Truck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { getPurchaseBill, cancelPurchaseBill } from '../../api/purchases'
import { formatCurrency, formatDate, getStatusColor } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import type { PurchaseBill } from '../../types'

export function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { currentBusiness } = useAuthStore()

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['purchaseBill', id],
    queryFn: () => getPurchaseBill(id!),
    enabled: Boolean(id),
  })

  const bill: PurchaseBill | null = data?.data?.bill || data?.data || null

  useEffect(() => {
    if (searchParams.get('print') === 'true' && bill) {
      setTimeout(() => {
        window.print()
      }, 500)
    }
  }, [searchParams, bill])

  const cancelMutation = useMutation({
    mutationFn: () => cancelPurchaseBill(id!, 'Cancelled by user'),
    onSuccess: () => {
      toast.success('Purchase bill cancelled')
      queryClient.invalidateQueries({ queryKey: ['purchaseBill', id] })
      queryClient.invalidateQueries({ queryKey: ['purchaseBills'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setIsCancelDialogOpen(false)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to cancel purchase bill')
    },
  })

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500">Loading purchase bill details...</p>
      </div>
    )
  }

  if (isError || !bill) {
    return (
      <div className="text-center py-20 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Purchase bill not found</h3>
        <Link to="/purchases">
          <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>
            Back to Purchase Bills
          </Button>
        </Link>
      </div>
    )
  }

  const supplier = typeof bill.supplierId === 'object' ? bill.supplierId : null

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top action bar */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/purchases"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Purchase Bills</span>
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => window.print()}
            icon={<Printer className="w-4 h-4" />}
          >
            Print
          </Button>

          <Button
            variant="outline"
            onClick={() => window.print()}
            icon={<Download className="w-4 h-4" />}
          >
            Download PDF
          </Button>

          {bill.status !== 'cancelled' && (
            <Button
              variant="danger"
              onClick={() => setIsCancelDialogOpen(true)}
              icon={<Ban className="w-4 h-4" />}
            >
              Cancel Bill
            </Button>
          )}
        </div>
      </div>

      {/* Bill Container */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-8 shadow-sm print:p-0 print:border-none print:shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-gray-200 pb-6 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                PURCHASE BILL
              </h1>
              <Badge variant={getStatusColor(bill.status)} className="text-xs">
                {bill.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <p className="font-mono text-sm text-emerald-600 font-bold">
              Bill #{bill.billNumber}
            </p>
            {bill.supplierInvoiceNumber && (
              <p className="font-mono text-xs text-gray-500 mt-0.5">
                Vendor Ref: {bill.supplierInvoiceNumber}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Place of Supply: {bill.placeOfSupply}{' '}
              {bill.isInterState ? '(Inter-State)' : '(Intra-State)'}
            </p>
          </div>

          <div className="text-right">
            <h2 className="text-lg font-bold text-gray-900">
              {currentBusiness?.name || 'Apni Dukan'}
            </h2>
            {currentBusiness?.gstin && (
              <p className="font-mono text-xs text-gray-600">GSTIN: {currentBusiness.gstin}</p>
            )}
            {currentBusiness?.address?.line1 && (
              <p className="text-xs text-gray-500">
                {currentBusiness.address.line1}, {currentBusiness.address.city}
              </p>
            )}
          </div>
        </div>

        {/* Supplier details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-gray-200">
          <div>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
              Vendor / Supplier
            </span>
            <h3 className="text-base font-bold text-gray-900">
              {supplier?.name || 'General Supplier'}
            </h3>
            {supplier?.gstin && (
              <p className="font-mono text-xs text-gray-700 mt-0.5">GSTIN: {supplier.gstin}</p>
            )}
            {supplier?.phone && (
              <p className="text-xs text-gray-600 mt-0.5">Phone: {supplier.phone}</p>
            )}
            {supplier?.address?.line1 && (
              <p className="text-xs text-gray-500 mt-0.5">
                {supplier.address.line1}, {supplier.address.city}, {supplier.address.state || ''}
              </p>
            )}
          </div>

          <div className="sm:text-right space-y-1 text-xs">
            <div>
              <span className="text-gray-500">Bill Date: </span>
              <span className="font-semibold text-gray-800">
                {formatDate(bill.billDate || bill.createdAt)}
              </span>
            </div>
            {bill.dueDate && (
              <div>
                <span className="text-gray-500">Payment Due: </span>
                <span className="font-semibold text-gray-800">{formatDate(bill.dueDate)}</span>
              </div>
            )}
            <div>
              <span className="text-gray-500">Liability: </span>
              <span className="font-semibold text-gray-800">
                {bill.balanceDue <= 0 ? 'Fully Settled' : `Pending: ${formatCurrency(bill.balanceDue)}`}
              </span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="py-6 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 uppercase border-y border-gray-200">
              <tr>
                <th className="py-3 px-3 w-8">#</th>
                <th className="py-3 px-3">Item Description</th>
                <th className="py-3 px-2 text-center">HSN</th>
                <th className="py-3 px-2 text-center">Qty</th>
                <th className="py-3 px-3 text-right">Rate</th>
                <th className="py-3 px-2 text-center">Disc</th>
                <th className="py-3 px-3 text-right">Taxable</th>
                <th className="py-3 px-2 text-center">GST</th>
                <th className="py-3 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bill.items?.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50/50">
                  <td className="py-3 px-3 text-gray-400 font-mono">{index + 1}</td>
                  <td className="py-3 px-3 font-semibold text-gray-900">{item.name}</td>
                  <td className="py-3 px-2 text-center text-gray-500 font-mono">
                    {item.hsnCode || '-'}
                  </td>
                  <td className="py-3 px-2 text-center font-medium">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="py-3 px-3 text-right">{formatCurrency(item.rate)}</td>
                  <td className="py-3 px-2 text-center text-gray-500">
                    {item.discountPercent ? `${item.discountPercent}%` : '-'}
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-gray-700">
                    {formatCurrency(item.taxableAmount)}
                  </td>
                  <td className="py-3 px-2 text-center text-emerald-700 font-medium">
                    {item.taxRate}%
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-gray-900">
                    {formatCurrency(item.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-600">
            {bill.notes && (
              <div>
                <span className="font-semibold text-gray-800 block mb-0.5">Remarks:</span>
                <p className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">{bill.notes}</p>
              </div>
            )}
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Gross Subtotal:</span>
              <span className="font-medium text-gray-900">{formatCurrency(bill.subtotal)}</span>
            </div>

            {bill.totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Total Discount:</span>
                <span className="font-medium">− {formatCurrency(bill.totalDiscount)}</span>
              </div>
            )}

            <div className="flex justify-between text-gray-600">
              <span>Taxable Purchase Value:</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(bill.taxableAmount)}
              </span>
            </div>

            {!bill.isInterState ? (
              <>
                <div className="flex justify-between text-gray-500 pl-2">
                  <span>Input CGST:</span>
                  <span>{formatCurrency(bill.totalCgst)}</span>
                </div>
                <div className="flex justify-between text-gray-500 pl-2">
                  <span>Input SGST:</span>
                  <span>{formatCurrency(bill.totalSgst)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-gray-500 pl-2">
                <span>Input IGST:</span>
                <span>{formatCurrency(bill.totalIgst)}</span>
              </div>
            )}

            <div className="flex justify-between text-gray-600">
              <span>Total Input Tax Credit (ITC):</span>
              <span className="font-medium text-gray-900">{formatCurrency(bill.totalTax)}</span>
            </div>

            {bill.roundOff !== 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Round Off:</span>
                <span>{formatCurrency(bill.roundOff)}</span>
              </div>
            )}

            <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline text-sm">
              <span className="font-bold text-gray-900">Grand Total Payable:</span>
              <span className="text-xl font-extrabold text-emerald-600">
                {formatCurrency(bill.finalAmount)}
              </span>
            </div>

            <div className="flex justify-between text-blue-600 pt-1">
              <span>Amount Paid:</span>
              <span className="font-semibold">{formatCurrency(bill.paidAmount || 0)}</span>
            </div>

            <div className="flex justify-between font-bold text-rose-600">
              <span>Balance Liability Due:</span>
              <span>{formatCurrency(bill.balanceDue ?? 0)}</span>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isCancelDialogOpen}
        onClose={() => setIsCancelDialogOpen(false)}
        onConfirm={() => cancelMutation.mutate()}
        title="Cancel Purchase Bill"
        message={`Are you sure you want to cancel bill #${bill.billNumber}? Stock entries will be reversed.`}
        confirmText="Cancel Bill"
        variant="danger"
        loading={cancelMutation.isPending}
      />
    </div>
  )
}

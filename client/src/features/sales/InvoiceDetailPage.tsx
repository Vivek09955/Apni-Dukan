import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Printer,
  Ban,
  CheckCircle,
  Building,
  Calendar,
  FileText,
  DollarSign,
  Download,
  Receipt,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { InvoicePDF } from './InvoicePDF'
import { ThermalReceipt } from './ThermalReceipt'
import { getInvoice, cancelInvoice, issueInvoice } from '../../api/sales'
import { formatCurrency, formatDate, getStatusColor } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import type { SalesInvoice } from '../../types'

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { currentBusiness } = useAuthStore()

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [showPrintView, setShowPrintView] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['salesInvoice', id],
    queryFn: () => getInvoice(id!),
    enabled: Boolean(id),
  })

  const invoice: SalesInvoice | null = data?.data?.invoice || data?.data || null

  // Auto-trigger print if query param print=true
  useEffect(() => {
    if (searchParams.get('print') === 'true' && invoice) {
      setTimeout(() => {
        window.print()
      }, 500)
    }
  }, [searchParams, invoice])

  const cancelMutation = useMutation({
    mutationFn: () => cancelInvoice(id!, 'Cancelled by user'),
    onSuccess: () => {
      toast.success('Invoice cancelled')
      queryClient.invalidateQueries({ queryKey: ['salesInvoice', id] })
      queryClient.invalidateQueries({ queryKey: ['salesInvoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setIsCancelDialogOpen(false)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to cancel invoice')
    },
  })

  const issueMutation = useMutation({
    mutationFn: () => issueInvoice(id!),
    onSuccess: () => {
      toast.success('Invoice issued successfully')
      queryClient.invalidateQueries({ queryKey: ['salesInvoice', id] })
      queryClient.invalidateQueries({ queryKey: ['salesInvoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to issue invoice')
    },
  })

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500">Loading invoice details...</p>
      </div>
    )
  }

  if (isError || !invoice) {
    return (
      <div className="text-center py-20 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Invoice not found</h3>
        <Link to="/sales">
          <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>
            Back to Sales
          </Button>
        </Link>
      </div>
    )
  }

  const customer = typeof invoice.customerId === 'object' ? invoice.customerId : null

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top action bar (hidden during print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/sales"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Invoices</span>
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          {invoice.status === 'draft' && (
            <Button
              variant="outline"
              onClick={() => issueMutation.mutate()}
              loading={issueMutation.isPending}
              icon={<CheckCircle className="w-4 h-4 text-blue-600" />}
            >
              Issue Invoice
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => setShowPrintView(!showPrintView)}
            icon={<Printer className="w-4 h-4" />}
          >
            {showPrintView ? 'Hide Print View' : 'Print / PDF'}
          </Button>

          {invoice.status !== 'cancelled' && (
            <Button
              variant="danger"
              onClick={() => setIsCancelDialogOpen(true)}
              icon={<Ban className="w-4 h-4" />}
            >
              Cancel Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Printable Invoice Container */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-8 shadow-sm print:p-0 print:border-none print:shadow-none">
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-gray-200 pb-6 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">TAX INVOICE</h1>
              <Badge variant={getStatusColor(invoice.status)} className="text-xs">
                {invoice.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <p className="font-mono text-sm text-blue-600 font-bold">
              Invoice #{invoice.invoiceNumber}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Place of Supply: {invoice.placeOfSupply}{' '}
              {invoice.isInterState ? '(Inter-State)' : '(Intra-State)'}
            </p>
          </div>

          <div className="text-right sm:text-right">
            <h2 className="text-lg font-bold text-gray-900">{currentBusiness?.name || 'Apni Dukan'}</h2>
            {currentBusiness?.gstin && (
              <p className="font-mono text-xs text-gray-600">GSTIN: {currentBusiness.gstin}</p>
            )}
            {currentBusiness?.address?.line1 && (
              <p className="text-xs text-gray-500">
                {currentBusiness.address.line1}, {currentBusiness.address.city}
              </p>
            )}
            {currentBusiness?.phone && (
              <p className="text-xs text-gray-500">Phone: {currentBusiness.phone}</p>
            )}
            {currentBusiness?.email && (
              <p className="text-xs text-gray-500">Email: {currentBusiness.email}</p>
            )}
          </div>
        </div>

        {/* Customer & Invoice Meta Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-gray-200">
          <div>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
              Billed To
            </span>
            <h3 className="text-base font-bold text-gray-900">
              {customer?.name || 'Cash Customer'}
            </h3>
            {customer?.gstin && (
              <p className="font-mono text-xs text-gray-700 mt-0.5">GSTIN: {customer.gstin}</p>
            )}
            {customer?.phone && (
              <p className="text-xs text-gray-600 mt-0.5">Phone: {customer.phone}</p>
            )}
            {customer?.billingAddress?.line1 && (
              <p className="text-xs text-gray-500 mt-0.5">
                {customer.billingAddress.line1}, {customer.billingAddress.city},{' '}
                {customer.billingAddress.state || ''} {customer.billingAddress.pincode || ''}
              </p>
            )}
          </div>

          <div className="sm:text-right space-y-1 text-xs">
            <div>
              <span className="text-gray-500">Invoice Date: </span>
              <span className="font-semibold text-gray-800">
                {formatDate(invoice.invoiceDate || invoice.createdAt)}
              </span>
            </div>
            {invoice.dueDate && (
              <div>
                <span className="text-gray-500">Due Date: </span>
                <span className="font-semibold text-gray-800">{formatDate(invoice.dueDate)}</span>
              </div>
            )}
            <div>
              <span className="text-gray-500">Payment Status: </span>
              <span className="font-semibold text-gray-800">
                {invoice.balanceDue <= 0 ? 'Full Paid' : `Due: ${formatCurrency(invoice.balanceDue)}`}
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
              {invoice.items?.map((item, index) => {
                const taxRateText = `${item.taxRate}%`
                return (
                  <tr key={index} className="hover:bg-gray-50/50">
                    <td className="py-3 px-3 text-gray-400 font-mono">{index + 1}</td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-gray-900 block">{item.name}</span>
                    </td>
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
                    <td className="py-3 px-2 text-center">
                      <span className="text-[11px] font-medium text-blue-700">
                        {taxRateText}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-gray-900">
                      {formatCurrency(item.totalAmount)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Totals & Tax Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 border-t border-gray-200">
          {/* Notes & Terms */}
          <div className="space-y-4 text-xs text-gray-600">
            {invoice.notes && (
              <div>
                <span className="font-semibold text-gray-800 block mb-0.5">Customer Notes:</span>
                <p className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">{invoice.notes}</p>
              </div>
            )}
            {invoice.termsAndConditions && (
              <div>
                <span className="font-semibold text-gray-800 block mb-0.5">
                  Terms & Conditions:
                </span>
                <p className="whitespace-pre-line text-[11px] text-gray-500">
                  {invoice.termsAndConditions}
                </p>
              </div>
            )}
          </div>

          {/* Right Totals */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-medium text-gray-900">{formatCurrency(invoice.subtotal)}</span>
            </div>

            {invoice.totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Total Discount:</span>
                <span className="font-medium">− {formatCurrency(invoice.totalDiscount)}</span>
              </div>
            )}

            <div className="flex justify-between text-gray-600">
              <span>Taxable Value:</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(invoice.taxableAmount)}
              </span>
            </div>

            {!invoice.isInterState ? (
              <>
                <div className="flex justify-between text-gray-500 pl-2">
                  <span>Central GST (CGST):</span>
                  <span>{formatCurrency(invoice.totalCgst)}</span>
                </div>
                <div className="flex justify-between text-gray-500 pl-2">
                  <span>State GST (SGST):</span>
                  <span>{formatCurrency(invoice.totalSgst)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-gray-500 pl-2">
                <span>Integrated GST (IGST):</span>
                <span>{formatCurrency(invoice.totalIgst)}</span>
              </div>
            )}

            <div className="flex justify-between text-gray-600">
              <span>Total Tax:</span>
              <span className="font-medium text-gray-900">{formatCurrency(invoice.totalTax)}</span>
            </div>

            {invoice.roundOff !== 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Round Off:</span>
                <span>{formatCurrency(invoice.roundOff)}</span>
              </div>
            )}

            <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline text-sm">
              <span className="font-bold text-gray-900">Final Total:</span>
              <span className="text-xl font-extrabold text-blue-600">
                {formatCurrency(invoice.finalAmount)}
              </span>
            </div>

            <div className="flex justify-between text-emerald-600 pt-1">
              <span>Amount Paid:</span>
              <span className="font-semibold">{formatCurrency(invoice.paidAmount || 0)}</span>
            </div>

            <div className="flex justify-between font-bold text-rose-600">
              <span>Balance Due:</span>
              <span>{formatCurrency(invoice.balanceDue ?? 0)}</span>
            </div>
          </div>
        </div>

        {/* Invoice Footer Signature Block */}
        <div className="mt-16 pt-8 border-t border-gray-200 flex justify-between items-end text-xs text-gray-500">
          <div>
            <p>Thank you for your business!</p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              This is a computer generated tax invoice.
            </p>
          </div>
          <div className="text-right">
            <p className="font-medium text-gray-800">For {currentBusiness?.name || 'Apni Dukan'}</p>
            <div className="h-12"></div>
            <p className="border-t border-gray-300 pt-1">Authorized Signatory</p>
          </div>
        </div>
      </div>

      {/* Print View - Invoice PDF & Thermal Receipt */}
      {showPrintView && (
        <div className="print:hidden space-y-6">
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-600" />
              Print Options
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <ThermalReceipt invoice={invoice} business={currentBusiness} />
            </div>
          </Card>
          <InvoicePDF invoice={invoice} business={currentBusiness} />
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isCancelDialogOpen}
        onClose={() => setIsCancelDialogOpen(false)}
        onConfirm={() => cancelMutation.mutate()}
        title="Cancel Invoice"
        message={`Are you sure you want to cancel invoice #${invoice.invoiceNumber}? This will mark it cancelled and restore inventory.`}
        confirmText="Cancel Invoice"
        variant="danger"
        loading={cancelMutation.isPending}
      />
    </div>
  )
}

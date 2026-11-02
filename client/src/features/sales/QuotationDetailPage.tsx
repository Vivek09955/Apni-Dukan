import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Printer,
  FileCheck,
  Building,
  Calendar,
  Clock,
  ExternalLink,
  Check,
  X,
  FileText,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { getQuotation, convertToInvoice, updateQuotationStatus } from '../../api/quotations'
import { formatCurrency, formatDate, getStatusColor } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import type { Quotation } from '../../types'

export function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentBusiness } = useAuthStore()

  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => getQuotation(id!),
    enabled: Boolean(id),
  })

  const quotation: Quotation | null = data?.data?.quotation || (data?.data as any) || null

  // Auto-trigger print
  useEffect(() => {
    if (searchParams.get('print') === 'true' && quotation) {
      setTimeout(() => {
        window.print()
      }, 500)
    }
  }, [searchParams, quotation])

  const convertMutation = useMutation({
    mutationFn: () => convertToInvoice(id!),
    onSuccess: (res) => {
      toast.success('Quotation converted to Sales Invoice!')
      queryClient.invalidateQueries({ queryKey: ['quotation', id] })
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      queryClient.invalidateQueries({ queryKey: ['salesInvoices'] })
      setIsConvertDialogOpen(false)
      const invoiceId = res?.data?.invoiceId
      if (invoiceId) {
        navigate(`/sales/${invoiceId}`)
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to convert quotation')
    },
  })

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => updateQuotationStatus(id!, newStatus),
    onSuccess: (_, newStatus) => {
      toast.success(`Quotation marked as ${newStatus}`)
      queryClient.invalidateQueries({ queryKey: ['quotation', id] })
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update quotation status')
    },
  })

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500">Loading quotation details...</p>
      </div>
    )
  }

  if (isError || !quotation) {
    return (
      <div className="text-center py-20 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Quotation not found</h3>
        <Link to="/sales/quotations">
          <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>
            Back to Quotations
          </Button>
        </Link>
      </div>
    )
  }

  const customer = typeof quotation.customerId === 'object' ? quotation.customerId : null
  const canConvert = quotation.status === 'accepted' || quotation.status === 'sent' || quotation.status === 'draft'

  return (
    <div className="space-y-6 pb-12">
      {/* Header / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link to="/sales/quotations">
            <Button variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                {quotation.quotationNumber}
              </h1>
              <Badge variant={getStatusColor(quotation.status)} className="capitalize">
                {quotation.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Created on {formatDate(quotation.quotationDate || quotation.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {quotation.status === 'sent' && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                onClick={() => statusMutation.mutate('accepted')}
                icon={<Check className="w-4 h-4" />}
                disabled={statusMutation.isPending}
              >
                Mark Accepted
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-700 border-red-300 hover:bg-red-50"
                onClick={() => statusMutation.mutate('rejected')}
                icon={<X className="w-4 h-4" />}
                disabled={statusMutation.isPending}
              >
                Mark Rejected
              </Button>
            </>
          )}

          {quotation.status === 'converted' && quotation.convertedToInvoice && (
            <Link to={`/sales/${quotation.convertedToInvoice}`}>
              <Button
                variant="outline"
                size="sm"
                className="text-blue-700 border-blue-300 hover:bg-blue-50"
                icon={<ExternalLink className="w-4 h-4" />}
              >
                View Invoice
              </Button>
            </Link>
          )}

          {canConvert && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsConvertDialogOpen(true)}
              icon={<FileCheck className="w-4 h-4" />}
            >
              Convert to Invoice
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            icon={<Printer className="w-4 h-4" />}
          >
            Print
          </Button>
        </div>
      </div>

      {/* Linked Invoice Banner */}
      {quotation.status === 'converted' && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-medium">
              This quotation has been converted to an active Sales Invoice.
            </span>
          </div>
          {quotation.convertedToInvoice && (
            <Link
              to={`/sales/${quotation.convertedToInvoice}`}
              className="text-sm font-semibold text-emerald-700 hover:underline flex items-center gap-1"
            >
              Go to Invoice <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}

      {/* Printable Quotation Sheet */}
      <Card className="p-8 bg-white border border-gray-200 shadow-sm print:border-none print:shadow-none print:p-0">
        {/* Top Business & Quote Info */}
        <div className="border-b border-gray-200 pb-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {currentBusiness?.name || 'Apni Dukan'}
              </h2>
              {currentBusiness?.gstin && (
                <p className="text-xs text-gray-600 mt-1 font-mono">
                  GSTIN: {currentBusiness.gstin}
                </p>
              )}
              {currentBusiness?.phone && (
                <p className="text-xs text-gray-500">Phone: {currentBusiness.phone}</p>
              )}
              {currentBusiness?.email && (
                <p className="text-xs text-gray-500">Email: {currentBusiness.email}</p>
              )}
              {currentBusiness?.state && (
                <p className="text-xs text-gray-500">State: {currentBusiness.state}</p>
              )}
            </div>

            <div className="sm:text-right">
              <span className="inline-block px-3 py-1 rounded bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
                Quotation / Estimate
              </span>
              <p className="text-lg font-bold text-gray-900">{quotation.quotationNumber}</p>
              <p className="text-xs text-gray-500 mt-1">
                Date: {formatDate(quotation.quotationDate || quotation.createdAt)}
              </p>
              {quotation.validUntil && (
                <p className="text-xs text-amber-700 font-medium mt-0.5">
                  Valid Until: {formatDate(quotation.validUntil)}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-0.5">
                Place of Supply: {quotation.placeOfSupply}
              </p>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 mb-6 border-b border-gray-200">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Estimate For:
            </p>
            <p className="text-base font-bold text-gray-900">
              {customer?.name || (typeof quotation.customerId === 'string' ? quotation.customerId : 'Unknown Customer')}
            </p>
            {customer?.gstin && (
              <p className="text-xs text-gray-600 font-mono mt-0.5">
                GSTIN: {customer.gstin}
              </p>
            )}
            {customer?.phone && (
              <p className="text-xs text-gray-500 mt-0.5">Phone: {customer.phone}</p>
            )}
            {customer?.email && (
              <p className="text-xs text-gray-500 mt-0.5">Email: {customer.email}</p>
            )}
            {customer?.billingAddress && (
              <p className="text-xs text-gray-500 mt-0.5">
                {[
                  customer.billingAddress.line1,
                  customer.billingAddress.city,
                  customer.billingAddress.state,
                  customer.billingAddress.pincode,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            )}
          </div>

          <div className="sm:text-right">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Estimate Summary:
            </p>
            <p className="text-sm text-gray-700">
              Status: <span className="font-semibold capitalize">{quotation.status}</span>
            </p>
            <p className="text-sm text-gray-700">
              Supply Type:{' '}
              <span className="font-semibold">
                {quotation.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}
              </span>
            </p>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-300 text-gray-500 font-semibold uppercase">
                <th className="py-2.5 px-2">#</th>
                <th className="py-2.5 px-2">Item & Description</th>
                <th className="py-2.5 px-2">HSN</th>
                <th className="py-2.5 px-2 text-right">Qty</th>
                <th className="py-2.5 px-2 text-right">Rate (₹)</th>
                <th className="py-2.5 px-2 text-right">Disc %</th>
                <th className="py-2.5 px-2 text-right">Taxable (₹)</th>
                <th className="py-2.5 px-2 text-right">GST %</th>
                <th className="py-2.5 px-2 text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quotation.items.map((item, idx) => (
                <tr key={idx} className="text-gray-800">
                  <td className="py-2.5 px-2 text-gray-400">{idx + 1}</td>
                  <td className="py-2.5 px-2 font-medium">{item.name}</td>
                  <td className="py-2.5 px-2 text-gray-500">{item.hsnCode || '-'}</td>
                  <td className="py-2.5 px-2 text-right">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="py-2.5 px-2 text-right">{formatCurrency(item.rate)}</td>
                  <td className="py-2.5 px-2 text-right">
                    {item.discountPercent ? `${item.discountPercent}%` : '-'}
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    {formatCurrency(item.taxableAmount)}
                  </td>
                  <td className="py-2.5 px-2 text-right">{item.taxRate}%</td>
                  <td className="py-2.5 px-2 text-right font-semibold">
                    {formatCurrency(item.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
          <div>
            {quotation.notes && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Notes:
                </p>
                <p className="text-xs text-gray-700 whitespace-pre-line bg-gray-50 p-3 rounded-lg border border-gray-100">
                  {quotation.notes}
                </p>
              </div>
            )}
            {quotation.termsAndConditions && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Terms & Conditions:
                </p>
                <p className="text-xs text-gray-600 whitespace-pre-line">
                  {quotation.termsAndConditions}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-semibold">{formatCurrency(quotation.subtotal)}</span>
            </div>

            {quotation.totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Total Discount:</span>
                <span className="font-semibold">-{formatCurrency(quotation.totalDiscount)}</span>
              </div>
            )}

            <div className="flex justify-between text-gray-600">
              <span>Taxable Value:</span>
              <span className="font-semibold">{formatCurrency(quotation.taxableAmount)}</span>
            </div>

            {quotation.isInterState ? (
              <div className="flex justify-between text-gray-600">
                <span>IGST:</span>
                <span className="font-semibold">{formatCurrency(quotation.totalIgst)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-gray-600">
                  <span>CGST:</span>
                  <span className="font-semibold">{formatCurrency(quotation.totalCgst)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>SGST:</span>
                  <span className="font-semibold">{formatCurrency(quotation.totalSgst)}</span>
                </div>
              </>
            )}

            {quotation.roundOff !== 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Round Off:</span>
                <span>{formatCurrency(quotation.roundOff)}</span>
              </div>
            )}

            <div className="pt-2 border-t border-gray-200 flex justify-between text-base font-bold text-gray-900">
              <span>Final Amount:</span>
              <span className="text-blue-600">{formatCurrency(quotation.finalAmount)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Convert Confirm Dialog */}
      <ConfirmDialog
        isOpen={isConvertDialogOpen}
        onClose={() => setIsConvertDialogOpen(false)}
        onConfirm={() => convertMutation.mutate()}
        title="Convert this quotation to a sales invoice?"
        message="This action will issue an official sales invoice from this quotation. Items will be billed to the customer."
        confirmText="Convert Now"
        variant="warning"
        loading={convertMutation.isPending}
      />
    </div>
  )
}

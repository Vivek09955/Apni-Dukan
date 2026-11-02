import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  CheckCircle2,
  Calendar,
  CreditCard,
  Building,
  User,
  FileText,
  AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Spinner } from '../../components/ui/Spinner'
import { getPayment, cancelPayment } from '../../api/payments'
import { formatCurrency, formatDate } from '../../lib/utils'
import type { Payment, Customer, Supplier } from '../../types'

export function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['payment', id],
    queryFn: () => getPayment(id!),
    enabled: Boolean(id),
  })

  const payment: Payment | null = data?.data?.payment || data?.data || null

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => cancelPayment(id!, reason),
    onSuccess: () => {
      toast.success('Payment cancelled successfully')
      queryClient.invalidateQueries({ queryKey: ['payment', id] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['salesInvoices'] })
      queryClient.invalidateQueries({ queryKey: ['purchaseBills'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setIsCancelDialogOpen(false)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to cancel payment')
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (isError || !payment) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
        <h3 className="text-base font-semibold">Payment Record Not Found</h3>
        <p className="text-xs">The requested payment voucher could not be loaded or may have been deleted.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/payments')}>
          Back to Payments
        </Button>
      </div>
    )
  }

  const party = payment.partyId as Customer | Supplier | undefined
  const partyName = typeof party === 'object' && party?.name ? party.name : 'Unspecified Party'
  const partyPhone = typeof party === 'object' ? party?.phone : undefined
  const partyEmail = typeof party === 'object' ? party?.email : undefined
  const partyGstin = typeof party === 'object' ? party?.gstin : undefined

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/payments')}
          >
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                Payment #{payment.paymentNumber || payment._id.slice(-8).toUpperCase()}
              </h2>
              {payment.isCancelled ? (
                <Badge variant="danger">CANCELLED</Badge>
              ) : (
                <Badge variant="success">COMPLETED</Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Recorded on {formatDate(payment.paymentDate || payment.createdAt)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {!payment.isCancelled && (
            <Button
              variant="danger"
              size="sm"
              icon={<Ban className="w-4 h-4" />}
              onClick={() => setIsCancelDialogOpen(true)}
            >
              Cancel Payment
            </Button>
          )}
        </div>
      </div>

      {/* Main Details Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Payment Voucher Summary */}
        <Card className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              VOUCHER DETAILS
            </span>
            {payment.type === 'payment_in' ? (
              <Badge variant="success" className="px-3 py-1">
                <ArrowDownLeft className="w-3.5 h-3.5 mr-1 inline" /> Payment In (Receipt)
              </Badge>
            ) : (
              <Badge variant="danger" className="px-3 py-1">
                <ArrowUpRight className="w-3.5 h-3.5 mr-1 inline" /> Payment Out (Disbursement)
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-gray-400 block">Total Amount</span>
              <span
                className={`text-3xl font-extrabold block mt-0.5 ${
                  payment.type === 'payment_in' ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {formatCurrency(payment.amount)}
              </span>
            </div>

            <div>
              <span className="text-xs text-gray-400 block">Payment Date</span>
              <div className="flex items-center gap-1.5 mt-1 text-sm font-semibold text-gray-800">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>{formatDate(payment.paymentDate || payment.createdAt)}</span>
              </div>
            </div>

            <div>
              <span className="text-xs text-gray-400 block">Payment Method</span>
              <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-gray-800 capitalize">
                <CreditCard className="w-4 h-4 text-gray-400" />
                <span>{payment.paymentMethod ? payment.paymentMethod.replace('_', ' ') : 'Cash'}</span>
              </div>
            </div>

            <div>
              <span className="text-xs text-gray-400 block">Reference / UTR Number</span>
              <span className="text-sm font-medium text-gray-800 block mt-1">
                {payment.referenceNumber || '-'}
              </span>
            </div>

            {payment.bankName && (
              <div className="sm:col-span-2">
                <span className="text-xs text-gray-400 block">Bank Name / Branch</span>
                <span className="text-sm font-medium text-gray-800 block mt-1">
                  {payment.bankName}
                </span>
              </div>
            )}

            {payment.notes && (
              <div className="sm:col-span-2 pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-400 block">Notes / Remarks</span>
                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  {payment.notes}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Party Details Card */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <User className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {payment.partyType === 'customer' ? 'CUSTOMER INFO' : 'SUPPLIER INFO'}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-xs text-gray-400 block">Name</span>
              <h4 className="text-base font-bold text-gray-900 mt-0.5">{partyName}</h4>
            </div>

            {partyPhone && (
              <div>
                <span className="text-xs text-gray-400 block">Phone</span>
                <span className="text-sm font-medium text-gray-800 block">{partyPhone}</span>
              </div>
            )}

            {partyEmail && (
              <div>
                <span className="text-xs text-gray-400 block">Email</span>
                <span className="text-sm font-medium text-gray-800 block">{partyEmail}</span>
              </div>
            )}

            {partyGstin && (
              <div>
                <span className="text-xs text-gray-400 block">GSTIN</span>
                <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700 inline-block mt-0.5">
                  {partyGstin}
                </span>
              </div>
            )}

            <div className="pt-2">
              <Link
                to={
                  payment.partyType === 'customer'
                    ? typeof payment.partyId === 'object'
                      ? `/customers/${payment.partyId._id}`
                      : `/customers/${payment.partyId}`
                    : typeof payment.partyId === 'object'
                    ? `/suppliers/${payment.partyId._id}`
                    : `/suppliers/${payment.partyId}`
                }
                className="text-xs font-medium text-blue-600 hover:text-blue-800 underline"
              >
                View Party Ledger & Profile &rarr;
              </Link>
            </div>
          </div>
        </Card>
      </div>

      {/* Invoice Allocations Table */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <h3 className="text-base font-semibold text-gray-900">Settled Invoices & Allocations</h3>
          </div>
        }
      >
        {!payment.invoiceAllocations || payment.invoiceAllocations.length === 0 ? (
          <div className="p-4 bg-gray-50 rounded-xl text-center text-xs text-gray-500 border border-gray-100">
            This payment was recorded as an advance settlement or unallocated on-account receipt/payout.
          </div>
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-[11px] border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Invoice / Bill Ref</th>
                  <th className="px-4 py-3">Document Type</th>
                  <th className="px-4 py-3 text-right">Allocated Settlement</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payment.invoiceAllocations.map((alloc, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-semibold text-blue-600">
                      {alloc.invoiceId}
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-600">
                      {alloc.invoiceType.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      {formatCurrency(alloc.allocatedAmount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={
                          alloc.invoiceType === 'sales_invoice'
                            ? `/sales/${alloc.invoiceId}`
                            : `/purchases/${alloc.invoiceId}`
                        }
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 underline"
                      >
                        Open Bill
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Accounting Voucher Notice */}
      <Card className="bg-blue-50/40 border-blue-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building className="w-5 h-5 text-blue-600 shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-gray-900">General Ledger Posting</h4>
            <p className="text-xs text-gray-500">
              Double-entry accounting journal entries are automatically updated for cash/bank and party accounts.
            </p>
          </div>
        </div>
        <Link to="/accounting">
          <Button variant="outline" size="sm">
            View Journal Entries
          </Button>
        </Link>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isCancelDialogOpen}
        onClose={() => setIsCancelDialogOpen(false)}
        onConfirm={() => cancelMutation.mutate(cancelReason || 'Cancelled by user')}
        title="Cancel Payment Voucher"
        message={`Are you sure you want to cancel payment #${
          payment.paymentNumber || payment._id.slice(-6)
        }? The settled amount of ${formatCurrency(payment.amount)} will be reinstated as due on invoices.`}
        confirmText="Confirm Cancellation"
        variant="danger"
        loading={cancelMutation.isPending}
      />
    </div>
  )
}

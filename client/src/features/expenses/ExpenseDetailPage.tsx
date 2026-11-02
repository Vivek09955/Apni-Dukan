import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Ban,
  Calendar,
  CreditCard,
  Building,
  User,
  FileText,
  AlertTriangle,
  Repeat,
  Tag,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Spinner } from '../../components/ui/Spinner'
import { getExpense, cancelExpense } from '../../api/expenses'
import { formatCurrency, formatDate } from '../../lib/utils'
import type { Expense } from '../../types'

export function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['expense', id],
    queryFn: () => getExpense(id!),
    enabled: Boolean(id),
  })

  const expense: Expense | null = data?.data?.expense || data?.data || null

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => cancelExpense(id!, reason),
    onSuccess: () => {
      toast.success('Expense cancelled successfully')
      queryClient.invalidateQueries({ queryKey: ['expense', id] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['accounting'] })
      setIsCancelDialogOpen(false)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to cancel expense')
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (isError || !expense) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
        <h3 className="text-base font-semibold">Expense Record Not Found</h3>
        <p className="text-xs">The requested expense voucher could not be loaded or was removed.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/expenses')}>
          Back to Expenses
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/expenses')}
          >
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                Expense #{expense.expenseNumber || expense._id.slice(-8).toUpperCase()}
              </h2>
              {expense.isCancelled ? (
                <Badge variant="danger">CANCELLED</Badge>
              ) : (
                <Badge variant="success">RECORDED</Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Incurred on {formatDate(expense.expenseDate || expense.createdAt)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {!expense.isCancelled && (
            <Button
              variant="danger"
              size="sm"
              icon={<Ban className="w-4 h-4" />}
              onClick={() => setIsCancelDialogOpen(true)}
            >
              Cancel Expense
            </Button>
          )}
        </div>
      </div>

      {/* Main Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              EXPENSE VOUCHER
            </span>
            <Badge variant="info" className="capitalize">
              {expense.category}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-gray-400 block">Expense Amount</span>
              <span className="text-3xl font-extrabold text-rose-600 block mt-0.5">
                {formatCurrency(expense.amount)}
              </span>
            </div>

            <div>
              <span className="text-xs text-gray-400 block">Expense Date</span>
              <div className="flex items-center gap-1.5 mt-1 text-sm font-semibold text-gray-800">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>{formatDate(expense.expenseDate || expense.createdAt)}</span>
              </div>
            </div>

            <div>
              <span className="text-xs text-gray-400 block">Payment Mode</span>
              <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-gray-800 capitalize">
                <CreditCard className="w-4 h-4 text-gray-400" />
                <span>{expense.paymentMethod ? expense.paymentMethod.replace('_', ' ') : 'Cash'}</span>
              </div>
            </div>

            <div>
              <span className="text-xs text-gray-400 block">Vendor / Payee</span>
              <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-gray-800">
                <User className="w-4 h-4 text-gray-400" />
                <span>{expense.vendorName || 'Not specified'}</span>
              </div>
            </div>

            {expense.isRecurring && (
              <div className="sm:col-span-2 p-3 bg-blue-50/50 rounded-lg border border-blue-100 flex items-center gap-2 text-xs text-blue-800">
                <Repeat className="w-4 h-4 text-blue-600" />
                <span>
                  Recurring expense scheduled at{' '}
                  <strong className="capitalize">{expense.recurringInterval || 'monthly'}</strong>{' '}
                  intervals.
                </span>
              </div>
            )}

            {expense.description && (
              <div className="sm:col-span-2 pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-400 block">Description / Purpose</span>
                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  {expense.description}
                </p>
              </div>
            )}

            {expense.notes && (
              <div className="sm:col-span-2 pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-400 block">Internal Notes</span>
                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  {expense.notes}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Category Breakdown info */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Tag className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              ACCOUNTING CATEGORY
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-xs text-gray-400 block">Category</span>
              <h4 className="text-base font-bold text-gray-900 mt-0.5">{expense.category}</h4>
            </div>

            <div>
              <span className="text-xs text-gray-400 block">Account Classification</span>
              <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200/50 inline-block mt-1">
                Indirect Expense
              </span>
            </div>

            <div className="pt-2 text-xs text-gray-500 leading-relaxed">
              This expense is posted to the Profit & Loss statement and deducted from gross business profit.
            </div>

            <div className="pt-2 border-t border-gray-100">
              <Link
                to="/reports/financial/pnl"
                className="text-xs font-medium text-blue-600 hover:text-blue-800 underline"
              >
                View in Profit & Loss Statement &rarr;
              </Link>
            </div>
          </div>
        </Card>
      </div>

      {/* Accounting Notice */}
      <Card className="bg-blue-50/40 border-blue-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building className="w-5 h-5 text-blue-600 shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-gray-900">General Ledger Posting</h4>
            <p className="text-xs text-gray-500">
              Debit: Expense Account ({expense.category}) | Credit: Payment Account ({expense.paymentMethod})
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
        title="Cancel Expense Voucher"
        message={`Are you sure you want to cancel expense #${
          expense.expenseNumber || expense._id.slice(-6)
        }? The amount of ${formatCurrency(expense.amount)} will be reversed in your expense reports.`}
        confirmText="Confirm Cancellation"
        variant="danger"
        loading={cancelMutation.isPending}
      />
    </div>
  )
}

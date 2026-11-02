import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  RotateCcw,
  Calendar,
  FileText,
  AlertTriangle,
  Building,
  CheckCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Spinner } from '../../components/ui/Spinner'
import { getJournalEntry, reverseJournalEntry } from '../../api/accounting'
import { formatCurrency, formatDate } from '../../lib/utils'
import type { JournalEntry, Account } from '../../types'

export function JournalEntryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isReverseDialogOpen, setIsReverseDialogOpen] = useState(false)
  const [reversalReason, setReversalReason] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['journal-entry', id],
    queryFn: () => getJournalEntry(id!),
    enabled: Boolean(id),
  })

  const entry: JournalEntry | null = data?.data?.entry || data?.data || null

  const reverseMutation = useMutation({
    mutationFn: (reason: string) => reverseJournalEntry(id!, reason),
    onSuccess: () => {
      toast.success('Journal entry reversed successfully')
      queryClient.invalidateQueries({ queryKey: ['journal-entry', id] })
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] })
      queryClient.invalidateQueries({ queryKey: ['pnl'] })
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] })
      setIsReverseDialogOpen(false)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to reverse journal entry')
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (isError || !entry) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
        <h3 className="text-base font-semibold">Journal Entry Not Found</h3>
        <p className="text-xs">The requested journal voucher could not be loaded.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/accounting')}>
          Back to Journal Entries
        </Button>
      </div>
    )
  }

  const lines = entry.lines || []
  const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0)
  const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/accounting')}
          >
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                Journal Voucher #{entry.entryNumber || entry._id.slice(-8).toUpperCase()}
              </h2>
              {entry.isReversed ? (
                <Badge variant="danger">REVERSED</Badge>
              ) : (
                <Badge variant="success">POSTED</Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Posted on {formatDate(entry.date || entry.createdAt)}
            </p>
          </div>
        </div>

        {/* Reverse Button */}
        <div>
          {!entry.isReversed && (
            <Button
              variant="danger"
              size="sm"
              icon={<RotateCcw className="w-4 h-4" />}
              onClick={() => setIsReverseDialogOpen(true)}
            >
              Reverse Entry
            </Button>
          )}
        </div>
      </div>

      {/* Reversal notice if reversed */}
      {entry.isReversed && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-xs">
          <RotateCcw className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <strong className="font-semibold block">This Journal Entry has been Reversed</strong>
            <span>All debits and credits have been counter-balanced by an automated reversal voucher.</span>
          </div>
        </div>
      )}

      {/* Narration & Header Details Card */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            TRANSACTION OVERVIEW
          </span>
          <span className="text-xs text-gray-400">
            Reference: {entry.referenceType || 'Manual Journal'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <span className="text-xs text-gray-400 block">Voucher Date</span>
            <div className="flex items-center gap-1.5 mt-1 text-sm font-semibold text-gray-900">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>{formatDate(entry.date || entry.createdAt)}</span>
            </div>
          </div>

          <div>
            <span className="text-xs text-gray-400 block">Total Transaction Value</span>
            <span className="text-xl font-bold text-gray-900 block mt-0.5">
              {formatCurrency(totalDebit)}
            </span>
          </div>

          <div>
            <span className="text-xs text-gray-400 block">Status</span>
            <div className="mt-1">
              {entry.isReversed ? (
                <Badge variant="danger">Reversed Entry</Badge>
              ) : (
                <Badge variant="success">Posted to Ledger</Badge>
              )}
            </div>
          </div>

          <div className="sm:col-span-3 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-400 block">Narration</span>
            <p className="text-sm font-medium text-gray-800 mt-1 bg-gray-50 p-3 rounded-lg border border-gray-100 whitespace-pre-wrap">
              {entry.narration}
            </p>
          </div>
        </div>
      </Card>

      {/* Lines Table */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <h3 className="text-base font-semibold text-gray-900">Accounting Debit & Credit Breakdown</h3>
          </div>
        }
      >
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-[11px] border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Account (Ledger)</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right w-36">Debit (₹)</th>
                <th className="px-4 py-3 text-right w-36">Credit (₹)</th>
                <th className="px-4 py-3">Line Memo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lines.map((line, idx) => {
                const acc = line.accountId as Account | undefined
                const accName = typeof acc === 'object' && acc?.name ? acc.name : String(line.accountId)
                const accCode = typeof acc === 'object' ? acc.code : ''
                const accType = typeof acc === 'object' ? acc.type : ''

                return (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{accName}</div>
                      {accCode && <span className="text-[11px] font-mono text-blue-600">[{accCode}]</span>}
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-500">
                      {accType || '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {(line.debit || 0) > 0 ? formatCurrency(line.debit) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {(line.credit || 0) > 0 ? formatCurrency(line.credit) : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {line.description || '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {/* Totals Row */}
            <tfoot className="bg-gray-50/80 font-bold text-gray-900 border-t border-gray-200">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-right text-xs uppercase text-gray-500 font-semibold">
                  Total
                </td>
                <td className="px-4 py-3 text-right text-sm text-blue-600">
                  {formatCurrency(totalDebit)}
                </td>
                <td className="px-4 py-3 text-right text-sm text-blue-600">
                  {formatCurrency(totalCredit)}
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant="success">Balanced</Badge>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Reverse Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isReverseDialogOpen}
        onClose={() => setIsReverseDialogOpen(false)}
        onConfirm={() => reverseMutation.mutate(reversalReason || 'Manual user reversal')}
        title="Reverse Journal Voucher"
        message={`Are you sure you want to reverse journal entry #${
          entry.entryNumber || entry._id.slice(-6)
        }? An offsetting journal voucher will be created immediately.`}
        confirmText="Confirm Reversal"
        variant="danger"
        loading={reverseMutation.isPending}
      />
    </div>
  )
}

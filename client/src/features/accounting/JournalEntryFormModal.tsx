import { useEffect, useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, AlertCircle, CheckCircle2, IndianRupee } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { getAccounts, createJournalEntry } from '../../api/accounting'
import { formatCurrency, rupeesToPaise } from '../../lib/utils'
import type { Account } from '../../types'

interface EntryLineState {
  accountId: string
  debit: string // ₹ string
  credit: string // ₹ string
  description: string
}

export interface JournalEntryFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function JournalEntryFormModal({ isOpen, onClose, onSuccess }: JournalEntryFormModalProps) {
  const queryClient = useQueryClient()

  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [narration, setNarration] = useState('')
  const [lines, setLines] = useState<EntryLineState[]>([
    { accountId: '', debit: '', credit: '', description: '' },
    { accountId: '', debit: '', credit: '', description: '' },
  ])
  const [formError, setFormError] = useState<string | null>(null)

  // Fetch accounts list for dropdown
  const { data: accountsData } = useQuery({
    queryKey: ['accounts', 'select-list'],
    queryFn: () => getAccounts({ limit: 500 }),
    enabled: isOpen,
  })

  const accounts: Account[] = accountsData?.data?.accounts || accountsData?.data || []

  useEffect(() => {
    if (isOpen) {
      setDate(new Date().toISOString().split('T')[0])
      setNarration('')
      setLines([
        { accountId: '', debit: '', credit: '', description: '' },
        { accountId: '', debit: '', credit: '', description: '' },
      ])
      setFormError(null)
    }
  }, [isOpen])

  // Line mutation helpers
  const handleAddLine = () => {
    setLines((prev) => [...prev, { accountId: '', debit: '', credit: '', description: '' }])
  }

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 2) {
      toast.error('A journal entry requires at least 2 lines')
      return
    }
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  const handleLineChange = (index: number, field: keyof EntryLineState, value: string) => {
    setLines((prev) => {
      const updated = [...prev]
      const current = { ...updated[index], [field]: value }

      // If user inputs a debit, clear the credit on the same line and vice-versa
      if (field === 'debit' && value !== '') {
        current.credit = ''
      } else if (field === 'credit' && value !== '') {
        current.debit = ''
      }

      updated[index] = current
      return updated
    })
  }

  // Calculate totals in paise
  const totalDebitPaise = useMemo(() => {
    return lines.reduce((sum, line) => sum + rupeesToPaise(line.debit || 0), 0)
  }, [lines])

  const totalCreditPaise = useMemo(() => {
    return lines.reduce((sum, line) => sum + rupeesToPaise(line.credit || 0), 0)
  }, [lines])

  const differencePaise = Math.abs(totalDebitPaise - totalCreditPaise)
  const isBalanced = totalDebitPaise > 0 && totalDebitPaise === totalCreditPaise

  const mutation = useMutation({
    mutationFn: async () => {
      if (!narration.trim()) {
        throw new Error('Narration / reason for entry is required')
      }
      if (!date) {
        throw new Error('Entry date is required')
      }
      if (lines.length < 2) {
        throw new Error('A journal entry must contain at least 2 lines')
      }
      if (!isBalanced) {
        throw new Error('Total debits must strictly equal total credits')
      }

      for (let i = 0; i < lines.length; i++) {
        const l = lines[i]
        if (!l.accountId) {
          throw new Error(`Line #${i + 1} requires an account selection`)
        }
        const d = rupeesToPaise(l.debit)
        const c = rupeesToPaise(l.credit)
        if (d === 0 && c === 0) {
          throw new Error(`Line #${i + 1} must have either a debit or a credit amount`)
        }
      }

      const payload = {
        date,
        narration: narration.trim(),
        lines: lines.map((l) => ({
          accountId: l.accountId,
          debit: rupeesToPaise(l.debit),
          credit: rupeesToPaise(l.credit),
          description: l.description.trim() || undefined,
        })),
      }

      return createJournalEntry(payload)
    },
    onSuccess: () => {
      toast.success('Journal entry posted successfully')
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] })
      queryClient.invalidateQueries({ queryKey: ['pnl'] })
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] })
      if (onSuccess) onSuccess()
      onClose()
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to record entry'
      setFormError(msg)
      toast.error(msg)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    mutation.mutate()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Double-Entry Journal Voucher" size="4xl">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto px-1">
        {formError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Date & Narration */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Entry Date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <div className="sm:col-span-2">
            <Input
              label="Narration / Purpose"
              required
              placeholder="e.g. Booking depreciation on machinery, Transfer between cash and bank..."
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
            />
          </div>
        </div>

        {/* Journal Lines Table */}
        <div className="pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-800">Accounting Lines (Debit / Credit)</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={handleAddLine}
            >
              Add Line
            </Button>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-[11px] border-b border-gray-200">
                <tr>
                  <th className="px-3.5 py-2.5">Account (Ledger)</th>
                  <th className="px-3.5 py-2.5 w-32 text-right">Debit (₹)</th>
                  <th className="px-3.5 py-2.5 w-32 text-right">Credit (₹)</th>
                  <th className="px-3.5 py-2.5">Line Description</th>
                  <th className="px-3.5 py-2.5 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="px-3.5 py-2">
                      <select
                        value={line.accountId}
                        onChange={(e) => handleLineChange(idx, 'accountId', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      >
                        <option value="">-- Select Account --</option>
                        {accounts.map((acc) => (
                          <option key={acc._id} value={acc._id}>
                            [{acc.code}] {acc.name} ({acc.type})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3.5 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={line.debit}
                        onChange={(e) => handleLineChange(idx, 'debit', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-right text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-gray-900"
                      />
                    </td>
                    <td className="px-3.5 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={line.credit}
                        onChange={(e) => handleLineChange(idx, 'credit', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-right text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-gray-900"
                      />
                    </td>
                    <td className="px-3.5 py-2">
                      <input
                        type="text"
                        placeholder="Line memo (optional)"
                        value={line.description}
                        onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3.5 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        disabled={lines.length <= 2}
                        className="text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-gray-400 p-1"
                        title="Remove Line"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals & Balance Verification Footer */}
        <div
          className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 text-xs ${
            isBalanced
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-rose-50/70 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {isBalanced ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <div>
              <span className="font-bold text-sm block">
                {isBalanced ? 'Journal Voucher is Balanced' : 'Unbalanced Journal Voucher'}
              </span>
              <span className="text-[11px] opacity-80">
                {isBalanced
                  ? 'Total Debits match Total Credits exactly.'
                  : `Discrepancy: ${formatCurrency(differencePaise)}. Debits and Credits must balance to zero.`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <span className="text-gray-500 block text-[10px] uppercase font-semibold">
                Total Debit
              </span>
              <span className="text-base font-bold text-gray-900">
                {formatCurrency(totalDebitPaise)}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block text-[10px] uppercase font-semibold">
                Total Credit
              </span>
              <span className="text-base font-bold text-gray-900">
                {formatCurrency(totalCreditPaise)}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!isBalanced || mutation.isPending}
            loading={mutation.isPending}
          >
            Post Journal Entry
          </Button>
        </div>
      </form>
    </Modal>
  )
}

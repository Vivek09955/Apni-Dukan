import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  Calendar,
  IndianRupee,
  Search,
  Filter,
  Download,
  Printer,
  ArrowUpDown,
  Building,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { getAccounts, getAccountLedger } from '../../api/accounting'
import { formatCurrency, formatDate } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import type { Account, LedgerEntry } from '../../types'

export function AccountLedgerPage() {
  const { currentBusiness } = useAuthStore()

  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // 1. Fetch all accounts
  const { data: accountsData, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['accounts', currentBusiness?._id],
    queryFn: () => getAccounts({ limit: 500 }),
  })

  const accounts: Account[] = accountsData?.data?.accounts || accountsData?.data || []

  // Auto-select first account if none selected
  const activeAccountId = selectedAccountId || (accounts.length > 0 ? accounts[0]._id : '')

  const currentAccount = useMemo(() => {
    return accounts.find((a) => a._id === activeAccountId) || null
  }, [accounts, activeAccountId])

  // 2. Fetch ledger for active account
  const { data: ledgerData, isLoading: isLoadingLedger } = useQuery({
    queryKey: ['account-ledger', activeAccountId, startDate, endDate],
    queryFn: () =>
      getAccountLedger(activeAccountId, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
    enabled: Boolean(activeAccountId),
  })

  const openingBalance: number =
    ledgerData?.data?.openingBalance ?? currentAccount?.openingBalance ?? 0
  const entries: LedgerEntry[] = ledgerData?.data?.entries || ledgerData?.data?.ledger || []

  // Compute running balance & summary figures
  const { processedEntries, totalDebit, totalCredit, closingBalance } = useMemo(() => {
    let running = openingBalance
    let sumDebit = 0
    let sumCredit = 0

    const isAssetOrExpense =
      currentAccount?.type === 'asset' || currentAccount?.type === 'expense'

    const list = entries.map((e) => {
      const debit = e.debit || 0
      const credit = e.credit || 0
      sumDebit += debit
      sumCredit += credit

      if (isAssetOrExpense) {
        running = running + debit - credit
      } else {
        running = running + credit - debit
      }

      return {
        ...e,
        runningBalance: running,
      }
    })

    return {
      processedEntries: list,
      totalDebit: sumDebit,
      totalCredit: sumCredit,
      closingBalance: running,
    }
  }, [entries, openingBalance, currentAccount?.type])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Account General Ledger</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Audit itemized debits, credits and running balances for individual ledger accounts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Printer className="w-4 h-4" />}
            onClick={() => window.print()}
          >
            Print Ledger
          </Button>
        </div>
      </div>

      {/* Account Selector & Date Range Card */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div className="sm:col-span-1">
            <Select
              label="Select Account"
              value={activeAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              options={accounts.map((a) => ({
                value: a._id,
                label: `[${a.code}] ${a.name} (${a.type})`,
              }))}
              placeholder="-- Select Ledger Account --"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3.5 py-2.5 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3.5 py-2.5 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Account Financial KPI Summary */}
      {currentAccount && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/5 to-transparent">
            <span className="text-xs font-semibold text-gray-500 block">OPENING BALANCE</span>
            <div className="text-xl font-bold text-gray-900 mt-2">
              {formatCurrency(openingBalance)}
            </div>
            <span className="text-[11px] text-gray-400">Balance at period start</span>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/5 to-transparent">
            <span className="text-xs font-semibold text-gray-500 block">TOTAL DEBITS</span>
            <div className="text-xl font-bold text-emerald-600 mt-2">
              {formatCurrency(totalDebit)}
            </div>
            <span className="text-[11px] text-gray-400">Sum of debit postings</span>
          </Card>

          <Card className="bg-gradient-to-br from-rose-500/5 to-transparent">
            <span className="text-xs font-semibold text-gray-500 block">TOTAL CREDITS</span>
            <div className="text-xl font-bold text-rose-600 mt-2">
              {formatCurrency(totalCredit)}
            </div>
            <span className="text-[11px] text-gray-400">Sum of credit postings</span>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-500/5 to-transparent">
            <span className="text-xs font-semibold text-gray-500 block">CLOSING BALANCE</span>
            <div className="text-xl font-bold text-indigo-600 mt-2">
              {formatCurrency(closingBalance)}
            </div>
            <span className="text-[11px] text-gray-400">Current net balance</span>
          </Card>
        </div>
      )}

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold uppercase text-[11px] border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Entry / Ref #</th>
                <th className="px-4 py-3">Narration & Description</th>
                <th className="px-4 py-3 text-right w-32">Debit (₹)</th>
                <th className="px-4 py-3 text-right w-32">Credit (₹)</th>
                <th className="px-4 py-3 text-right w-36">Running Balance (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Opening Balance Row */}
              <tr className="bg-gray-50/40 font-semibold text-gray-700">
                <td className="px-4 py-3">{startDate ? formatDate(startDate) : '-'}</td>
                <td className="px-4 py-3 text-gray-400">-</td>
                <td className="px-4 py-3 italic">Opening Balance B/F</td>
                <td className="px-4 py-3 text-right text-gray-400">-</td>
                <td className="px-4 py-3 text-right text-gray-400">-</td>
                <td className="px-4 py-3 text-right font-bold text-gray-900">
                  {formatCurrency(openingBalance)}
                </td>
              </tr>

              {/* Entries */}
              {isLoadingLedger ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : processedEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    No transactions recorded for this account in the specified period.
                  </td>
                </tr>
              ) : (
                processedEntries.map((row, idx) => (
                  <tr key={row._id || idx} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-700">{formatDate(row.date)}</td>
                    <td className="px-4 py-3 font-mono font-medium text-blue-600">
                      {row.entryNumber || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-medium">
                      {row.narration || 'General ledger posting'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-700">
                      {(row.debit || 0) > 0 ? formatCurrency(row.debit) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-rose-700">
                      {(row.credit || 0) > 0 ? formatCurrency(row.credit) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      {formatCurrency(row.runningBalance)}
                    </td>
                  </tr>
                ))
              )}

              {/* Closing Balance Row */}
              <tr className="bg-gray-100/70 font-bold text-gray-900 border-t-2 border-gray-300">
                <td className="px-4 py-3">{endDate ? formatDate(endDate) : 'Current'}</td>
                <td className="px-4 py-3 text-gray-500">CLOSING</td>
                <td className="px-4 py-3">Closing Balance C/F</td>
                <td className="px-4 py-3 text-right text-emerald-700">{formatCurrency(totalDebit)}</td>
                <td className="px-4 py-3 text-right text-rose-700">{formatCurrency(totalCredit)}</td>
                <td className="px-4 py-3 text-right text-indigo-700 text-sm">
                  {formatCurrency(closingBalance)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Scale,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Printer,
  BarChart3,
  Coins,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { getTrialBalance, getAccounts } from '../../api/accounting'
import { formatCurrency, formatDate } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import type { TrialBalanceRow, Account } from '../../types'

export function TrialBalancePage() {
  const { currentBusiness } = useAuthStore()
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0])

  // Fetch trial balance data
  const { data, isLoading } = useQuery({
    queryKey: ['trial-balance', currentBusiness?._id, asOfDate],
    queryFn: async () => {
      try {
        const res = await getTrialBalance({ asOfDate })
        if (res?.data) return res.data
      } catch {
        // Fallback to accounts if dedicated endpoint not ready
      }
      const accRes = await getAccounts({ limit: 500 })
      const accList: Account[] = accRes?.data?.accounts || accRes?.data || []

      const rows: TrialBalanceRow[] = accList.map((acc) => {
        const bal = acc.currentBalance ?? acc.openingBalance ?? 0
        const isDebitNormal = acc.type === 'asset' || acc.type === 'expense'
        return {
          accountId: acc._id,
          accountName: acc.name,
          accountCode: acc.code,
          accountType: acc.type,
          debitBalance: isDebitNormal ? (bal > 0 ? bal : 0) : bal < 0 ? Math.abs(bal) : 0,
          creditBalance: !isDebitNormal ? (bal > 0 ? bal : 0) : bal < 0 ? Math.abs(bal) : 0,
        }
      })

      return { rows }
    },
  })

  const rows: TrialBalanceRow[] = useMemo(() => {
    if (!data) return []
    if (Array.isArray(data)) return data
    if (data.rows && Array.isArray(data.rows)) return data.rows
    return []
  }, [data])

  // Calculate total debits and credits
  const { totalDebits, totalCredits, isBalanced, difference } = useMemo(() => {
    let debits = 0
    let credits = 0
    rows.forEach((r) => {
      debits += r.debitBalance || 0
      credits += r.creditBalance || 0
    })
    const diff = Math.abs(debits - credits)
    return {
      totalDebits: debits,
      totalCredits: credits,
      isBalanced: diff === 0,
      difference: diff,
    }
  }, [rows])

  // Chart data aggregated by account type
  const chartData = useMemo(() => {
    const typeMap: Record<string, { type: string; debits: number; credits: number }> = {
      asset: { type: 'Assets', debits: 0, credits: 0 },
      liability: { type: 'Liabilities', debits: 0, credits: 0 },
      equity: { type: 'Equity', debits: 0, credits: 0 },
      revenue: { type: 'Revenue', debits: 0, credits: 0 },
      expense: { type: 'Expenses', debits: 0, credits: 0 },
    }

    rows.forEach((r) => {
      const t = r.accountType?.toLowerCase() || 'asset'
      if (!typeMap[t]) {
        typeMap[t] = { type: t, debits: 0, credits: 0 }
      }
      typeMap[t].debits += (r.debitBalance || 0) / 100
      typeMap[t].credits += (r.creditBalance || 0) / 100
    })

    return Object.values(typeMap)
  }, [rows])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Financial Statements</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Standard double-entry accounting reports, trial balance verification, and year-end audits
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Printer className="w-4 h-4" />}
            onClick={() => window.print()}
          >
            Print Statement
          </Button>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <Link
          to="/reports/financial"
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white shadow-xs"
        >
          Trial Balance
        </Link>
        <Link
          to="/reports/financial/pnl"
          className="px-4 py-2 text-xs font-medium rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        >
          Profit & Loss (P&L)
        </Link>
        <Link
          to="/reports/financial/balance-sheet"
          className="px-4 py-2 text-xs font-medium rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        >
          Balance Sheet
        </Link>
      </div>

      {/* Date Filter Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-bold text-gray-900">Trial Balance Audit</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>As of Date:</span>
          </div>
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
          />
        </div>
      </div>

      {/* Verification Status Banner */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs ${
          isBalanced
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            : 'bg-rose-50/70 border-rose-200 text-rose-900'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isBalanced ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
          )}
          <div>
            <h4 className="font-bold text-sm">
              {isBalanced ? 'Trial Balance is in Exact Balance' : 'Trial Balance Out of Balance'}
            </h4>
            <p className="text-[11px] opacity-80 mt-0.5">
              {isBalanced
                ? 'Total debits equal total credits. Books are mathematically verified.'
                : `A discrepancy of ${formatCurrency(difference)} exists between debits and credits.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-500 block">Total Debits</span>
            <span className="text-base font-extrabold text-gray-900">
              {formatCurrency(totalDebits)}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-500 block">Total Credits</span>
            <span className="text-base font-extrabold text-gray-900">
              {formatCurrency(totalCredits)}
            </span>
          </div>
        </div>
      </div>

      {/* Recharts Bar Chart Breakdown */}
      <Card title="Account Classification Debit vs Credit Overview">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="type" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: any) => [`₹${Number(value || 0).toLocaleString('en-IN')}`, '']}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="debits" name="Debit Balances (₹)" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="credits" name="Credit Balances (₹)" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Trial Balance Table */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-[11px] border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 w-28">Code</th>
                <th className="px-4 py-3">Account Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right w-44">Debit Balance (₹)</th>
                <th className="px-4 py-3 text-right w-44">Credit Balance (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    No accounts found for trial balance calculation.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.accountId} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-blue-600">
                      {row.accountCode}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{row.accountName}</td>
                    <td className="px-4 py-3 capitalize text-gray-500">{row.accountType}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {(row.debitBalance || 0) > 0 ? formatCurrency(row.debitBalance) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {(row.creditBalance || 0) > 0 ? formatCurrency(row.creditBalance) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Totals Row */}
            <tfoot className="bg-gray-100/80 font-bold text-gray-900 border-t-2 border-gray-300">
              <tr>
                <td colSpan={3} className="px-4 py-3.5 text-right uppercase text-xs text-gray-600 font-bold">
                  Total
                </td>
                <td className="px-4 py-3.5 text-right text-sm text-blue-700">
                  {formatCurrency(totalDebits)}
                </td>
                <td className="px-4 py-3.5 text-right text-sm text-emerald-700">
                  {formatCurrency(totalCredits)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

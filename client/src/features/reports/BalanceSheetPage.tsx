import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Calendar,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Coins,
  DollarSign,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { getBalanceSheet, getAccounts } from '../../api/accounting'
import { formatCurrency, formatDate } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import type { BalanceSheetData, Account } from '../../types'

export function BalanceSheetPage() {
  const { currentBusiness } = useAuthStore()
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0])

  // Fetch Balance Sheet Data
  const { data: sheetData, isLoading } = useQuery({
    queryKey: ['balance-sheet', currentBusiness?._id, asOfDate],
    queryFn: async () => {
      try {
        const res = await getBalanceSheet({ asOfDate })
        if (res?.data && (res.data.assets || res.data.totalAssets !== undefined)) {
          return res.data as BalanceSheetData
        }
      } catch {
        // Fallback using accounts list
      }

      const accRes = await getAccounts({ limit: 500 })
      const accList: Account[] = accRes?.data?.accounts || accRes?.data || []

      const assets: { accountName: string; balance: number }[] = []
      const liabilities: { accountName: string; balance: number }[] = []
      const equity: { accountName: string; balance: number }[] = []

      accList.forEach((acc) => {
        const bal = acc.currentBalance ?? acc.openingBalance ?? 0
        if (bal === 0) return

        if (acc.type === 'asset') {
          assets.push({ accountName: `[${acc.code}] ${acc.name}`, balance: bal })
        } else if (acc.type === 'liability') {
          liabilities.push({ accountName: `[${acc.code}] ${acc.name}`, balance: bal })
        } else if (acc.type === 'equity') {
          equity.push({ accountName: `[${acc.code}] ${acc.name}`, balance: bal })
        }
      })

      const totalAssets = assets.reduce((s, a) => s + a.balance, 0)
      const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0)
      const totalEquity = equity.reduce((s, a) => s + a.balance, 0)

      // Calculate balancing profit if any
      const netProfit = totalAssets - (totalLiabilities + totalEquity)
      if (netProfit !== 0) {
        equity.push({
          accountName: 'Current Period Retained Earnings / Net Profit',
          balance: netProfit,
        })
      }

      const computedTotalEquity = totalEquity + netProfit

      return {
        assets,
        liabilities,
        equity,
        totalAssets,
        totalLiabilities,
        totalEquity: computedTotalEquity,
        netProfit,
      } as BalanceSheetData
    },
  })

  const assets = sheetData?.assets || []
  const liabilities = sheetData?.liabilities || []
  const equity = sheetData?.equity || []
  const totalAssets = sheetData?.totalAssets ?? 0
  const totalLiabilities = sheetData?.totalLiabilities ?? 0
  const totalEquity = sheetData?.totalEquity ?? 0

  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity
  const diff = Math.abs(totalAssets - totalLiabilitiesAndEquity)
  const isBalanced = diff === 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Financial Statements</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Statement of financial position: Assets, Liabilities, and Owner's Equity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Printer className="w-4 h-4" />}
            onClick={() => window.print()}
          >
            Print Balance Sheet
          </Button>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <Link
          to="/reports/financial"
          className="px-4 py-2 text-xs font-medium rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
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
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white shadow-xs"
        >
          Balance Sheet
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-bold text-gray-900">Balance Sheet Statement</h3>
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

      {/* Verification Banner: Assets == Liabilities + Equity */}
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
              {isBalanced
                ? 'Accounting Equation Balanced (Assets = Liabilities + Equity)'
                : 'Accounting Equation Imbalance'}
            </h4>
            <p className="text-[11px] opacity-80 mt-0.5">
              {isBalanced
                ? 'All business resources, creditors obligations and net equity balance symmetrically.'
                : `Discrepancy: ${formatCurrency(diff)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-500 block">Total Assets</span>
            <span className="text-base font-extrabold text-gray-900">
              {formatCurrency(totalAssets)}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-500 block">Liabilities + Equity</span>
            <span className="text-base font-extrabold text-gray-900">
              {formatCurrency(totalLiabilitiesAndEquity)}
            </span>
          </div>
        </div>
      </div>

      {/* Three Columns Layout on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Assets */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs flex flex-col overflow-hidden">
          <div className="p-4 bg-emerald-50/60 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-600" />
              <h4 className="font-bold text-sm text-gray-900">ASSETS</h4>
            </div>
            <span className="text-xs font-bold text-emerald-700">
              {formatCurrency(totalAssets)}
            </span>
          </div>

          <div className="flex-1 p-4 space-y-3">
            {assets.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No assets on record</p>
            ) : (
              assets.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs pb-2 border-b border-gray-50">
                  <span className="text-gray-700 font-medium">{item.accountName}</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(item.balance)}</span>
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between text-xs font-bold text-gray-900">
            <span>TOTAL ASSETS</span>
            <span className="text-emerald-700">{formatCurrency(totalAssets)}</span>
          </div>
        </div>

        {/* Column 2: Liabilities */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs flex flex-col overflow-hidden">
          <div className="p-4 bg-rose-50/60 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-rose-600" />
              <h4 className="font-bold text-sm text-gray-900">LIABILITIES</h4>
            </div>
            <span className="text-xs font-bold text-rose-700">
              {formatCurrency(totalLiabilities)}
            </span>
          </div>

          <div className="flex-1 p-4 space-y-3">
            {liabilities.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No liabilities on record</p>
            ) : (
              liabilities.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs pb-2 border-b border-gray-50">
                  <span className="text-gray-700 font-medium">{item.accountName}</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(item.balance)}</span>
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between text-xs font-bold text-gray-900">
            <span>TOTAL LIABILITIES</span>
            <span className="text-rose-700">{formatCurrency(totalLiabilities)}</span>
          </div>
        </div>

        {/* Column 3: Equity */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs flex flex-col overflow-hidden">
          <div className="p-4 bg-blue-50/60 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <h4 className="font-bold text-sm text-gray-900">EQUITY & RESERVES</h4>
            </div>
            <span className="text-xs font-bold text-blue-700">
              {formatCurrency(totalEquity)}
            </span>
          </div>

          <div className="flex-1 p-4 space-y-3">
            {equity.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No equity on record</p>
            ) : (
              equity.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs pb-2 border-b border-gray-50">
                  <span className="text-gray-700 font-medium">{item.accountName}</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(item.balance)}</span>
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between text-xs font-bold text-gray-900">
            <span>TOTAL EQUITY</span>
            <span className="text-blue-700">{formatCurrency(totalEquity)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Calendar,
  TrendingUp,
  Receipt,
  DollarSign,
  Printer,
  PieChart as PieIcon,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { getProfitLoss, getAccounts } from '../../api/accounting'
import { getExpenses } from '../../api/expenses'
import { getInvoices } from '../../api/sales'
import { formatCurrency, formatDate } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import type { ProfitLossData, Account, Expense, SalesInvoice } from '../../types'

export function ProfitLossPage() {
  const { currentBusiness } = useAuthStore()

  // Default to current Indian Financial Year (Apr 1 to Mar 31)
  const now = new Date()
  const currentYear = now.getFullYear()
  const fyStart = now.getMonth() >= 3 ? `${currentYear}-04-01` : `${currentYear - 1}-04-01`
  const fyEnd = now.getMonth() >= 3 ? `${currentYear + 1}-03-31` : `${currentYear}-03-31`

  const [fromDate, setFromDate] = useState(fyStart)
  const [toDate, setToDate] = useState(now.toISOString().split('T')[0])

  // Fetch P&L data
  const { data: pnlData, isLoading } = useQuery({
    queryKey: ['pnl', currentBusiness?._id, fromDate, toDate],
    queryFn: async () => {
      try {
        const res = await getProfitLoss({ fromDate, toDate })
        if (res?.data && (res.data.revenue || res.data.totalRevenue !== undefined)) {
          return res.data as ProfitLossData
        }
      } catch {
        // Fallback calculation using sales and expenses
      }

      // Calculate from sales invoices and expenses
      const salesRes = await getInvoices({ limit: 1000 })
      const expRes = await getExpenses({ limit: 1000 })

      const sales: SalesInvoice[] = salesRes?.data?.invoices || salesRes?.data || []
      const expenses: Expense[] = expRes?.data?.expenses || expRes?.data || []

      // Filter by date
      const fromTime = new Date(fromDate).getTime()
      const toTime = new Date(toDate).getTime() + 86400000

      const filteredSales = sales.filter((s) => {
        if (s.status === 'cancelled') return false
        const t = new Date(s.invoiceDate || s.createdAt).getTime()
        return t >= fromTime && t <= toTime
      })

      const filteredExpenses = expenses.filter((e) => {
        if (e.isCancelled) return false
        const t = new Date(e.expenseDate || e.createdAt).getTime()
        return t >= fromTime && t <= toTime
      })

      const totalSalesRevenue = filteredSales.reduce((sum, s) => sum + (s.taxableAmount || s.finalAmount || 0), 0)

      // Group expenses by category
      const expGroupMap: Record<string, number> = {}
      filteredExpenses.forEach((e) => {
        const cat = e.category || 'Other Expenses'
        expGroupMap[cat] = (expGroupMap[cat] || 0) + (e.amount || 0)
      })

      const expenseList = Object.entries(expGroupMap).map(([accountName, amount]) => ({
        accountName,
        amount,
      }))

      const totalExpenses = Object.values(expGroupMap).reduce((s, a) => s + a, 0)

      const result: ProfitLossData = {
        revenue: [{ accountName: 'Sales / Operating Revenue', amount: totalSalesRevenue }],
        expenses: expenseList.length > 0 ? expenseList : [{ accountName: 'Store Operating Expenses', amount: 0 }],
        totalRevenue: totalSalesRevenue,
        totalExpenses: totalExpenses,
        netProfit: totalSalesRevenue - totalExpenses,
        period: { from: fromDate, to: toDate },
      }

      return result
    },
  })

  const revenueItems = pnlData?.revenue || []
  const expenseItems = pnlData?.expenses || []
  const totalRevenue = pnlData?.totalRevenue ?? 0
  const totalExpenses = pnlData?.totalExpenses ?? 0
  const netProfit = pnlData?.netProfit ?? totalRevenue - totalExpenses
  const isNetProfit = netProfit >= 0

  // Chart data for revenue vs expenses
  const pieChartData = useMemo(() => {
    if (totalRevenue === 0 && totalExpenses === 0) return []
    return [
      { name: 'Revenue', value: Math.max(0, totalRevenue / 100), color: '#10b981' },
      { name: 'Expenses', value: Math.max(0, totalExpenses / 100), color: '#f43f5e' },
    ]
  }, [totalRevenue, totalExpenses])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Financial Statements</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Evaluate gross profitability, operational margins and net profit or loss
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Printer className="w-4 h-4" />}
            onClick={() => window.print()}
          >
            Print P&L
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
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white shadow-xs"
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

      {/* Period Filter Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          <h3 className="text-sm font-bold text-gray-900">Profit & Loss Statement (Income Statement)</h3>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>From:</span>
          </div>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
          />
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span>To:</span>
          </div>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
          />
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/5 to-transparent">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>TOTAL REVENUE (INCOME)</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">
            {formatCurrency(totalRevenue)}
          </div>
          <span className="text-[11px] text-gray-400">Total earned turnover</span>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500/5 to-transparent">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>TOTAL EXPENSES</span>
            <ArrowDownRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2">
            {formatCurrency(totalExpenses)}
          </div>
          <span className="text-[11px] text-gray-400">Operating costs & overheads</span>
        </Card>

        <Card
          className={`bg-gradient-to-br ${
            isNetProfit ? 'from-emerald-500/10' : 'from-rose-500/10'
          } to-transparent`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>NET {isNetProfit ? 'PROFIT' : 'LOSS'}</span>
            <DollarSign className={`w-4 h-4 ${isNetProfit ? 'text-emerald-600' : 'text-rose-600'}`} />
          </div>
          <div
            className={`text-2xl font-black mt-2 ${
              isNetProfit ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {formatCurrency(netProfit)}
          </div>
          <span className="text-[11px] text-gray-400">
            {isNetProfit ? 'Net surplus for selected period' : 'Net deficit for selected period'}
          </span>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* P&L Breakdown Statement Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Revenue Section */}
          <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-emerald-50/50 border-b border-gray-200 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                1. Revenue from Operations
              </h4>
              <span className="font-bold text-sm text-emerald-700">
                {formatCurrency(totalRevenue)}
              </span>
            </div>
            <table className="w-full text-left text-xs">
              <tbody className="divide-y divide-gray-100">
                {revenueItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-800 font-medium">{item.accountName}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 w-44">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Expense Section */}
          <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-rose-50/50 border-b border-gray-200 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800">
                2. Operating Expenses
              </h4>
              <span className="font-bold text-sm text-rose-700">
                {formatCurrency(totalExpenses)}
              </span>
            </div>
            <table className="w-full text-left text-xs">
              <tbody className="divide-y divide-gray-100">
                {expenseItems.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-4 text-center text-gray-400">
                      No expenses logged for this period.
                    </td>
                  </tr>
                ) : (
                  expenseItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-800 font-medium">{item.accountName}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 w-44">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Net Profit / Loss Banner */}
          <div
            className={`p-5 rounded-xl border flex items-center justify-between shadow-xs ${
              isNetProfit
                ? 'bg-emerald-600 text-white border-emerald-700'
                : 'bg-rose-600 text-white border-rose-700'
            }`}
          >
            <div>
              <span className="text-xs font-bold uppercase tracking-wider opacity-90 block">
                Net Result (Turnover - Expenses)
              </span>
              <h3 className="text-xl font-black mt-0.5">
                {isNetProfit ? 'NET PROFIT FOR THE PERIOD' : 'NET LOSS FOR THE PERIOD'}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black block">{formatCurrency(netProfit)}</span>
              <span className="text-xs opacity-90 block">
                Profit Margin:{' '}
                {totalRevenue > 0 ? `${((netProfit / totalRevenue) * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
          </div>
        </div>

        {/* Recharts Pie Chart & Breakdown */}
        <div className="space-y-4">
          <Card title="Revenue vs Expenses Distribution">
            {pieChartData.length === 0 ? (
              <div className="h-60 flex items-center justify-center text-xs text-gray-400">
                No revenue or expense data for this period
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Amount']}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card title="Statement Highlights">
            <div className="space-y-3 text-xs">
              <div className="flex justify-between pb-2 border-b border-gray-100">
                <span className="text-gray-500">Gross Income:</span>
                <span className="font-semibold text-gray-900">{formatCurrency(totalRevenue)}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-gray-100">
                <span className="text-gray-500">Total Overheads:</span>
                <span className="font-semibold text-rose-600">{formatCurrency(totalExpenses)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="font-bold text-gray-900">Net Business Margin:</span>
                <span
                  className={`font-bold ${
                    isNetProfit ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {totalRevenue > 0 ? `${((netProfit / totalRevenue) * 100).toFixed(2)}%` : '0.00%'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

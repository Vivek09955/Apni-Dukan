import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp,
  ShoppingCart,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Boxes,
  PlusCircle,
  UserPlus,
  AlertCircle,
  Truck,
  Layers,
  ChevronRight,
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
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { DataTable, Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { formatCurrency, formatDate, getStatusColor } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import { getDashboardData } from '../../api/dashboard'
import type { DashboardData, Product } from '../../types'

type DateFilter = 'today' | 'week' | 'month' | 'fy'

export function DashboardPage() {
  const navigate = useNavigate()
  const { currentBusiness } = useAuthStore()
  const [dateFilter, setDateFilter] = useState<DateFilter>('month')

  const { data: responseData, isLoading, isError } = useQuery({
    queryKey: ['dashboard', currentBusiness?._id, dateFilter],
    queryFn: () => getDashboardData({ period: dateFilter }),
    enabled: Boolean(currentBusiness?._id),
  })

  const dashboard: DashboardData = responseData?.data || {
    todaySales: 0,
    todayPurchases: 0,
    totalReceivables: 0,
    totalPayables: 0,
    cashInHand: 0,
    inventoryValue: 0,
    monthlySalesTrend: [],
    monthlyPurchasesTrend: [],
    recentTransactions: [],
    lowStockProducts: [],
    invoiceStatusCounts: {},
    topSellingProducts: [],
  }

  // Merge monthly sales and purchases trend for chart
  const chartData = useMemo(() => {
    const salesList = dashboard.monthlySalesTrend || []
    const purchasesList = dashboard.monthlyPurchasesTrend || []

    const map = new Map<string, { month: string; sales: number; purchases: number }>()

    salesList.forEach((item) => {
      map.set(item.month, {
        month: item.month,
        sales: (item.sales ?? item.amount ?? 0) / 100,
        purchases: 0,
      })
    })

    purchasesList.forEach((item) => {
      const existing = map.get(item.month)
      const purchaseRupees = (item.amount ?? 0) / 100
      if (existing) {
        existing.purchases = purchaseRupees
      } else {
        map.set(item.month, {
          month: item.month,
          sales: 0,
          purchases: purchaseRupees,
        })
      }
    })

    const result = Array.from(map.values())
    if (result.length === 0) {
      return [
        { month: 'Apr', sales: 0, purchases: 0 },
        { month: 'May', sales: 0, purchases: 0 },
        { month: 'Jun', sales: 0, purchases: 0 },
        { month: 'Jul', sales: 0, purchases: 0 },
        { month: 'Aug', sales: 0, purchases: 0 },
        { month: 'Sep', sales: 0, purchases: 0 },
      ]
    }
    return result
  }, [dashboard.monthlySalesTrend, dashboard.monthlyPurchasesTrend])

  const recentTransactions = (dashboard.recentTransactions || []).slice(0, 10)
  const lowStockProducts = dashboard.lowStockProducts || []

  const transactionColumns: Column<any>[] = [
    {
      key: 'invoiceNumber',
      header: 'Reference #',
      render: (row) => {
        const ref = row.invoiceNumber || row.billNumber || row.reference || row._id?.slice(-6)
        const isSale = row.type === 'sale' || !row.type
        const link = isSale ? `/sales/${row._id}` : `/purchases/${row._id}`
        return (
          <Link to={link} className="font-semibold text-blue-600 hover:text-blue-800">
            {ref}
          </Link>
        )
      },
    },
    {
      key: 'partyName',
      header: 'Party',
      render: (row) => {
        const party =
          row.partyName ||
          (typeof row.customerId === 'object' ? row.customerId?.name : null) ||
          (typeof row.supplierId === 'object' ? row.supplierId?.name : null) ||
          'Counter Sale'
        return <span className="font-medium text-gray-800">{party}</span>
      },
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => {
        const isSale = row.type === 'sale' || !row.type
        return (
          <Badge variant={isSale ? 'success' : 'info'}>
            {isSale ? 'SALE' : 'PURCHASE'}
          </Badge>
        )
      },
    },
    {
      key: 'finalAmount',
      header: 'Amount',
      render: (row) => (
        <span className="font-semibold text-gray-900">
          {formatCurrency(row.finalAmount ?? row.amount ?? 0)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={getStatusColor(row.status || 'paid')}>
          {(row.status || 'paid').replace('_', ' ').toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (row) => formatDate(row.invoiceDate || row.billDate || row.createdAt || row.date),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Top Banner & Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            Dashboard: {currentBusiness?.name || 'My Store'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time financial summary, liquidity, sales comparison and active inventory
          </p>
        </div>

        {/* Date Filter Tabs */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200/80 shadow-xs self-start sm:self-auto">
          {(
            [
              { key: 'today', label: 'Today' },
              { key: 'week', label: 'This Week' },
              { key: 'month', label: 'This Month' },
              { key: 'fy', label: 'This FY' },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setDateFilter(item.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                dateFilter === item.key
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link to="/sales/new">
          <Button
            variant="outline"
            fullWidth
            className="justify-start bg-white border-blue-200 hover:bg-blue-50 text-blue-700 py-3 font-semibold"
            icon={<PlusCircle className="w-5 h-5 text-blue-600" />}
          >
            New Invoice
          </Button>
        </Link>
        <Link to="/purchases/new">
          <Button
            variant="outline"
            fullWidth
            className="justify-start bg-white border-emerald-200 hover:bg-emerald-50 text-emerald-700 py-3 font-semibold"
            icon={<Truck className="w-5 h-5 text-emerald-600" />}
          >
            New Purchase
          </Button>
        </Link>
        <Link to="/products">
          <Button
            variant="outline"
            fullWidth
            className="justify-start bg-white border-purple-200 hover:bg-purple-50 text-purple-700 py-3 font-semibold"
            icon={<Boxes className="w-5 h-5 text-purple-600" />}
          >
            Add Product
          </Button>
        </Link>
        <Link to="/customers">
          <Button
            variant="outline"
            fullWidth
            className="justify-start bg-white border-amber-200 hover:bg-amber-50 text-amber-700 py-3 font-semibold"
            icon={<UserPlus className="w-5 h-5 text-amber-600" />}
          >
            Add Customer
          </Button>
        </Link>
      </div>

      {/* KPI Cards (2 Rows of 3 = 6 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Today's Sales */}
        <Card className="hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Today's Sales
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            {isLoading ? (
              <div className="h-8 bg-gray-200 rounded animate-pulse w-3/4"></div>
            ) : (
              <span className="text-2xl font-extrabold text-emerald-600">
                {formatCurrency(dashboard.todaySales)}
              </span>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-400">Total billing generated today</div>
        </Card>

        {/* 2. Today's Purchases */}
        <Card className="hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Today's Purchases
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            {isLoading ? (
              <div className="h-8 bg-gray-200 rounded animate-pulse w-3/4"></div>
            ) : (
              <span className="text-2xl font-extrabold text-gray-900">
                {formatCurrency(dashboard.todayPurchases)}
              </span>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-400">Vendor procurements entered today</div>
        </Card>

        {/* 3. Receivables (Customer Dues) */}
        <Card className="hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Receivables
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            {isLoading ? (
              <div className="h-8 bg-gray-200 rounded animate-pulse w-3/4"></div>
            ) : (
              <span className="text-2xl font-extrabold text-blue-600">
                {formatCurrency(dashboard.totalReceivables)}
              </span>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-400">To collect from customers</div>
        </Card>

        {/* 4. Payables (Supplier Dues) */}
        <Card className="hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Payables
            </span>
            <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            {isLoading ? (
              <div className="h-8 bg-gray-200 rounded animate-pulse w-3/4"></div>
            ) : (
              <span className="text-2xl font-extrabold text-rose-600">
                {formatCurrency(dashboard.totalPayables)}
              </span>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-400">To pay to suppliers & vendors</div>
        </Card>

        {/* 5. Cash in Hand */}
        <Card className="hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Cash & Bank Balance
            </span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            {isLoading ? (
              <div className="h-8 bg-gray-200 rounded animate-pulse w-3/4"></div>
            ) : (
              <span className="text-2xl font-extrabold text-gray-900">
                {formatCurrency(dashboard.cashInHand)}
              </span>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-400">Estimated available liquid balance</div>
        </Card>

        {/* 6. Inventory Value */}
        <Card className="hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Stock Valuation
            </span>
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            {isLoading ? (
              <div className="h-8 bg-gray-200 rounded animate-pulse w-3/4"></div>
            ) : (
              <span className="text-2xl font-extrabold text-gray-900">
                {formatCurrency(dashboard.inventoryValue)}
              </span>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-400">Current warehouse inventory at cost</div>
        </Card>
      </div>

      {/* Chart Section: Sales vs Purchases Trend */}
      <Card
        title="Sales vs Purchases Comparison"
        subtitle="Revenue vs procurement expenses over time"
      >
        <div className="h-72 w-full pt-4">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              Loading trend analytics...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: '#e5e7eb' }} fontSize={12} />
                <YAxis
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  fontSize={12}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value) * 100), '']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="sales" name="Sales (₹)" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="purchases" name="Purchases (₹)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Two Columns: Recent Transactions & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Recent Transactions</h3>
            <Link
              to="/sales"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
            >
              <span>View All Invoices</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <DataTable
            columns={transactionColumns}
            data={recentTransactions}
            loading={isLoading}
            emptyTitle="No Recent Transactions"
            emptyMessage="Create your first invoice or bill to record transactions."
          />
        </div>

        {/* Low Stock Alerts (1 col) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Low Stock Alerts</h3>
            <Link
              to="/products"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <Card>
            {lowStockProducts.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold text-gray-800">All Stock Levels Healthy</h4>
                <p className="text-xs text-gray-500 mt-1">
                  Items below minimum threshold will appear here.
                </p>
                <div className="mt-4">
                  <Link to="/products">
                    <Button variant="outline" size="sm">
                      Manage Products
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {lowStockProducts.map((p) => {
                  const stock = p.currentStock ?? p.openingStock ?? 0
                  return (
                    <div key={p._id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{p.name}</p>
                        <p className="text-[10px] text-gray-400">SKU: {p.sku || '-'}</p>
                      </div>
                      <Badge variant="danger">
                        {stock} / {p.reorderLevel || 5} {p.unit}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

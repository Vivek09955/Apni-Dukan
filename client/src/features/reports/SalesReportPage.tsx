import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Calendar,
  BarChart3,
  TrendingUp,
  Receipt,
  Users,
  Package,
  Printer,
  Coins,
  Percent,
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
import { DataTable, Column } from '../../components/ui/DataTable'
import { getInvoices, getSalesSummary } from '../../api/sales'
import { formatCurrency, formatDate } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import type { SalesInvoice, Customer, InvoiceItem } from '../../types'

interface TopCustomerRow {
  customerId: string
  name: string
  invoiceCount: number
  totalSpent: number
}

interface TopProductRow {
  productId: string
  name: string
  quantity: number
  totalRevenue: number
}

export function SalesReportPage() {
  const { currentBusiness } = useAuthStore()

  // Default to last 30 days
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(now.toISOString().split('T')[0])

  // Fetch all invoices for detailed calculations
  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['sales-report-invoices', currentBusiness?._id, startDate, endDate],
    queryFn: () =>
      getInvoices({
        limit: 1000,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
  })

  const invoices: SalesInvoice[] = invoicesData?.data?.invoices || invoicesData?.data || []

  // Analytics computations
  const { summary, trendData, topCustomers, topProducts } = useMemo(() => {
    let totalSales = 0
    let totalTax = 0
    let validCount = 0

    const customerMap: Record<string, TopCustomerRow> = {}
    const productMap: Record<string, TopProductRow> = {}
    const trendMap: Record<string, { date: string; sales: number; tax: number; count: number }> = {}

    invoices.forEach((inv) => {
      if (inv.status === 'cancelled') return

      const saleAmt = inv.finalAmount || 0
      const taxAmt = inv.totalTax || 0
      totalSales += saleAmt
      totalTax += taxAmt
      validCount++

      // Date trend aggregation (day or month)
      const dateKey = (inv.invoiceDate || inv.createdAt).split('T')[0]
      if (!trendMap[dateKey]) {
        trendMap[dateKey] = { date: dateKey, sales: 0, tax: 0, count: 0 }
      }
      trendMap[dateKey].sales += saleAmt / 100
      trendMap[dateKey].tax += taxAmt / 100
      trendMap[dateKey].count += 1

      // Top Customers
      const custObj = inv.customerId as Customer | undefined
      const cId = typeof custObj === 'object' ? custObj?._id || 'walk-in' : custObj || 'walk-in'
      const cName = typeof custObj === 'object' ? custObj?.name || 'Walk-in Customer' : 'Walk-in Customer'

      if (!customerMap[cId]) {
        customerMap[cId] = {
          customerId: cId,
          name: cName,
          invoiceCount: 0,
          totalSpent: 0,
        }
      }
      customerMap[cId].invoiceCount += 1
      customerMap[cId].totalSpent += saleAmt

      // Top Products
      const invoiceItems: InvoiceItem[] = inv.items || []
      invoiceItems.forEach((item) => {
        const pId = item.productId || item.name
        if (!productMap[pId]) {
          productMap[pId] = {
            productId: pId,
            name: item.name,
            quantity: 0,
            totalRevenue: 0,
          }
        }
        productMap[pId].quantity += item.quantity || 0
        productMap[pId].totalRevenue += item.totalAmount || 0
      })
    })

    const avgInvoiceValue = validCount > 0 ? Math.round(totalSales / validCount) : 0

    // Sort trend chronologically
    const sortedTrend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date))

    // Top 5 customers by revenue
    const sortedCustomers = Object.values(customerMap)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5)

    // Top 5 products by quantity / revenue
    const sortedProducts = Object.values(productMap)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5)

    return {
      summary: {
        totalSales,
        totalTax,
        averageInvoiceValue: avgInvoiceValue,
        invoiceCount: validCount,
      },
      trendData: sortedTrend,
      topCustomers: sortedCustomers,
      topProducts: sortedProducts,
    }
  }, [invoices])

  const customerColumns: Column<TopCustomerRow>[] = [
    {
      key: 'name',
      header: 'Customer',
      render: (row) => <span className="font-semibold text-gray-900">{row.name}</span>,
    },
    {
      key: 'invoiceCount',
      header: 'Invoices',
      render: (row) => <span>{row.invoiceCount}</span>,
    },
    {
      key: 'totalSpent',
      header: 'Total Billed',
      render: (row) => (
        <span className="font-bold text-gray-900">{formatCurrency(row.totalSpent)}</span>
      ),
    },
  ]

  const productColumns: Column<TopProductRow>[] = [
    {
      key: 'name',
      header: 'Product Name',
      render: (row) => <span className="font-semibold text-gray-900">{row.name}</span>,
    },
    {
      key: 'quantity',
      header: 'Qty Sold',
      render: (row) => <span className="font-medium">{row.quantity}</span>,
    },
    {
      key: 'totalRevenue',
      header: 'Total Revenue',
      render: (row) => (
        <span className="font-bold text-emerald-600">{formatCurrency(row.totalRevenue)}</span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Sales Analytics & Reports</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Turnover trends, tax collection, average order size, and high-value customers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Printer className="w-4 h-4" />}
            onClick={() => window.print()}
          >
            Print Report
          </Button>
        </div>
      </div>

      {/* Date Filter Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-bold text-gray-900">Period Analytics Filter</h3>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>From:</span>
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
          />
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span>To:</span>
          </div>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
          />
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/5 to-transparent">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>TOTAL SALES</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {formatCurrency(summary.totalSales)}
          </div>
          <span className="text-[11px] text-gray-400">Gross billing in period</span>
        </Card>

        <Card className="bg-gradient-to-br from-teal-500/5 to-transparent">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>GST / TAX COLLECTED</span>
            <Percent className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-teal-600 mt-2">
            {formatCurrency(summary.totalTax)}
          </div>
          <span className="text-[11px] text-gray-400">CGST + SGST + IGST</span>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/5 to-transparent">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>AVERAGE INVOICE VALUE</span>
            <Coins className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">
            {formatCurrency(summary.averageInvoiceValue)}
          </div>
          <span className="text-[11px] text-gray-400">Mean bill size</span>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-500/5 to-transparent">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>INVOICES GENERATED</span>
            <Receipt className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-600 mt-2">
            {summary.invoiceCount}
          </div>
          <span className="text-[11px] text-gray-400">Completed sales vouchers</span>
        </Card>
      </div>

      {/* Sales Trend Bar Chart */}
      <Card title="Sales & Tax Trends (Daily Volume)">
        {trendData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-xs text-gray-400">
            No sales invoices recorded in the selected date range.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val) => formatDate(val)}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                  labelFormatter={(lbl) => formatDate(String(lbl))}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="sales" name="Sales Turnover (₹)" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="tax" name="Tax Collected (₹)" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Top Customers & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title={
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Top Customers by Billing</span>
            </div>
          }
        >
          {topCustomers.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No customer purchase data available</p>
          ) : (
            <DataTable columns={customerColumns} data={topCustomers} />
          )}
        </Card>

        <Card
          title={
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              <span>Top Selling Products</span>
            </div>
          }
        >
          {topProducts.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No product sales data available</p>
          ) : (
            <DataTable columns={productColumns} data={topProducts} />
          )}
        </Card>
      </div>
    </div>
  )
}

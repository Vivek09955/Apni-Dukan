import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  Eye,
  FileCheck,
  ShoppingBag,
  Clock,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { DataTable, Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { getSalesOrders, convertSalesOrderToInvoice } from '../../api/salesOrders'
import { formatCurrency, formatDate, getStatusColor } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import type { SalesOrder } from '../../types'

type StatusTab = 'all' | 'draft' | 'confirmed' | 'partially_fulfilled' | 'fulfilled' | 'cancelled'

export function SalesOrderListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentBusiness } = useAuthStore()

  const [activeTab, setActiveTab] = useState<StatusTab>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [convertingOrder, setConvertingOrder] = useState<SalesOrder | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['salesOrders', currentBusiness?._id, page, activeTab, searchTerm],
    queryFn: () =>
      getSalesOrders({
        page,
        limit: 15,
        status: activeTab === 'all' ? undefined : activeTab,
        search: searchTerm || undefined,
      }),
  })

  const rawOrders = data?.data?.orders || (Array.isArray(data?.data) ? data?.data : [])
  const orders: SalesOrder[] = Array.isArray(rawOrders) ? rawOrders : []
  const pagination = data?.data?.pagination || {
    page,
    limit: 15,
    total: orders.length,
    totalPages: 1,
  }

  // Summary
  const summary = useMemo(() => {
    const totalCount = orders.length
    const totalValue = orders.reduce((acc, o) => acc + (o.finalAmount || 0), 0)
    const confirmedCount = orders.filter((o) => o.status === 'confirmed').length
    return { totalCount, totalValue, confirmedCount }
  }, [orders])

  // Convert Mutation
  const convertMutation = useMutation({
    mutationFn: (id: string) => convertSalesOrderToInvoice(id),
    onSuccess: (res) => {
      toast.success('Sales Order converted to Invoice!')
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] })
      queryClient.invalidateQueries({ queryKey: ['salesInvoices'] })
      setConvertingOrder(null)
      const invoiceId = res?.data?.invoiceId
      if (invoiceId) {
        navigate(`/sales/${invoiceId}`)
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to convert order to invoice')
    },
  })

  const columns: Column<SalesOrder>[] = [
    {
      key: 'orderNumber',
      header: 'Order #',
      sortable: true,
      render: (row) => (
        <span
          className="font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
          onClick={() => {
            if (row.convertedToInvoice) {
              navigate(`/sales/${row.convertedToInvoice}`)
            } else {
              toast('Order details preview available in invoices view')
            }
          }}
        >
          {row.orderNumber}
        </span>
      ),
    },
    {
      key: 'orderDate',
      header: 'Date',
      sortable: true,
      render: (row) => formatDate(row.orderDate || row.createdAt),
    },
    {
      key: 'customerId',
      header: 'Customer',
      render: (row) => {
        const custName =
          typeof row.customerId === 'object' && row.customerId !== null
            ? row.customerId.name
            : 'Unknown Customer'
        return <span className="font-medium text-gray-900">{custName}</span>
      },
    },
    {
      key: 'expectedDate',
      header: 'Expected Delivery',
      render: (row) => (
        <span className="text-gray-600 text-sm">
          {row.expectedDate ? formatDate(row.expectedDate) : '-'}
        </span>
      ),
    },
    {
      key: 'finalAmount',
      header: 'Amount (₹)',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-gray-900">
          {formatCurrency(row.finalAmount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const variant = getStatusColor(row.status)
        return (
          <Badge variant={variant} className="capitalize">
            {row.status.replace('_', ' ')}
          </Badge>
        )
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.status === 'confirmed' && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs text-blue-700 border-blue-300 hover:bg-blue-50"
              onClick={() => setConvertingOrder(row)}
              title="Convert to Invoice"
            >
              <FileCheck className="w-3.5 h-3.5 mr-1 text-blue-600" />
              Convert to Invoice
            </Button>
          )}

          {row.status === 'fulfilled' && row.convertedToInvoice && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate(`/sales/${row.convertedToInvoice}`)}
              title="View Invoice"
            >
              <Eye className="w-4 h-4 text-gray-600" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  const statusTabs: { label: string; value: StatusTab }[] = [
    { label: 'All Orders', value: 'all' },
    { label: 'Draft', value: 'draft' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Partially Fulfilled', value: 'partially_fulfilled' },
    { label: 'Fulfilled', value: 'fulfilled' },
    { label: 'Cancelled', value: 'cancelled' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Sales Orders</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage customer purchase orders, fulfillment timelines, and bill conversions.
          </p>
        </div>
        <Link to="/sales/orders/new">
          <Button icon={<Plus className="w-4 h-4" />}>
            Create Order
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white border border-gray-100 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Orders</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{summary.totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 bg-white border border-gray-100 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Order Value</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.totalValue)}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 bg-white border border-gray-100 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pending Fulfillment</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{summary.confirmedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-white border border-gray-200">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center overflow-x-auto gap-1 border-b sm:border-b-0 pb-2 sm:pb-0">
            {statusTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setActiveTab(tab.value)
                  setPage(1)
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.value
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="w-full sm:w-64">
            <Input
              placeholder="Search order # or customer..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
              icon={<Search className="w-4 h-4 text-gray-400" />}
            />
          </div>
        </div>
      </Card>

      {/* Data Table */}
      {orders.length === 0 && !isLoading ? (
        <EmptyState
          title="No sales orders found"
          description={
            searchTerm
              ? 'No sales orders matched your search criteria.'
              : 'You have not created any sales orders yet. Track customer commitments easily.'
          }
          actionLabel="Create Sales Order"
          onAction={() => navigate('/sales/orders/new')}
        />
      ) : (
        <DataTable
          columns={columns}
          data={orders}
          loading={isLoading}
          pagination={{
            page: pagination.page,
            pageSize: pagination.limit || 15,
            total: pagination.total || orders.length,
            onPageChange: (p) => setPage(p),
          }}
        />
      )}

      {/* Convert Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(convertingOrder)}
        onClose={() => setConvertingOrder(null)}
        onConfirm={() => {
          if (convertingOrder) {
            convertMutation.mutate(convertingOrder._id)
          }
        }}
        title="Convert Sales Order to Invoice?"
        message={`Convert order ${convertingOrder?.orderNumber} into a billable sales invoice?`}
        confirmText="Convert"
        variant="warning"
        loading={convertMutation.isPending}
      />
    </div>
  )
}

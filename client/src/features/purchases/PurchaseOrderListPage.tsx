import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  Eye,
  FileCheck,
  Package,
  Clock,
  TrendingDown,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { DataTable, Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { getPurchaseOrders, convertPurchaseOrderToBill } from '../../api/purchaseOrders'
import { formatCurrency, formatDate, getStatusColor } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import type { PurchaseOrder } from '../../types'

type StatusTab = 'all' | 'draft' | 'confirmed' | 'partially_fulfilled' | 'fulfilled' | 'cancelled'

export function PurchaseOrderListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentBusiness } = useAuthStore()

  const [activeTab, setActiveTab] = useState<StatusTab>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [convertingOrder, setConvertingOrder] = useState<PurchaseOrder | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['purchaseOrders', currentBusiness?._id, page, activeTab, searchTerm],
    queryFn: () =>
      getPurchaseOrders({
        page,
        limit: 15,
        status: activeTab === 'all' ? undefined : activeTab,
        search: searchTerm || undefined,
      }),
  })

  const rawOrders = data?.data?.orders || (Array.isArray(data?.data) ? data?.data : [])
  const orders: PurchaseOrder[] = Array.isArray(rawOrders) ? rawOrders : []
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
    const pendingCount = orders.filter((o) => o.status === 'confirmed').length
    return { totalCount, totalValue, pendingCount }
  }, [orders])

  // Convert to Bill Mutation
  const convertMutation = useMutation({
    mutationFn: (id: string) => convertPurchaseOrderToBill(id),
    onSuccess: (res) => {
      toast.success('Purchase order converted to purchase bill!')
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
      queryClient.invalidateQueries({ queryKey: ['purchaseBills'] })
      setConvertingOrder(null)
      const billId = res?.data?.billId
      if (billId) {
        navigate(`/purchases/${billId}`)
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to convert purchase order')
    },
  })

  const columns: Column<PurchaseOrder>[] = [
    {
      key: 'orderNumber',
      header: 'PO #',
      sortable: true,
      render: (row) => (
        <span
          className="font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
          onClick={() => {
            if (row.convertedToBill) {
              navigate(`/purchases/${row.convertedToBill}`)
            } else {
              toast('PO details view')
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
      key: 'supplierId',
      header: 'Supplier',
      render: (row) => {
        const suppName =
          typeof row.supplierId === 'object' && row.supplierId !== null
            ? row.supplierId.name
            : 'Unknown Supplier'
        return <span className="font-medium text-gray-900">{suppName}</span>
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
              title="Convert to Bill"
            >
              <FileCheck className="w-3.5 h-3.5 mr-1 text-blue-600" />
              Convert to Bill
            </Button>
          )}

          {row.status === 'fulfilled' && row.convertedToBill && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate(`/purchases/${row.convertedToBill}`)}
              title="View Purchase Bill"
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
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-1">
            Issue orders to vendors and convert incoming shipments directly into purchase bills.
          </p>
        </div>
        <Link to="/purchases/orders/new">
          <Button icon={<Plus className="w-4 h-4" />}>
            Create Order
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white border border-gray-100 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total POs</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{summary.totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 bg-white border border-gray-100 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total PO Value</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.totalValue)}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingDown className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 bg-white border border-gray-100 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pending Orders</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{summary.pendingCount}</p>
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
              placeholder="Search PO # or supplier..."
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
          title="No purchase orders found"
          description={
            searchTerm
              ? 'No purchase orders matched your search criteria.'
              : 'You have not created any purchase orders yet. Send purchase orders to vendors to streamline procurement.'
          }
          actionLabel="Create Purchase Order"
          onAction={() => navigate('/purchases/orders/new')}
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
        title="Convert Purchase Order to Bill?"
        message={`Convert purchase order ${convertingOrder?.orderNumber} into a received purchase bill?`}
        confirmText="Convert to Bill"
        variant="warning"
        loading={convertMutation.isPending}
      />
    </div>
  )
}

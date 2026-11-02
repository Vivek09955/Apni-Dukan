import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  Eye,
  Printer,
  Ban,
  Package,
  AlertCircle,
  Truck,
  CheckCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { DataTable, Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { getPurchaseBills, cancelPurchaseBill } from '../../api/purchases'
import { formatCurrency, formatDate, getStatusColor } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import type { PurchaseBill } from '../../types'

type StatusTab = 'all' | 'draft' | 'received' | 'paid' | 'cancelled'

export function PurchaseListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentBusiness } = useAuthStore()

  const [activeTab, setActiveTab] = useState<StatusTab>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [cancellingBill, setCancellingBill] = useState<PurchaseBill | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['purchaseBills', currentBusiness?._id, page, activeTab, searchTerm],
    queryFn: () =>
      getPurchaseBills({
        page,
        limit: 15,
        status: activeTab === 'all' ? undefined : activeTab,
        search: searchTerm || undefined,
      }),
  })

  const bills: PurchaseBill[] = data?.data?.bills || data?.data || []
  const pagination = data?.data?.pagination || {
    page,
    limit: 15,
    total: bills.length,
    totalPages: 1,
  }

  const summary = useMemo(() => {
    const totalCount = pagination.total || bills.length
    const totalValue = bills.reduce((s, b) => s + (b.finalAmount || 0), 0)
    const totalPayable = bills.reduce((s, b) => s + (b.balanceDue || 0), 0)
    return { totalCount, totalValue, totalPayable }
  }, [bills, pagination.total])

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelPurchaseBill(id, 'Cancelled by user'),
    onSuccess: () => {
      toast.success('Purchase bill cancelled successfully')
      queryClient.invalidateQueries({ queryKey: ['purchaseBills'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setCancellingBill(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to cancel bill')
    },
  })

  const columns: Column<PurchaseBill>[] = [
    {
      key: 'billNumber',
      header: 'Bill #',
      sortable: true,
      render: (row) => (
        <span
          className="font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
          onClick={() => navigate(`/purchases/${row._id}`)}
        >
          {row.billNumber}
        </span>
      ),
    },
    {
      key: 'billDate',
      header: 'Date',
      sortable: true,
      render: (row) => formatDate(row.billDate || row.createdAt),
    },
    {
      key: 'supplierId',
      header: 'Supplier / Vendor',
      render: (row) => {
        const name = typeof row.supplierId === 'object' ? row.supplierId?.name : 'Cash Supplier'
        return (
          <div>
            <span className="font-medium text-gray-900 block">{name || 'General Supplier'}</span>
            {row.supplierInvoiceNumber && (
              <span className="text-[11px] text-gray-400 font-mono">
                Vendor Ref: {row.supplierInvoiceNumber}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'finalAmount',
      header: 'Amount',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-gray-900">{formatCurrency(row.finalAmount)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={getStatusColor(row.status)}>
          {row.status.replace('_', ' ').toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'balanceDue',
      header: 'Balance Due',
      sortable: true,
      render: (row) => (
        <span
          className={`font-semibold text-xs ${
            row.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'
          }`}
        >
          {formatCurrency(row.balanceDue ?? 0)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            title="View Bill"
            onClick={() => navigate(`/purchases/${row._id}`)}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Print Bill"
            onClick={() => navigate(`/purchases/${row._id}?print=true`)}
            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4" />
          </button>
          {row.status !== 'cancelled' && (
            <button
              type="button"
              title="Cancel Bill"
              onClick={() => setCancellingBill(row)}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Ban className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ]

  const statusTabs: { key: StatusTab; label: string }[] = [
    { key: 'all', label: 'All Bills' },
    { key: 'draft', label: 'Draft' },
    { key: 'received', label: 'Received' },
    { key: 'paid', label: 'Paid' },
    { key: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Purchase Bills</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Record incoming vendor procurement, manage input tax credit (ITC) and liabilities
          </p>
        </div>
        <Link to="/purchases/new">
          <Button icon={<Plus className="w-4 h-4" />} size="md">
            Record Purchase Bill
          </Button>
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/5 to-transparent">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>TOTAL PURCHASE BILLS</span>
            <Truck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{summary.totalCount}</div>
          <span className="text-[11px] text-gray-400">Procurement records</span>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/5 to-transparent">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>TOTAL PROCUREMENT</span>
            <CheckCircle className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-600 mt-2">
            {formatCurrency(summary.totalValue)}
          </div>
          <span className="text-[11px] text-gray-400">Total bill expenses</span>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500/5 to-transparent">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>TOTAL PENDING PAYABLE</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2">
            {formatCurrency(summary.totalPayable)}
          </div>
          <span className="text-[11px] text-gray-400">Supplier outstanding balance</span>
        </Card>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-3 space-y-3">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-gray-100">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key)
                setPage(1)
              }}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-96">
          <Input
            placeholder="Search by bill # or vendor name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setPage(1)
            }}
            icon={<Search className="w-4 h-4 text-gray-400" />}
          />
        </div>
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl">
          Failed to load purchase bills. Please check connection.
        </div>
      )}

      {/* Table / Empty State */}
      {!isLoading && bills.length === 0 && !searchTerm && activeTab === 'all' ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <EmptyState
            icon={<Package className="w-10 h-10 text-gray-400" />}
            title="No purchase bills recorded yet"
            description="Record your vendor invoices to track stock additions, input GST and supplier dues."
            action={{
              label: 'Record First Purchase Bill',
              onClick: () => navigate('/purchases/new'),
            }}
          />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={bills}
          loading={isLoading}
          emptyTitle="No purchase bills found"
          emptyMessage="No bills match your current search or status filter."
          pagination={{
            page,
            pageSize: pagination.limit || 15,
            total: pagination.total || 0,
            onPageChange: (newPage) => setPage(newPage),
          }}
        />
      )}

      {/* Cancel Dialog */}
      <ConfirmDialog
        isOpen={Boolean(cancellingBill)}
        onClose={() => setCancellingBill(null)}
        onConfirm={() => cancellingBill && cancelMutation.mutate(cancellingBill._id)}
        title="Cancel Purchase Bill"
        message={`Are you sure you want to cancel bill #${cancellingBill?.billNumber}? Inventory added will be deducted.`}
        confirmText="Cancel Bill"
        variant="danger"
        loading={cancelMutation.isPending}
      />
    </div>
  )
}

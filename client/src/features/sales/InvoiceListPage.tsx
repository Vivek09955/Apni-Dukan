import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  Eye,
  Printer,
  Ban,
  FileSpreadsheet,
  AlertCircle,
  Receipt,
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
import { getInvoices, cancelInvoice } from '../../api/sales'
import { formatCurrency, formatDate, getStatusColor } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import type { SalesInvoice } from '../../types'

type StatusTab = 'all' | 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled'

export function InvoiceListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentBusiness } = useAuthStore()

  const [activeTab, setActiveTab] = useState<StatusTab>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [cancellingInvoice, setCancellingInvoice] = useState<SalesInvoice | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['salesInvoices', currentBusiness?._id, page, activeTab, searchTerm],
    queryFn: () =>
      getInvoices({
        page,
        limit: 15,
        status: activeTab === 'all' ? undefined : activeTab,
        search: searchTerm || undefined,
      }),
  })

  const invoices: SalesInvoice[] = data?.data?.invoices || data?.data || []
  const pagination = data?.data?.pagination || {
    page,
    limit: 15,
    total: invoices.length,
    totalPages: 1,
  }

  // Calculate summary figures
  const summary = useMemo(() => {
    const totalCount = pagination.total || invoices.length
    const totalValue = invoices.reduce((s, i) => s + (i.finalAmount || 0), 0)
    const totalOutstanding = invoices.reduce((s, i) => s + (i.balanceDue || 0), 0)
    return { totalCount, totalValue, totalOutstanding }
  }, [invoices, pagination.total])

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelInvoice(id, 'Cancelled by user'),
    onSuccess: () => {
      toast.success('Invoice cancelled successfully')
      queryClient.invalidateQueries({ queryKey: ['salesInvoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setCancellingInvoice(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to cancel invoice')
    },
  })

  const columns: Column<SalesInvoice>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      sortable: true,
      render: (row) => (
        <span
          className="font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
          onClick={() => navigate(`/sales/${row._id}`)}
        >
          {row.invoiceNumber}
        </span>
      ),
    },
    {
      key: 'invoiceDate',
      header: 'Date',
      sortable: true,
      render: (row) => formatDate(row.invoiceDate || row.createdAt),
    },
    {
      key: 'customerId',
      header: 'Customer',
      render: (row) => {
        const name = typeof row.customerId === 'object' ? row.customerId?.name : 'Cash Customer'
        return (
          <div>
            <span className="font-medium text-gray-900 block">{name || 'Cash Sale'}</span>
            {row.placeOfSupply && (
              <span className="text-[11px] text-gray-400">Place: {row.placeOfSupply}</span>
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
            row.balanceDue > 0 ? 'text-amber-600' : 'text-emerald-600'
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
            title="View Invoice"
            onClick={() => navigate(`/sales/${row._id}`)}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Print Invoice"
            onClick={() => navigate(`/sales/${row._id}?print=true`)}
            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4" />
          </button>
          {row.status !== 'cancelled' && (
            <button
              type="button"
              title="Cancel Invoice"
              onClick={() => setCancellingInvoice(row)}
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
    { key: 'all', label: 'All Invoices' },
    { key: 'draft', label: 'Draft' },
    { key: 'issued', label: 'Issued' },
    { key: 'paid', label: 'Paid' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Sales Invoices</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Create, manage and issue GST tax invoices, track settlements and dues
          </p>
        </div>
        <Link to="/sales/new">
          <Button icon={<Plus className="w-4 h-4" />} size="md">
            Create Invoice
          </Button>
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/5 to-transparent">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>TOTAL INVOICES</span>
            <Receipt className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{summary.totalCount}</div>
          <span className="text-[11px] text-gray-400">Recorded invoices</span>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/5 to-transparent">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>TOTAL BILLED VALUE</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">
            {formatCurrency(summary.totalValue)}
          </div>
          <span className="text-[11px] text-gray-400">Total gross billed</span>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/5 to-transparent">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>TOTAL OUTSTANDING</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">
            {formatCurrency(summary.totalOutstanding)}
          </div>
          <span className="text-[11px] text-gray-400">Pending customer receivables</span>
        </Card>
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-3 space-y-3">
        {/* Status Tabs */}
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

        {/* Search Input */}
        <div className="w-full sm:w-96">
          <Input
            placeholder="Search by invoice # or customer name..."
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
          Failed to load invoices. Please retry or check your network.
        </div>
      )}

      {/* Table / Empty State */}
      {!isLoading && invoices.length === 0 && !searchTerm && activeTab === 'all' ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <EmptyState
            icon={<FileSpreadsheet className="w-10 h-10 text-gray-400" />}
            title="No sales invoices created yet"
            description="Create your first GST invoice in seconds with automated tax calculations."
            action={{
              label: 'Create First Invoice',
              onClick: () => navigate('/sales/new'),
            }}
          />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={invoices}
          loading={isLoading}
          emptyTitle="No invoices found"
          emptyMessage="No invoices match the selected filter criteria."
          pagination={{
            page,
            pageSize: pagination.limit || 15,
            total: pagination.total || 0,
            onPageChange: (newPage) => setPage(newPage),
          }}
        />
      )}

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(cancellingInvoice)}
        onClose={() => setCancellingInvoice(null)}
        onConfirm={() => cancellingInvoice && cancelMutation.mutate(cancellingInvoice._id)}
        title="Cancel Invoice"
        message={`Are you sure you want to cancel invoice #${cancellingInvoice?.invoiceNumber}? Stock adjustments will be reverted.`}
        confirmText="Cancel Invoice"
        variant="danger"
        loading={cancelMutation.isPending}
      />
    </div>
  )
}

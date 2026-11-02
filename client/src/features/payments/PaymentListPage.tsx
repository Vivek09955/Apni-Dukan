import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  Eye,
  Ban,
  IndianRupee,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  Calendar,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { DataTable, Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { getPayments, cancelPayment } from '../../api/payments'
import { PaymentFormModal } from './PaymentFormModal'
import { formatCurrency, formatDate } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import type { Payment } from '../../types'

type TabType = 'all' | 'payment_in' | 'payment_out'

export function PaymentListPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { currentBusiness } = useAuthStore()

  // Default to payment_out if on /payments/out
  const isOutRoute = location.pathname.includes('/payments/out')
  const [activeTab, setActiveTab] = useState<TabType>(isOutRoute ? 'payment_out' : 'all')
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [cancellingPayment, setCancellingPayment] = useState<Payment | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['payments', currentBusiness?._id, page, activeTab, searchTerm, startDate, endDate],
    queryFn: () =>
      getPayments({
        page,
        limit: 15,
        type: activeTab === 'all' ? undefined : activeTab,
        search: searchTerm || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
  })

  const payments: Payment[] = data?.data?.payments || data?.data || []
  const pagination = data?.data?.pagination || {
    page,
    limit: 15,
    total: payments.length,
    totalPages: 1,
  }

  // Summary KPI figures
  const summary = useMemo(() => {
    let totalIn = 0
    let totalOut = 0

    payments.forEach((p) => {
      if (p.isCancelled) return
      if (p.type === 'payment_in') {
        totalIn += p.amount || 0
      } else {
        totalOut += p.amount || 0
      }
    })

    return {
      totalIn,
      totalOut,
      netFlow: totalIn - totalOut,
      count: pagination.total || payments.length,
    }
  }, [payments, pagination.total])

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => cancelPayment(id, reason),
    onSuccess: () => {
      toast.success('Payment cancelled successfully')
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['salesInvoices'] })
      queryClient.invalidateQueries({ queryKey: ['purchaseBills'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setCancellingPayment(null)
      setCancelReason('')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to cancel payment')
    },
  })

  const getPartyName = (row: Payment) => {
    if (!row.partyId) return 'General'
    if (typeof row.partyId === 'object') {
      return row.partyId.name || 'Unknown Party'
    }
    return String(row.partyId)
  }

  const columns: Column<Payment>[] = [
    {
      key: 'paymentNumber',
      header: 'Payment #',
      sortable: true,
      render: (row) => (
        <span
          className="font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
          onClick={() => navigate(`/payments/${row._id}`)}
        >
          {row.paymentNumber || row._id.slice(-8).toUpperCase()}
        </span>
      ),
    },
    {
      key: 'paymentDate',
      header: 'Date',
      sortable: true,
      render: (row) => formatDate(row.paymentDate || row.createdAt),
    },
    {
      key: 'partyId',
      header: 'Party Name',
      render: (row) => {
        const name = getPartyName(row)
        const typeLabel = row.partyType === 'customer' ? 'Customer' : 'Supplier'
        return (
          <div>
            <span className="font-medium text-gray-900 block">{name}</span>
            <span className="text-[11px] text-gray-400 capitalize">{typeLabel}</span>
          </div>
        )
      },
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) =>
        row.type === 'payment_in' ? (
          <Badge variant="success">
            <ArrowDownLeft className="w-3 h-3 mr-1 inline" /> Received
          </Badge>
        ) : (
          <Badge variant="danger">
            <ArrowUpRight className="w-3 h-3 mr-1 inline" /> Paid
          </Badge>
        ),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (row) => (
        <span
          className={`font-semibold ${
            row.type === 'payment_in' ? 'text-emerald-600' : 'text-rose-600'
          }`}
        >
          {row.type === 'payment_in' ? '+' : '-'} {formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Method',
      render: (row) => (
        <span className="capitalize text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
          {row.paymentMethod ? row.paymentMethod.replace('_', ' ') : 'Cash'}
        </span>
      ),
    },
    {
      key: 'isCancelled',
      header: 'Status',
      render: (row) =>
        row.isCancelled ? (
          <Badge variant="danger">Cancelled</Badge>
        ) : (
          <Badge variant="success">Completed</Badge>
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
            title="View Details"
            onClick={() => navigate(`/payments/${row._id}`)}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          {!row.isCancelled && (
            <button
              type="button"
              title="Cancel Payment"
              onClick={() => {
                setCancellingPayment(row)
                setCancelReason('Cancelled by user')
              }}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Ban className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ]

  const tabs: { key: TabType; label: string }[] = [
    { key: 'all', label: 'All Payments' },
    { key: 'payment_in', label: 'Payments In (Receipts)' },
    { key: 'payment_out', label: 'Payments Out (Disbursements)' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Payments & Settlements</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Track customer collections, supplier payouts, advance payments and invoice allocations
          </p>
        </div>
        <Button
          icon={<Plus className="w-4 h-4" />}
          size="md"
          onClick={() => setIsModalOpen(true)}
        >
          Record Payment
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/5 to-transparent">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>TOTAL RECEIVED (IN)</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">
            {formatCurrency(summary.totalIn)}
          </div>
          <span className="text-[11px] text-gray-400">Collections from customers</span>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500/5 to-transparent">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>TOTAL PAID (OUT)</span>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2">
            {formatCurrency(summary.totalOut)}
          </div>
          <span className="text-[11px] text-gray-400">Disbursements to suppliers</span>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/5 to-transparent">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>NET CASH FLOW</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div
            className={`text-2xl font-bold mt-2 ${
              summary.netFlow >= 0 ? 'text-blue-600' : 'text-amber-600'
            }`}
          >
            {formatCurrency(summary.netFlow)}
          </div>
          <span className="text-[11px] text-gray-400">Period net cash balance</span>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-3 space-y-3">
        {/* Type Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-gray-100">
          {tabs.map((tab) => (
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

        {/* Search & Date Range */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 sm:max-w-xs">
            <Input
              placeholder="Search by payment # or party name..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
              icon={<Search className="w-4 h-4 text-gray-400" />}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>From:</span>
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setPage(1)
              }}
              className="text-xs border border-gray-300 rounded-lg px-2.5 py-2 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span>To:</span>
            </div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setPage(1)
              }}
              className="text-xs border border-gray-300 rounded-lg px-2.5 py-2 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {(startDate || endDate || searchTerm) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('')
                setStartDate('')
                setEndDate('')
                setPage(1)
              }}
              className="text-xs text-blue-600 hover:underline px-2 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl">
          Failed to load payments. Please verify network or API status.
        </div>
      )}

      {/* Table / Empty State */}
      {!isLoading && payments.length === 0 && !searchTerm && !startDate && !endDate && activeTab === 'all' ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <EmptyState
            icon={<IndianRupee className="w-10 h-10 text-gray-400" />}
            title="No payments recorded yet"
            description="Record incoming customer receipts or vendor payouts to track balances and cashflow."
            action={{
              label: 'Record First Payment',
              onClick: () => setIsModalOpen(true),
            }}
          />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={payments}
          loading={isLoading}
          emptyTitle="No payments found"
          emptyMessage="No payments match the selected criteria."
          pagination={{
            page,
            pageSize: pagination.limit || 15,
            total: pagination.total || 0,
            onPageChange: (newPage) => setPage(newPage),
          }}
        />
      )}

      {/* Record Payment Modal */}
      <PaymentFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialType={activeTab === 'payment_out' ? 'payment_out' : 'payment_in'}
      />

      {/* Cancel Payment Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(cancellingPayment)}
        onClose={() => setCancellingPayment(null)}
        onConfirm={() =>
          cancellingPayment &&
          cancelMutation.mutate({
            id: cancellingPayment._id,
            reason: cancelReason || 'Cancelled by user',
          })
        }
        title="Cancel Payment"
        message={`Are you sure you want to cancel payment #${
          cancellingPayment?.paymentNumber || cancellingPayment?._id.slice(-6)
        }? Invoice balances and accounts will be reverted.`}
        confirmText="Yes, Cancel Payment"
        variant="danger"
        loading={cancelMutation.isPending}
      />
    </div>
  )
}

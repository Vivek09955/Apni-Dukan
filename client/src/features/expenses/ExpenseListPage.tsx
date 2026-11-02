import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  Eye,
  Ban,
  Receipt,
  Calendar,
  Layers,
  ArrowUpDown,
  Tag,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { DataTable, Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { getExpenses, cancelExpense } from '../../api/expenses'
import { ExpenseFormModal } from './ExpenseFormModal'
import { formatCurrency, formatDate } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import type { Expense } from '../../types'

const CATEGORY_TABS = [
  'All',
  'Rent',
  'Salary',
  'Electricity',
  'Transport',
  'Office Expenses',
  'Other',
]

export function ExpenseListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentBusiness } = useAuthStore()

  const [activeCategory, setActiveCategory] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [cancellingExpense, setCancellingExpense] = useState<Expense | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['expenses', currentBusiness?._id, page, activeCategory, searchTerm, startDate, endDate],
    queryFn: () =>
      getExpenses({
        page,
        limit: 15,
        category: activeCategory === 'All' ? undefined : activeCategory,
        search: searchTerm || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
  })

  const expenses: Expense[] = data?.data?.expenses || data?.data || []
  const pagination = data?.data?.pagination || {
    page,
    limit: 15,
    total: expenses.length,
    totalPages: 1,
  }

  // Summary figures
  const summary = useMemo(() => {
    let totalAmount = 0
    let activeCount = 0

    expenses.forEach((e) => {
      if (!e.isCancelled) {
        totalAmount += e.amount || 0
        activeCount++
      }
    })

    const avgExpense = activeCount > 0 ? Math.round(totalAmount / activeCount) : 0

    return {
      totalAmount,
      totalCount: pagination.total || expenses.length,
      avgExpense,
    }
  }, [expenses, pagination.total])

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => cancelExpense(id, reason),
    onSuccess: () => {
      toast.success('Expense cancelled successfully')
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['accounting'] })
      setCancellingExpense(null)
      setCancelReason('')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to cancel expense')
    },
  })

  const getCategoryBadgeVariant = (cat: string): 'default' | 'info' | 'warning' | 'success' | 'danger' => {
    switch (cat?.toLowerCase()) {
      case 'rent':
        return 'danger'
      case 'salary':
        return 'warning'
      case 'electricity':
        return 'info'
      case 'transport':
        return 'default'
      default:
        return 'default'
    }
  }

  const columns: Column<Expense>[] = [
    {
      key: 'expenseNumber',
      header: 'Expense #',
      sortable: true,
      render: (row) => (
        <span
          className="font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
          onClick={() => navigate(`/expenses/${row._id}`)}
        >
          {row.expenseNumber || row._id.slice(-8).toUpperCase()}
        </span>
      ),
    },
    {
      key: 'expenseDate',
      header: 'Date',
      sortable: true,
      render: (row) => formatDate(row.expenseDate || row.createdAt),
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => (
        <Badge variant={getCategoryBadgeVariant(row.category)}>
          {row.category}
        </Badge>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (row) => (
        <div>
          <span className="font-medium text-gray-900 block truncate max-w-xs">
            {row.description || row.notes || 'Operating expense'}
          </span>
          {row.vendorName && (
            <span className="text-[11px] text-gray-400">Paid to: {row.vendorName}</span>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-gray-900">{formatCurrency(row.amount)}</span>
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
        ) : row.isRecurring ? (
          <Badge variant="info">Recurring</Badge>
        ) : (
          <Badge variant="success">Paid</Badge>
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
            onClick={() => navigate(`/expenses/${row._id}`)}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          {!row.isCancelled && (
            <button
              type="button"
              title="Cancel Expense"
              onClick={() => {
                setCancellingExpense(row)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Operating Expenses</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Log shop overheads, rent, utility bills, employee payroll and daily operating costs
          </p>
        </div>
        <Button
          icon={<Plus className="w-4 h-4" />}
          size="md"
          onClick={() => setIsModalOpen(true)}
        >
          Add Expense
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-rose-500/5 to-transparent">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>TOTAL EXPENSES</span>
            <Receipt className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2">
            {formatCurrency(summary.totalAmount)}
          </div>
          <span className="text-[11px] text-gray-400">Total operational spend</span>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/5 to-transparent">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>EXPENSE ENTRIES</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{summary.totalCount}</div>
          <span className="text-[11px] text-gray-400">Recorded vouchers</span>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/5 to-transparent">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>AVERAGE EXPENSE</span>
            <ArrowUpDown className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">
            {formatCurrency(summary.avgExpense)}
          </div>
          <span className="text-[11px] text-gray-400">Per voucher cost</span>
        </Card>
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-3 space-y-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-gray-100">
          {CATEGORY_TABS.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setActiveCategory(cat)
                setPage(1)
              }}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search & Dates */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 sm:max-w-xs">
            <Input
              placeholder="Search by expense #, description, payee..."
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
          {(startDate || endDate || searchTerm || activeCategory !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('')
                setStartDate('')
                setEndDate('')
                setActiveCategory('All')
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
          Failed to load expenses. Please check network or retry.
        </div>
      )}

      {/* Table / Empty State */}
      {!isLoading && expenses.length === 0 && !searchTerm && !startDate && !endDate && activeCategory === 'All' ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <EmptyState
            icon={<Receipt className="w-10 h-10 text-gray-400" />}
            title="No expenses recorded yet"
            description="Keep track of store rent, utilities, electricity, and team wages in real-time."
            action={{
              label: 'Add First Expense',
              onClick: () => setIsModalOpen(true),
            }}
          />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={expenses}
          loading={isLoading}
          emptyTitle="No expenses found"
          emptyMessage="No expense vouchers match the selected filter criteria."
          pagination={{
            page,
            pageSize: pagination.limit || 15,
            total: pagination.total || 0,
            onPageChange: (newPage) => setPage(newPage),
          }}
        />
      )}

      {/* Modal Form */}
      <ExpenseFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Cancel Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(cancellingExpense)}
        onClose={() => setCancellingExpense(null)}
        onConfirm={() =>
          cancellingExpense &&
          cancelMutation.mutate({
            id: cancellingExpense._id,
            reason: cancelReason || 'Cancelled by user',
          })
        }
        title="Cancel Expense"
        message={`Are you sure you want to cancel expense #${
          cancellingExpense?.expenseNumber || cancellingExpense?._id.slice(-6)
        } for ${formatCurrency(cancellingExpense?.amount || 0)}? This will reverse the general ledger entries.`}
        confirmText="Cancel Expense"
        variant="danger"
        loading={cancelMutation.isPending}
      />
    </div>
  )
}

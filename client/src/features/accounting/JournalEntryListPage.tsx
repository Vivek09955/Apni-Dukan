import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Plus,
  Search,
  Eye,
  BookOpen,
  Calendar,
  Layers,
  ArrowUpDown,
  FileSpreadsheet,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { DataTable, Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { getJournalEntries } from '../../api/accounting'
import { JournalEntryFormModal } from './JournalEntryFormModal'
import { formatCurrency, formatDate } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import type { JournalEntry } from '../../types'

export function JournalEntryListPage() {
  const navigate = useNavigate()
  const { currentBusiness } = useAuthStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['journal-entries', currentBusiness?._id, page, searchTerm, startDate, endDate],
    queryFn: () =>
      getJournalEntries({
        page,
        limit: 15,
        search: searchTerm || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
  })

  const entries: JournalEntry[] = data?.data?.entries || data?.data || []
  const pagination = data?.data?.pagination || {
    page,
    limit: 15,
    total: entries.length,
    totalPages: 1,
  }

  const columns: Column<JournalEntry>[] = [
    {
      key: 'entryNumber',
      header: 'Entry #',
      sortable: true,
      render: (row) => (
        <span
          className={`font-semibold cursor-pointer ${
            row.isReversed
              ? 'line-through text-gray-400 hover:text-gray-600'
              : 'text-blue-600 hover:text-blue-800'
          }`}
          onClick={() => navigate(`/accounting/${row._id}`)}
        >
          {row.entryNumber || row._id.slice(-8).toUpperCase()}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (row) => (
        <span className={row.isReversed ? 'line-through text-gray-400' : ''}>
          {formatDate(row.date || row.createdAt)}
        </span>
      ),
    },
    {
      key: 'narration',
      header: 'Narration / Description',
      render: (row) => (
        <div className="max-w-md truncate">
          <span
            className={`font-medium block truncate ${
              row.isReversed ? 'line-through text-gray-400' : 'text-gray-900'
            }`}
          >
            {row.narration}
          </span>
          <span className="text-[11px] text-gray-400">
            {row.lines?.length || 0} line{row.lines?.length === 1 ? '' : 's'}
          </span>
        </div>
      ),
    },
    {
      key: 'debit',
      header: 'Total Debit',
      sortable: true,
      render: (row) => {
        const totalDebit = (row.lines || []).reduce((s, l) => s + (l.debit || 0), 0)
        return (
          <span
            className={`font-semibold ${
              row.isReversed ? 'line-through text-gray-400' : 'text-gray-900'
            }`}
          >
            {formatCurrency(totalDebit)}
          </span>
        )
      },
    },
    {
      key: 'credit',
      header: 'Total Credit',
      sortable: true,
      render: (row) => {
        const totalCredit = (row.lines || []).reduce((s, l) => s + (l.credit || 0), 0)
        return (
          <span
            className={`font-semibold ${
              row.isReversed ? 'line-through text-gray-400' : 'text-gray-900'
            }`}
          >
            {formatCurrency(totalCredit)}
          </span>
        )
      },
    },
    {
      key: 'referenceType',
      header: 'Reference',
      render: (row) => (
        <span className="text-xs text-gray-500 capitalize">
          {row.referenceType ? row.referenceType.replace('_', ' ') : 'Manual Voucher'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) =>
        row.isReversed ? (
          <Badge variant="danger">Reversed</Badge>
        ) : (
          <Badge variant="success">Posted</Badge>
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
            title="View Journal Entry"
            onClick={() => navigate(`/accounting/${row._id}`)}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">General Journal Entries</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Double-entry transactions, adjustments, transfers, year-end closings, and reversals
          </p>
        </div>
        <Button
          icon={<Plus className="w-4 h-4" />}
          size="md"
          onClick={() => setIsModalOpen(true)}
        >
          New Entry
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-3 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 sm:max-w-sm">
            <Input
              placeholder="Search by entry # or narration..."
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
          Failed to load journal entries. Please retry.
        </div>
      )}

      {/* Table / Empty State */}
      {!isLoading && entries.length === 0 && !searchTerm && !startDate && !endDate ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <EmptyState
            icon={<BookOpen className="w-10 h-10 text-gray-400" />}
            title="No manual journal entries posted yet"
            description="Create adjusting journal vouchers, bank transfers, or asset depreciation entries."
            action={{
              label: 'Create First Journal Entry',
              onClick: () => setIsModalOpen(true),
            }}
          />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={entries}
          loading={isLoading}
          emptyTitle="No journal entries found"
          emptyMessage="No entries match the selected filters."
          pagination={{
            page,
            pageSize: pagination.limit || 15,
            total: pagination.total || 0,
            onPageChange: (newPage) => setPage(newPage),
          }}
        />
      )}

      {/* New Journal Entry Modal */}
      <JournalEntryFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}

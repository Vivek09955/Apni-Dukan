import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  Eye,
  FileCheck,
  Trash2,
  FileText,
  Clock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { DataTable, Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { getQuotations, convertToInvoice, deleteQuotation } from '../../api/quotations'
import { formatCurrency, formatDate, getStatusColor } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import type { Quotation } from '../../types'

type StatusTab = 'all' | 'draft' | 'sent' | 'accepted' | 'expired' | 'converted'

export function QuotationListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentBusiness } = useAuthStore()

  const [activeTab, setActiveTab] = useState<StatusTab>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [convertingQuotation, setConvertingQuotation] = useState<Quotation | null>(null)
  const [deletingQuotation, setDeletingQuotation] = useState<Quotation | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', currentBusiness?._id, page, activeTab, searchTerm],
    queryFn: () =>
      getQuotations({
        page,
        limit: 15,
        status: activeTab === 'all' ? undefined : activeTab,
        search: searchTerm || undefined,
      }),
  })

  const rawQuotations = data?.data?.quotations || (Array.isArray(data?.data) ? data?.data : [])
  const quotations: Quotation[] = Array.isArray(rawQuotations) ? rawQuotations : []
  const pagination = data?.data?.pagination || {
    page,
    limit: 15,
    total: quotations.length,
    totalPages: 1,
  }

  // Summary figures
  const summary = useMemo(() => {
    const totalCount = quotations.length
    const totalValue = quotations.reduce((acc, q) => acc + (q.finalAmount || 0), 0)
    const acceptedValue = quotations
      .filter((q) => q.status === 'accepted' || q.status === 'converted')
      .reduce((acc, q) => acc + (q.finalAmount || 0), 0)
    return { totalCount, totalValue, acceptedValue }
  }, [quotations])

  // Convert Mutation
  const convertMutation = useMutation({
    mutationFn: (id: string) => convertToInvoice(id),
    onSuccess: (res) => {
      toast.success('Quotation successfully converted to Sales Invoice!')
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      queryClient.invalidateQueries({ queryKey: ['salesInvoices'] })
      setConvertingQuotation(null)
      const invoiceId = res?.data?.invoiceId
      if (invoiceId) {
        navigate(`/sales/${invoiceId}`)
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to convert quotation')
    },
  })

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteQuotation(id),
    onSuccess: () => {
      toast.success('Quotation deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      setDeletingQuotation(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete quotation')
    },
  })

  const columns: Column<Quotation>[] = [
    {
      key: 'quotationNumber',
      header: 'Quote #',
      sortable: true,
      render: (row) => (
        <span
          className="font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
          onClick={() => navigate(`/sales/quotations/${row._id}`)}
        >
          {row.quotationNumber}
        </span>
      ),
    },
    {
      key: 'quotationDate',
      header: 'Date',
      sortable: true,
      render: (row) => formatDate(row.quotationDate || row.createdAt),
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
      key: 'validUntil',
      header: 'Valid Until',
      render: (row) => (
        <span className="text-gray-600 text-sm">
          {row.validUntil ? formatDate(row.validUntil) : '-'}
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
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate(`/sales/quotations/${row._id}`)}
            title="View Details"
          >
            <Eye className="w-4 h-4 text-gray-600" />
          </Button>

          {(row.status === 'accepted' || row.status === 'sent') && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              onClick={() => setConvertingQuotation(row)}
              title="Convert to Invoice"
            >
              <FileCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Convert
            </Button>
          )}

          {row.status === 'draft' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDeletingQuotation(row)}
              title="Delete Quotation"
            >
              <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  const statusTabs: { label: string; value: StatusTab }[] = [
    { label: 'All Quotations', value: 'all' },
    { label: 'Draft', value: 'draft' },
    { label: 'Sent', value: 'sent' },
    { label: 'Accepted', value: 'accepted' },
    { label: 'Converted', value: 'converted' },
    { label: 'Expired', value: 'expired' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Quotations & Estimates</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create, send, and track business estimates and convert them into sales invoices.
          </p>
        </div>
        <Link to="/sales/quotations/new">
          <Button icon={<Plus className="w-4 h-4" />}>
            Create Quotation
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white border border-gray-100 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Quotes</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{summary.totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 bg-white border border-gray-100 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Quote Value</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.totalValue)}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 bg-white border border-gray-100 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Accepted / Converted</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(summary.acceptedValue)}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Filters and Tabs */}
      <Card className="p-4 bg-white border border-gray-200">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Status Tabs */}
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

          {/* Search Box */}
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search quote # or customer..."
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
      {quotations.length === 0 && !isLoading ? (
        <EmptyState
          title="No quotations found"
          description={
            searchTerm
              ? 'No quotations matched your search criteria.'
              : 'You have not created any quotations yet. Create one to send estimates to clients.'
          }
          actionLabel="Create Quotation"
          onAction={() => navigate('/sales/quotations/new')}
        />
      ) : (
        <DataTable
          columns={columns}
          data={quotations}
          loading={isLoading}
          pagination={{
            page: pagination.page,
            pageSize: pagination.limit || 15,
            total: pagination.total || quotations.length,
            onPageChange: (p) => setPage(p),
          }}
        />
      )}

      {/* Convert Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(convertingQuotation)}
        onClose={() => setConvertingQuotation(null)}
        onConfirm={() => {
          if (convertingQuotation) {
            convertMutation.mutate(convertingQuotation._id)
          }
        }}
        title="Convert to Sales Invoice?"
        message={`This will convert quotation ${convertingQuotation?.quotationNumber} into an active sales invoice. Tax invoices will be issued and inventory will be tracked.`}
        confirmText="Convert to Invoice"
        variant="warning"
        loading={convertMutation.isPending}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingQuotation)}
        onClose={() => setDeletingQuotation(null)}
        onConfirm={() => {
          if (deletingQuotation) {
            deleteMutation.mutate(deletingQuotation._id)
          }
        }}
        title="Delete Quotation?"
        message={`Are you sure you want to delete quotation ${deletingQuotation?.quotationNumber}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  Truck,
  CheckCircle2,
  Clock,
  Trash2,
  Printer,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { DataTable, Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { getDeliveryChallans, updateDeliveryChallanStatus } from '../../api/deliveryChallans'
import { formatDate, getStatusColor } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import type { DeliveryChallan } from '../../types'

type StatusTab = 'all' | 'draft' | 'dispatched' | 'delivered' | 'cancelled'

export function DeliveryChallanListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentBusiness } = useAuthStore()

  const [activeTab, setActiveTab] = useState<StatusTab>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [deliveringChallan, setDeliveringChallan] = useState<DeliveryChallan | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['deliveryChallans', currentBusiness?._id, page, activeTab, searchTerm],
    queryFn: () =>
      getDeliveryChallans({
        page,
        limit: 15,
        status: activeTab === 'all' ? undefined : activeTab,
        search: searchTerm || undefined,
      }),
  })

  const rawChallans = data?.data?.challans || (Array.isArray(data?.data) ? data?.data : [])
  const challans: DeliveryChallan[] = Array.isArray(rawChallans) ? rawChallans : []
  const pagination = data?.data?.pagination || {
    page,
    limit: 15,
    total: challans.length,
    totalPages: 1,
  }

  // Summary
  const summary = useMemo(() => {
    const totalCount = challans.length
    const dispatchedCount = challans.filter((c) => c.status === 'dispatched').length
    const deliveredCount = challans.filter((c) => c.status === 'delivered').length
    return { totalCount, dispatchedCount, deliveredCount }
  }, [challans])

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateDeliveryChallanStatus(id, status),
    onSuccess: () => {
      toast.success('Challan status updated!')
      queryClient.invalidateQueries({ queryKey: ['deliveryChallans'] })
      setDeliveringChallan(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update challan status')
    },
  })

  const columns: Column<DeliveryChallan>[] = [
    {
      key: 'challanNumber',
      header: 'Challan #',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-blue-600">
          {row.challanNumber}
        </span>
      ),
    },
    {
      key: 'challanDate',
      header: 'Date',
      sortable: true,
      render: (row) => formatDate(row.challanDate || row.createdAt),
    },
    {
      key: 'customerId',
      header: 'Customer',
      render: (row) => {
        const custName =
          typeof row.customerId === 'object' && row.customerId !== null
            ? row.customerId.name
            : 'Customer'
        return <span className="font-medium text-gray-900">{custName}</span>
      },
    },
    {
      key: 'items',
      header: 'Items',
      render: (row) => (
        <span className="text-gray-700 font-medium">
          {row.items?.length || 0} item{row.items?.length === 1 ? '' : 's'}
        </span>
      ),
    },
    {
      key: 'vehicleNumber',
      header: 'Vehicle / Transporter',
      render: (row) => (
        <div className="text-xs">
          <p className="font-mono text-gray-800">{row.vehicleNumber || '-'}</p>
          {row.transporterName && (
            <p className="text-gray-500">{row.transporterName}</p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const variant = getStatusColor(row.status)
        return (
          <Badge variant={variant} className="capitalize">
            {row.status}
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
          {row.status === 'dispatched' && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              onClick={() => setDeliveringChallan(row)}
              title="Mark Delivered"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Mark Delivered
            </Button>
          )}
        </div>
      ),
    },
  ]

  const statusTabs: { label: string; value: StatusTab }[] = [
    { label: 'All Challans', value: 'all' },
    { label: 'Draft', value: 'draft' },
    { label: 'Dispatched', value: 'dispatched' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'Cancelled', value: 'cancelled' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Delivery Challans</h1>
          <p className="text-sm text-gray-500 mt-1">
            Dispatch products to buyers or warehouse branches without price mentions on delivery notes.
          </p>
        </div>
        <Link to="/sales/challans/new">
          <Button icon={<Plus className="w-4 h-4" />}>
            Create Challan
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white border border-gray-100 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Challans</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{summary.totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 bg-white border border-gray-100 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">In Transit</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{summary.dispatchedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 bg-white border border-gray-100 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Delivered</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{summary.deliveredCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
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
              placeholder="Search challan # or vehicle..."
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
      {challans.length === 0 && !isLoading ? (
        <EmptyState
          title="No delivery challans found"
          description={
            searchTerm
              ? 'No challans match your search.'
              : 'Create a delivery challan to accompany shipments and goods dispatched.'
          }
          actionLabel="Create Challan"
          onAction={() => navigate('/sales/challans/new')}
        />
      ) : (
        <DataTable
          columns={columns}
          data={challans}
          loading={isLoading}
          pagination={{
            page: pagination.page,
            pageSize: pagination.limit || 15,
            total: pagination.total || challans.length,
            onPageChange: (p) => setPage(p),
          }}
        />
      )}

      {/* Mark Delivered Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deliveringChallan)}
        onClose={() => setDeliveringChallan(null)}
        onConfirm={() => {
          if (deliveringChallan) {
            statusMutation.mutate({ id: deliveringChallan._id, status: 'delivered' })
          }
        }}
        title="Mark Delivery as Completed?"
        message={`Confirm delivery receipt for challan ${deliveringChallan?.challanNumber}?`}
        confirmText="Confirm Delivered"
        variant="warning"
        loading={statusMutation.isPending}
      />
    </div>
  )
}

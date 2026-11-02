import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Edit2, Trash2, Eye, Truck } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { DataTable, Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { SupplierFormModal } from './SupplierFormModal'
import { getSuppliers, deleteSupplier } from '../../api/suppliers'
import { formatCurrency } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import type { Supplier } from '../../types'

export function SupplierListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentBusiness } = useAuthStore()

  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['suppliers', currentBusiness?._id, page, debouncedSearch],
    queryFn: () =>
      getSuppliers({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
      }),
  })

  const suppliers: Supplier[] = data?.data?.suppliers || data?.data || []
  const pagination = data?.data?.pagination || {
    page,
    limit: 10,
    total: suppliers.length,
    totalPages: 1,
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSupplier(id),
    onSuccess: () => {
      toast.success('Supplier deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setDeletingSupplier(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete supplier')
    },
  })

  const handleOpenAdd = () => {
    setEditingSupplier(null)
    setIsFormOpen(true)
  }

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s)
    setIsFormOpen(true)
  }

  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      header: 'Supplier Name',
      sortable: true,
      render: (row) => (
        <div
          className="cursor-pointer group"
          onClick={() => navigate(`/suppliers/${row._id}`)}
        >
          <span className="font-semibold text-gray-900 block group-hover:text-blue-600 transition-colors">
            {row.name}
          </span>
          {row.email && <span className="text-xs text-gray-400">{row.email}</span>}
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (row) => <span className="text-gray-600 text-xs">{row.phone || '-'}</span>,
    },
    {
      key: 'gstin',
      header: 'GSTIN',
      render: (row) => <span className="font-mono text-xs text-gray-600">{row.gstin || '-'}</span>,
    },
    {
      key: 'totalPayable',
      header: 'Payable Due',
      sortable: true,
      render: (row) => {
        const amt = row.totalPayable ?? row.openingBalance ?? 0
        return (
          <span className={`font-semibold text-xs ${amt > 0 ? 'text-rose-600' : 'text-gray-700'}`}>
            {formatCurrency(amt)}
          </span>
        )
      },
    },
    {
      key: 'creditDays',
      header: 'Credit Days',
      render: (row) => <span className="text-gray-600 text-xs">{row.creditDays ?? 30} days</span>,
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.isActive !== false ? 'success' : 'default'}>
          {row.isActive !== false ? 'Active' : 'Inactive'}
        </Badge>
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
            onClick={() => navigate(`/suppliers/${row._id}`)}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Edit Supplier"
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Delete Supplier"
            onClick={() => setDeletingSupplier(row)}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Suppliers & Vendors</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage your suppliers, track purchase dues, ledger balances and credit windows
          </p>
        </div>
        <Button onClick={handleOpenAdd} icon={<Plus className="w-4 h-4" />}>
          Add Supplier
        </Button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-96">
          <Input
            placeholder="Search suppliers by name, phone or GSTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="w-4 h-4 text-gray-400" />}
          />
        </div>
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl">
          Failed to load suppliers. Please check connection and try again.
        </div>
      )}

      {!isLoading && suppliers.length === 0 && !debouncedSearch ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <EmptyState
            icon={<Truck className="w-10 h-10 text-gray-400" />}
            title="No suppliers added"
            description="Add your first supplier or distributor to record purchases and bills."
            action={{
              label: 'Add First Supplier',
              onClick: handleOpenAdd,
            }}
          />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={suppliers}
          loading={isLoading}
          emptyTitle="No matching suppliers"
          emptyMessage="Try adjusting your search query"
          pagination={{
            page,
            pageSize: pagination.limit || 10,
            total: pagination.total || 0,
            onPageChange: (newPage) => setPage(newPage),
          }}
        />
      )}

      <SupplierFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingSupplier(null)
        }}
        supplier={editingSupplier}
      />

      <ConfirmDialog
        isOpen={Boolean(deletingSupplier)}
        onClose={() => setDeletingSupplier(null)}
        onConfirm={() => deletingSupplier && deleteMutation.mutate(deletingSupplier._id)}
        title="Delete Supplier"
        message={`Are you sure you want to delete "${deletingSupplier?.name}"? Outstanding purchase records may remain in reports.`}
        confirmText="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Edit2, Trash2, Eye, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { DataTable, Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { CustomerFormModal } from './CustomerFormModal'
import { getCustomers, deleteCustomer } from '../../api/customers'
import { formatCurrency } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import type { Customer } from '../../types'

export function CustomerListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentBusiness } = useAuthStore()

  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['customers', currentBusiness?._id, page, debouncedSearch],
    queryFn: () =>
      getCustomers({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
      }),
  })

  const customers: Customer[] = data?.data?.customers || data?.data || []
  const pagination = data?.data?.pagination || {
    page,
    limit: 10,
    total: customers.length,
    totalPages: 1,
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCustomer(id),
    onSuccess: () => {
      toast.success('Customer deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setDeletingCustomer(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete customer')
    },
  })

  const handleOpenAdd = () => {
    setEditingCustomer(null)
    setIsFormOpen(true)
  }

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c)
    setIsFormOpen(true)
  }

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Customer Name',
      sortable: true,
      render: (row) => (
        <div
          className="cursor-pointer group"
          onClick={() => navigate(`/customers/${row._id}`)}
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
      key: 'totalReceivable',
      header: 'Receivable Due',
      sortable: true,
      render: (row) => {
        const amt = row.totalReceivable ?? row.openingBalance ?? 0
        return (
          <span className={`font-semibold text-xs ${amt > 0 ? 'text-amber-600' : 'text-gray-700'}`}>
            {formatCurrency(amt)}
          </span>
        )
      },
    },
    {
      key: 'creditLimit',
      header: 'Credit Limit',
      render: (row) => (
        <span className="text-gray-600 text-xs">
          {row.creditLimit ? formatCurrency(row.creditLimit) : 'No limit'}
        </span>
      ),
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
            onClick={() => navigate(`/customers/${row._id}`)}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Edit Customer"
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Delete Customer"
            onClick={() => setDeletingCustomer(row)}
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Customers</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage your customer database, addresses, GST details and track dues
          </p>
        </div>
        <Button onClick={handleOpenAdd} icon={<Plus className="w-4 h-4" />}>
          Add Customer
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-96">
          <Input
            placeholder="Search customers by name, phone or GSTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="w-4 h-4 text-gray-400" />}
          />
        </div>
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl">
          Failed to load customers. Please verify connection and retry.
        </div>
      )}

      {/* Data Table */}
      {!isLoading && customers.length === 0 && !debouncedSearch ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <EmptyState
            icon={<Users className="w-10 h-10 text-gray-400" />}
            title="No customers yet"
            description="Add your first customer to start creating sales invoices and tracking receivables."
            action={{
              label: 'Add First Customer',
              onClick: handleOpenAdd,
            }}
          />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={customers}
          loading={isLoading}
          emptyTitle="No matching customers"
          emptyMessage="Try adjusting your search criteria"
          pagination={{
            page,
            pageSize: pagination.limit || 10,
            total: pagination.total || 0,
            onPageChange: (newPage) => setPage(newPage),
          }}
        />
      )}

      {/* Customer Form Modal */}
      <CustomerFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingCustomer(null)
        }}
        customer={editingCustomer}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingCustomer)}
        onClose={() => setDeletingCustomer(null)}
        onConfirm={() => deletingCustomer && deleteMutation.mutate(deletingCustomer._id)}
        title="Delete Customer"
        message={`Are you sure you want to delete "${deletingCustomer?.name}"? Past invoice records may remain linked.`}
        confirmText="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

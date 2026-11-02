import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Edit2, Trash2, ArrowUpDown, Layers } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { DataTable, Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { ProductFormModal } from './ProductFormModal'
import { StockAdjustmentModal } from './StockAdjustmentModal'
import { getProducts, deleteProduct, getCategories } from '../../api/products'
import { formatCurrency } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import type { Product, Category } from '../../types'

export function ProductListPage() {
  const queryClient = useQueryClient()
  const { currentBusiness } = useAuthStore()

  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Fetch categories for filter dropdown
  const { data: categoriesData } = useQuery({
    queryKey: ['categories', currentBusiness?._id],
    queryFn: () => getCategories(),
  })
  const categories: Category[] = categoriesData?.data?.categories || categoriesData?.data || []

  // Fetch products
  const { data, isLoading, isError } = useQuery({
    queryKey: ['products', currentBusiness?._id, page, debouncedSearch, selectedCategory],
    queryFn: () =>
      getProducts({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        category: selectedCategory || undefined,
      }),
  })

  const products: Product[] = data?.data?.products || data?.data || []
  const pagination = data?.data?.pagination || {
    page,
    limit: 10,
    total: products.length,
    totalPages: 1,
  }

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      toast.success('Product deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setDeletingProduct(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete product')
    },
  })

  const handleOpenAdd = () => {
    setEditingProduct(null)
    setIsFormOpen(true)
  }

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p)
    setIsFormOpen(true)
  }

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Product Name',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-semibold text-gray-900 block hover:text-blue-600 transition-colors">
            {row.name}
          </span>
          {row.brand && <span className="text-xs text-gray-400">{row.brand}</span>}
        </div>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      render: (row) => <span className="font-mono text-xs text-gray-600">{row.sku || '-'}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => {
        const catName = typeof row.category === 'object' ? row.category?.name : '-'
        return <span className="text-gray-600 text-xs">{catName || '-'}</span>
      },
    },
    {
      key: 'sellingPrice',
      header: 'Selling Price',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-gray-900">{formatCurrency(row.sellingPrice)}</span>
      ),
    },
    {
      key: 'currentStock',
      header: 'Stock',
      render: (row) => {
        const stock = row.currentStock ?? row.openingStock ?? 0
        const isLow = row.trackInventory && stock <= (row.reorderLevel || 5)
        return (
          <div className="flex items-center gap-1.5">
            <span className={`font-semibold text-xs ${isLow ? 'text-red-600' : 'text-gray-800'}`}>
              {stock} {row.unit}
            </span>
            {isLow && (
              <Badge variant="danger" className="text-[10px] py-0 px-1.5">
                Low
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      key: 'taxRate',
      header: 'Tax Rate',
      render: (row) => (
        <Badge variant="info">
          {row.taxRate}% {row.taxInclusive ? '(Inc)' : ''}
        </Badge>
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
            title="Adjust Stock"
            onClick={() => setAdjustingProduct(row)}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Edit Product"
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Delete Product"
            onClick={() => setDeletingProduct(row)}
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
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Products</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage your store catalog, pricing, tax rates and real-time inventory
          </p>
        </div>
        <Button onClick={handleOpenAdd} icon={<Plus className="w-4 h-4" />}>
          Add Product
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search products by name, SKU or brand..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="w-4 h-4 text-gray-400" />}
          />
        </div>

        <div className="w-full sm:w-60">
          <Select
            placeholder="All Categories"
            options={[
              { value: '', label: 'All Categories' },
              ...categories.map((c) => ({ value: c._id, label: c.name })),
            ]}
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value)
              setPage(1)
            }}
          />
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl">
          Failed to load products. Please check your network connection and try again.
        </div>
      )}

      {/* Data Table */}
      {!isLoading && products.length === 0 && !debouncedSearch && !selectedCategory ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <EmptyState
            icon={<Layers className="w-10 h-10 text-gray-400" />}
            title="No products yet"
            description="Add your first product to get started with billing, purchases and inventory tracking."
            action={{
              label: 'Add First Product',
              onClick: handleOpenAdd,
            }}
          />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={products}
          loading={isLoading}
          emptyTitle="No matching products"
          emptyMessage="Try adjusting your search or category filter"
          pagination={{
            page,
            pageSize: pagination.limit || 10,
            total: pagination.total || 0,
            onPageChange: (newPage) => setPage(newPage),
          }}
        />
      )}

      {/* Product Add/Edit Modal */}
      <ProductFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingProduct(null)
        }}
        product={editingProduct}
      />

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={Boolean(adjustingProduct)}
        onClose={() => setAdjustingProduct(null)}
        product={adjustingProduct}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingProduct)}
        onClose={() => setDeletingProduct(null)}
        onConfirm={() => deletingProduct && deleteMutation.mutate(deletingProduct._id)}
        title="Delete Product"
        message={`Are you sure you want to delete "${deletingProduct?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

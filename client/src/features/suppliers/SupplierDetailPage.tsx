import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Truck,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Calendar,
  FileText,
  Clock,
  Edit2,
  ArrowUpRight,
  Receipt,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { DataTable, Column } from '../../components/ui/DataTable'
import { SupplierFormModal } from './SupplierFormModal'
import { getSupplier, getSupplierLedger } from '../../api/suppliers'
import { getPurchaseBills } from '../../api/purchases'
import { formatCurrency, formatDate, getStatusColor } from '../../lib/utils'
import type { Supplier, PurchaseBill } from '../../types'

type TabType = 'bills' | 'ledger'

export function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<TabType>('bills')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const { data: supplierData, isLoading: isSupplierLoading } = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => getSupplier(id!),
    enabled: Boolean(id),
  })

  const { data: billsData, isLoading: isBillsLoading } = useQuery({
    queryKey: ['supplierBills', id],
    queryFn: () => getPurchaseBills({ supplierId: id }),
    enabled: Boolean(id) && activeTab === 'bills',
  })

  const { data: ledgerData, isLoading: isLedgerLoading } = useQuery({
    queryKey: ['supplierLedger', id],
    queryFn: () => getSupplierLedger(id!),
    enabled: Boolean(id) && activeTab === 'ledger',
  })

  const supplier: Supplier | null = supplierData?.data?.supplier || supplierData?.data || null
  const purchaseBills: PurchaseBill[] = billsData?.data?.bills || billsData?.data || []
  const ledgerEntries: any[] = ledgerData?.data?.ledger || ledgerData?.data || []

  // Calculated metrics
  const totalPayable = supplier?.totalPayable ?? supplier?.openingBalance ?? 0
  const totalBilled = purchaseBills.reduce((acc, b) => acc + (b.finalAmount || 0), 0)
  const totalPaid = Math.max(0, totalBilled - totalPayable)

  const billColumns: Column<PurchaseBill>[] = [
    {
      key: 'billNumber',
      header: 'Bill #',
      render: (row) => (
        <Link
          to={`/purchases/${row._id}`}
          className="font-semibold text-blue-600 hover:text-blue-800 transition-colors"
        >
          {row.billNumber}
        </Link>
      ),
    },
    {
      key: 'billDate',
      header: 'Date',
      render: (row) => formatDate(row.billDate || row.createdAt),
    },
    {
      key: 'finalAmount',
      header: 'Amount',
      render: (row) => (
        <span className="font-semibold text-gray-900">{formatCurrency(row.finalAmount)}</span>
      ),
    },
    {
      key: 'paidAmount',
      header: 'Paid Amount',
      render: (row) => (
        <span className="text-emerald-600 font-medium">{formatCurrency(row.paidAmount || 0)}</span>
      ),
    },
    {
      key: 'balanceDue',
      header: 'Balance Due',
      render: (row) => (
        <span className={`font-semibold ${row.balanceDue > 0 ? 'text-rose-600' : 'text-gray-600'}`}>
          {formatCurrency(row.balanceDue ?? 0)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={getStatusColor(row.status)}>
          {row.status?.replace('_', ' ').toUpperCase()}
        </Badge>
      ),
    },
  ]

  const ledgerColumns: Column<any>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (row) => formatDate(row.date || row.createdAt),
    },
    {
      key: 'description',
      header: 'Particulars',
      render: (row) => (
        <div>
          <span className="font-medium text-gray-900">{row.description || row.narration || '-'}</span>
          {row.reference && <span className="text-xs text-gray-400 block">Ref: {row.reference}</span>}
        </div>
      ),
    },
    {
      key: 'credit',
      header: 'Credit (₹)',
      render: (row) => (
        <span className="text-emerald-600 font-medium">
          {row.credit ? formatCurrency(row.credit) : '-'}
        </span>
      ),
    },
    {
      key: 'debit',
      header: 'Debit (₹)',
      render: (row) => (
        <span className="text-rose-600 font-medium">
          {row.debit ? formatCurrency(row.debit) : '-'}
        </span>
      ),
    },
    {
      key: 'balance',
      header: 'Closing Balance',
      render: (row) => (
        <span className="font-semibold text-gray-900">
          {formatCurrency(row.balance ?? row.runningBalance ?? 0)}
        </span>
      ),
    },
  ]

  if (isSupplierLoading) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500">Loading supplier details...</p>
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className="text-center py-20 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Supplier not found</h3>
        <Link to="/suppliers">
          <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>
            Back to Suppliers
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/suppliers"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Suppliers</span>
        </Link>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsEditModalOpen(true)}
            icon={<Edit2 className="w-4 h-4" />}
          >
            Edit Supplier
          </Button>
          <Link to={`/purchases/new?supplierId=${supplier._id}`}>
            <Button icon={<FileText className="w-4 h-4" />}>Record Purchase Bill</Button>
          </Link>
        </div>
      </div>

      {/* Supplier Profile Card */}
      <Card className="border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Truck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
                <Badge variant={supplier.isActive !== false ? 'success' : 'default'}>
                  {supplier.isActive !== false ? 'Active Supplier' : 'Inactive'}
                </Badge>
                {supplier.group && <Badge variant="info">{supplier.group}</Badge>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-1.5 gap-x-6 mt-3 text-xs text-gray-600">
                {supplier.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{supplier.phone}</span>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span>{supplier.email}</span>
                  </div>
                )}
                {supplier.gstin && (
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-mono">GSTIN: {supplier.gstin}</span>
                  </div>
                )}
                {supplier.address?.city && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>
                      {supplier.address.line1 ? `${supplier.address.line1}, ` : ''}
                      {supplier.address.city}, {supplier.address.state || ''}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span>Credit Window: {supplier.creditDays || 30} Days</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>TOTAL PURCHASED</span>
            <Receipt className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-gray-900">{formatCurrency(totalBilled)}</div>
          <p className="text-[11px] text-gray-400 mt-1">Total procurement bills entered</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>TOTAL PAID</span>
            <ArrowUpRight className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</div>
          <p className="text-[11px] text-gray-400 mt-1">Settled payments to vendor</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>PENDING TO PAY</span>
            <Calendar className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-rose-600">{formatCurrency(totalPayable)}</div>
          <p className="text-[11px] text-gray-400 mt-1">Outstanding liabilities</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {(
            [
              { key: 'bills', label: 'Purchase Bills' },
              { key: 'ledger', label: 'Supplier Ledger' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Panels */}
      {activeTab === 'bills' && (
        <DataTable
          columns={billColumns}
          data={purchaseBills}
          loading={isBillsLoading}
          emptyTitle="No Purchase Bills"
          emptyMessage="No bills entered for this supplier yet."
        />
      )}

      {activeTab === 'ledger' && (
        <DataTable
          columns={ledgerColumns}
          data={ledgerEntries}
          loading={isLedgerLoading}
          emptyTitle="No Ledger Entries"
          emptyMessage="No financial ledger entries recorded for this supplier."
        />
      )}

      <SupplierFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        supplier={supplier}
      />
    </div>
  )
}

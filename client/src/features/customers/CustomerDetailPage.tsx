import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Calendar,
  FileText,
  Clock,
  Edit2,
  ArrowDownLeft,
  DollarSign,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { DataTable, Column } from '../../components/ui/DataTable'
import { CustomerFormModal } from './CustomerFormModal'
import { getCustomer, getCustomerLedger, getCustomerOutstanding } from '../../api/customers'
import { formatCurrency, formatDate, getStatusColor } from '../../lib/utils'
import type { Customer, SalesInvoice } from '../../types'

type TabType = 'transactions' | 'ledger' | 'outstanding'

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<TabType>('transactions')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Fetch customer details
  const { data: customerData, isLoading: isCustomerLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomer(id!),
    enabled: Boolean(id),
  })

  // Fetch customer ledger
  const { data: ledgerData, isLoading: isLedgerLoading } = useQuery({
    queryKey: ['customerLedger', id],
    queryFn: () => getCustomerLedger(id!),
    enabled: Boolean(id) && activeTab === 'ledger',
  })

  // Fetch customer outstanding
  const { data: outstandingData, isLoading: isOutstandingLoading } = useQuery({
    queryKey: ['customerOutstanding', id],
    queryFn: () => getCustomerOutstanding(id!),
    enabled: Boolean(id) && (activeTab === 'outstanding' || activeTab === 'transactions'),
  })

  const customer: Customer | null = customerData?.data?.customer || customerData?.data || null
  const ledgerEntries: any[] = ledgerData?.data?.ledger || ledgerData?.data || []
  const outstandingInvoices: SalesInvoice[] =
    outstandingData?.data?.invoices || outstandingData?.data?.outstanding || []

  // Calculated summary metrics
  const totalSales = outstandingData?.data?.totalSales ?? customer?.totalReceivable ?? 0
  const balanceDue = customer?.totalReceivable ?? customer?.openingBalance ?? 0
  const totalReceived = Math.max(0, totalSales - balanceDue)

  const transactionColumns: Column<any>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      render: (row) => (
        <Link
          to={`/sales/${row._id}`}
          className="font-semibold text-blue-600 hover:text-blue-800 transition-colors"
        >
          {row.invoiceNumber}
        </Link>
      ),
    },
    {
      key: 'invoiceDate',
      header: 'Date',
      render: (row) => formatDate(row.invoiceDate || row.createdAt),
    },
    {
      key: 'finalAmount',
      header: 'Total Amount',
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
      key: 'debit',
      header: 'Debit (₹)',
      render: (row) => (
        <span className="text-rose-600 font-medium">
          {row.debit ? formatCurrency(row.debit) : '-'}
        </span>
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
      key: 'balance',
      header: 'Closing Balance',
      render: (row) => (
        <span className="font-semibold text-gray-900">
          {formatCurrency(row.balance ?? row.runningBalance ?? 0)}
        </span>
      ),
    },
  ]

  if (isCustomerLoading) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500">Loading customer information...</p>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="text-center py-20 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Customer not found</h3>
        <Link to="/customers">
          <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>
            Back to Customers
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back button and page actions */}
      <div className="flex items-center justify-between">
        <Link
          to="/customers"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </Link>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsEditModalOpen(true)}
            icon={<Edit2 className="w-4 h-4" />}
          >
            Edit Customer
          </Button>
          <Link to={`/sales/new?customerId=${customer._id}`}>
            <Button icon={<FileText className="w-4 h-4" />}>Create Invoice</Button>
          </Link>
        </div>
      </div>

      {/* Customer Info Card */}
      <Card className="border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
                <Badge variant={customer.isActive !== false ? 'success' : 'default'}>
                  {customer.isActive !== false ? 'Active Customer' : 'Inactive'}
                </Badge>
                {customer.group && (
                  <Badge variant="info">{customer.group}</Badge>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-1.5 gap-x-6 mt-3 text-xs text-gray-600">
                {customer.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span>{customer.email}</span>
                  </div>
                )}
                {customer.gstin && (
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-mono">GSTIN: {customer.gstin}</span>
                  </div>
                )}
                {customer.billingAddress?.city && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>
                      {customer.billingAddress.line1 ? `${customer.billingAddress.line1}, ` : ''}
                      {customer.billingAddress.city}, {customer.billingAddress.state || ''}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span>Credit Period: {customer.creditDays || 30} Days</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>TOTAL BILLED</span>
            <DollarSign className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-gray-900">{formatCurrency(totalSales)}</div>
          <p className="text-[11px] text-gray-400 mt-1">Lifetime customer invoice volume</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>TOTAL COLLECTED</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-600">{formatCurrency(totalReceived)}</div>
          <p className="text-[11px] text-gray-400 mt-1">Payments recorded to date</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>CURRENT BALANCE DUE</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-rose-600">{formatCurrency(balanceDue)}</div>
          <p className="text-[11px] text-gray-400 mt-1">
            Credit Limit: {customer.creditLimit ? formatCurrency(customer.creditLimit) : 'None'}
          </p>
        </Card>
      </div>

      {/* Tabs Section */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {(
            [
              { key: 'transactions', label: 'All Invoices' },
              { key: 'outstanding', label: 'Outstanding Invoices' },
              { key: 'ledger', label: 'Statement / Ledger' },
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
      {activeTab === 'transactions' && (
        <DataTable
          columns={transactionColumns}
          data={outstandingInvoices}
          loading={isOutstandingLoading}
          emptyTitle="No Invoices Yet"
          emptyMessage="No sales invoices have been issued to this customer yet."
        />
      )}

      {activeTab === 'outstanding' && (
        <DataTable
          columns={transactionColumns}
          data={outstandingInvoices.filter((inv) => inv.balanceDue > 0)}
          loading={isOutstandingLoading}
          emptyTitle="Zero Outstanding Dues"
          emptyMessage="All invoices for this customer have been completely settled."
        />
      )}

      {activeTab === 'ledger' && (
        <DataTable
          columns={ledgerColumns}
          data={ledgerEntries}
          loading={isLedgerLoading}
          emptyTitle="No Ledger Entries"
          emptyMessage="No accounting ledger entries recorded for this party."
        />
      )}

      {/* Edit Customer Modal */}
      <CustomerFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        customer={customer}
      />
    </div>
  )
}

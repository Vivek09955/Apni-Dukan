import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Download, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { DataTable, Column } from '../../components/ui/DataTable'
import { getHSNSummary } from '../../api/gst'
import { formatCurrency } from '../../lib/utils'
import type { HSNSummaryRow } from '../../types'

interface HSNSummaryTabProps {
  month: number
  year: number
  businessId?: string
}

export function HSNSummaryTab({ month, year, businessId }: HSNSummaryTabProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['hsnSummary', businessId, month, year],
    queryFn: () => getHSNSummary({ month, year }),
  })

  const rawRows: HSNSummaryRow[] = data?.data?.hsnSummary || (Array.isArray(data?.data) ? data?.data : [])
  const filteredRows = rawRows.filter(
    (r) =>
      r.hsnCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const columns: Column<HSNSummaryRow>[] = [
    {
      key: 'hsnCode',
      header: 'HSN / SAC Code',
      sortable: true,
      render: (row) => <span className="font-mono font-semibold text-blue-600">{row.hsnCode}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      render: (row) => row.description || 'Goods / Services',
    },
    {
      key: 'uqc',
      header: 'UQC',
      render: (row) => row.uqc || 'NOS',
    },
    {
      key: 'quantity',
      header: 'Total Quantity',
      className: 'text-right',
      render: (row) => row.quantity,
    },
    {
      key: 'taxableValue',
      header: 'Total Taxable Value (₹)',
      className: 'text-right',
      render: (row) => formatCurrency(row.taxableValue),
    },
    {
      key: 'igst',
      header: 'Integrated Tax (IGST)',
      className: 'text-right',
      render: (row) => formatCurrency(row.igst),
    },
    {
      key: 'cgst',
      header: 'Central Tax (CGST)',
      className: 'text-right',
      render: (row) => formatCurrency(row.cgst),
    },
    {
      key: 'sgst',
      header: 'State Tax (SGST)',
      className: 'text-right',
      render: (row) => formatCurrency(row.sgst),
    },
    {
      key: 'totalTax',
      header: 'Total Tax (₹)',
      className: 'text-right font-bold text-gray-900',
      render: (row) => formatCurrency(row.totalTax),
    },
  ]

  const totalTaxable = filteredRows.reduce((s, r) => s + (r.taxableValue || 0), 0)
  const totalTax = filteredRows.reduce((s, r) => s + (r.totalTax || 0), 0)

  return (
    <div className="space-y-6">
      {/* Disclaimer Alert */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-xs space-y-1">
          <p className="font-semibold">Preparation & Filing Notice</p>
          <p className="text-amber-800">
            These reports are for preparation purposes only. Verify all figures before filing on the GST portal (gst.gov.in).
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">HSN/SAC Wise Summary</h2>
          <p className="text-xs text-gray-500">
            Consolidated turnover and tax collected classified by HSN codes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-64">
            <Input
              placeholder="Search HSN code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4 text-gray-400" />}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.success('HSN report exported')}
            icon={<Download className="w-4 h-4" />}
          >
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase">Distinct HSN Codes</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{filteredRows.length}</p>
        </Card>
        <Card className="p-4 bg-white border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase">Total Taxable Value</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(totalTaxable)}</p>
        </Card>
        <Card className="p-4 bg-white border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase">Total GST Collected</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(totalTax)}</p>
        </Card>
      </div>

      <Card className="p-6 bg-white border border-gray-200">
        <DataTable
          columns={columns}
          data={filteredRows}
          loading={isLoading}
          emptyMessage="No HSN data found for the selected period."
        />
      </Card>
    </div>
  )
}

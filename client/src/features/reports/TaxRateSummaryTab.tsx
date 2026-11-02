import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Download, PieChart } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { DataTable, Column } from '../../components/ui/DataTable'
import { getTaxRateSummary } from '../../api/gst'
import { formatCurrency } from '../../lib/utils'
import type { TaxRateSummaryRow } from '../../types'

interface TaxRateSummaryTabProps {
  month: number
  year: number
  businessId?: string
}

export function TaxRateSummaryTab({ month, year, businessId }: TaxRateSummaryTabProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['taxRateSummary', businessId, month, year],
    queryFn: () => getTaxRateSummary({ month, year }),
  })

  const rawRows: TaxRateSummaryRow[] = data?.data?.taxRateSummary || (Array.isArray(data?.data) ? data?.data : [])

  const columns: Column<TaxRateSummaryRow>[] = [
    {
      key: 'taxRate',
      header: 'GST Rate %',
      sortable: true,
      render: (row) => (
        <span className="font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-md text-xs">
          {row.taxRate}%
        </span>
      ),
    },
    {
      key: 'taxableAmount',
      header: 'Taxable Turnover (₹)',
      className: 'text-right',
      render: (row) => formatCurrency(row.taxableAmount),
    },
    {
      key: 'cgst',
      header: 'CGST (₹)',
      className: 'text-right',
      render: (row) => formatCurrency(row.cgst),
    },
    {
      key: 'sgst',
      header: 'SGST (₹)',
      className: 'text-right',
      render: (row) => formatCurrency(row.sgst),
    },
    {
      key: 'igst',
      header: 'IGST (₹)',
      className: 'text-right',
      render: (row) => formatCurrency(row.igst),
    },
    {
      key: 'totalTax',
      header: 'Total Tax (₹)',
      className: 'text-right font-bold text-gray-900',
      render: (row) => formatCurrency(row.totalTax),
    },
  ]

  const totalTaxable = rawRows.reduce((s, r) => s + (r.taxableAmount || 0), 0)
  const totalTax = rawRows.reduce((s, r) => s + (r.totalTax || 0), 0)

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

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Tax Rate Wise Slab Summary</h2>
          <p className="text-xs text-gray-500">
            Breakup of taxable sales and tax components grouped by GST slab percentages (0%, 5%, 12%, 18%, 28%).
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast.success('Tax rate summary exported')}
          icon={<Download className="w-4 h-4" />}
        >
          Export
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-4 bg-white border border-gray-100 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Taxable Turnover</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(totalTaxable)}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <PieChart className="w-5 h-5" />
          </div>
        </Card>
        <Card className="p-4 bg-white border border-gray-100 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Tax Collected</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(totalTax)}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-white border border-gray-200">
        <DataTable
          columns={columns}
          data={rawRows}
          loading={isLoading}
          emptyMessage="No tax slab data found for the selected month."
        />
      </Card>
    </div>
  )
}

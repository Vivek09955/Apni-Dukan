import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Download,
  FileSpreadsheet,
  AlertTriangle,
  FileText,
  TrendingUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { DataTable, Column } from '../../components/ui/DataTable'
import { getGSTR1 } from '../../api/gst'
import { formatCurrency, formatDate } from '../../lib/utils'
import type { GSTR1Report, GSTR1B2BInvoice, GSTR1HSNRow } from '../../types'

interface GSTR1ReportTabProps {
  month: number
  year: number
  businessId?: string
}

export function GSTR1ReportTab({ month, year, businessId }: GSTR1ReportTabProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['gstr1', businessId, month, year],
    queryFn: () => getGSTR1({ month, year }),
  })

  const report: GSTR1Report = data?.data || {
    b2b: [],
    b2cSmall: [],
    b2cLarge: [],
    hsnSummary: [],
    docSummary: {
      invoicesCount: 0,
      creditNotesCount: 0,
      debitNotesCount: 0,
      cancelledCount: 0,
    },
    period: { from: '', to: '' },
  }

  const b2bColumns: Column<GSTR1B2BInvoice>[] = [
    {
      key: 'gstin',
      header: 'GSTIN of Recipient',
      sortable: true,
      render: (row) => <span className="font-mono text-xs">{row.gstin}</span>,
    },
    {
      key: 'customerName',
      header: 'Receiver Name',
      render: (row) => <span className="font-medium text-gray-900">{row.customerName}</span>,
    },
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      render: (row) => <span className="font-semibold text-blue-600">{row.invoiceNumber}</span>,
    },
    {
      key: 'invoiceDate',
      header: 'Date',
      render: (row) => formatDate(row.invoiceDate),
    },
    {
      key: 'taxableValue',
      header: 'Taxable Val (₹)',
      className: 'text-right',
      render: (row) => <span>{formatCurrency(row.taxableValue)}</span>,
    },
    {
      key: 'cgst',
      header: 'CGST (₹)',
      className: 'text-right',
      render: (row) => <span>{formatCurrency(row.cgst)}</span>,
    },
    {
      key: 'sgst',
      header: 'SGST (₹)',
      className: 'text-right',
      render: (row) => <span>{formatCurrency(row.sgst)}</span>,
    },
    {
      key: 'igst',
      header: 'IGST (₹)',
      className: 'text-right',
      render: (row) => <span>{formatCurrency(row.igst)}</span>,
    },
    {
      key: 'totalAmount',
      header: 'Total (₹)',
      className: 'text-right font-bold',
      render: (row) => <span className="font-semibold">{formatCurrency(row.totalAmount)}</span>,
    },
  ]

  const hsnColumns: Column<GSTR1HSNRow>[] = [
    {
      key: 'hsnCode',
      header: 'HSN / SAC',
      sortable: true,
      render: (row) => <span className="font-mono font-medium">{row.hsnCode}</span>,
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
      header: 'Qty',
      className: 'text-right',
      render: (row) => row.quantity,
    },
    {
      key: 'taxableValue',
      header: 'Taxable Value',
      className: 'text-right',
      render: (row) => formatCurrency(row.taxableValue),
    },
    {
      key: 'cgst',
      header: 'CGST',
      className: 'text-right',
      render: (row) => formatCurrency(row.cgst),
    },
    {
      key: 'sgst',
      header: 'SGST',
      className: 'text-right',
      render: (row) => formatCurrency(row.sgst),
    },
    {
      key: 'igst',
      header: 'IGST',
      className: 'text-right',
      render: (row) => formatCurrency(row.igst),
    },
    {
      key: 'totalTax',
      header: 'Total Tax',
      className: 'text-right font-semibold',
      render: (row) => formatCurrency(row.totalTax),
    },
  ]

  const totalB2bTaxable = report.b2b?.reduce((s, i) => s + (i.taxableValue || 0), 0) || 0
  const totalB2bTax = report.b2b?.reduce((s, i) => s + (i.cgst || 0) + (i.sgst || 0) + (i.igst || 0), 0) || 0

  const handleExport = (format: string) => {
    toast.success(`Preparing ${format.toUpperCase()} export for GSTR-1...`)
  }

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

      {/* Top Action Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">GSTR-1 Outward Supplies</h2>
          <p className="text-xs text-gray-500">
            Details of outward supplies of goods or services.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('json')}
            icon={<Download className="w-4 h-4" />}
          >
            GST Portal JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('excel')}
            icon={<FileSpreadsheet className="w-4 h-4" />}
          >
            Export Excel
          </Button>
        </div>
      </div>

      {/* Document Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-gray-100">
          <p className="text-[11px] font-semibold text-gray-500 uppercase">Total Invoices</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{report.docSummary?.invoicesCount || 0}</p>
        </Card>
        <Card className="p-4 bg-white border border-gray-100">
          <p className="text-[11px] font-semibold text-gray-500 uppercase">B2B Taxable Value</p>
          <p className="text-xl font-bold text-blue-600 mt-1">{formatCurrency(totalB2bTaxable)}</p>
        </Card>
        <Card className="p-4 bg-white border border-gray-100">
          <p className="text-[11px] font-semibold text-gray-500 uppercase">Total Tax Liability</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totalB2bTax)}</p>
        </Card>
        <Card className="p-4 bg-white border border-gray-100">
          <p className="text-[11px] font-semibold text-gray-500 uppercase">Cancelled Docs</p>
          <p className="text-xl font-bold text-red-600 mt-1">{report.docSummary?.cancelledCount || 0}</p>
        </Card>
      </div>

      {/* 4A, 4B, 4C, 6B, 6C - B2B Invoices */}
      <Card className="p-6 bg-white border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              4A, 4B, 4C - B2B Invoices
            </h3>
            <p className="text-xs text-gray-500">
              Taxable outward supplies made to registered persons.
            </p>
          </div>
          <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-semibold">
            {report.b2b?.length || 0} Records
          </span>
        </div>

        <DataTable
          columns={b2bColumns}
          data={report.b2b || []}
          loading={isLoading}
          emptyMessage="No B2B invoices recorded for this period."
        />
      </Card>

      {/* 12 - HSN-wise Summary */}
      <Card className="p-6 bg-white border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              12 - HSN Summary of Outward Supplies
            </h3>
            <p className="text-xs text-gray-500">
              Summary of supplies based on HSN/SAC codes.
            </p>
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-semibold">
            {report.hsnSummary?.length || 0} HSN Codes
          </span>
        </div>

        <DataTable
          columns={hsnColumns}
          data={report.hsnSummary || []}
          loading={isLoading}
          emptyMessage="No HSN data available for this period."
        />
      </Card>

      {/* 13 - Documents Issued */}
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-base font-bold text-gray-900 mb-2">
          13 - Documents Issued During the Tax Period
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 uppercase">
                <th className="py-2.5 px-3">Document Nature</th>
                <th className="py-2.5 px-3 text-right">Total Number</th>
                <th className="py-2.5 px-3 text-right">Cancelled</th>
                <th className="py-2.5 px-3 text-right">Net Issued</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              <tr>
                <td className="py-2.5 px-3 font-medium">Invoices for outward supply</td>
                <td className="py-2.5 px-3 text-right">{report.docSummary?.invoicesCount || 0}</td>
                <td className="py-2.5 px-3 text-right text-red-600">
                  {report.docSummary?.cancelledCount || 0}
                </td>
                <td className="py-2.5 px-3 text-right font-bold">
                  {(report.docSummary?.invoicesCount || 0) - (report.docSummary?.cancelledCount || 0)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Credit Notes</td>
                <td className="py-2.5 px-3 text-right">{report.docSummary?.creditNotesCount || 0}</td>
                <td className="py-2.5 px-3 text-right">0</td>
                <td className="py-2.5 px-3 text-right font-bold">
                  {report.docSummary?.creditNotesCount || 0}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Debit Notes</td>
                <td className="py-2.5 px-3 text-right">{report.docSummary?.debitNotesCount || 0}</td>
                <td className="py-2.5 px-3 text-right">0</td>
                <td className="py-2.5 px-3 text-right font-bold">
                  {report.docSummary?.debitNotesCount || 0}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

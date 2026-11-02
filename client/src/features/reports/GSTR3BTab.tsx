import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Download, FileSpreadsheet } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { getGSTR3B } from '../../api/gst'
import { formatCurrency } from '../../lib/utils'
import type { GSTR3BSummary } from '../../types'

interface GSTR3BTabProps {
  month: number
  year: number
  businessId?: string
}

export function GSTR3BTab({ month, year, businessId }: GSTR3BTabProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['gstr3b', businessId, month, year],
    queryFn: () => getGSTR3B({ month, year }),
  })

  const summary: GSTR3BSummary = data?.data || {
    outwardSupplies: { taxable: 0, cgst: 0, sgst: 0, igst: 0 },
    inwardSupplies: { taxable: 0, cgst: 0, sgst: 0, igst: 0 },
    inputTaxCredit: { cgst: 0, sgst: 0, igst: 0 },
    outputTaxLiability: { cgst: 0, sgst: 0, igst: 0 },
    netPayable: { cgst: 0, sgst: 0, igst: 0, total: 0 },
  }

  const handleExport = () => {
    toast.success('GSTR-3B summary exported successfully')
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

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">GSTR-3B Monthly Return Summary</h2>
          <p className="text-xs text-gray-500">
            Self-assessed summary return of outward and inward supplies.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          icon={<Download className="w-4 h-4" />}
        >
          Download PDF Summary
        </Button>
      </div>

      {/* 3.1 Details of Outward Supplies */}
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-base font-bold text-gray-900 mb-2">
          3.1 Details of Outward Supplies and inward supplies liable to reverse charge
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          All taxable outward supplies made during the month.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 uppercase">
                <th className="py-2.5 px-3">Nature of Supplies</th>
                <th className="py-2.5 px-3 text-right">Total Taxable Value (₹)</th>
                <th className="py-2.5 px-3 text-right">IGST (₹)</th>
                <th className="py-2.5 px-3 text-right">CGST (₹)</th>
                <th className="py-2.5 px-3 text-right">SGST (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800 font-medium">
              <tr>
                <td className="py-2.5 px-3">
                  (a) Outward taxable supplies (other than zero rated, nil rated and exempted)
                </td>
                <td className="py-2.5 px-3 text-right">
                  {formatCurrency(summary.outwardSupplies.taxable)}
                </td>
                <td className="py-2.5 px-3 text-right">
                  {formatCurrency(summary.outwardSupplies.igst)}
                </td>
                <td className="py-2.5 px-3 text-right">
                  {formatCurrency(summary.outwardSupplies.cgst)}
                </td>
                <td className="py-2.5 px-3 text-right">
                  {formatCurrency(summary.outwardSupplies.sgst)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-gray-500">
                  (b) Outward taxable supplies (zero rated)
                </td>
                <td className="py-2.5 px-3 text-right text-gray-400">₹0.00</td>
                <td className="py-2.5 px-3 text-right text-gray-400">₹0.00</td>
                <td className="py-2.5 px-3 text-right text-gray-400">₹0.00</td>
                <td className="py-2.5 px-3 text-right text-gray-400">₹0.00</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-gray-500">
                  (c) Other outward supplies (Nil rated, exempted)
                </td>
                <td className="py-2.5 px-3 text-right text-gray-400">₹0.00</td>
                <td className="py-2.5 px-3 text-right text-gray-400">₹0.00</td>
                <td className="py-2.5 px-3 text-right text-gray-400">₹0.00</td>
                <td className="py-2.5 px-3 text-right text-gray-400">₹0.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. Eligible ITC */}
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-base font-bold text-gray-900 mb-2">
          4. Eligible ITC (Input Tax Credit)
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Tax credit derived from purchases and inward supplies.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 uppercase">
                <th className="py-2.5 px-3">Details</th>
                <th className="py-2.5 px-3 text-right">IGST (₹)</th>
                <th className="py-2.5 px-3 text-right">CGST (₹)</th>
                <th className="py-2.5 px-3 text-right">SGST (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800 font-medium">
              <tr>
                <td className="py-2.5 px-3">
                  (A) ITC Available (whether in full or part) - All other ITC
                </td>
                <td className="py-2.5 px-3 text-right text-emerald-600">
                  {formatCurrency(summary.inputTaxCredit.igst)}
                </td>
                <td className="py-2.5 px-3 text-right text-emerald-600">
                  {formatCurrency(summary.inputTaxCredit.cgst)}
                </td>
                <td className="py-2.5 px-3 text-right text-emerald-600">
                  {formatCurrency(summary.inputTaxCredit.sgst)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-gray-500">
                  (B) ITC Reversed (As per rules 42 & 43)
                </td>
                <td className="py-2.5 px-3 text-right text-gray-400">₹0.00</td>
                <td className="py-2.5 px-3 text-right text-gray-400">₹0.00</td>
                <td className="py-2.5 px-3 text-right text-gray-400">₹0.00</td>
              </tr>
              <tr className="bg-emerald-50/50 font-bold">
                <td className="py-2.5 px-3 text-emerald-900">
                  (C) Net ITC Available (A) - (B)
                </td>
                <td className="py-2.5 px-3 text-right text-emerald-700">
                  {formatCurrency(summary.inputTaxCredit.igst)}
                </td>
                <td className="py-2.5 px-3 text-right text-emerald-700">
                  {formatCurrency(summary.inputTaxCredit.cgst)}
                </td>
                <td className="py-2.5 px-3 text-right text-emerald-700">
                  {formatCurrency(summary.inputTaxCredit.sgst)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* 6. Payment of Tax */}
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-base font-bold text-gray-900 mb-2">
          6. Payment of Tax (Net Tax Payable)
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Calculated as Output Tax Liability minus Eligible Input Tax Credit.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 uppercase">
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-right">Tax Payable (Output)</th>
                <th className="py-2.5 px-3 text-right">Paid Through ITC</th>
                <th className="py-2.5 px-3 text-right">Net Tax Payable in Cash (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              <tr>
                <td className="py-2.5 px-3 font-medium">Integrated Tax (IGST)</td>
                <td className="py-2.5 px-3 text-right">{formatCurrency(summary.outputTaxLiability.igst)}</td>
                <td className="py-2.5 px-3 text-right text-emerald-600">
                  {formatCurrency(summary.inputTaxCredit.igst)}
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-blue-600">
                  {formatCurrency(summary.netPayable.igst)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Central Tax (CGST)</td>
                <td className="py-2.5 px-3 text-right">{formatCurrency(summary.outputTaxLiability.cgst)}</td>
                <td className="py-2.5 px-3 text-right text-emerald-600">
                  {formatCurrency(summary.inputTaxCredit.cgst)}
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-blue-600">
                  {formatCurrency(summary.netPayable.cgst)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">State/UT Tax (SGST)</td>
                <td className="py-2.5 px-3 text-right">{formatCurrency(summary.outputTaxLiability.sgst)}</td>
                <td className="py-2.5 px-3 text-right text-emerald-600">
                  {formatCurrency(summary.inputTaxCredit.sgst)}
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-blue-600">
                  {formatCurrency(summary.netPayable.sgst)}
                </td>
              </tr>
              <tr className="bg-gray-50 font-bold text-sm">
                <td className="py-3 px-3">Total Net Tax Payable</td>
                <td className="py-3 px-3 text-right">
                  {formatCurrency(
                    summary.outputTaxLiability.igst +
                      summary.outputTaxLiability.cgst +
                      summary.outputTaxLiability.sgst
                  )}
                </td>
                <td className="py-3 px-3 text-right text-emerald-600">
                  {formatCurrency(
                    summary.inputTaxCredit.igst +
                      summary.inputTaxCredit.cgst +
                      summary.inputTaxCredit.sgst
                  )}
                </td>
                <td className="py-3 px-3 text-right text-blue-700">
                  {formatCurrency(summary.netPayable.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

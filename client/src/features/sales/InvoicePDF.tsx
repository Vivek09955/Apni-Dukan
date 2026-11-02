import { useRef } from 'react'
import { Printer, Download } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { formatCurrency, formatDate } from '../../lib/utils'
import { paiseToWords } from '../../lib/numberToWords'
import type { SalesInvoice, Business, Customer } from '../../types'

interface InvoicePDFProps {
  invoice: SalesInvoice
  business: Business | null
}

export function InvoicePDF({ invoice, business }: InvoicePDFProps) {
  const printRef = useRef<HTMLDivElement | null>(null)

  const customer =
    typeof invoice.customerId === 'object' ? (invoice.customerId as Customer) : null

  const handlePrint = () => {
    const printContents = printRef.current
    if (!printContents) return

    const printWindow = window.open('', '_blank', 'width=800,height=1100')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          ${printStyles}
        </style>
      </head>
      <body>
        ${printContents.innerHTML}
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleDownload = () => {
    // Use print-to-PDF browser functionality
    handlePrint()
  }

  return (
    <div>
      {/* Action Buttons */}
      <div className="flex gap-2 mb-4 print:hidden">
        <Button
          type="button"
          onClick={handlePrint}
          icon={<Printer className="w-4 h-4" />}
        >
          Print Invoice
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleDownload}
          icon={<Download className="w-4 h-4" />}
        >
          Download PDF
        </Button>
      </div>

      {/* Printable Invoice */}
      <div ref={printRef} className="bg-white border border-gray-200 rounded-lg p-8 max-w-[210mm] mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-blue-600 pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {business?.name || 'Business Name'}
            </h1>
            {business?.address && (
              <p className="text-sm text-gray-600 mt-1">
                {[business.address.line1, business.address.line2, business.address.city, business.address.state, business.address.pincode]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            )}
            {business?.phone && (
              <p className="text-sm text-gray-600">Phone: {business.phone}</p>
            )}
            {business?.email && (
              <p className="text-sm text-gray-600">Email: {business.email}</p>
            )}
            {business?.gstin && (
              <p className="text-sm font-medium text-gray-700 mt-1">
                GSTIN: {business.gstin}
              </p>
            )}
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-blue-600 uppercase">
              Tax Invoice
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Invoice #: <span className="font-semibold text-gray-900">{invoice.invoiceNumber}</span>
            </p>
            <p className="text-sm text-gray-600">
              Date: {formatDate(invoice.invoiceDate)}
            </p>
            {invoice.dueDate && (
              <p className="text-sm text-gray-600">
                Due Date: {formatDate(invoice.dueDate)}
              </p>
            )}
          </div>
        </div>

        {/* Bill To / Ship To */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Bill To</h3>
            {customer ? (
              <>
                <p className="font-semibold text-gray-900">{customer.name}</p>
                {customer.phone && (
                  <p className="text-sm text-gray-600">Phone: {customer.phone}</p>
                )}
                {customer.email && (
                  <p className="text-sm text-gray-600">Email: {customer.email}</p>
                )}
                {customer.gstin && (
                  <p className="text-sm text-gray-600">GSTIN: {customer.gstin}</p>
                )}
                {customer.billingAddress && (
                  <p className="text-sm text-gray-600 mt-1">
                    {[
                      (customer.billingAddress as any)?.line1,
                      (customer.billingAddress as any)?.city,
                      (customer.billingAddress as any)?.state,
                      (customer.billingAddress as any)?.pincode,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">Customer details not available</p>
            )}
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Invoice Details</h3>
            <p className="text-sm text-gray-600">
              Place of Supply: <span className="font-medium">{invoice.placeOfSupply || business?.state || '-'}</span>
            </p>
            <p className="text-sm text-gray-600">
              Type: <span className="font-medium">{invoice.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}</span>
            </p>
            <p className="text-sm text-gray-600">
              Status: <span className="font-medium capitalize">{invoice.status.replace('_', ' ')}</span>
            </p>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse mb-6">
          <thead>
            <tr className="bg-blue-600 text-white text-xs uppercase">
              <th className="p-2 text-left border border-blue-600">#</th>
              <th className="p-2 text-left border border-blue-600">Item / Description</th>
              <th className="p-2 text-center border border-blue-600">HSN/SAC</th>
              <th className="p-2 text-right border border-blue-600">Qty</th>
              <th className="p-2 text-center border border-blue-600">Unit</th>
              <th className="p-2 text-right border border-blue-600">Rate</th>
              <th className="p-2 text-right border border-blue-600">Disc.</th>
              <th className="p-2 text-right border border-blue-600">Taxable</th>
              {!invoice.isInterState ? (
                <>
                  <th className="p-2 text-right border border-blue-600">CGST</th>
                  <th className="p-2 text-right border border-blue-600">SGST</th>
                </>
              ) : (
                <th className="p-2 text-right border border-blue-600">IGST</th>
              )}
              <th className="p-2 text-right border border-blue-600">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => (
              <tr key={idx} className="text-sm border-b border-gray-200">
                <td className="p-2 border border-gray-200">{idx + 1}</td>
                <td className="p-2 border border-gray-200 font-medium">{item.name}</td>
                <td className="p-2 border border-gray-200 text-center text-xs">{item.hsnCode || '-'}</td>
                <td className="p-2 border border-gray-200 text-right">{item.quantity}</td>
                <td className="p-2 border border-gray-200 text-center">{item.unit}</td>
                <td className="p-2 border border-gray-200 text-right">{formatCurrency(item.rate)}</td>
                <td className="p-2 border border-gray-200 text-right">
                  {item.discountPercent > 0 ? `${item.discountPercent}%` : '-'}
                </td>
                <td className="p-2 border border-gray-200 text-right">{formatCurrency(item.taxableAmount)}</td>
                {!invoice.isInterState ? (
                  <>
                    <td className="p-2 border border-gray-200 text-right text-xs">
                      {formatCurrency(item.cgstAmount)}
                      <br />
                      <span className="text-gray-400">@{item.taxRate / 2}%</span>
                    </td>
                    <td className="p-2 border border-gray-200 text-right text-xs">
                      {formatCurrency(item.sgstAmount)}
                      <br />
                      <span className="text-gray-400">@{item.taxRate / 2}%</span>
                    </td>
                  </>
                ) : (
                  <td className="p-2 border border-gray-200 text-right text-xs">
                    {formatCurrency(item.igstAmount)}
                    <br />
                    <span className="text-gray-400">@{item.taxRate}%</span>
                  </td>
                )}
                <td className="p-2 border border-gray-200 text-right font-medium">
                  {formatCurrency(item.totalAmount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-80">
            <div className="flex justify-between py-1 text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.totalDiscount > 0 && (
              <div className="flex justify-between py-1 text-sm text-green-600">
                <span>Discount:</span>
                <span>-{formatCurrency(invoice.totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between py-1 text-sm">
              <span className="text-gray-600">Taxable Amount:</span>
              <span>{formatCurrency(invoice.taxableAmount)}</span>
            </div>
            {!invoice.isInterState ? (
              <>
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-gray-600">CGST:</span>
                  <span>{formatCurrency(invoice.totalCgst)}</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-gray-600">SGST:</span>
                  <span>{formatCurrency(invoice.totalSgst)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between py-1 text-sm">
                <span className="text-gray-600">IGST:</span>
                <span>{formatCurrency(invoice.totalIgst)}</span>
              </div>
            )}
            {invoice.roundOff !== 0 && (
              <div className="flex justify-between py-1 text-sm">
                <span className="text-gray-600">Round Off:</span>
                <span>{invoice.roundOff > 0 ? '+' : ''}{formatCurrency(invoice.roundOff)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 text-base font-bold border-t-2 border-gray-900 mt-2">
              <span>Grand Total:</span>
              <span>{formatCurrency(invoice.finalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Amount in Words */}
        <div className="bg-gray-50 p-3 rounded mb-6">
          <p className="text-sm">
            <span className="font-semibold text-gray-700">Amount in Words: </span>
            <span className="text-gray-800 italic">{paiseToWords(invoice.finalAmount)}</span>
          </p>
        </div>

        {/* Payment Status */}
        {invoice.paidAmount > 0 && (
          <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded text-sm">
            <p>
              <span className="font-semibold">Paid: </span>{formatCurrency(invoice.paidAmount)}
              {invoice.balanceDue > 0 && (
                <span className="ml-4">
                  <span className="font-semibold">Balance Due: </span>
                  <span className="text-red-600 font-semibold">{formatCurrency(invoice.balanceDue)}</span>
                </span>
              )}
            </p>
          </div>
        )}

        {/* Terms & Notes */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {invoice.notes && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Notes</h4>
              <p className="text-sm text-gray-600">{invoice.notes}</p>
            </div>
          )}
          {invoice.termsAndConditions && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Terms & Conditions</h4>
              <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.termsAndConditions}</p>
            </div>
          )}
        </div>

        {/* Footer: Bank Details & Signature */}
        <div className="flex justify-between items-end border-t border-gray-300 pt-4">
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Bank Details</h4>
            <p className="text-sm text-gray-600">
              Please make payment via NEFT/RTGS/UPI to the bank account associated with this business.
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 mb-8">
              For <span className="font-semibold">{business?.name}</span>
            </p>
            <div className="border-t border-gray-400 pt-1">
              <p className="text-xs text-gray-500">Authorized Signatory</p>
            </div>
          </div>
        </div>

        {/* Computer Generated Note */}
        <div className="text-center mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            This is a computer-generated invoice and does not require a physical signature.
          </p>
        </div>
      </div>
    </div>
  )
}

// Print-specific styles
const printStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #1a1a1a; padding: 20px; }
  
  .bg-white { background: white; }
  .bg-gray-50 { background: #f9fafb; }
  .bg-blue-600 { background: #2563eb; }
  .bg-green-50 { background: #f0fdf4; }
  
  .text-white { color: white; }
  .text-gray-400 { color: #9ca3af; }
  .text-gray-500 { color: #6b7280; }
  .text-gray-600 { color: #4b5563; }
  .text-gray-700 { color: #374151; }
  .text-gray-800 { color: #1f2937; }
  .text-gray-900 { color: #111827; }
  .text-blue-600 { color: #2563eb; }
  .text-green-600 { color: #16a34a; }
  .text-red-600 { color: #dc2626; }
  
  .font-bold { font-weight: 700; }
  .font-semibold { font-weight: 600; }
  .font-medium { font-weight: 500; }
  .italic { font-style: italic; }
  .uppercase { text-transform: uppercase; }
  .capitalize { text-transform: capitalize; }
  .whitespace-pre-line { white-space: pre-line; }
  
  .text-2xl { font-size: 1.5rem; }
  .text-xl { font-size: 1.25rem; }
  .text-base { font-size: 1rem; }
  .text-sm { font-size: 0.875rem; }
  .text-xs { font-size: 0.75rem; }
  
  .text-left { text-align: left; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  
  .flex { display: flex; }
  .grid { display: grid; }
  .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
  .gap-6 { gap: 1.5rem; }
  .justify-between { justify-content: space-between; }
  .justify-end { justify-content: flex-end; }
  .items-start { align-items: flex-start; }
  .items-end { align-items: flex-end; }
  
  .p-2 { padding: 0.5rem; }
  .p-3 { padding: 0.75rem; }
  .p-4 { padding: 1rem; }
  .p-8 { padding: 2rem; }
  .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
  .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
  .pb-4 { padding-bottom: 1rem; }
  .pt-1 { padding-top: 0.25rem; }
  .pt-4 { padding-top: 1rem; }
  .mt-1 { margin-top: 0.25rem; }
  .mt-2 { margin-top: 0.5rem; }
  .mt-6 { margin-top: 1.5rem; }
  .mb-1 { margin-bottom: 0.25rem; }
  .mb-2 { margin-bottom: 0.5rem; }
  .mb-4 { margin-bottom: 1rem; }
  .mb-6 { margin-bottom: 1.5rem; }
  .mb-8 { margin-bottom: 2rem; }
  .ml-4 { margin-left: 1rem; }
  
  .border { border: 1px solid #e5e7eb; }
  .border-t { border-top: 1px solid; }
  .border-b { border-bottom: 1px solid; }
  .border-t-2 { border-top: 2px solid; }
  .border-b-2 { border-bottom: 2px solid; }
  .border-gray-200 { border-color: #e5e7eb; }
  .border-gray-300 { border-color: #d1d5db; }
  .border-gray-400 { border-color: #9ca3af; }
  .border-gray-900 { border-color: #111827; }
  .border-blue-600 { border-color: #2563eb; }
  .border-green-200 { border-color: #bbf7d0; }
  .rounded { border-radius: 0.25rem; }
  
  .w-full { width: 100%; }
  .w-80 { width: 20rem; }
  
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 0.5rem; }

  @media print {
    body { padding: 0; }
    @page { size: A4; margin: 15mm; }
  }
`

export default InvoicePDF

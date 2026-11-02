import { useRef } from 'react'
import { Printer } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { formatCurrency, formatDate } from '../../lib/utils'
import type { SalesInvoice, Business, Customer } from '../../types'

interface ThermalReceiptProps {
  invoice: SalesInvoice
  business: Business | null
}

export function ThermalReceipt({ invoice, business }: ThermalReceiptProps) {
  const receiptRef = useRef<HTMLDivElement | null>(null)

  const customer =
    typeof invoice.customerId === 'object' ? (invoice.customerId as Customer) : null

  const handlePrint = () => {
    const contents = receiptRef.current
    if (!contents) return

    const printWindow = window.open('', '_blank', 'width=400,height=800')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt ${invoice.invoiceNumber}</title>
        <style>
          ${thermalStyles}
        </style>
      </head>
      <body>
        ${contents.innerHTML}
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handlePrint}
        icon={<Printer className="w-4 h-4" />}
      >
        Print Thermal Receipt
      </Button>

      {/* Receipt Preview (hidden on screen, shown in print) */}
      <div className="hidden">
        <div ref={receiptRef}>
          <div className="thermal-receipt">
            {/* Business Name */}
            <div className="text-center mb-2">
              <h1 className="text-lg font-bold">{business?.name || 'Business'}</h1>
              {business?.address && (
                <p className="text-xs">
                  {[business.address.line1, business.address.city, business.address.state]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
              {business?.phone && <p className="text-xs">Ph: {business.phone}</p>}
              {business?.gstin && <p className="text-xs">GSTIN: {business.gstin}</p>}
            </div>

            <div className="separator">- - - - - - - - - - - - - - - - -</div>

            {/* Invoice Info */}
            <div className="text-xs mb-2">
              <div className="flex-row">
                <span>Invoice #:</span>
                <span className="font-bold">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex-row">
                <span>Date:</span>
                <span>{formatDate(invoice.invoiceDate)}</span>
              </div>
              {customer && (
                <div className="flex-row">
                  <span>Customer:</span>
                  <span>{customer.name}</span>
                </div>
              )}
            </div>

            <div className="separator">= = = = = = = = = = = = = = = = =</div>

            {/* Items */}
            <div className="text-xs mb-2">
              {invoice.items.map((item, idx) => (
                <div key={idx} className="item-row">
                  <div className="font-bold">{item.name}</div>
                  <div className="flex-row">
                    <span>{item.quantity} {item.unit} × {formatCurrency(item.rate)}</span>
                    <span className="font-bold">{formatCurrency(item.totalAmount)}</span>
                  </div>
                  {item.discountPercent > 0 && (
                    <div className="text-right text-xs" style={{ color: '#666' }}>
                      Disc: {item.discountPercent}%
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="separator">- - - - - - - - - - - - - - - - -</div>

            {/* Totals */}
            <div className="text-xs mb-2">
              <div className="flex-row">
                <span>Subtotal:</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.totalDiscount > 0 && (
                <div className="flex-row">
                  <span>Discount:</span>
                  <span>-{formatCurrency(invoice.totalDiscount)}</span>
                </div>
              )}
              {!invoice.isInterState ? (
                <>
                  {invoice.totalCgst > 0 && (
                    <div className="flex-row">
                      <span>CGST:</span>
                      <span>{formatCurrency(invoice.totalCgst)}</span>
                    </div>
                  )}
                  {invoice.totalSgst > 0 && (
                    <div className="flex-row">
                      <span>SGST:</span>
                      <span>{formatCurrency(invoice.totalSgst)}</span>
                    </div>
                  )}
                </>
              ) : (
                invoice.totalIgst > 0 && (
                  <div className="flex-row">
                    <span>IGST:</span>
                    <span>{formatCurrency(invoice.totalIgst)}</span>
                  </div>
                )
              )}
              {invoice.roundOff !== 0 && (
                <div className="flex-row">
                  <span>Round Off:</span>
                  <span>{invoice.roundOff > 0 ? '+' : ''}{formatCurrency(invoice.roundOff)}</span>
                </div>
              )}
            </div>

            <div className="separator">= = = = = = = = = = = = = = = = =</div>

            {/* Grand Total */}
            <div className="flex-row text-base font-bold mb-2">
              <span>TOTAL:</span>
              <span>{formatCurrency(invoice.finalAmount)}</span>
            </div>

            {invoice.paidAmount > 0 && (
              <div className="text-xs mb-2">
                <div className="flex-row">
                  <span>Paid:</span>
                  <span>{formatCurrency(invoice.paidAmount)}</span>
                </div>
                {invoice.balanceDue > 0 && (
                  <div className="flex-row font-bold">
                    <span>Balance Due:</span>
                    <span>{formatCurrency(invoice.balanceDue)}</span>
                  </div>
                )}
              </div>
            )}

            <div className="separator">- - - - - - - - - - - - - - - - -</div>

            {/* Footer */}
            <div className="text-center text-xs mt-2">
              <p className="font-bold">Thank You!</p>
              <p>Visit Again</p>
              <p style={{ color: '#999', marginTop: '4px' }}>
                Powered by Apni Dukan
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const thermalStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; width: 80mm; padding: 4mm; }
  
  .thermal-receipt { width: 100%; }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .text-lg { font-size: 16px; }
  .text-base { font-size: 14px; }
  .text-xs { font-size: 11px; }
  .font-bold { font-weight: bold; }
  .mb-2 { margin-bottom: 6px; }
  .mt-2 { margin-top: 6px; }
  
  .flex-row { display: flex; justify-content: space-between; }
  .item-row { margin-bottom: 4px; padding-bottom: 2px; }
  .separator { text-align: center; color: #999; font-size: 10px; margin: 4px 0; }
  
  @page { size: 80mm auto; margin: 0; }
  @media print { body { width: 80mm; } }
`

export default ThermalReceipt

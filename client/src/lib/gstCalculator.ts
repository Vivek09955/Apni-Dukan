// Client-side GST calculation for invoice preview. Server always recalculates.
export interface LineItemInput {
  rate: number          // paise per unit
  quantity: number
  discountPercent?: number
  discountAmount?: number  // paise
  taxRate: number       // percentage
  taxInclusive: boolean
  isInterState: boolean
}

export interface LineItemResult {
  grossAmount: number
  discountAmount: number
  taxableAmount: number
  cgstRate: number
  sgstRate: number
  igstRate: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  totalTax: number
  totalAmount: number
}

export function calculateLineItem(input: LineItemInput): LineItemResult {
  const grossAmount = Math.round(input.rate * input.quantity)
  
  let discountAmount = input.discountAmount || 0
  if (input.discountPercent && input.discountPercent > 0) {
    discountAmount = Math.round((grossAmount * input.discountPercent) / 100)
  }
  
  const afterDiscount = Math.max(0, grossAmount - discountAmount)
  
  let taxableAmount: number
  let totalTax: number
  
  if (input.taxInclusive) {
    taxableAmount = Math.round((afterDiscount * 10000) / (10000 + input.taxRate * 100))
    totalTax = afterDiscount - taxableAmount
  } else {
    taxableAmount = afterDiscount
    totalTax = Math.round((taxableAmount * input.taxRate) / 100)
  }
  
  let cgstAmount = 0
  let sgstAmount = 0
  let igstAmount = 0
  let cgstRate = 0
  let sgstRate = 0
  let igstRate = 0
  
  if (input.isInterState) {
    igstRate = input.taxRate
    igstAmount = totalTax
  } else {
    cgstRate = input.taxRate / 2
    sgstRate = input.taxRate / 2
    cgstAmount = Math.round(totalTax / 2)
    sgstAmount = totalTax - cgstAmount // ensure they add up exactly
  }
  
  return {
    grossAmount,
    discountAmount,
    taxableAmount,
    cgstRate,
    sgstRate,
    igstRate,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalTax,
    totalAmount: taxableAmount + totalTax,
  }
}

export function calculateInvoiceTotals(items: LineItemResult[]) {
  const subtotal = items.reduce((s, i) => s + i.grossAmount, 0)
  const totalDiscount = items.reduce((s, i) => s + i.discountAmount, 0)
  const taxableAmount = items.reduce((s, i) => s + i.taxableAmount, 0)
  const totalCgst = items.reduce((s, i) => s + i.cgstAmount, 0)
  const totalSgst = items.reduce((s, i) => s + i.sgstAmount, 0)
  const totalIgst = items.reduce((s, i) => s + i.igstAmount, 0)
  const totalTax = totalCgst + totalSgst + totalIgst
  const grandTotal = taxableAmount + totalTax
  const roundOff = Math.round(grandTotal / 100) * 100 - grandTotal
  const finalAmount = grandTotal + roundOff
  
  return {
    subtotal,
    totalDiscount,
    taxableAmount,
    totalCgst,
    totalSgst,
    totalIgst,
    totalTax,
    grandTotal,
    roundOff,
    finalAmount,
  }
}

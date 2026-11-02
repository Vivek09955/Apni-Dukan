export interface GstCalcInput {
  rate: number; // price in paise (per unit)
  quantity: number;
  discountPercent?: number;
  discountAmount?: number; // paise
  taxRate: number; // percentage like 0, 5, 12, 18, 28
  taxInclusive: boolean;
  isInterState: boolean;
}

export interface GstCalcResult {
  rate: number;
  quantity: number;
  grossAmount: number; // rate * quantity (paise)
  discountAmount: number; // paise
  taxableAmount: number; // paise
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cgstAmount: number; // paise
  sgstAmount: number; // paise
  igstAmount: number; // paise
  totalTax: number; // paise
  totalAmount: number; // paise
}

export interface InvoiceTotals {
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalTax: number;
  grandTotal: number;
  roundOff: number;
  finalAmount: number;
}

/**
 * Calculates GST components for a single line item using integer paise arithmetic.
 */
export function calculateLineItem(input: GstCalcInput): GstCalcResult {
  const rate = Math.round(input.rate || 0);
  const quantity = input.quantity;
  const grossAmount = Math.round(rate * quantity);

  let discountAmount = 0;
  if (input.discountAmount !== undefined && input.discountAmount !== null) {
    discountAmount = Math.round(input.discountAmount);
  } else if (input.discountPercent) {
    discountAmount = Math.round((grossAmount * input.discountPercent) / 100);
  }
  discountAmount = Math.min(discountAmount, grossAmount);

  const taxRate = Math.max(0, input.taxRate || 0);

  let taxableAmount = 0;
  let cgstRate = 0;
  let sgstRate = 0;
  let igstRate = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let totalTax = 0;
  let totalAmount = 0;

  if (input.isInterState) {
    igstRate = taxRate;
  } else {
    cgstRate = taxRate / 2;
    sgstRate = taxRate / 2;
  }

  if (input.taxInclusive) {
    const netInclusive = grossAmount - discountAmount;
    if (taxRate === 0) {
      taxableAmount = netInclusive;
      totalTax = 0;
    } else {
      taxableAmount = Math.round((netInclusive * 100) / (100 + taxRate));
      totalTax = netInclusive - taxableAmount;
    }

    if (input.isInterState) {
      igstAmount = totalTax;
    } else {
      cgstAmount = Math.round(totalTax / 2);
      sgstAmount = totalTax - cgstAmount;
    }

    totalAmount = taxableAmount + totalTax;
  } else {
    taxableAmount = grossAmount - discountAmount;

    if (input.isInterState) {
      igstAmount = Math.round((taxableAmount * igstRate) / 100);
      totalTax = igstAmount;
    } else {
      cgstAmount = Math.round((taxableAmount * cgstRate) / 100);
      sgstAmount = Math.round((taxableAmount * sgstRate) / 100);
      totalTax = cgstAmount + sgstAmount;
    }

    totalAmount = taxableAmount + totalTax;
  }

  return {
    rate,
    quantity,
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
    totalAmount,
  };
}

/**
 * Rounds paise amount to nearest rupee (100 paise) and returns the rounded amount and round-off delta.
 */
export function roundToNearestRupee(amountInPaise: number): { roundedAmount: number; roundOff: number } {
  const roundedRupees = Math.round(amountInPaise / 100);
  const roundedAmount = roundedRupees * 100;
  const roundOff = roundedAmount - amountInPaise;
  return { roundedAmount, roundOff };
}

/**
 * Aggregates all line item totals and computes invoice grand total with optional round-off.
 */
export function calculateInvoiceTotals(items: GstCalcResult[], roundOff: boolean = true): InvoiceTotals {
  const subtotal = items.reduce((sum, item) => sum + item.grossAmount, 0);
  const totalDiscount = items.reduce((sum, item) => sum + item.discountAmount, 0);
  const taxableAmount = items.reduce((sum, item) => sum + item.taxableAmount, 0);
  const totalCgst = items.reduce((sum, item) => sum + item.cgstAmount, 0);
  const totalSgst = items.reduce((sum, item) => sum + item.sgstAmount, 0);
  const totalIgst = items.reduce((sum, item) => sum + item.igstAmount, 0);
  const totalTax = totalCgst + totalSgst + totalIgst;
  const grandTotal = taxableAmount + totalTax;

  let roundOffAmount = 0;
  let finalAmount = grandTotal;

  if (roundOff) {
    const rounded = roundToNearestRupee(grandTotal);
    roundOffAmount = rounded.roundOff;
    finalAmount = rounded.roundedAmount;
  }

  return {
    subtotal,
    totalDiscount,
    taxableAmount,
    totalCgst,
    totalSgst,
    totalIgst,
    totalTax,
    grandTotal,
    roundOff: roundOffAmount,
    finalAmount,
  };
}

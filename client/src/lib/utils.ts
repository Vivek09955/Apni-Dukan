export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * Format paise to rupee display: 10050 -> "₹100.50"
 */
export function formatCurrency(paise: number | undefined | null): string {
  if (paise === undefined || paise === null || isNaN(paise)) {
    return '₹0.00'
  }
  const rupees = paise / 100
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees)
}

/**
 * Format paise to input value (rupees): 10050 -> "100.50"
 */
export function paiseToRupees(paise: number | undefined | null): string {
  if (paise === undefined || paise === null || isNaN(paise)) {
    return ''
  }
  return (paise / 100).toFixed(2)
}

/**
 * Parse rupee input to paise: "100.50" -> 10050
 */
export function rupeesToPaise(rupees: string | number | undefined | null): number {
  if (rupees === undefined || rupees === null || rupees === '') return 0
  const num = typeof rupees === 'string' ? parseFloat(rupees) : rupees
  if (isNaN(num)) return 0
  return Math.round(num * 100)
}

/**
 * Formats a date into dd/MM/yyyy format.
 */
export function formatDate(dateString: string | number | Date | undefined | null): string {
  if (!dateString) return '-'
  try {
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '-'
  }
}

/**
 * Get status badge variant for invoices and bills
 */
export function getStatusColor(status: string): 'default' | 'info' | 'warning' | 'success' | 'danger' {
  const colors: Record<string, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
    draft: 'default',
    issued: 'info',
    sent: 'info',
    confirmed: 'info',
    dispatched: 'info',
    partially_paid: 'warning',
    partially_fulfilled: 'warning',
    paid: 'success',
    accepted: 'success',
    fulfilled: 'success',
    delivered: 'success',
    converted: 'success',
    received: 'success',
    overdue: 'danger',
    cancelled: 'danger',
    rejected: 'danger',
    expired: 'danger',
  }
  return colors[status] || 'default'
}

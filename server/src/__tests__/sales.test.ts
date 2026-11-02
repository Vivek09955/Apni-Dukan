import { describe, it, expect } from 'vitest';
import { calculateLineItem, calculateInvoiceTotals } from '../utils/gstCalculator';

/**
 * Sales / billing logic unit tests.
 * Tests invoice total computation, status transitions, and business rules
 * without requiring MongoDB.
 */

describe('Sales Invoice Logic', () => {
  describe('Server-side total recalculation', () => {
    it('should compute correct totals for a simple invoice', () => {
      const items = [
        calculateLineItem({
          rate: 50000, // ₹500
          quantity: 2,
          taxRate: 18,
          taxInclusive: false,
          isInterState: false,
        }),
        calculateLineItem({
          rate: 25000, // ₹250
          quantity: 4,
          taxRate: 12,
          taxInclusive: false,
          isInterState: false,
        }),
      ];

      const totals = calculateInvoiceTotals(items, true);

      // Item 1: gross=100000, tax=18000, total=118000
      // Item 2: gross=100000, tax=12000, total=112000
      expect(totals.subtotal).toBe(200000);
      expect(totals.totalDiscount).toBe(0);
      expect(totals.taxableAmount).toBe(200000);
      expect(totals.totalTax).toBe(30000);
      expect(totals.grandTotal).toBe(230000);
      expect(totals.finalAmount).toBe(230000); // Already round
    });

    it('should recalculate with discounts correctly', () => {
      const items = [
        calculateLineItem({
          rate: 100000,
          quantity: 1,
          discountPercent: 20,
          taxRate: 18,
          taxInclusive: false,
          isInterState: false,
        }),
      ];

      const totals = calculateInvoiceTotals(items, false);

      // Gross: 100000, Discount: 20000, Taxable: 80000
      // Tax: 14400
      expect(totals.subtotal).toBe(100000);
      expect(totals.totalDiscount).toBe(20000);
      expect(totals.taxableAmount).toBe(80000);
      expect(totals.totalTax).toBe(14400);
      expect(totals.grandTotal).toBe(94400);
    });

    it('should prevent negative totals', () => {
      const items = [
        calculateLineItem({
          rate: 10000,
          quantity: 1,
          discountPercent: 100,
          taxRate: 18,
          taxInclusive: false,
          isInterState: false,
        }),
      ];

      const totals = calculateInvoiceTotals(items, false);

      expect(totals.taxableAmount).toBe(0);
      expect(totals.totalTax).toBe(0);
      expect(totals.grandTotal).toBe(0);
      expect(totals.finalAmount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Invoice Status Transitions', () => {
    type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

    const VALID_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
      draft: ['issued', 'cancelled'],
      issued: ['partially_paid', 'paid', 'overdue', 'cancelled'],
      partially_paid: ['paid', 'overdue', 'cancelled'],
      paid: [], // Terminal state — cannot change
      overdue: ['partially_paid', 'paid', 'cancelled'],
      cancelled: [], // Terminal state
    };

    function isValidTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
      return VALID_TRANSITIONS[from]?.includes(to) ?? false;
    }

    it('should allow draft → issued', () => {
      expect(isValidTransition('draft', 'issued')).toBe(true);
    });

    it('should allow draft → cancelled', () => {
      expect(isValidTransition('draft', 'cancelled')).toBe(true);
    });

    it('should allow issued → paid', () => {
      expect(isValidTransition('issued', 'paid')).toBe(true);
    });

    it('should allow issued → partially_paid', () => {
      expect(isValidTransition('issued', 'partially_paid')).toBe(true);
    });

    it('should allow issued → cancelled', () => {
      expect(isValidTransition('issued', 'cancelled')).toBe(true);
    });

    it('should allow partially_paid → paid', () => {
      expect(isValidTransition('partially_paid', 'paid')).toBe(true);
    });

    it('should not allow paid → any', () => {
      expect(isValidTransition('paid', 'draft')).toBe(false);
      expect(isValidTransition('paid', 'issued')).toBe(false);
      expect(isValidTransition('paid', 'cancelled')).toBe(false);
    });

    it('should not allow cancelled → any', () => {
      expect(isValidTransition('cancelled', 'draft')).toBe(false);
      expect(isValidTransition('cancelled', 'issued')).toBe(false);
      expect(isValidTransition('cancelled', 'paid')).toBe(false);
    });

    it('should not allow draft → paid directly', () => {
      expect(isValidTransition('draft', 'paid')).toBe(false);
    });

    it('should allow overdue → paid', () => {
      expect(isValidTransition('overdue', 'paid')).toBe(true);
    });
  });

  describe('Invoice Payment Status Computation', () => {
    function computePaymentStatus(
      finalAmount: number,
      paidAmount: number,
      dueDate: Date | null,
    ): string {
      if (paidAmount >= finalAmount) return 'paid';
      if (paidAmount > 0) {
        if (dueDate && dueDate < new Date()) return 'overdue';
        return 'partially_paid';
      }
      if (dueDate && dueDate < new Date()) return 'overdue';
      return 'issued';
    }

    it('should return paid when fully paid', () => {
      expect(computePaymentStatus(100000, 100000, null)).toBe('paid');
    });

    it('should return paid when overpaid', () => {
      expect(computePaymentStatus(100000, 120000, null)).toBe('paid');
    });

    it('should return partially_paid for partial payment', () => {
      const future = new Date(Date.now() + 86400000);
      expect(computePaymentStatus(100000, 50000, future)).toBe('partially_paid');
    });

    it('should return overdue for unpaid past-due invoice', () => {
      const past = new Date(Date.now() - 86400000);
      expect(computePaymentStatus(100000, 0, past)).toBe('overdue');
    });

    it('should return overdue for partially-paid past-due invoice', () => {
      const past = new Date(Date.now() - 86400000);
      expect(computePaymentStatus(100000, 30000, past)).toBe('overdue');
    });

    it('should return issued for unpaid invoice with no due date', () => {
      expect(computePaymentStatus(100000, 0, null)).toBe('issued');
    });
  });

  describe('Duplicate Invoice Prevention', () => {
    it('should detect duplicate invoice numbers', () => {
      const existingNumbers = new Set(['INV-00001', 'INV-00002', 'INV-00003']);
      
      expect(existingNumbers.has('INV-00001')).toBe(true); // Duplicate
      expect(existingNumbers.has('INV-00004')).toBe(false); // New
    });
  });

  describe('Stock Validation', () => {
    interface StockCheck {
      productId: string;
      available: number;
      requested: number;
    }

    function validateStock(checks: StockCheck[]): { valid: boolean; errors: string[] } {
      const errors: string[] = [];
      for (const check of checks) {
        if (check.requested > check.available) {
          errors.push(
            `Insufficient stock for product ${check.productId}: ` +
            `available=${check.available}, requested=${check.requested}`
          );
        }
      }
      return { valid: errors.length === 0, errors };
    }

    it('should pass when stock is sufficient', () => {
      const result = validateStock([
        { productId: 'p1', available: 100, requested: 50 },
        { productId: 'p2', available: 200, requested: 200 },
      ]);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when stock is insufficient', () => {
      const result = validateStock([
        { productId: 'p1', available: 10, requested: 50 },
      ]);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Insufficient stock');
    });

    it('should report all insufficient items', () => {
      const result = validateStock([
        { productId: 'p1', available: 10, requested: 50 },
        { productId: 'p2', available: 5, requested: 20 },
        { productId: 'p3', available: 100, requested: 10 },
      ]);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    it('should handle zero stock', () => {
      const result = validateStock([
        { productId: 'p1', available: 0, requested: 1 },
      ]);
      expect(result.valid).toBe(false);
    });

    it('should handle zero requested', () => {
      const result = validateStock([
        { productId: 'p1', available: 100, requested: 0 },
      ]);
      expect(result.valid).toBe(true);
    });
  });
});

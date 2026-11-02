import { describe, it, expect } from 'vitest';
import {
  calculateLineItem,
  calculateInvoiceTotals,
  roundToNearestRupee,
  type GstCalcInput,
  type GstCalcResult,
} from '../utils/gstCalculator';

describe('GST Calculator', () => {
  describe('calculateLineItem', () => {
    describe('Intra-state (CGST + SGST)', () => {
      it('should split tax into equal CGST and SGST for intra-state', () => {
        const input: GstCalcInput = {
          rate: 100000, // ₹1000.00 in paise
          quantity: 1,
          taxRate: 18,
          taxInclusive: false,
          isInterState: false,
        };
        const result = calculateLineItem(input);

        expect(result.grossAmount).toBe(100000);
        expect(result.taxableAmount).toBe(100000);
        expect(result.cgstRate).toBe(9);
        expect(result.sgstRate).toBe(9);
        expect(result.igstRate).toBe(0);
        expect(result.cgstAmount).toBe(9000); // 9% of 100000
        expect(result.sgstAmount).toBe(9000); // 9% of 100000
        expect(result.igstAmount).toBe(0);
        expect(result.totalTax).toBe(18000);
        expect(result.totalAmount).toBe(118000); // ₹1180.00
      });

      it('should handle 5% GST split (2.5% + 2.5%)', () => {
        const input: GstCalcInput = {
          rate: 50000, // ₹500.00
          quantity: 2,
          taxRate: 5,
          taxInclusive: false,
          isInterState: false,
        };
        const result = calculateLineItem(input);

        expect(result.grossAmount).toBe(100000);
        expect(result.taxableAmount).toBe(100000);
        expect(result.cgstRate).toBe(2.5);
        expect(result.sgstRate).toBe(2.5);
        expect(result.cgstAmount).toBe(2500);
        expect(result.sgstAmount).toBe(2500);
        expect(result.totalTax).toBe(5000);
        expect(result.totalAmount).toBe(105000);
      });

      it('should handle 12% GST', () => {
        const input: GstCalcInput = {
          rate: 10000, // ₹100.00
          quantity: 10,
          taxRate: 12,
          taxInclusive: false,
          isInterState: false,
        };
        const result = calculateLineItem(input);

        expect(result.grossAmount).toBe(100000);
        expect(result.cgstRate).toBe(6);
        expect(result.sgstRate).toBe(6);
        expect(result.cgstAmount).toBe(6000);
        expect(result.sgstAmount).toBe(6000);
        expect(result.totalTax).toBe(12000);
        expect(result.totalAmount).toBe(112000);
      });

      it('should handle 28% GST', () => {
        const input: GstCalcInput = {
          rate: 200000, // ₹2000.00
          quantity: 1,
          taxRate: 28,
          taxInclusive: false,
          isInterState: false,
        };
        const result = calculateLineItem(input);

        expect(result.cgstRate).toBe(14);
        expect(result.sgstRate).toBe(14);
        expect(result.cgstAmount).toBe(28000);
        expect(result.sgstAmount).toBe(28000);
        expect(result.totalTax).toBe(56000);
        expect(result.totalAmount).toBe(256000);
      });
    });

    describe('Inter-state (IGST)', () => {
      it('should apply full IGST for inter-state', () => {
        const input: GstCalcInput = {
          rate: 100000,
          quantity: 1,
          taxRate: 18,
          taxInclusive: false,
          isInterState: true,
        };
        const result = calculateLineItem(input);

        expect(result.cgstRate).toBe(0);
        expect(result.sgstRate).toBe(0);
        expect(result.igstRate).toBe(18);
        expect(result.cgstAmount).toBe(0);
        expect(result.sgstAmount).toBe(0);
        expect(result.igstAmount).toBe(18000);
        expect(result.totalTax).toBe(18000);
        expect(result.totalAmount).toBe(118000);
      });
    });

    describe('Tax-inclusive prices', () => {
      it('should back-calculate taxable amount from inclusive price', () => {
        const input: GstCalcInput = {
          rate: 118000, // ₹1180 inclusive of 18% GST
          quantity: 1,
          taxRate: 18,
          taxInclusive: true,
          isInterState: false,
        };
        const result = calculateLineItem(input);

        expect(result.grossAmount).toBe(118000);
        expect(result.taxableAmount).toBe(100000);
        expect(result.cgstAmount + result.sgstAmount).toBe(18000);
        expect(result.totalAmount).toBe(118000);
      });

      it('should handle tax-inclusive with IGST', () => {
        const input: GstCalcInput = {
          rate: 118000,
          quantity: 1,
          taxRate: 18,
          taxInclusive: true,
          isInterState: true,
        };
        const result = calculateLineItem(input);

        expect(result.taxableAmount).toBe(100000);
        expect(result.igstAmount).toBe(18000);
        expect(result.cgstAmount).toBe(0);
        expect(result.sgstAmount).toBe(0);
        expect(result.totalAmount).toBe(118000);
      });

      it('should handle tax-inclusive with zero rate', () => {
        const input: GstCalcInput = {
          rate: 50000,
          quantity: 1,
          taxRate: 0,
          taxInclusive: true,
          isInterState: false,
        };
        const result = calculateLineItem(input);

        expect(result.taxableAmount).toBe(50000);
        expect(result.totalTax).toBe(0);
        expect(result.totalAmount).toBe(50000);
      });
    });

    describe('Discounts', () => {
      it('should apply percentage discount before tax', () => {
        const input: GstCalcInput = {
          rate: 100000, // ₹1000
          quantity: 1,
          discountPercent: 10, // 10% off
          taxRate: 18,
          taxInclusive: false,
          isInterState: false,
        };
        const result = calculateLineItem(input);

        expect(result.grossAmount).toBe(100000);
        expect(result.discountAmount).toBe(10000); // ₹100 discount
        expect(result.taxableAmount).toBe(90000); // ₹900
        expect(result.totalTax).toBe(16200); // 18% of 90000
        expect(result.totalAmount).toBe(106200);
      });

      it('should apply fixed discount amount', () => {
        const input: GstCalcInput = {
          rate: 100000,
          quantity: 1,
          discountAmount: 5000, // ₹50 discount
          taxRate: 18,
          taxInclusive: false,
          isInterState: false,
        };
        const result = calculateLineItem(input);

        expect(result.discountAmount).toBe(5000);
        expect(result.taxableAmount).toBe(95000);
        expect(result.totalTax).toBe(17100);
      });

      it('should cap discount at gross amount', () => {
        const input: GstCalcInput = {
          rate: 10000,
          quantity: 1,
          discountAmount: 99999, // More than gross
          taxRate: 18,
          taxInclusive: false,
          isInterState: false,
        };
        const result = calculateLineItem(input);

        expect(result.discountAmount).toBe(10000); // Capped at grossAmount
        expect(result.taxableAmount).toBe(0);
        expect(result.totalTax).toBe(0);
      });

      it('should apply discount on tax-inclusive price', () => {
        const input: GstCalcInput = {
          rate: 118000,
          quantity: 1,
          discountPercent: 10,
          taxRate: 18,
          taxInclusive: true,
          isInterState: false,
        };
        const result = calculateLineItem(input);

        expect(result.discountAmount).toBe(11800);
        // Net after discount: 118000 - 11800 = 106200
        // Taxable = 106200 * 100 / 118 = 90000
        expect(result.taxableAmount).toBe(90000);
      });
    });

    describe('Zero-rated and exempt items', () => {
      it('should handle zero tax rate', () => {
        const input: GstCalcInput = {
          rate: 50000,
          quantity: 3,
          taxRate: 0,
          taxInclusive: false,
          isInterState: false,
        };
        const result = calculateLineItem(input);

        expect(result.grossAmount).toBe(150000);
        expect(result.taxableAmount).toBe(150000);
        expect(result.totalTax).toBe(0);
        expect(result.cgstAmount).toBe(0);
        expect(result.sgstAmount).toBe(0);
        expect(result.igstAmount).toBe(0);
        expect(result.totalAmount).toBe(150000);
      });
    });

    describe('Edge cases', () => {
      it('should handle zero quantity', () => {
        const input: GstCalcInput = {
          rate: 10000,
          quantity: 0,
          taxRate: 18,
          taxInclusive: false,
          isInterState: false,
        };
        const result = calculateLineItem(input);

        expect(result.grossAmount).toBe(0);
        expect(result.taxableAmount).toBe(0);
        expect(result.totalTax).toBe(0);
        expect(result.totalAmount).toBe(0);
      });

      it('should handle zero rate', () => {
        const input: GstCalcInput = {
          rate: 0,
          quantity: 5,
          taxRate: 18,
          taxInclusive: false,
          isInterState: false,
        };
        const result = calculateLineItem(input);

        expect(result.grossAmount).toBe(0);
        expect(result.totalAmount).toBe(0);
      });

      it('should handle fractional quantity', () => {
        const input: GstCalcInput = {
          rate: 10000,
          quantity: 1.5,
          taxRate: 18,
          taxInclusive: false,
          isInterState: false,
        };
        const result = calculateLineItem(input);

        expect(result.grossAmount).toBe(15000);
        expect(result.taxableAmount).toBe(15000);
        expect(result.totalTax).toBe(2700);
        expect(result.totalAmount).toBe(17700);
      });

      it('should use integer paise arithmetic (no floating-point errors)', () => {
        // ₹33.33 * 3 = ₹99.99
        const input: GstCalcInput = {
          rate: 3333, // 33.33 rupees in paise
          quantity: 3,
          taxRate: 18,
          taxInclusive: false,
          isInterState: false,
        };
        const result = calculateLineItem(input);

        expect(result.grossAmount).toBe(9999);
        expect(Number.isInteger(result.grossAmount)).toBe(true);
        expect(Number.isInteger(result.cgstAmount)).toBe(true);
        expect(Number.isInteger(result.sgstAmount)).toBe(true);
        expect(Number.isInteger(result.taxableAmount)).toBe(true);
        expect(Number.isInteger(result.totalAmount)).toBe(true);
      });

      it('should handle 100% discount', () => {
        const input: GstCalcInput = {
          rate: 50000,
          quantity: 1,
          discountPercent: 100,
          taxRate: 18,
          taxInclusive: false,
          isInterState: false,
        };
        const result = calculateLineItem(input);

        expect(result.discountAmount).toBe(50000);
        expect(result.taxableAmount).toBe(0);
        expect(result.totalTax).toBe(0);
        expect(result.totalAmount).toBe(0);
      });
    });

    describe('Multiple items with different tax rates', () => {
      it('should calculate different rates independently', () => {
        const item1 = calculateLineItem({
          rate: 100000,
          quantity: 1,
          taxRate: 5,
          taxInclusive: false,
          isInterState: false,
        });

        const item2 = calculateLineItem({
          rate: 200000,
          quantity: 1,
          taxRate: 18,
          taxInclusive: false,
          isInterState: false,
        });

        const item3 = calculateLineItem({
          rate: 50000,
          quantity: 2,
          taxRate: 12,
          taxInclusive: false,
          isInterState: false,
        });

        // Item 1: ₹1000 + 5% = ₹1050
        expect(item1.totalAmount).toBe(105000);
        // Item 2: ₹2000 + 18% = ₹2360
        expect(item2.totalAmount).toBe(236000);
        // Item 3: ₹1000 + 12% = ₹1120
        expect(item3.totalAmount).toBe(112000);
      });
    });
  });

  describe('roundToNearestRupee', () => {
    it('should round down when paise < 50', () => {
      const result = roundToNearestRupee(10049); // ₹100.49
      expect(result.roundedAmount).toBe(10000); // ₹100.00
      expect(result.roundOff).toBe(-49);
    });

    it('should round up when paise >= 50', () => {
      const result = roundToNearestRupee(10050); // ₹100.50
      expect(result.roundedAmount).toBe(10100); // ₹101.00
      expect(result.roundOff).toBe(50);
    });

    it('should not change exact rupee amounts', () => {
      const result = roundToNearestRupee(10000);
      expect(result.roundedAmount).toBe(10000);
      expect(result.roundOff).toBe(0);
    });

    it('should handle zero amount', () => {
      const result = roundToNearestRupee(0);
      expect(result.roundedAmount).toBe(0);
      expect(result.roundOff).toBe(0);
    });
  });

  describe('calculateInvoiceTotals', () => {
    it('should aggregate multiple line items correctly', () => {
      const items: GstCalcResult[] = [
        calculateLineItem({
          rate: 100000, quantity: 2, taxRate: 18,
          taxInclusive: false, isInterState: false,
        }),
        calculateLineItem({
          rate: 50000, quantity: 3, taxRate: 5,
          taxInclusive: false, isInterState: false,
        }),
      ];

      const totals = calculateInvoiceTotals(items, false);

      // Item 1: gross=200000, taxable=200000, tax=36000, total=236000
      // Item 2: gross=150000, taxable=150000, tax=7500, total=157500
      expect(totals.subtotal).toBe(350000); // 200000 + 150000
      expect(totals.totalDiscount).toBe(0);
      expect(totals.taxableAmount).toBe(350000);
      expect(totals.totalCgst).toBe(21750); // 18000 + 3750
      expect(totals.totalSgst).toBe(21750);
      expect(totals.totalTax).toBe(43500);
      expect(totals.grandTotal).toBe(393500);
      expect(totals.finalAmount).toBe(393500);
    });

    it('should apply round-off when enabled', () => {
      const items: GstCalcResult[] = [
        calculateLineItem({
          rate: 10050, // ₹100.50
          quantity: 1,
          taxRate: 18,
          taxInclusive: false,
          isInterState: false,
        }),
      ];

      const totals = calculateInvoiceTotals(items, true);

      // rate=10050, qty=1: gross=10050, taxable=10050
      // CGST = round(10050*9/100)=905, SGST = round(10050*9/100)=905
      // tax=1810, grand=11860
      expect(totals.grandTotal).toBe(11860);
      expect(totals.finalAmount % 100).toBe(0); // Should be a whole rupee
    });

    it('should handle empty items array', () => {
      const totals = calculateInvoiceTotals([], false);

      expect(totals.subtotal).toBe(0);
      expect(totals.totalDiscount).toBe(0);
      expect(totals.taxableAmount).toBe(0);
      expect(totals.totalTax).toBe(0);
      expect(totals.grandTotal).toBe(0);
      expect(totals.finalAmount).toBe(0);
    });

    it('should handle mixed IGST and CGST/SGST items', () => {
      const items: GstCalcResult[] = [
        calculateLineItem({
          rate: 100000, quantity: 1, taxRate: 18,
          taxInclusive: false, isInterState: true,
        }),
        calculateLineItem({
          rate: 100000, quantity: 1, taxRate: 18,
          taxInclusive: false, isInterState: false,
        }),
      ];

      const totals = calculateInvoiceTotals(items, false);

      expect(totals.totalIgst).toBe(18000);
      expect(totals.totalCgst).toBe(9000);
      expect(totals.totalSgst).toBe(9000);
      expect(totals.totalTax).toBe(36000);
    });

    it('should aggregate discounts correctly', () => {
      const items: GstCalcResult[] = [
        calculateLineItem({
          rate: 100000, quantity: 1, discountPercent: 10,
          taxRate: 18, taxInclusive: false, isInterState: false,
        }),
        calculateLineItem({
          rate: 50000, quantity: 2, discountAmount: 5000,
          taxRate: 12, taxInclusive: false, isInterState: false,
        }),
      ];

      const totals = calculateInvoiceTotals(items, false);

      expect(totals.totalDiscount).toBe(15000); // 10000 + 5000
      // Item 1: gross=100000, disc=10000, taxable=90000
      // Item 2: gross=100000, disc=5000, taxable=95000
      expect(totals.taxableAmount).toBe(185000); // 90000 + 95000
    });
  });
});

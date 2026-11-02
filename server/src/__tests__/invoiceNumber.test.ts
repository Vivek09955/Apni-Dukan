import { describe, it, expect } from 'vitest';

/**
 * Tests for invoice number generation format logic.
 * We test the formatting/padding logic without requiring MongoDB.
 */

function formatInvoiceNumber(prefix: string, nextNumber: number): string {
  const rawPrefix = prefix;
  const normalizedPrefix = rawPrefix.endsWith('-') || rawPrefix.endsWith('/')
    ? rawPrefix
    : `${rawPrefix}-`;
  const num = String(nextNumber || 1).padStart(5, '0');
  return `${normalizedPrefix}${num}`;
}

describe('Invoice Number Generator', () => {
  describe('formatInvoiceNumber', () => {
    it('should format with default prefix and padding', () => {
      expect(formatInvoiceNumber('INV', 1)).toBe('INV-00001');
    });

    it('should pad numbers to 5 digits', () => {
      expect(formatInvoiceNumber('INV', 42)).toBe('INV-00042');
      expect(formatInvoiceNumber('INV', 999)).toBe('INV-00999');
      expect(formatInvoiceNumber('INV', 10000)).toBe('INV-10000');
      expect(formatInvoiceNumber('INV', 99999)).toBe('INV-99999');
    });

    it('should handle numbers beyond 5 digits', () => {
      expect(formatInvoiceNumber('INV', 100000)).toBe('INV-100000');
    });

    it('should not add extra dash if prefix ends with dash', () => {
      expect(formatInvoiceNumber('INV-', 1)).toBe('INV-00001');
    });

    it('should handle slash-terminated prefix', () => {
      expect(formatInvoiceNumber('INV/', 1)).toBe('INV/00001');
    });

    it('should work with different document prefixes', () => {
      expect(formatInvoiceNumber('BILL', 5)).toBe('BILL-00005');
      expect(formatInvoiceNumber('PAY', 100)).toBe('PAY-00100');
      expect(formatInvoiceNumber('QTN', 1)).toBe('QTN-00001');
      expect(formatInvoiceNumber('SO', 25)).toBe('SO-00025');
      expect(formatInvoiceNumber('PO', 3)).toBe('PO-00003');
      expect(formatInvoiceNumber('DC', 7)).toBe('DC-00007');
      expect(formatInvoiceNumber('EXP', 12)).toBe('EXP-00012');
      expect(formatInvoiceNumber('JV', 999)).toBe('JV-00999');
    });

    it('should default to 1 if nextNumber is 0', () => {
      expect(formatInvoiceNumber('INV', 0)).toBe('INV-00001');
    });

    it('should handle custom business prefix', () => {
      expect(formatInvoiceNumber('SHOP2024', 1)).toBe('SHOP2024-00001');
      expect(formatInvoiceNumber('ABC/FY25/', 42)).toBe('ABC/FY25/00042');
    });

    it('should be sequential', () => {
      const numbers = [];
      for (let i = 1; i <= 10; i++) {
        numbers.push(formatInvoiceNumber('INV', i));
      }
      expect(numbers).toEqual([
        'INV-00001', 'INV-00002', 'INV-00003', 'INV-00004', 'INV-00005',
        'INV-00006', 'INV-00007', 'INV-00008', 'INV-00009', 'INV-00010',
      ]);
    });
  });
});

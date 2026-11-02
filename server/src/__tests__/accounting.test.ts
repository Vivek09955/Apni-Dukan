import { describe, it, expect } from 'vitest';

/**
 * Accounting logic unit tests.
 * Tests double-entry bookkeeping validation rules without MongoDB.
 */

interface JournalLine {
  account: string;
  debit: number;  // paise
  credit: number; // paise
  description?: string;
}

/**
 * Validates that a journal entry is balanced (total debits === total credits).
 * This mirrors the pre-save hook in server/src/models/JournalEntry.ts
 */
function validateJournalEntry(lines: JournalLine[]): {
  isValid: boolean;
  totalDebit: number;
  totalCredit: number;
  error?: string;
} {
  if (lines.length < 2) {
    return {
      isValid: false,
      totalDebit: 0,
      totalCredit: 0,
      error: 'A journal entry must have at least 2 lines',
    };
  }

  const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);

  if (totalDebit === 0 && totalCredit === 0) {
    return {
      isValid: false,
      totalDebit,
      totalCredit,
      error: 'Journal entry cannot have zero amounts',
    };
  }

  // Each line should have either debit or credit, not both
  for (const line of lines) {
    if (line.debit > 0 && line.credit > 0) {
      return {
        isValid: false,
        totalDebit,
        totalCredit,
        error: 'A line cannot have both debit and credit',
      };
    }
    if (line.debit < 0 || line.credit < 0) {
      return {
        isValid: false,
        totalDebit,
        totalCredit,
        error: 'Debit and credit amounts must be non-negative',
      };
    }
  }

  if (totalDebit !== totalCredit) {
    return {
      isValid: false,
      totalDebit,
      totalCredit,
      error: `Journal entry is not balanced: debit=${totalDebit} credit=${totalCredit}`,
    };
  }

  return { isValid: true, totalDebit, totalCredit };
}

/**
 * Creates the journal lines for a sales invoice.
 * Mirrors the accounting service logic.
 */
function createSalesJournalLines(invoice: {
  customerId: string;
  finalAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  roundOff: number;
}): JournalLine[] {
  const lines: JournalLine[] = [];

  // Debit: Accounts Receivable (customer owes us)
  lines.push({
    account: 'accounts_receivable',
    debit: invoice.finalAmount,
    credit: 0,
    description: 'Customer receivable',
  });

  // Credit: Sales Revenue
  lines.push({
    account: 'sales_revenue',
    debit: 0,
    credit: invoice.taxableAmount,
    description: 'Sales revenue',
  });

  // Credit: CGST Payable
  if (invoice.cgstAmount > 0) {
    lines.push({
      account: 'cgst_payable',
      debit: 0,
      credit: invoice.cgstAmount,
      description: 'CGST liability',
    });
  }

  // Credit: SGST Payable
  if (invoice.sgstAmount > 0) {
    lines.push({
      account: 'sgst_payable',
      debit: 0,
      credit: invoice.sgstAmount,
      description: 'SGST liability',
    });
  }

  // Credit: IGST Payable
  if (invoice.igstAmount > 0) {
    lines.push({
      account: 'igst_payable',
      debit: 0,
      credit: invoice.igstAmount,
      description: 'IGST liability',
    });
  }

  // Round-off adjustment
  if (invoice.roundOff > 0) {
    // Rounding increased the total → debit round-off expense
    lines.push({
      account: 'round_off',
      debit: 0,
      credit: invoice.roundOff,
      description: 'Round off adjustment',
    });
  } else if (invoice.roundOff < 0) {
    lines.push({
      account: 'round_off',
      debit: Math.abs(invoice.roundOff),
      credit: 0,
      description: 'Round off adjustment',
    });
  }

  return lines;
}

/**
 * Creates the reversal journal lines (for cancellation).
 */
function createReversalLines(originalLines: JournalLine[]): JournalLine[] {
  return originalLines.map((line) => ({
    ...line,
    debit: line.credit,
    credit: line.debit,
    description: `Reversal: ${line.description || ''}`,
  }));
}

describe('Accounting Logic', () => {
  describe('Journal Entry Validation', () => {
    it('should validate a balanced journal entry', () => {
      const lines: JournalLine[] = [
        { account: 'cash', debit: 100000, credit: 0 },
        { account: 'sales', debit: 0, credit: 100000 },
      ];
      const result = validateJournalEntry(lines);
      expect(result.isValid).toBe(true);
      expect(result.totalDebit).toBe(100000);
      expect(result.totalCredit).toBe(100000);
    });

    it('should reject unbalanced journal entry', () => {
      const lines: JournalLine[] = [
        { account: 'cash', debit: 100000, credit: 0 },
        { account: 'sales', debit: 0, credit: 90000 },
      ];
      const result = validateJournalEntry(lines);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('not balanced');
    });

    it('should reject entry with less than 2 lines', () => {
      const lines: JournalLine[] = [
        { account: 'cash', debit: 100000, credit: 0 },
      ];
      const result = validateJournalEntry(lines);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least 2 lines');
    });

    it('should reject entry with zero amounts', () => {
      const lines: JournalLine[] = [
        { account: 'cash', debit: 0, credit: 0 },
        { account: 'sales', debit: 0, credit: 0 },
      ];
      const result = validateJournalEntry(lines);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('zero amounts');
    });

    it('should reject line with both debit and credit', () => {
      const lines: JournalLine[] = [
        { account: 'cash', debit: 50000, credit: 50000 },
        { account: 'sales', debit: 0, credit: 0 },
      ];
      const result = validateJournalEntry(lines);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('both debit and credit');
    });

    it('should reject negative amounts', () => {
      const lines: JournalLine[] = [
        { account: 'cash', debit: -100000, credit: 0 },
        { account: 'sales', debit: 0, credit: -100000 },
      ];
      const result = validateJournalEntry(lines);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('non-negative');
    });

    it('should handle multi-line balanced entries', () => {
      const lines: JournalLine[] = [
        { account: 'accounts_receivable', debit: 118000, credit: 0 },
        { account: 'sales_revenue', debit: 0, credit: 100000 },
        { account: 'cgst_payable', debit: 0, credit: 9000 },
        { account: 'sgst_payable', debit: 0, credit: 9000 },
      ];
      const result = validateJournalEntry(lines);
      expect(result.isValid).toBe(true);
      expect(result.totalDebit).toBe(118000);
      expect(result.totalCredit).toBe(118000);
    });
  });

  describe('Sales Invoice Journal Entries', () => {
    it('should create balanced entries for intra-state sale', () => {
      const invoice = {
        customerId: 'cust1',
        finalAmount: 118000, // ₹1180
        taxableAmount: 100000,
        cgstAmount: 9000,
        sgstAmount: 9000,
        igstAmount: 0,
        roundOff: 0,
      };

      const lines = createSalesJournalLines(invoice);
      const validation = validateJournalEntry(lines);

      expect(validation.isValid).toBe(true);
      expect(lines.length).toBe(4); // Receivable, Sales, CGST, SGST
      expect(validation.totalDebit).toBe(118000);
      expect(validation.totalCredit).toBe(118000);
    });

    it('should create balanced entries for inter-state sale', () => {
      const invoice = {
        customerId: 'cust1',
        finalAmount: 118000,
        taxableAmount: 100000,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 18000,
        roundOff: 0,
      };

      const lines = createSalesJournalLines(invoice);
      const validation = validateJournalEntry(lines);

      expect(validation.isValid).toBe(true);
      expect(lines.length).toBe(3); // Receivable, Sales, IGST
    });

    it('should handle round-off in journal entry', () => {
      const invoice = {
        customerId: 'cust1',
        finalAmount: 11900, // ₹119 (rounded up from 118.59)
        taxableAmount: 10050,
        cgstAmount: 905,
        sgstAmount: 904,
        igstAmount: 0,
        roundOff: 41, // 11900 - (10050 + 905 + 904) = 41
      };

      const lines = createSalesJournalLines(invoice);
      const validation = validateJournalEntry(lines);

      expect(validation.isValid).toBe(true);
    });

    it('should handle negative round-off', () => {
      const invoice = {
        customerId: 'cust1',
        finalAmount: 11800, // ₹118 (rounded down from 118.59)
        taxableAmount: 10050,
        cgstAmount: 905,
        sgstAmount: 904,
        igstAmount: 0,
        roundOff: -59, // 11800 - (10050 + 905 + 904) = -59 
      };

      const lines = createSalesJournalLines(invoice);
      const validation = validateJournalEntry(lines);

      expect(validation.isValid).toBe(true);
    });

    it('should handle zero-rated sale (no tax)', () => {
      const invoice = {
        customerId: 'cust1',
        finalAmount: 50000,
        taxableAmount: 50000,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        roundOff: 0,
      };

      const lines = createSalesJournalLines(invoice);
      const validation = validateJournalEntry(lines);

      expect(validation.isValid).toBe(true);
      expect(lines.length).toBe(2); // Only Receivable and Sales
    });
  });

  describe('Journal Entry Reversal', () => {
    it('should create reversed entries that balance', () => {
      const originalLines: JournalLine[] = [
        { account: 'accounts_receivable', debit: 118000, credit: 0 },
        { account: 'sales_revenue', debit: 0, credit: 100000 },
        { account: 'cgst_payable', debit: 0, credit: 9000 },
        { account: 'sgst_payable', debit: 0, credit: 9000 },
      ];

      const reversalLines = createReversalLines(originalLines);
      const validation = validateJournalEntry(reversalLines);

      expect(validation.isValid).toBe(true);
      // Reversed: receivable is now credit, sales is now debit
      expect(reversalLines[0].debit).toBe(0);
      expect(reversalLines[0].credit).toBe(118000);
      expect(reversalLines[1].debit).toBe(100000);
      expect(reversalLines[1].credit).toBe(0);
    });

    it('should net to zero when original + reversal combined', () => {
      const original: JournalLine[] = [
        { account: 'cash', debit: 50000, credit: 0 },
        { account: 'revenue', debit: 0, credit: 50000 },
      ];

      const reversal = createReversalLines(original);

      const allLines = [...original, ...reversal];
      const totalDebit = allLines.reduce((sum, l) => sum + l.debit, 0);
      const totalCredit = allLines.reduce((sum, l) => sum + l.credit, 0);

      expect(totalDebit).toBe(totalCredit);
      // Cash account: debit 50000 + credit 50000 = net 0
      const cashDebit = allLines.filter(l => l.account === 'cash').reduce((s, l) => s + l.debit, 0);
      const cashCredit = allLines.filter(l => l.account === 'cash').reduce((s, l) => s + l.credit, 0);
      expect(cashDebit).toBe(cashCredit);
    });
  });

  describe('Trial Balance', () => {
    it('should have total debits equal total credits', () => {
      // Simulate a trial balance computation
      const allEntries: JournalLine[][] = [
        // Sale 1
        [
          { account: 'accounts_receivable', debit: 118000, credit: 0 },
          { account: 'sales_revenue', debit: 0, credit: 100000 },
          { account: 'cgst_payable', debit: 0, credit: 9000 },
          { account: 'sgst_payable', debit: 0, credit: 9000 },
        ],
        // Payment received
        [
          { account: 'cash', debit: 118000, credit: 0 },
          { account: 'accounts_receivable', debit: 0, credit: 118000 },
        ],
        // Expense
        [
          { account: 'rent_expense', debit: 30000, credit: 0 },
          { account: 'cash', debit: 0, credit: 30000 },
        ],
      ];

      // Each entry must be balanced
      for (const entry of allEntries) {
        const validation = validateJournalEntry(entry);
        expect(validation.isValid).toBe(true);
      }

      // Trial balance: aggregate all lines
      const accountBalances = new Map<string, { debit: number; credit: number }>();
      for (const entry of allEntries) {
        for (const line of entry) {
          const existing = accountBalances.get(line.account) || { debit: 0, credit: 0 };
          existing.debit += line.debit;
          existing.credit += line.credit;
          accountBalances.set(line.account, existing);
        }
      }

      let totalTrialDebit = 0;
      let totalTrialCredit = 0;
      for (const [, balance] of accountBalances) {
        totalTrialDebit += balance.debit;
        totalTrialCredit += balance.credit;
      }

      expect(totalTrialDebit).toBe(totalTrialCredit);

      // Verify specific account balances
      const arBalance = accountBalances.get('accounts_receivable')!;
      expect(arBalance.debit - arBalance.credit).toBe(0); // Fully paid

      const cashBalance = accountBalances.get('cash')!;
      expect(cashBalance.debit - cashBalance.credit).toBe(88000); // 118000 - 30000

      const salesBalance = accountBalances.get('sales_revenue')!;
      expect(salesBalance.credit - salesBalance.debit).toBe(100000);
    });
  });

  describe('Payment Allocation', () => {
    interface PaymentAllocation {
      invoiceId: string;
      amount: number; // paise
    }

    function validatePaymentAllocations(
      totalPayment: number,
      allocations: PaymentAllocation[],
      invoiceOutstanding: Map<string, number>,
    ): { isValid: boolean; error?: string } {
      const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);

      if (totalAllocated > totalPayment) {
        return { isValid: false, error: 'Allocations exceed payment amount' };
      }

      for (const allocation of allocations) {
        if (allocation.amount <= 0) {
          return { isValid: false, error: 'Allocation amount must be positive' };
        }
        const outstanding = invoiceOutstanding.get(allocation.invoiceId);
        if (outstanding === undefined) {
          return { isValid: false, error: `Invoice ${allocation.invoiceId} not found` };
        }
        if (allocation.amount > outstanding) {
          return { isValid: false, error: `Allocation exceeds outstanding for ${allocation.invoiceId}` };
        }
      }

      return { isValid: true };
    }

    it('should accept valid full payment allocation', () => {
      const outstanding = new Map([['INV-001', 50000]]);
      const result = validatePaymentAllocations(50000, [{ invoiceId: 'INV-001', amount: 50000 }], outstanding);
      expect(result.isValid).toBe(true);
    });

    it('should accept partial payment allocation', () => {
      const outstanding = new Map([['INV-001', 100000]]);
      const result = validatePaymentAllocations(30000, [{ invoiceId: 'INV-001', amount: 30000 }], outstanding);
      expect(result.isValid).toBe(true);
    });

    it('should accept multi-invoice allocation', () => {
      const outstanding = new Map([
        ['INV-001', 50000],
        ['INV-002', 30000],
      ]);
      const result = validatePaymentAllocations(80000, [
        { invoiceId: 'INV-001', amount: 50000 },
        { invoiceId: 'INV-002', amount: 30000 },
      ], outstanding);
      expect(result.isValid).toBe(true);
    });

    it('should reject allocation exceeding payment', () => {
      const outstanding = new Map([['INV-001', 100000]]);
      const result = validatePaymentAllocations(50000, [{ invoiceId: 'INV-001', amount: 60000 }], outstanding);
      expect(result.isValid).toBe(false);
    });

    it('should reject allocation exceeding outstanding', () => {
      const outstanding = new Map([['INV-001', 30000]]);
      const result = validatePaymentAllocations(50000, [{ invoiceId: 'INV-001', amount: 40000 }], outstanding);
      expect(result.isValid).toBe(false);
    });

    it('should reject zero allocation amount', () => {
      const outstanding = new Map([['INV-001', 50000]]);
      const result = validatePaymentAllocations(50000, [{ invoiceId: 'INV-001', amount: 0 }], outstanding);
      expect(result.isValid).toBe(false);
    });

    it('should reject allocation for non-existent invoice', () => {
      const outstanding = new Map([['INV-001', 50000]]);
      const result = validatePaymentAllocations(50000, [{ invoiceId: 'INV-999', amount: 50000 }], outstanding);
      expect(result.isValid).toBe(false);
    });
  });
});

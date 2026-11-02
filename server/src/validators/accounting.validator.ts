import { z } from 'zod';

export const createAccountSchema = z.object({
  name: z
    .string({ required_error: 'Account name is required' })
    .trim()
    .min(1, 'Account name cannot be empty'),
  code: z
    .string({ required_error: 'Account code is required' })
    .trim()
    .min(1, 'Account code cannot be empty'),
  type: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense'], {
    required_error: 'Valid account type is required',
  }),
  subType: z.string().trim().optional(),
  parentAccount: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid parent account ID')
    .optional(),
  description: z.string().trim().optional(),
  openingBalance: z.number().int('Opening balance must be an integer (in paise)').default(0).optional(),
});

export const updateAccountSchema = z.object({
  name: z.string().trim().min(1, 'Account name cannot be empty').optional(),
  subType: z.string().trim().optional(),
  parentAccount: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid parent account ID')
    .nullable()
    .optional(),
  description: z.string().trim().optional(),
  isActive: z.boolean().optional(),
});

const journalLineSchema = z.object({
  accountId: z
    .string({ required_error: 'Account ID is required' })
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Account ID'),
  debit: z.number().int().min(0, 'Debit cannot be negative').default(0),
  credit: z.number().int().min(0, 'Credit cannot be negative').default(0),
  description: z.string().trim().optional(),
});

export const createJournalEntrySchema = z
  .object({
    date: z.coerce.date().default(() => new Date()).optional(),
    narration: z
      .string({ required_error: 'Narration is required' })
      .trim()
      .min(1, 'Narration cannot be empty'),
    lines: z
      .array(journalLineSchema, { required_error: 'Lines are required' })
      .min(2, 'At least 2 lines are required for double-entry bookkeeping'),
    referenceType: z.string().trim().optional(),
    referenceId: z
      .string()
      .trim()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Reference ID')
      .optional(),
  })
  .refine(
    (data) => {
      const totalDebit = data.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
      const totalCredit = data.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
      return totalDebit > 0 && totalDebit === totalCredit;
    },
    {
      message: 'Journal entry must be balanced: total debits must equal total credits and be greater than 0',
      path: ['lines'],
    }
  );

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;

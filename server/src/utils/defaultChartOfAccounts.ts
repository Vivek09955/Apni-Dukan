import { ClientSession, Types } from 'mongoose';
import { Account, IAccount, AccountType } from '../models/Account';

export interface DefaultAccountDefinition {
  code: string;
  name: string;
  type: AccountType;
  subType?: string;
  description?: string;
  isSystemAccount: boolean;
}

export const DEFAULT_CHART_OF_ACCOUNTS: DefaultAccountDefinition[] = [
  // ASSETS (1xxx)
  {
    code: '1001',
    name: 'Cash in Hand',
    type: 'asset',
    subType: 'current_asset',
    description: 'Physical cash available in business registers or cash drawer',
    isSystemAccount: true,
  },
  {
    code: '1002',
    name: 'Bank Account',
    type: 'asset',
    subType: 'current_asset',
    description: 'Business bank account balance',
    isSystemAccount: true,
  },
  {
    code: '1003',
    name: 'Accounts Receivable',
    type: 'asset',
    subType: 'current_asset',
    description: 'Amounts owed by customers for goods/services sold on credit',
    isSystemAccount: true,
  },
  {
    code: '1004',
    name: 'Inventory',
    type: 'asset',
    subType: 'current_asset',
    description: 'Total value of merchandise held for sale',
    isSystemAccount: true,
  },
  {
    code: '1005',
    name: 'Other Current Assets',
    type: 'asset',
    subType: 'current_asset',
    description: 'Other short term assets and prepayments',
    isSystemAccount: false,
  },

  // LIABILITIES (2xxx)
  {
    code: '2001',
    name: 'Accounts Payable',
    type: 'liability',
    subType: 'current_liability',
    description: 'Amounts owed to suppliers for goods/services purchased on credit',
    isSystemAccount: true,
  },
  {
    code: '2002',
    name: 'Duties & Taxes - CGST Payable',
    type: 'liability',
    subType: 'current_liability',
    description: 'Central GST collected on sales payable to government',
    isSystemAccount: true,
  },
  {
    code: '2003',
    name: 'Duties & Taxes - SGST Payable',
    type: 'liability',
    subType: 'current_liability',
    description: 'State GST collected on sales payable to government',
    isSystemAccount: true,
  },
  {
    code: '2004',
    name: 'Duties & Taxes - IGST Payable',
    type: 'liability',
    subType: 'current_liability',
    description: 'Integrated GST collected on interstate sales payable to government',
    isSystemAccount: true,
  },
  {
    code: '2005',
    name: 'CGST Input Credit',
    type: 'asset',
    subType: 'current_asset',
    description: 'Input Central GST credit eligible to offset output tax liability',
    isSystemAccount: true,
  },
  {
    code: '2006',
    name: 'SGST Input Credit',
    type: 'asset',
    subType: 'current_asset',
    description: 'Input State GST credit eligible to offset output tax liability',
    isSystemAccount: true,
  },
  {
    code: '2007',
    name: 'IGST Input Credit',
    type: 'asset',
    subType: 'current_asset',
    description: 'Input Integrated GST credit eligible to offset output tax liability',
    isSystemAccount: true,
  },
  {
    code: '2008',
    name: 'Other Current Liabilities',
    type: 'liability',
    subType: 'current_liability',
    description: 'Other short term obligations and provisions',
    isSystemAccount: false,
  },

  // EQUITY (3xxx)
  {
    code: '3001',
    name: "Owner's Equity / Capital",
    type: 'equity',
    subType: 'capital',
    description: 'Capital invested by business owner(s)',
    isSystemAccount: true,
  },
  {
    code: '3002',
    name: 'Retained Earnings',
    type: 'equity',
    subType: 'retained_earnings',
    description: 'Cumulative net profit or loss retained in the business',
    isSystemAccount: false,
  },

  // REVENUE (4xxx)
  {
    code: '4001',
    name: 'Sales Revenue',
    type: 'revenue',
    subType: 'direct_income',
    description: 'Revenue earned from principal trading and sales',
    isSystemAccount: true,
  },
  {
    code: '4002',
    name: 'Other Income',
    type: 'revenue',
    subType: 'indirect_income',
    description: 'Miscellaneous secondary income including interest and commissions',
    isSystemAccount: false,
  },
  {
    code: '4003',
    name: 'Discount Received',
    type: 'revenue',
    subType: 'indirect_income',
    description: 'Discounts granted by suppliers upon purchases or early payments',
    isSystemAccount: false,
  },

  // EXPENSES (5xxx)
  {
    code: '5001',
    name: 'Cost of Goods Sold',
    type: 'expense',
    subType: 'direct_expense',
    description: 'Direct cost of goods sold',
    isSystemAccount: true,
  },
  {
    code: '5002',
    name: 'Purchase Expense',
    type: 'expense',
    subType: 'direct_expense',
    description: 'Purchases of inventory and raw materials',
    isSystemAccount: true,
  },
  {
    code: '5003',
    name: 'Rent',
    type: 'expense',
    subType: 'indirect_expense',
    description: 'Rent for shop, office or storage facilities',
    isSystemAccount: false,
  },
  {
    code: '5004',
    name: 'Salaries & Wages',
    type: 'expense',
    subType: 'indirect_expense',
    description: 'Staff payroll, wages and bonuses',
    isSystemAccount: false,
  },
  {
    code: '5005',
    name: 'Electricity',
    type: 'expense',
    subType: 'indirect_expense',
    description: 'Electricity, power and utility bills',
    isSystemAccount: false,
  },
  {
    code: '5006',
    name: 'Transport & Freight',
    type: 'expense',
    subType: 'indirect_expense',
    description: 'Freight inward/outward and transportation charges',
    isSystemAccount: false,
  },
  {
    code: '5007',
    name: 'Office & Admin Expenses',
    type: 'expense',
    subType: 'indirect_expense',
    description: 'Stationery, telecom, internet, maintenance and admin supplies',
    isSystemAccount: false,
  },
  {
    code: '5008',
    name: 'Discount Given',
    type: 'expense',
    subType: 'direct_expense',
    description: 'Trade or cash discounts granted to customers',
    isSystemAccount: false,
  },
  {
    code: '5009',
    name: 'Round Off',
    type: 'expense',
    subType: 'indirect_expense',
    description: 'Fractional rupee rounding difference',
    isSystemAccount: false,
  },
  {
    code: '5010',
    name: 'Other Expenses',
    type: 'expense',
    subType: 'indirect_expense',
    description: 'General miscellaneous operating expenses',
    isSystemAccount: false,
  },
];

/**
 * Creates default chart of accounts for a given business if not already created.
 */
export async function createDefaultAccounts(
  businessId: string | Types.ObjectId,
  session?: ClientSession
): Promise<IAccount[]> {
  const existingAccounts = await Account.find({ businessId }).session(session || null).select('code');
  const existingCodes = new Set(existingAccounts.map((a) => a.code));

  const accountsToCreate = DEFAULT_CHART_OF_ACCOUNTS.filter(
    (acc) => !existingCodes.has(acc.code)
  ).map((acc) => ({
    ...acc,
    businessId: new Types.ObjectId(businessId),
    openingBalance: 0,
    isActive: true,
  }));

  if (accountsToCreate.length === 0) {
    return existingAccounts as unknown as IAccount[];
  }

  const created = await Account.insertMany(accountsToCreate, { session });
  return created as unknown as IAccount[];
}

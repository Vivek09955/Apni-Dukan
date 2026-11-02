export interface User {
  _id: string
  name: string
  email: string
  phone?: string
  avatar?: string
  isEmailVerified: boolean
  createdAt: string
}

export interface BusinessSettings {
  taxInclusive: boolean
  enableGst: boolean
  enableDiscount: boolean
  roundOffTotal: boolean
  defaultTaxRate: number
  thermalPrint: boolean
  showLogo: boolean
}

export interface BusinessAddress {
  line1?: string
  line2?: string
  city?: string
  state?: string
  pincode?: string
}

export interface Business {
  _id: string
  name: string
  logo?: string
  address?: BusinessAddress
  phone?: string
  email?: string
  gstin?: string
  state: string
  financialYearStart: number
  currency: string
  invoicePrefix: string
  settings: BusinessSettings
  createdAt: string
}

export interface BusinessMember {
  _id: string
  userId: User
  businessId: string
  role: 'owner' | 'admin' | 'accountant' | 'manager' | 'staff'
  permissions: string[]
  isActive: boolean
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface AuthResponse {
  user: User
  accessToken: string
  businesses?: Business[]
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  confirmPassword?: string
  phone?: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface ForgotPasswordPayload {
  email: string
}

export interface ResetPasswordPayload {
  token: string
  password: string
}

export interface CreateBusinessPayload {
  name: string
  phone?: string
  email?: string
  gstin?: string
  state: string
  financialYearStart?: number
  currency?: string
  invoicePrefix?: string
  address?: BusinessAddress
  settings?: Partial<BusinessSettings>
}

export interface UpdateBusinessPayload extends Partial<CreateBusinessPayload> {}

export interface AddMemberPayload {
  email: string
  role: 'admin' | 'accountant' | 'manager' | 'staff'
  permissions?: string[]
}

export interface Product {
  _id: string
  name: string
  sku?: string
  description?: string
  category?: Category | string
  brand?: string
  hsnCode?: string
  sacCode?: string
  unit: string
  purchasePrice: number  // paise
  sellingPrice: number   // paise
  wholesalePrice?: number
  taxRate: number
  taxInclusive: boolean
  trackInventory: boolean
  reorderLevel: number
  openingStock: number
  currentStock?: number
  images: string[]
  isActive: boolean
  createdAt: string
}

export interface Category {
  _id: string
  name: string
  parentCategory?: string
  description?: string
}

export interface Address {
  line1?: string
  line2?: string
  city?: string
  state?: string
  pincode?: string
}

export interface Customer {
  _id: string
  name: string
  phone?: string
  email?: string
  gstin?: string
  billingAddress?: Address
  shippingAddress?: Address
  openingBalance: number
  creditLimit: number
  creditDays: number
  group?: string
  tags: string[]
  isActive: boolean
  totalReceivable?: number
  createdAt: string
}

export interface Supplier {
  _id: string
  name: string
  phone?: string
  email?: string
  gstin?: string
  address?: Address
  openingBalance: number
  creditDays: number
  group?: string
  tags: string[]
  isActive: boolean
  totalPayable?: number
  createdAt: string
}

export interface InvoiceItem {
  productId: string
  name: string
  hsnCode?: string
  quantity: number
  unit: string
  rate: number       // paise
  discount: number   // paise
  discountPercent: number
  taxableAmount: number
  taxRate: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  totalAmount: number
}

export interface SalesInvoice {
  _id: string
  invoiceNumber: string
  customerId: Customer | string
  invoiceDate: string
  dueDate?: string
  placeOfSupply: string
  items: InvoiceItem[]
  subtotal: number
  totalDiscount: number
  taxableAmount: number
  totalCgst: number
  totalSgst: number
  totalIgst: number
  totalTax: number
  grandTotal: number
  roundOff: number
  finalAmount: number
  paidAmount: number
  balanceDue: number
  status: 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled'
  notes?: string
  termsAndConditions?: string
  isInterState: boolean
  createdAt: string
}

export interface PurchaseBillItem {
  productId?: string
  name: string
  hsnCode?: string
  quantity: number
  unit: string
  rate: number       // paise
  discount: number   // paise
  discountPercent: number
  taxableAmount: number
  taxRate: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  totalAmount: number
}

export interface PurchaseBill {
  _id: string
  billNumber: string
  supplierInvoiceNumber?: string
  supplierId: Supplier | string
  billDate: string
  dueDate?: string
  placeOfSupply: string
  items: PurchaseBillItem[]
  subtotal: number
  totalDiscount: number
  taxableAmount: number
  totalCgst: number
  totalSgst: number
  totalIgst: number
  totalTax: number
  grandTotal: number
  roundOff: number
  finalAmount: number
  paidAmount: number
  balanceDue: number
  status: 'draft' | 'received' | 'partially_paid' | 'paid' | 'cancelled'
  notes?: string
  isInterState: boolean
  createdAt: string
}

export interface DashboardData {
  todaySales: number
  todayPurchases: number
  totalReceivables: number
  totalPayables: number
  cashInHand: number
  inventoryValue: number
  monthlySalesTrend: { month: string; amount: number; sales?: number; purchases?: number }[]
  monthlyPurchasesTrend: { month: string; amount: number }[]
  recentTransactions: any[]
  lowStockProducts: Product[]
  invoiceStatusCounts: Record<string, number>
  topSellingProducts: { name: string; quantity: number; revenue: number }[]
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface InvoiceAllocation {
  invoiceId: string
  invoiceType: 'sales_invoice' | 'purchase_bill'
  allocatedAmount: number
}

export interface Payment {
  _id: string
  paymentNumber: string
  type: 'payment_in' | 'payment_out'
  partyType: 'customer' | 'supplier'
  partyId: Customer | Supplier | string
  amount: number // paise
  paymentMethod: 'cash' | 'bank_transfer' | 'upi' | 'cheque' | 'other'
  paymentDate: string
  referenceNumber?: string
  bankName?: string
  invoiceAllocations: InvoiceAllocation[]
  isAdvance: boolean
  notes?: string
  isCancelled: boolean
  createdAt: string
}

export interface Expense {
  _id: string
  expenseNumber: string
  category: string
  amount: number // paise
  expenseDate: string
  paymentMethod: string
  vendorName?: string
  description?: string
  notes?: string
  isRecurring: boolean
  recurringInterval?: 'monthly' | 'quarterly' | 'yearly'
  isCancelled: boolean
  createdAt: string
}

export interface Account {
  _id: string
  name: string
  code: string
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  subType?: string
  parentAccount?: string
  description?: string
  openingBalance: number // paise
  currentBalance?: number // paise
  isSystemAccount: boolean
  isActive: boolean
}

export interface JournalLine {
  accountId: Account | string
  debit: number // paise
  credit: number // paise
  description?: string
}

export interface JournalEntry {
  _id: string
  entryNumber: string
  date: string
  narration: string
  lines: JournalLine[]
  referenceType?: string
  referenceId?: string
  isReversed: boolean
  isPosted: boolean
  createdAt: string
}

export interface TrialBalanceRow {
  accountId: string
  accountName: string
  accountCode: string
  accountType: string
  debitBalance: number
  creditBalance: number
}

export interface ProfitLossData {
  revenue: { accountName: string; amount: number }[]
  expenses: { accountName: string; amount: number }[]
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  period: { from: string; to: string }
}

export interface BalanceSheetData {
  assets: { accountName: string; balance: number }[]
  liabilities: { accountName: string; balance: number }[]
  equity: { accountName: string; balance: number }[]
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  netProfit: number
}

export interface OutstandingInvoice {
  _id: string
  invoiceNumber: string
  invoiceDate: string
  totalAmount: number
  paidAmount: number
  balanceDue: number
  type: 'sales_invoice' | 'purchase_bill'
}

export interface LedgerEntry {
  _id?: string
  date: string
  entryNumber: string
  narration: string
  debit: number
  credit: number
  balance: number
  referenceType?: string
  referenceId?: string
}

export interface Quotation {
  _id: string
  quotationNumber: string
  customerId: Customer | string
  quotationDate: string
  validUntil?: string
  placeOfSupply: string
  items: InvoiceItem[]
  subtotal: number
  totalDiscount: number
  taxableAmount: number
  totalCgst: number
  totalSgst: number
  totalIgst: number
  totalTax: number
  grandTotal: number
  roundOff: number
  finalAmount: number
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted'
  convertedToInvoice?: string
  notes?: string
  termsAndConditions?: string
  isInterState: boolean
  createdAt: string
}

export interface SalesOrder {
  _id: string
  orderNumber: string
  customerId: Customer | string
  orderDate: string
  expectedDate?: string
  placeOfSupply?: string
  items: (InvoiceItem & { fulfilledQuantity?: number })[]
  subtotal: number
  totalDiscount: number
  taxableAmount: number
  totalCgst: number
  totalSgst: number
  totalIgst: number
  totalTax: number
  grandTotal: number
  roundOff: number
  finalAmount: number
  status: 'draft' | 'confirmed' | 'partially_fulfilled' | 'fulfilled' | 'cancelled'
  convertedToInvoice?: string
  notes?: string
  termsAndConditions?: string
  isInterState?: boolean
  createdAt: string
}

export interface PurchaseOrder {
  _id: string
  orderNumber: string
  supplierId: Supplier | string
  orderDate: string
  expectedDate?: string
  placeOfSupply?: string
  items: (InvoiceItem & { fulfilledQuantity?: number })[]
  subtotal: number
  totalDiscount?: number
  taxableAmount?: number
  totalCgst?: number
  totalSgst?: number
  totalIgst?: number
  totalTax?: number
  grandTotal?: number
  roundOff?: number
  finalAmount: number
  status: 'draft' | 'confirmed' | 'partially_fulfilled' | 'fulfilled' | 'cancelled'
  convertedToBill?: string
  notes?: string
  isInterState?: boolean
  createdAt: string
}

export interface DeliveryChallanItem {
  productId: string
  name: string
  quantity: number
  unit: string
}

export interface DeliveryChallan {
  _id: string
  challanNumber: string
  customerId: Customer | string
  challanDate: string
  items: DeliveryChallanItem[]
  status: 'draft' | 'dispatched' | 'delivered' | 'cancelled'
  vehicleNumber?: string
  transporterName?: string
  notes?: string
  createdAt: string
}

export interface AppNotification {
  _id: string
  type: 'low_stock' | 'payment_due' | 'payment_overdue' | 'invoice_created' | 'quotation_expiring' | 'system'
  title: string
  message: string
  data?: any
  isRead: boolean
  createdAt: string
}

export interface GSTR1B2BInvoice {
  gstin: string
  customerName: string
  invoiceNumber: string
  invoiceDate: string
  taxableValue: number
  cgst: number
  sgst: number
  igst: number
  totalAmount: number
}

export interface GSTR1HSNRow {
  hsnCode: string
  description: string
  uqc: string
  quantity: number
  taxableValue: number
  cgst: number
  sgst: number
  igst: number
  totalTax: number
}

export interface GSTR1Report {
  b2b: GSTR1B2BInvoice[]
  b2cSmall: {
    state: string
    taxRate: number
    taxableValue: number
    cgst: number
    sgst: number
    igst: number
  }[]
  b2cLarge: any[]
  hsnSummary: GSTR1HSNRow[]
  docSummary: {
    invoicesCount: number
    creditNotesCount: number
    debitNotesCount: number
    cancelledCount: number
  }
  period: { from: string; to: string }
}

export interface GSTR3BSummary {
  outwardSupplies: { taxable: number; cgst: number; sgst: number; igst: number }
  inwardSupplies: { taxable: number; cgst: number; sgst: number; igst: number }
  inputTaxCredit: { cgst: number; sgst: number; igst: number }
  outputTaxLiability: { cgst: number; sgst: number; igst: number }
  netPayable: { cgst: number; sgst: number; igst: number; total: number }
}

export interface HSNSummaryRow {
  hsnCode: string
  description: string
  uqc: string
  quantity: number
  taxableValue: number
  cgst: number
  sgst: number
  igst: number
  totalTax: number
}

export interface TaxRateSummaryRow {
  taxRate: number
  taxableAmount: number
  cgst: number
  sgst: number
  igst: number
  totalTax: number
}

export interface BackupRecord {
  _id?: string
  id?: string
  filename: string
  createdAt: string
  size: number
  status: 'completed' | 'in_progress' | 'failed'
  recordsCount?: number
}


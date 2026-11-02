import type { FC } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthLayout } from './components/layout/AuthLayout'
import { AppLayout } from './components/layout/AppLayout'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage'
import { BusinessSetupWizard } from './features/business/BusinessSetupWizard'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { ProductListPage } from './features/products/ProductListPage'
import { CustomerListPage } from './features/customers/CustomerListPage'
import { CustomerDetailPage } from './features/customers/CustomerDetailPage'
import { SupplierListPage } from './features/suppliers/SupplierListPage'
import { SupplierDetailPage } from './features/suppliers/SupplierDetailPage'
import { InvoiceListPage } from './features/sales/InvoiceListPage'
import { InvoiceCreatePage } from './features/sales/InvoiceCreatePage'
import { InvoiceDetailPage } from './features/sales/InvoiceDetailPage'
import { QuotationListPage } from './features/sales/QuotationListPage'
import { QuotationCreatePage } from './features/sales/QuotationCreatePage'
import { QuotationDetailPage } from './features/sales/QuotationDetailPage'
import { SalesOrderListPage } from './features/sales/SalesOrderListPage'
import { SalesOrderCreatePage } from './features/sales/SalesOrderCreatePage'
import { DeliveryChallanListPage } from './features/sales/DeliveryChallanListPage'
import { DeliveryChallanCreatePage } from './features/sales/DeliveryChallanCreatePage'
import { PurchaseListPage } from './features/purchases/PurchaseListPage'
import { PurchaseCreatePage } from './features/purchases/PurchaseCreatePage'
import { PurchaseDetailPage } from './features/purchases/PurchaseDetailPage'
import { PurchaseOrderListPage } from './features/purchases/PurchaseOrderListPage'
import { PurchaseOrderCreatePage } from './features/purchases/PurchaseOrderCreatePage'
import { PaymentListPage } from './features/payments/PaymentListPage'
import { PaymentDetailPage } from './features/payments/PaymentDetailPage'
import { ExpenseListPage } from './features/expenses/ExpenseListPage'
import { ExpenseDetailPage } from './features/expenses/ExpenseDetailPage'
import { OtherIncomePage } from './features/expenses/OtherIncomePage'
import { ChartOfAccountsPage } from './features/accounting/ChartOfAccountsPage'
import { JournalEntryListPage } from './features/accounting/JournalEntryListPage'
import { JournalEntryDetailPage } from './features/accounting/JournalEntryDetailPage'
import { AccountLedgerPage } from './features/accounting/AccountLedgerPage'
import { SalesReportPage } from './features/reports/SalesReportPage'
import { TrialBalancePage } from './features/reports/TrialBalancePage'
import { ProfitLossPage } from './features/reports/ProfitLossPage'
import { BalanceSheetPage } from './features/reports/BalanceSheetPage'
import { GSTReportPage } from './features/reports/GSTReportPage'
import { BusinessSettingsPage } from './features/settings/BusinessSettingsPage'
import { UserManagementPage } from './features/settings/UserManagementPage'
import { BackupPage } from './features/settings/BackupPage'
import { UserProfilePage } from './features/settings/UserProfilePage'
import { PlaceholderPage } from './components/ui/PlaceholderPage'

export const App: FC = () => {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Auth & Setup routes (Public / Semi-Public) */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route
          path="/setup"
          element={
            <ProtectedRoute>
              <BusinessSetupWizard />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Protected App Routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Sales */}
        <Route path="/sales" element={<InvoiceListPage />} />
        <Route path="/sales/new" element={<InvoiceCreatePage />} />
        <Route path="/sales/:id" element={<InvoiceDetailPage />} />
        <Route path="/sales/quotations" element={<QuotationListPage />} />
        <Route path="/sales/quotations/new" element={<QuotationCreatePage />} />
        <Route path="/sales/quotations/:id" element={<QuotationDetailPage />} />
        <Route path="/sales/orders" element={<SalesOrderListPage />} />
        <Route path="/sales/orders/new" element={<SalesOrderCreatePage />} />
        <Route path="/sales/returns" element={<PlaceholderPage title="Sales Returns (Credit Notes)" />} />
        <Route path="/sales/challans" element={<DeliveryChallanListPage />} />
        <Route path="/sales/challans/new" element={<DeliveryChallanCreatePage />} />

        {/* Purchases */}
        <Route path="/purchases" element={<PurchaseListPage />} />
        <Route path="/purchases/new" element={<PurchaseCreatePage />} />
        <Route path="/purchases/:id" element={<PurchaseDetailPage />} />
        <Route path="/purchases/orders" element={<PurchaseOrderListPage />} />
        <Route path="/purchases/orders/new" element={<PurchaseOrderCreatePage />} />
        <Route path="/purchases/returns" element={<PlaceholderPage title="Purchase Returns (Debit Notes)" />} />

        {/* Products */}
        <Route path="/products" element={<ProductListPage />} />
        <Route path="/products/:id" element={<ProductListPage />} />
        <Route path="/products/categories" element={<PlaceholderPage title="Categories & Brands" />} />
        <Route path="/products/inventory" element={<PlaceholderPage title="Inventory Stock Management" />} />
        <Route path="/products/warehouses" element={<PlaceholderPage title="Warehouses & Godowns" />} />

        {/* Parties */}
        <Route path="/customers" element={<CustomerListPage />} />
        <Route path="/customers/:id" element={<CustomerDetailPage />} />
        <Route path="/suppliers" element={<SupplierListPage />} />
        <Route path="/suppliers/:id" element={<SupplierDetailPage />} />

        {/* Payments */}
        <Route path="/payments" element={<PaymentListPage />} />
        <Route path="/payments/:id" element={<PaymentDetailPage />} />
        <Route path="/payments/out" element={<PaymentListPage />} />
        <Route path="/payments/outstanding" element={<PaymentListPage />} />

        {/* Expenses */}
        <Route path="/expenses" element={<ExpenseListPage />} />
        <Route path="/expenses/:id" element={<ExpenseDetailPage />} />
        <Route path="/expenses/income" element={<OtherIncomePage />} />

        {/* Accounting */}
        <Route path="/accounting" element={<JournalEntryListPage />} />
        <Route path="/accounting/:id" element={<JournalEntryDetailPage />} />
        <Route path="/accounting/ledger" element={<AccountLedgerPage />} />
        <Route path="/accounting/accounts" element={<ChartOfAccountsPage />} />

        {/* Reports */}
        <Route path="/reports" element={<SalesReportPage />} />
        <Route path="/reports/purchases" element={<PlaceholderPage title="Purchase Analysis Reports" />} />
        <Route path="/reports/financial" element={<TrialBalancePage />} />
        <Route path="/reports/financial/pnl" element={<ProfitLossPage />} />
        <Route path="/reports/financial/balance-sheet" element={<BalanceSheetPage />} />
        <Route path="/reports/gst" element={<GSTReportPage />} />
        <Route path="/reports/stock" element={<PlaceholderPage title="Stock Movement & Valuation Reports" />} />

        {/* Settings */}
        <Route path="/settings" element={<BusinessSettingsPage />} />
        <Route path="/settings/users" element={<UserManagementPage />} />
        <Route path="/settings/backup" element={<BackupPage />} />
        <Route path="/settings/profile" element={<UserProfilePage />} />
      </Route>

      {/* Catch-all 404 */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App

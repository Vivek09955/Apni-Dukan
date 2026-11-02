import { Router } from 'express';

/**
 * Swagger route annotations.
 * This file is only used for swagger-jsdoc scanning — no actual routes are defined here.
 * All actual routes are in their respective .routes.ts files.
 */

const _swaggerRouter = Router();

// ─── AUTH ────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new user account
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: "Rahul Sharma" }
 *               email: { type: string, format: email, example: "rahul@example.com" }
 *               password: { type: string, minLength: 8, example: "MyPassword123" }
 *               phone: { type: string, example: "9876543210" }
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or email already exists
 */

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful, returns access and refresh tokens
 *       401:
 *         description: Invalid credentials
 */

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: New access token issued
 *       401:
 *         description: Invalid or expired refresh token
 */

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Logout and invalidate tokens
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out successfully
 */

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Reset token generated (check email)
 */

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: User profile data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 */

// ─── BUSINESSES ──────────────────────────────────────────────────

/**
 * @openapi
 * /api/businesses:
 *   post:
 *     summary: Create a new business
 *     tags: [Business]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, state]
 *             properties:
 *               name: { type: string, example: "Sharma Electronics" }
 *               gstin: { type: string, example: "27AADCS0472N1Z1" }
 *               state: { type: string, example: "Maharashtra" }
 *               phone: { type: string }
 *               email: { type: string }
 *               address: { type: object }
 *     responses:
 *       201:
 *         description: Business created with default chart of accounts
 *   get:
 *     summary: List all businesses for the authenticated user
 *     tags: [Business]
 *     responses:
 *       200:
 *         description: Array of businesses
 */

/**
 * @openapi
 * /api/businesses/{id}:
 *   get:
 *     summary: Get business details by ID
 *     tags: [Business]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Business details
 *   put:
 *     summary: Update business details
 *     tags: [Business]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Business'
 *     responses:
 *       200:
 *         description: Business updated
 */

// ─── PRODUCTS ────────────────────────────────────────────────────

/**
 * @openapi
 * /api/products:
 *   get:
 *     summary: List all products for the current business
 *     tags: [Products]
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated product list
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       201:
 *         description: Product created
 */

/**
 * @openapi
 * /api/products/{id}:
 *   get:
 *     summary: Get a product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product details
 *   put:
 *     summary: Update a product
 *     tags: [Products]
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product updated
 *   delete:
 *     summary: Delete a product
 *     tags: [Products]
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product deleted
 */

/**
 * @openapi
 * /api/products/{id}/stock-adjust:
 *   post:
 *     summary: Adjust product stock manually
 *     tags: [Products]
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [adjustmentType, quantity, reason]
 *             properties:
 *               adjustmentType: { type: string, enum: [add, subtract] }
 *               quantity: { type: number }
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Stock adjusted
 */

// ─── CUSTOMERS ───────────────────────────────────────────────────

/**
 * @openapi
 * /api/customers:
 *   get:
 *     summary: List all customers
 *     tags: [Customers]
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated customer list
 *   post:
 *     summary: Create a new customer
 *     tags: [Customers]
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201:
 *         description: Customer created
 */

/**
 * @openapi
 * /api/customers/{id}:
 *   get:
 *     summary: Get customer details
 *     tags: [Customers]
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Customer with transaction history
 *   put:
 *     summary: Update a customer
 *     tags: [Customers]
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Customer updated
 *   delete:
 *     summary: Delete a customer
 *     tags: [Customers]
 *     responses:
 *       200:
 *         description: Customer deleted
 */

// ─── SUPPLIERS ───────────────────────────────────────────────────

/**
 * @openapi
 * /api/suppliers:
 *   get:
 *     summary: List all suppliers
 *     tags: [Suppliers]
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated supplier list
 *   post:
 *     summary: Create a new supplier
 *     tags: [Suppliers]
 *     responses:
 *       201:
 *         description: Supplier created
 */

// ─── SALES ───────────────────────────────────────────────────────

/**
 * @openapi
 * /api/sales:
 *   get:
 *     summary: List all sales invoices
 *     tags: [Sales]
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [draft, issued, partially_paid, paid, overdue, cancelled] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated invoice list
 *   post:
 *     summary: Create a new sales invoice
 *     tags: [Sales]
 *     description: |
 *       Creates a new GST-compliant sales invoice. Server recalculates all totals
 *       using paise arithmetic. Creates journal entries for issued invoices and
 *       deducts inventory for confirmed sales.
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customer, items, invoiceDate]
 *             properties:
 *               customer: { type: string, description: "Customer ID" }
 *               invoiceDate: { type: string, format: date }
 *               dueDate: { type: string, format: date }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [product, quantity, rate, taxRate]
 *                   properties:
 *                     product: { type: string }
 *                     quantity: { type: number }
 *                     rate: { type: integer, description: "Rate in paise" }
 *                     taxRate: { type: number }
 *                     discountPercent: { type: number }
 *               status: { type: string, enum: [draft, issued] }
 *               isInterState: { type: boolean }
 *               taxInclusive: { type: boolean }
 *     responses:
 *       201:
 *         description: Invoice created with auto-generated number
 *       400:
 *         description: Validation error or insufficient stock
 */

/**
 * @openapi
 * /api/sales/{id}:
 *   get:
 *     summary: Get sales invoice details
 *     tags: [Sales]
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Full invoice with items, customer, and payment history
 */

/**
 * @openapi
 * /api/sales/{id}/cancel:
 *   post:
 *     summary: Cancel a sales invoice
 *     tags: [Sales]
 *     description: Cancels the invoice, reverses inventory, and creates reversal journal entries
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Invoice cancelled with reversals
 *       400:
 *         description: Cannot cancel (already paid or cancelled)
 */

// ─── PURCHASES ───────────────────────────────────────────────────

/**
 * @openapi
 * /api/purchases:
 *   get:
 *     summary: List all purchase bills
 *     tags: [Purchases]
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated purchase bill list
 *   post:
 *     summary: Create a new purchase bill
 *     tags: [Purchases]
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201:
 *         description: Purchase bill created, inventory updated
 */

// ─── PAYMENTS ────────────────────────────────────────────────────

/**
 * @openapi
 * /api/payments:
 *   get:
 *     summary: List all payments
 *     tags: [Payments]
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [received, made] }
 *     responses:
 *       200:
 *         description: Paginated payment list
 *   post:
 *     summary: Record a new payment
 *     tags: [Payments]
 *     description: Records a payment and allocates it to specified invoices. Creates journal entries.
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, paymentMode, paymentDate, paymentType]
 *             properties:
 *               amount: { type: integer, description: "Amount in paise" }
 *               paymentMode: { type: string, enum: [cash, bank, upi, cheque, other] }
 *               paymentDate: { type: string, format: date }
 *               paymentType: { type: string, enum: [received, made] }
 *               party: { type: string, description: "Customer or Supplier ID" }
 *               invoiceAllocations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     invoice: { type: string }
 *                     amount: { type: integer }
 *     responses:
 *       201:
 *         description: Payment recorded with journal entries
 */

// ─── EXPENSES ────────────────────────────────────────────────────

/**
 * @openapi
 * /api/expenses:
 *   get:
 *     summary: List all expenses
 *     tags: [Expenses]
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated expense list
 *   post:
 *     summary: Record a new expense
 *     tags: [Expenses]
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201:
 *         description: Expense recorded with journal entry
 */

// ─── OTHER INCOME ────────────────────────────────────────────────

/**
 * @openapi
 * /api/income:
 *   get:
 *     summary: List all other income records
 *     tags: [Income]
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Income list
 *   post:
 *     summary: Record other income
 *     tags: [Income]
 *     responses:
 *       201:
 *         description: Income recorded
 */

// ─── ACCOUNTING ──────────────────────────────────────────────────

/**
 * @openapi
 * /api/accounting/accounts:
 *   get:
 *     summary: Get chart of accounts
 *     tags: [Accounting]
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of all accounts
 */

/**
 * @openapi
 * /api/accounting/journal-entries:
 *   get:
 *     summary: List journal entries
 *     tags: [Accounting]
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated journal entry list
 *   post:
 *     summary: Create a manual journal entry
 *     tags: [Accounting]
 *     description: Creates a balanced double-entry journal entry. Debits must equal credits.
 *     responses:
 *       201:
 *         description: Journal entry created
 *       400:
 *         description: Entry is not balanced
 */

/**
 * @openapi
 * /api/accounting/trial-balance:
 *   get:
 *     summary: Generate trial balance report
 *     tags: [Accounting]
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Trial balance with debit and credit totals per account
 */

/**
 * @openapi
 * /api/accounting/profit-loss:
 *   get:
 *     summary: Generate Profit & Loss statement
 *     tags: [Accounting]
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Profit & Loss data with income, expenses, and net profit
 */

/**
 * @openapi
 * /api/accounting/balance-sheet:
 *   get:
 *     summary: Generate Balance Sheet
 *     tags: [Accounting]
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: asOfDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Balance sheet with assets, liabilities, and equity
 */

/**
 * @openapi
 * /api/accounting/ledger/{accountId}:
 *   get:
 *     summary: Get account ledger
 *     tags: [Accounting]
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Chronological ledger entries for the account
 */

// ─── QUOTATIONS ──────────────────────────────────────────────────

/**
 * @openapi
 * /api/quotations:
 *   get:
 *     summary: List all quotations
 *     tags: [Quotations]
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated quotation list
 *   post:
 *     summary: Create a new quotation
 *     tags: [Quotations]
 *     responses:
 *       201:
 *         description: Quotation created
 */

/**
 * @openapi
 * /api/quotations/{id}/convert:
 *   post:
 *     summary: Convert quotation to sales invoice
 *     tags: [Quotations]
 *     description: Converts an accepted quotation into a sales invoice without duplicating entries
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201:
 *         description: Invoice created from quotation
 */

// ─── SALES ORDERS ────────────────────────────────────────────────

/**
 * @openapi
 * /api/sales-orders:
 *   get:
 *     summary: List all sales orders
 *     tags: [Sales Orders]
 *     responses:
 *       200:
 *         description: Paginated sales order list
 *   post:
 *     summary: Create a sales order
 *     tags: [Sales Orders]
 *     responses:
 *       201:
 *         description: Sales order created
 */

// ─── PURCHASE ORDERS ─────────────────────────────────────────────

/**
 * @openapi
 * /api/purchase-orders:
 *   get:
 *     summary: List all purchase orders
 *     tags: [Purchase Orders]
 *     responses:
 *       200:
 *         description: Paginated purchase order list
 *   post:
 *     summary: Create a purchase order
 *     tags: [Purchase Orders]
 *     responses:
 *       201:
 *         description: Purchase order created
 */

// ─── DELIVERY CHALLANS ───────────────────────────────────────────

/**
 * @openapi
 * /api/delivery-challans:
 *   get:
 *     summary: List all delivery challans
 *     tags: [Delivery Challans]
 *     responses:
 *       200:
 *         description: Paginated delivery challan list
 *   post:
 *     summary: Create a delivery challan
 *     tags: [Delivery Challans]
 *     responses:
 *       201:
 *         description: Delivery challan created
 */

// ─── GST REPORTS ─────────────────────────────────────────────────

/**
 * @openapi
 * /api/gst/gstr1:
 *   get:
 *     summary: Generate GSTR-1 report
 *     tags: [GST Reports]
 *     description: |
 *       Generates GSTR-1 data for preparation purposes only.
 *       Verify all figures before filing with the GST portal.
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: GSTR-1 report data (for preparation purposes only)
 */

/**
 * @openapi
 * /api/gst/gstr3b:
 *   get:
 *     summary: Generate GSTR-3B summary
 *     tags: [GST Reports]
 *     description: For preparation purposes only. Verify before filing.
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: GSTR-3B summary data
 */

/**
 * @openapi
 * /api/gst/hsn-summary:
 *   get:
 *     summary: Generate HSN-wise summary
 *     tags: [GST Reports]
 *     responses:
 *       200:
 *         description: HSN code summary with quantities and tax amounts
 */

// ─── DASHBOARD ───────────────────────────────────────────────────

/**
 * @openapi
 * /api/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Dashboard]
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Dashboard data including sales, purchases, profit, receivables, payables, inventory stats
 */

// ─── NOTIFICATIONS ───────────────────────────────────────────────

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     summary: Get user notifications
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: Notification list
 */

// ─── BACKUP ──────────────────────────────────────────────────────

/**
 * @openapi
 * /api/backup/create:
 *   post:
 *     summary: Create a database backup
 *     tags: [Backup]
 *     parameters:
 *       - in: header
 *         name: x-business-id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Backup created successfully
 */

/**
 * @openapi
 * /api/backup/restore:
 *   post:
 *     summary: Restore from a backup
 *     tags: [Backup]
 *     responses:
 *       200:
 *         description: Data restored from backup
 */

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Health check
 *     tags: [Dashboard]
 *     security: []
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 timestamp: { type: string, format: date-time }
 */

export default _swaggerRouter;

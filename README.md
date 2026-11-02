# Apni Dukan — Business Management & GST Billing Application

A complete, production-oriented business management, GST billing, inventory, and accounting web application built for Indian small businesses, retailers, wholesalers, and shop owners.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 6, Vite 8, Tailwind CSS 4 |
| Backend | Node.js 22, Express 4, TypeScript 5 |
| Database | MongoDB 7+ with Mongoose 8 |
| Auth | JWT (access + refresh tokens) + bcrypt |
| Testing | Vitest, React Testing Library, Supertest |

## Prerequisites

- **Node.js** v20+ (v22 recommended)
- **MongoDB** v7+ with **Replica Set** enabled (required for transactions)
- **npm** v10+

### MongoDB Replica Set Setup

MongoDB transactions require a replica set. For local development:

**Option 1: mongosh (Simplest)**
```bash
# Start mongod with replica set
mongod --replSet rs0 --dbpath /path/to/data

# In another terminal, initialize the replica set
mongosh --eval "rs.initiate()"
```

**Option 2: Docker**
```bash
docker run -d --name mongo-rs \
  -p 27017:27017 \
  mongo:7 --replSet rs0

docker exec -it mongo-rs mongosh --eval "rs.initiate()"
```

**Option 3: MongoDB Atlas**
Atlas clusters are already replica sets. Use your connection string directly.

## Quick Start

### 1. Clone & Configure Environment

```bash
git clone <repo-url>
cd "Apni Dukan Apni Pahchan"

# Copy environment template
cp .env.example server/.env
```

Edit `server/.env` with your values:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/apni-dukan?replicaSet=rs0
JWT_ACCESS_SECRET=your-super-secret-access-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
CLIENT_URL=http://localhost:3000
```

### 2. Install Dependencies

```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

### 3. Seed Demo Data (Optional)

```bash
cd server
npm run seed
```

This creates:
- Demo user: `demo@apnidukan.in` / `Demo@12345`
- Sample business with products, customers, and invoices

### 4. Start Development Servers

```bash
# Terminal 1: Start Backend
cd server
npm run dev

# Terminal 2: Start Frontend
cd client
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Docs: http://localhost:5000/api-docs

### 5. Production Build

```bash
# Build frontend
cd client
npm run build

# Build backend
cd ../server
npm run build
npm start
```

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── api/           # API client & hooks
│   │   ├── components/    # Reusable UI components
│   │   ├── features/      # Feature modules
│   │   ├── lib/           # Utilities
│   │   ├── store/         # Zustand state
│   │   └── types/         # TypeScript types
│   └── package.json
├── server/                 # Express backend
│   ├── src/
│   │   ├── config/        # Database & env config
│   │   ├── controllers/   # Route handlers
│   │   ├── middleware/     # Auth, RBAC, validation
│   │   ├── models/        # Mongoose schemas
│   │   ├── routes/        # Express routers
│   │   ├── services/      # Business logic
│   │   ├── utils/         # Helpers (GST calc, etc.)
│   │   └── validators/    # Zod schemas
│   └── package.json
├── .env.example
└── README.md
```

## Key Features

### Sales & GST Billing
- GST-compliant invoices with CGST/SGST/IGST, HSN/SAC codes
- Tax-inclusive and tax-exclusive pricing with paise-level precision
- Cash, credit, and partial-payment sales
- Multiple invoice statuses: Draft → Issued → Partially Paid → Paid / Overdue / Cancelled
- Automatic invoice numbering with atomic counter
- PDF invoice generation (A4 format) with amount in words
- Thermal receipt printing (80mm format)
- Sales returns and cancellation with automatic reversals

### Estimates, Orders & Challans
- Quotations / Estimates with conversion to invoice
- Sales Orders and Purchase Orders
- Delivery Challans with dispatch tracking
- Document status tracking and fulfilment

### Inventory Management
- Real-time stock tracking with movement audit trail
- Automatic stock deduction on sales, addition on purchases
- Stock adjustments for damage, loss, corrections
- Low-stock alerts and reorder levels
- Product categories, SKU codes, units
- Warehouse / Godown support

### Accounting & Finance
- Double-entry bookkeeping with balanced journal entries
- Chart of Accounts (23 standard Indian business accounts)
- Trial Balance, Profit & Loss, Balance Sheet reports
- Account Ledger with date filtering
- Payment recording with multi-invoice allocation
- Expense tracking and Other Income recording
- Posted entries are immutable — only reversible

### GST Reports
- GSTR-1 report generation (for preparation purposes)
- GSTR-3B summary
- HSN-wise summary and Tax Rate summary
- ⚠️ For preparation purposes only — verify before filing

### Customer & Supplier Management
- Complete party profiles with GSTIN, addresses, contact
- Customer-wise and supplier-wise ledgers
- Opening balances, credit limits
- Transaction history and outstanding invoices

### Dashboard
- Today's sales, purchases, and revenue
- Monthly trends and profit summary
- Cash/bank balances, receivables, payables
- Low-stock alerts and upcoming due dates
- Date range filters (Today, Week, Month, Financial Year, Custom)

### Authentication & Security
- JWT access + refresh tokens with bcrypt password hashing
- Role-based access control (Owner, Admin, Accountant, Manager, Staff)
- Business-level data isolation — users cannot access other businesses
- Rate limiting, input validation, audit logging
- Profile management and password change

### Multi-Business Support
- Multiple businesses under one user account
- Business setup wizard with GSTIN validation
- Configurable invoice prefix, numbering, tax settings
- Per-business chart of accounts and settings

### Other Features
- Notification system (low stock, overdue invoices)
- Data backup and restore
- Swagger/OpenAPI documentation at `/api-docs`
- Demo seed data for quick evaluation
- Production-ready build pipeline

## API Documentation

With the server running, visit: http://localhost:5000/api-docs

## Running Tests

```bash
cd server
npm test
```

**99 automated tests** across 5 test suites:

| Test Suite | Tests | Coverage |
|------------|-------|----------|
| GST Calculator | 28 | Intra/inter-state, tax-inclusive/exclusive, discounts, rounding, edge cases |
| Invoice Numbering | 9 | Formatting, padding, sequential generation, custom prefixes |
| Authentication | 15 | Password hashing, JWT tokens, expiry, validation rules |
| Accounting | 22 | Journal balance validation, sales entries, reversals, trial balance, payment allocation |
| Sales Logic | 25 | Total recalculation, status transitions, payment status, stock validation |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 5000 | Server port |
| NODE_ENV | No | development | Environment |
| MONGODB_URI | Yes | - | MongoDB connection string (must include replicaSet) |
| JWT_ACCESS_SECRET | Yes | - | Secret for access tokens |
| JWT_REFRESH_SECRET | Yes | - | Secret for refresh tokens |
| JWT_ACCESS_EXPIRY | No | 15m | Access token expiry |
| JWT_REFRESH_EXPIRY | No | 7d | Refresh token expiry |
| CLIENT_URL | No | http://localhost:3000 | Frontend URL for CORS |

## License

Private — All rights reserved.

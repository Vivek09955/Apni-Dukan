import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Apni Dukan API',
      version: '1.0.0',
      description:
        'Complete REST API for Apni Dukan — a business management, GST billing, inventory, and accounting application for Indian small businesses.',
      contact: {
        name: 'Apni Dukan Support',
        email: 'support@apnidukan.in',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'array', items: {} },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                pages: { type: 'integer' },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string', example: 'Rahul Sharma' },
            email: { type: 'string', format: 'email', example: 'rahul@example.com' },
            phone: { type: 'string', example: '9876543210' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Business: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string', example: 'Sharma Electronics' },
            gstin: { type: 'string', example: '27AADCS0472N1Z1' },
            address: {
              type: 'object',
              properties: {
                line1: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                pincode: { type: 'string' },
              },
            },
            phone: { type: 'string' },
            email: { type: 'string' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string', example: 'Samsung Galaxy M34' },
            sku: { type: 'string', example: 'SGM34-001' },
            category: { type: 'string' },
            sellingPrice: { type: 'integer', description: 'Price in paise', example: 1499900 },
            purchasePrice: { type: 'integer', description: 'Price in paise', example: 1200000 },
            taxRate: { type: 'number', example: 18 },
            hsnCode: { type: 'string', example: '8517' },
            currentStock: { type: 'number', example: 50 },
            unit: { type: 'string', example: 'PCS' },
          },
        },
        Customer: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string', example: 'Ravi Kumar' },
            phone: { type: 'string', example: '9876543210' },
            email: { type: 'string' },
            gstin: { type: 'string' },
            billingAddress: { type: 'object' },
            balance: { type: 'integer', description: 'Balance in paise' },
          },
        },
        Supplier: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string', example: 'Delhi Distributors' },
            phone: { type: 'string' },
            gstin: { type: 'string' },
            balance: { type: 'integer', description: 'Balance in paise' },
          },
        },
        SalesInvoice: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            invoiceNumber: { type: 'string', example: 'INV-00001' },
            customer: { type: 'string', description: 'Customer ID' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  product: { type: 'string' },
                  name: { type: 'string' },
                  quantity: { type: 'number' },
                  rate: { type: 'integer', description: 'Paise' },
                  taxRate: { type: 'number' },
                  cgstAmount: { type: 'integer' },
                  sgstAmount: { type: 'integer' },
                  igstAmount: { type: 'integer' },
                  totalAmount: { type: 'integer' },
                },
              },
            },
            status: {
              type: 'string',
              enum: ['draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled'],
            },
            finalAmount: { type: 'integer', description: 'Total in paise' },
            paidAmount: { type: 'integer' },
            invoiceDate: { type: 'string', format: 'date' },
            dueDate: { type: 'string', format: 'date' },
          },
        },
        Payment: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            paymentNumber: { type: 'string', example: 'PAY-00001' },
            amount: { type: 'integer', description: 'Amount in paise' },
            paymentMode: { type: 'string', enum: ['cash', 'bank', 'upi', 'cheque', 'other'] },
            paymentDate: { type: 'string', format: 'date' },
          },
        },
        JournalEntry: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            entryNumber: { type: 'string', example: 'JV-00001' },
            date: { type: 'string', format: 'date' },
            lines: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  account: { type: 'string' },
                  debit: { type: 'integer' },
                  credit: { type: 'integer' },
                  description: { type: 'string' },
                },
              },
            },
            status: { type: 'string', enum: ['draft', 'posted', 'reversed'] },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication and user management' },
      { name: 'Business', description: 'Business setup and management' },
      { name: 'Products', description: 'Product and inventory management' },
      { name: 'Customers', description: 'Customer management' },
      { name: 'Suppliers', description: 'Supplier management' },
      { name: 'Sales', description: 'Sales invoices and billing' },
      { name: 'Purchases', description: 'Purchase bills' },
      { name: 'Payments', description: 'Payment recording and allocation' },
      { name: 'Expenses', description: 'Expense tracking' },
      { name: 'Income', description: 'Other income' },
      { name: 'Accounting', description: 'Chart of accounts, journal entries, reports' },
      { name: 'Quotations', description: 'Estimates and quotations' },
      { name: 'Sales Orders', description: 'Sales order management' },
      { name: 'Purchase Orders', description: 'Purchase order management' },
      { name: 'Delivery Challans', description: 'Delivery challan management' },
      { name: 'GST Reports', description: 'GST report generation' },
      { name: 'Dashboard', description: 'Dashboard statistics' },
      { name: 'Notifications', description: 'Notification management' },
      { name: 'Backup', description: 'Data backup and restore' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/routes/swagger.routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

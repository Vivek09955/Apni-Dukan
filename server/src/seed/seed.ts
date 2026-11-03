import dotenv from 'dotenv';
dotenv.config();

import mongoose, { Types } from 'mongoose';
import { connectDB, disconnectDB } from '../config/db';
import {
  User,
  Business,
  BusinessMember,
  PERMISSIONS,
  Category,
  Warehouse,
  Product,
  InventoryMovement,
  Customer,
  Supplier,
  SalesInvoice,
  PurchaseBill,
  Account,
  JournalEntry,
  Payment,
  Expense,
  OtherIncome,
  Quotation,
  SalesOrder,
  PurchaseOrder,
  DeliveryChallan,
  Notification,
  BackupMeta,
  AuditLog,
} from '../models';
import { createDefaultAccounts } from '../utils/defaultChartOfAccounts';
import { calculateLineItem, calculateInvoiceTotals } from '../utils/gstCalculator';

async function runSeed() {
  const isForce = process.argv.includes('--force') || process.argv.includes('--confirm') || process.argv.includes('--yes');
  if (!isForce) {
    console.error('\n[Seed Error] Missing safety flag! Database clearing requires confirmation.');
    console.error('Usage: npm run seed -- --confirm');
    console.error('   or: npx tsx src/seed/seed.ts --confirm\n');
    process.exit(1);
  }

  console.log('\n=============================================');
  console.log('   Apni Dukan — Database Seeder Starting');
  console.log('=============================================\n');

  await connectDB();

  console.log('[1/14] Clearing existing database records...');
  await Promise.all([
    User.deleteMany({}),
    Business.deleteMany({}),
    BusinessMember.deleteMany({}),
    Category.deleteMany({}),
    Warehouse.deleteMany({}),
    Product.deleteMany({}),
    InventoryMovement.deleteMany({}),
    Customer.deleteMany({}),
    Supplier.deleteMany({}),
    SalesInvoice.deleteMany({}),
    PurchaseBill.deleteMany({}),
    Account.deleteMany({}),
    JournalEntry.deleteMany({}),
    Payment.deleteMany({}),
    Expense.deleteMany({}),
    OtherIncome.deleteMany({}),
    Quotation.deleteMany({}),
    SalesOrder.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    DeliveryChallan.deleteMany({}),
    Notification.deleteMany({}),
    BackupMeta.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
  console.log('  -> All collections cleared successfully.');

  console.log('[2/14] Creating Demo User...');
  const demoUser = new User({
    name: 'Demo User',
    email: 'demo@apnidukan.in',
    password: 'Demo@12345',
    phone: '9876543210',
    isEmailVerified: true,
  });
  await demoUser.save();
  console.log(`  -> Demo user created: ${demoUser.email} (ID: ${demoUser._id})`);

  console.log('[3/14] Creating Demo Business...');
  const demoBusiness = new Business({
    name: 'Radhe Traders & General Store',
    email: 'contact@radhetraders.com',
    phone: '9876543210',
    state: 'Maharashtra',
    gstin: '27ABCDE1234F1Z5',
    invoicePrefix: 'RT/2026/',
    invoiceNextNumber: 6,
    purchasePrefix: 'BILL/',
    purchaseNextNumber: 4,
    quotationPrefix: 'RT/QTN/',
    quotationNextNumber: 1,
    salesOrderPrefix: 'RT/SO/',
    salesOrderNextNumber: 1,
    purchaseOrderPrefix: 'RT/PO/',
    purchaseOrderNextNumber: 1,
    challanPrefix: 'RT/DC/',
    challanNextNumber: 1,
    paymentNextNumber: 4,
    expenseNextNumber: 6,
    incomeNextNumber: 1,
    journalNextNumber: 1,
    address: {
      line1: 'Shop No. 12, Market Yard',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411037',
    },
    settings: {
      taxInclusive: false,
      enableGst: true,
      enableDiscount: true,
      roundOffTotal: true,
      defaultTaxRate: 18,
      thermalPrint: false,
      showLogo: true,
    },
    isActive: true,
  });
  await demoBusiness.save();

  // Attach demo user as owner
  await BusinessMember.create({
    businessId: demoBusiness._id,
    userId: demoUser._id,
    role: 'owner',
    permissions: Object.values(PERMISSIONS),
    isActive: true,
  });
  console.log(`  -> Business created: ${demoBusiness.name} (GSTIN: ${demoBusiness.gstin})`);

  console.log('[4/14] Setting up Default Chart of Accounts...');
  const accounts = await createDefaultAccounts(demoBusiness._id);
  console.log(`  -> Initialized ${accounts.length} default accounting ledger accounts.`);

  console.log('[5/14] Creating Warehouse & Product Categories...');
  const warehouse = await Warehouse.create({
    businessId: demoBusiness._id,
    name: 'Main Godown & Store',
    code: 'WH-MAIN',
    isDefault: true,
    isActive: true,
  });

  const categories = await Category.insertMany([
    { businessId: demoBusiness._id, name: 'Grocery & Staples', description: 'Grains, pulses, oils and daily staples' },
    { businessId: demoBusiness._id, name: 'Electronics & Accessories', description: 'Cables, chargers, peripherals' },
    { businessId: demoBusiness._id, name: 'Clothing & Apparel', description: 'Shirts, jeans, cotton wear' },
    { businessId: demoBusiness._id, name: 'Stationery & Office', description: 'Notebooks, pens, office desk supplies' },
  ]);

  const catMap = {
    grocery: categories[0]._id,
    electronics: categories[1]._id,
    clothing: categories[2]._id,
    stationery: categories[3]._id,
  };

  console.log('[6/14] Creating 15 Products across 4 categories...');
  const rawProducts = [
    // Grocery (0% & 5%)
    { name: 'Basmati Rice Premium 5kg', sku: 'GRO-RIC-001', category: catMap.grocery, hsnCode: '1006', unit: 'bag', purchasePrice: 35000, sellingPrice: 45000, taxRate: 0, openingStock: 50 },
    { name: 'Toor Dal Desi 1kg', sku: 'GRO-DAL-002', category: catMap.grocery, hsnCode: '0713', unit: 'kg', purchasePrice: 11000, sellingPrice: 14000, taxRate: 0, openingStock: 100 },
    { name: 'Refined Sunflower Oil 1L', sku: 'GRO-OIL-003', category: catMap.grocery, hsnCode: '1512', unit: 'bottle', purchasePrice: 12000, sellingPrice: 15000, taxRate: 5, openingStock: 80 },
    { name: 'Tata Tea Gold Leaf 500g', sku: 'GRO-TEA-004', category: catMap.grocery, hsnCode: '0902', unit: 'pack', purchasePrice: 22000, sellingPrice: 26000, taxRate: 5, openingStock: 60 },

    // Electronics (12% & 18%)
    { name: 'Fast Charging USB-C Braided Cable', sku: 'ELE-CAB-001', category: catMap.electronics, hsnCode: '8544', unit: 'pcs', purchasePrice: 15000, sellingPrice: 35000, taxRate: 18, openingStock: 40 },
    { name: 'Wireless Bluetooth Mouse 2.4G', sku: 'ELE-MOU-002', category: catMap.electronics, hsnCode: '8471', unit: 'pcs', purchasePrice: 40000, sellingPrice: 75000, taxRate: 18, openingStock: 25 },
    { name: '20000mAh Dual Port Power Bank', sku: 'ELE-POW-003', category: catMap.electronics, hsnCode: '8507', unit: 'pcs', purchasePrice: 90000, sellingPrice: 149900, taxRate: 18, openingStock: 20 },
    { name: 'Smart LED Bulb 12W B22', sku: 'ELE-LED-004', category: catMap.electronics, hsnCode: '8539', unit: 'pcs', purchasePrice: 18000, sellingPrice: 32000, taxRate: 12, openingStock: 50 },

    // Clothing (5% & 12%)
    { name: 'Men Cotton Casual Shirt L', sku: 'CLO-SHI-001', category: catMap.clothing, hsnCode: '6205', unit: 'pcs', purchasePrice: 45000, sellingPrice: 85000, taxRate: 5, openingStock: 30 },
    { name: 'Slim Fit Denim Jeans 32', sku: 'CLO-JEA-002', category: catMap.clothing, hsnCode: '6203', unit: 'pcs', purchasePrice: 65000, sellingPrice: 120000, taxRate: 12, openingStock: 25 },
    { name: 'Cotton Ankle Socks Pair', sku: 'CLO-SOC-003', category: catMap.clothing, hsnCode: '6115', unit: 'pair', purchasePrice: 4000, sellingPrice: 9900, taxRate: 5, openingStock: 100 },
    { name: 'Formal Office Trousers Grey', sku: 'CLO-TRO-004', category: catMap.clothing, hsnCode: '6204', unit: 'pcs', purchasePrice: 55000, sellingPrice: 99900, taxRate: 12, openingStock: 20 },

    // Stationery (12% & 18%)
    { name: 'Executive Ruled Notebook A5', sku: 'STA-NOT-001', category: catMap.stationery, hsnCode: '4820', unit: 'pcs', purchasePrice: 8000, sellingPrice: 16000, taxRate: 12, openingStock: 80 },
    { name: 'Ballpoint Pen Box (Pack of 10)', sku: 'STA-PEN-002', category: catMap.stationery, hsnCode: '9608', unit: 'box', purchasePrice: 10000, sellingPrice: 18000, taxRate: 18, openingStock: 50 },
    { name: 'Heavy Duty Metal Stapler No.10', sku: 'STA-STP-003', category: catMap.stationery, hsnCode: '8472', unit: 'pcs', purchasePrice: 12000, sellingPrice: 25000, taxRate: 18, openingStock: 30 },
  ];

  const products = [];
  for (const p of rawProducts) {
    const prod = new Product({
      businessId: demoBusiness._id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      hsnCode: p.hsnCode,
      unit: p.unit,
      purchasePrice: p.purchasePrice,
      sellingPrice: p.sellingPrice,
      taxRate: p.taxRate,
      taxInclusive: false,
      trackInventory: true,
      reorderLevel: 10,
      openingStock: p.openingStock,
      isActive: true,
    });
    await prod.save();
    products.push(prod);

    // Initial stock movement
    await InventoryMovement.create({
      businessId: demoBusiness._id,
      productId: prod._id,
      warehouseId: warehouse._id,
      type: 'opening',
      quantity: p.openingStock,
      balanceAfter: p.openingStock,
      unitCost: p.purchasePrice,
      notes: 'Initial stock intake on business launch',
      date: new Date(),
    });
  }
  console.log(`  -> Created ${products.length} products with initial inventory movements.`);

  console.log('[7/14] Creating 5 Customers with varied credit limits...');
  const customers = await Customer.insertMany([
    {
      businessId: demoBusiness._id,
      name: 'Ramesh Patil',
      phone: '9822011223',
      email: 'ramesh.patil@example.com',
      gstin: '27AABCP1234F1Z1',
      creditLimit: 10000000, // ₹1,00,000
      creditDays: 30,
      openingBalance: 0,
      billingAddress: { line1: 'Sector 4, Vashi', city: 'Navi Mumbai', state: 'Maharashtra', pincode: '400703' },
      isActive: true,
    },
    {
      businessId: demoBusiness._id,
      name: 'Sunita Sharma',
      phone: '9822022334',
      email: 'sunita.sharma@example.com',
      creditLimit: 2000000, // ₹20,000
      creditDays: 15,
      openingBalance: 0,
      billingAddress: { line1: 'Flat 302, Green Valley', city: 'Pune', state: 'Maharashtra', pincode: '411038' },
      isActive: true,
    },
    {
      businessId: demoBusiness._id,
      name: 'Amit Verma',
      phone: '9811033445',
      email: 'amit.verma@example.com',
      gstin: '07AAACV9876Q1Z2', // Delhi - Inter-State
      creditLimit: 25000000, // ₹2,50,000
      creditDays: 45,
      openingBalance: 0,
      billingAddress: { line1: 'Connaught Place', city: 'New Delhi', state: 'Delhi', pincode: '110001' },
      isActive: true,
    },
    {
      businessId: demoBusiness._id,
      name: 'Priya Deshmukh',
      phone: '9822044556',
      email: 'priya.deshmukh@example.com',
      creditLimit: 1500000, // ₹15,000
      creditDays: 7,
      openingBalance: 0,
      billingAddress: { line1: 'Shivaji Nagar', city: 'Pune', state: 'Maharashtra', pincode: '411005' },
      isActive: true,
    },
    {
      businessId: demoBusiness._id,
      name: 'Vijay Gupta',
      phone: '9822055667',
      email: 'vijay.gupta@example.com',
      gstin: '27AABCG5555K1Z8',
      creditLimit: 5000000, // ₹50,000
      creditDays: 30,
      openingBalance: 0,
      billingAddress: { line1: 'MG Road', city: 'Nashik', state: 'Maharashtra', pincode: '422001' },
      isActive: true,
    },
  ]);
  console.log(`  -> Created ${customers.length} customers.`);

  console.log('[8/14] Creating 3 Suppliers...');
  const suppliers = await Supplier.insertMany([
    {
      businessId: demoBusiness._id,
      name: 'National Wholesale Traders',
      phone: '9822100001',
      email: 'orders@nationaltraders.in',
      gstin: '27AAACN1111B1Z3', // Maharashtra
      creditDays: 30,
      openingBalance: 0,
      address: { line1: 'APMC Market', city: 'Navi Mumbai', state: 'Maharashtra', pincode: '400705' },
      isActive: true,
    },
    {
      businessId: demoBusiness._id,
      name: 'Bharat Electronics Hub',
      phone: '9822100002',
      email: 'sales@bharatelectronics.in',
      gstin: '24AAACB2222C1Z4', // Gujarat - Inter-State
      creditDays: 45,
      openingBalance: 0,
      address: { line1: 'GIDC Electronic Zone', city: 'Gandhinagar', state: 'Gujarat', pincode: '382028' },
      isActive: true,
    },
    {
      businessId: demoBusiness._id,
      name: 'Star Paper & Stationery Mill',
      phone: '9822100003',
      email: 'contact@starstationery.com',
      gstin: '27AAACS3333D1Z5', // Maharashtra
      creditDays: 20,
      openingBalance: 0,
      address: { line1: 'MIDC Industrial Area', city: 'Nagpur', state: 'Maharashtra', pincode: '440016' },
      isActive: true,
    },
  ]);
  console.log(`  -> Created ${suppliers.length} suppliers.`);

  console.log('[9/14] Creating 5 Sales Invoices (draft, issued, paid, partially_paid)...');
  const invoicesData = [
    // 1. Paid invoice - Intra-State B2B
    {
      number: 'RT/2026/00001',
      customer: customers[0],
      items: [
        { prod: products[0], qty: 5 }, // Rice
        { prod: products[4], qty: 10 }, // USB Cable
      ],
      status: 'paid' as const,
      paid: true,
      placeOfSupply: 'Maharashtra',
      isInterState: false,
    },
    // 2. Partially Paid - Inter-State B2B (Delhi)
    {
      number: 'RT/2026/00002',
      customer: customers[2], // Amit Verma (Delhi)
      items: [
        { prod: products[6], qty: 5 }, // Power Bank
        { prod: products[9], qty: 10 }, // Jeans
      ],
      status: 'partially_paid' as const,
      partialAmount: 1000000, // ₹10,000 paid
      placeOfSupply: 'Delhi',
      isInterState: true,
    },
    // 3. Issued (unpaid) - Intra-State B2C
    {
      number: 'RT/2026/00003',
      customer: customers[1], // Sunita Sharma
      items: [
        { prod: products[1], qty: 4 }, // Dal
        { prod: products[2], qty: 3 }, // Oil
      ],
      status: 'issued' as const,
      placeOfSupply: 'Maharashtra',
      isInterState: false,
    },
    // 4. Paid - Intra-State B2C
    {
      number: 'RT/2026/00004',
      customer: customers[3], // Priya Deshmukh
      items: [
        { prod: products[3], qty: 2 }, // Tea
        { prod: products[12], qty: 5 }, // Notebook
      ],
      status: 'paid' as const,
      paid: true,
      placeOfSupply: 'Maharashtra',
      isInterState: false,
    },
    // 5. Draft - Intra-State B2B
    {
      number: 'RT/2026/00005',
      customer: customers[4], // Vijay Gupta
      items: [
        { prod: products[5], qty: 4 }, // Mouse
        { prod: products[7], qty: 10 }, // LED Bulb
      ],
      status: 'draft' as const,
      placeOfSupply: 'Maharashtra',
      isInterState: false,
    },
  ];

  const createdInvoices = [];
  for (const invData of invoicesData) {
    const gstResults = [];
    const items = [];

    for (const item of invData.items) {
      const line = calculateLineItem({
        rate: item.prod.sellingPrice,
        quantity: item.qty,
        taxRate: item.prod.taxRate,
        taxInclusive: false,
        isInterState: invData.isInterState,
      });
      gstResults.push(line);
      items.push({
        productId: item.prod._id,
        name: item.prod.name,
        hsnCode: item.prod.hsnCode,
        quantity: item.qty,
        unit: item.prod.unit,
        rate: item.prod.sellingPrice,
        discount: 0,
        discountPercent: 0,
        taxableAmount: line.taxableAmount,
        taxRate: item.prod.taxRate,
        cgstAmount: line.cgstAmount,
        sgstAmount: line.sgstAmount,
        igstAmount: line.igstAmount,
        totalAmount: line.totalAmount,
      });
    }

    const totals = calculateInvoiceTotals(gstResults, true);
    let paidAmount = 0;
    if (invData.status === 'paid') {
      paidAmount = totals.finalAmount;
    } else if (invData.status === 'partially_paid' && invData.partialAmount) {
      paidAmount = invData.partialAmount;
    }
    const balanceDue = totals.finalAmount - paidAmount;

    const invoice = new SalesInvoice({
      businessId: demoBusiness._id,
      invoiceNumber: invData.number,
      customerId: invData.customer._id,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 15 * 86400000),
      placeOfSupply: invData.placeOfSupply,
      items,
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      taxableAmount: totals.taxableAmount,
      totalCgst: totals.totalCgst,
      totalSgst: totals.totalSgst,
      totalIgst: totals.totalIgst,
      totalTax: totals.totalTax,
      grandTotal: totals.grandTotal,
      roundOff: totals.roundOff,
      finalAmount: totals.finalAmount,
      paidAmount,
      balanceDue,
      status: invData.status,
      isInterState: invData.isInterState,
    });

    await invoice.save();
    createdInvoices.push(invoice);
  }
  console.log(`  -> Created ${createdInvoices.length} sales invoices.`);

  console.log('[10/14] Creating 3 Purchase Bills...');
  const billsData = [
    {
      number: 'BILL/00001',
      supplier: suppliers[0],
      items: [{ prod: products[0], qty: 20 }, { prod: products[1], qty: 30 }],
      status: 'paid' as const,
      placeOfSupply: 'Maharashtra',
      isInterState: false,
    },
    {
      number: 'BILL/00002',
      supplier: suppliers[1],
      items: [{ prod: products[4], qty: 25 }, { prod: products[6], qty: 10 }],
      status: 'partially_paid' as const,
      partialAmount: 1500000,
      placeOfSupply: 'Gujarat',
      isInterState: true,
    },
    {
      number: 'BILL/00003',
      supplier: suppliers[2],
      items: [{ prod: products[12], qty: 50 }, { prod: products[13], qty: 30 }],
      status: 'received' as const,
      placeOfSupply: 'Maharashtra',
      isInterState: false,
    },
  ];

  const createdBills = [];
  for (const bData of billsData) {
    const gstResults = [];
    const items = [];

    for (const item of bData.items) {
      const line = calculateLineItem({
        rate: item.prod.purchasePrice,
        quantity: item.qty,
        taxRate: item.prod.taxRate,
        taxInclusive: false,
        isInterState: bData.isInterState,
      });
      gstResults.push(line);
      items.push({
        productId: item.prod._id,
        name: item.prod.name,
        hsnCode: item.prod.hsnCode,
        quantity: item.qty,
        unit: item.prod.unit,
        rate: item.prod.purchasePrice,
        discount: 0,
        discountPercent: 0,
        taxableAmount: line.taxableAmount,
        taxRate: item.prod.taxRate,
        cgstAmount: line.cgstAmount,
        sgstAmount: line.sgstAmount,
        igstAmount: line.igstAmount,
        totalAmount: line.totalAmount,
      });
    }

    const totals = calculateInvoiceTotals(gstResults, true);
    let paidAmount = 0;
    if (bData.status === 'paid') paidAmount = totals.finalAmount;
    if (bData.status === 'partially_paid' && bData.partialAmount) paidAmount = bData.partialAmount;
    const balanceDue = totals.finalAmount - paidAmount;

    const bill = new PurchaseBill({
      businessId: demoBusiness._id,
      billNumber: bData.number,
      supplierId: bData.supplier._id,
      billDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 86400000),
      placeOfSupply: bData.placeOfSupply,
      items,
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      taxableAmount: totals.taxableAmount,
      totalCgst: totals.totalCgst,
      totalSgst: totals.totalSgst,
      totalIgst: totals.totalIgst,
      totalTax: totals.totalTax,
      grandTotal: totals.grandTotal,
      roundOff: totals.roundOff,
      finalAmount: totals.finalAmount,
      paidAmount,
      balanceDue,
      status: bData.status,
      isInterState: bData.isInterState,
    });
    await bill.save();
    createdBills.push(bill);
  }
  console.log(`  -> Created ${createdBills.length} purchase bills.`);

  console.log('[11/14] Recording 3 Payments allocated to invoices...');
  const payments = await Payment.insertMany([
    {
      businessId: demoBusiness._id,
      paymentNumber: 'PAY-00001',
      type: 'payment_in',
      partyType: 'customer',
      partyId: customers[0]._id,
      amount: createdInvoices[0].paidAmount,
      paymentMethod: 'bank_transfer',
      paymentDate: new Date(),
      invoiceAllocations: [
        {
          invoiceId: createdInvoices[0]._id,
          invoiceType: 'sales_invoice',
          allocatedAmount: createdInvoices[0].paidAmount,
        },
      ],
      isAdvance: false,
      notes: 'Payment via NEFT for invoice RT/2026/00001',
      isCancelled: false,
    },
    {
      businessId: demoBusiness._id,
      paymentNumber: 'PAY-00002',
      type: 'payment_in',
      partyType: 'customer',
      partyId: customers[2]._id,
      amount: createdInvoices[1].paidAmount,
      paymentMethod: 'upi',
      paymentDate: new Date(),
      invoiceAllocations: [
        {
          invoiceId: createdInvoices[1]._id,
          invoiceType: 'sales_invoice',
          allocatedAmount: createdInvoices[1].paidAmount,
        },
      ],
      isAdvance: false,
      notes: 'Partial payment via UPI for invoice RT/2026/00002',
      isCancelled: false,
    },
    {
      businessId: demoBusiness._id,
      paymentNumber: 'PAY-00003',
      type: 'payment_in',
      partyType: 'customer',
      partyId: customers[3]._id,
      amount: createdInvoices[3].paidAmount,
      paymentMethod: 'cash',
      paymentDate: new Date(),
      invoiceAllocations: [
        {
          invoiceId: createdInvoices[3]._id,
          invoiceType: 'sales_invoice',
          allocatedAmount: createdInvoices[3].paidAmount,
        },
      ],
      isAdvance: false,
      notes: 'Cash counter collection for invoice RT/2026/00004',
      isCancelled: false,
    },
  ]);
  console.log(`  -> Created ${payments.length} payment records.`);

  console.log('[12/14] Recording 5 Business Expenses across categories...');
  const expenses = await Expense.insertMany([
    {
      businessId: demoBusiness._id,
      expenseNumber: 'EXP-00001',
      category: 'rent',
      amount: 3500000, // ₹35,000
      expenseDate: new Date(),
      paymentMethod: 'bank_transfer',
      vendorName: 'Market Yard Property Management',
      description: 'Monthly Shop Rent for Current Month',
      isRecurring: true,
      recurringInterval: 'monthly',
      isCancelled: false,
    },
    {
      businessId: demoBusiness._id,
      expenseNumber: 'EXP-00002',
      category: 'salary',
      amount: 4000000, // ₹40,000
      expenseDate: new Date(),
      paymentMethod: 'bank_transfer',
      vendorName: 'Store Staff',
      description: 'Monthly Wages for 2 Store Helpers',
      isRecurring: true,
      recurringInterval: 'monthly',
      isCancelled: false,
    },
    {
      businessId: demoBusiness._id,
      expenseNumber: 'EXP-00003',
      category: 'electricity',
      amount: 450000, // ₹4,500
      expenseDate: new Date(),
      paymentMethod: 'upi',
      vendorName: 'MSEDCL Maharashtra',
      description: 'Commercial electricity bill for store meter',
      isRecurring: true,
      recurringInterval: 'monthly',
      isCancelled: false,
    },
    {
      businessId: demoBusiness._id,
      expenseNumber: 'EXP-00004',
      category: 'transport',
      amount: 220000, // ₹2,200
      expenseDate: new Date(),
      paymentMethod: 'cash',
      vendorName: 'Local Tempo Service',
      description: 'Goods transit from APMC market yard to store',
      isRecurring: false,
      isCancelled: false,
    },
    {
      businessId: demoBusiness._id,
      expenseNumber: 'EXP-00005',
      category: 'office',
      amount: 150000, // ₹1,500
      expenseDate: new Date(),
      paymentMethod: 'cash',
      vendorName: 'City Packaging & Stationary',
      description: 'Packaging tape, thermal paper rolls, carry bags',
      isRecurring: false,
      isCancelled: false,
    },
  ]);
  console.log(`  -> Created ${expenses.length} expense records.`);

  console.log('[13/14] Creating Sample Notifications...');
  const notifications = await Notification.insertMany([
    {
      businessId: demoBusiness._id,
      userId: demoUser._id,
      type: 'low_stock',
      title: 'Low Stock Alert: 20000mAh Dual Port Power Bank',
      message: 'Stock is currently at 20 pcs, reaching the reorder threshold.',
      data: { productId: products[6]._id.toString(), currentStock: 20, reorderLevel: 10 },
      isRead: false,
    },
    {
      businessId: demoBusiness._id,
      userId: demoUser._id,
      type: 'invoice_created',
      title: 'New Invoice Issued: RT/2026/00001',
      message: 'Invoice RT/2026/00001 was generated for Ramesh Patil for ₹5,980.00',
      data: { invoiceId: createdInvoices[0]._id.toString(), invoiceNumber: 'RT/2026/00001' },
      isRead: false,
    },
    {
      businessId: demoBusiness._id,
      userId: demoUser._id,
      type: 'payment_due',
      title: 'Payment Due: Sunita Sharma',
      message: 'Invoice RT/2026/00003 payment is pending and due in 15 days.',
      data: { invoiceId: createdInvoices[2]._id.toString(), invoiceNumber: 'RT/2026/00003' },
      isRead: false,
    },
  ]);
  console.log(`  -> Created ${notifications.length} notification alerts.`);

  console.log('[14/14] Finalizing and creating sample Quotation & Sales Order...');
  const sampleQuotation = new Quotation({
    businessId: demoBusiness._id,
    quotationNumber: 'RT/QTN/00001',
    customerId: customers[0]._id,
    quotationDate: new Date(),
    validUntil: new Date(Date.now() + 15 * 86400000),
    placeOfSupply: 'Maharashtra',
    items: [
      {
        productId: products[4]._id,
        name: products[4].name,
        hsnCode: products[4].hsnCode,
        quantity: 20,
        unit: products[4].unit,
        rate: products[4].sellingPrice,
        discount: 0,
        discountPercent: 0,
        taxableAmount: 700000,
        taxRate: 18,
        cgstAmount: 63000,
        sgstAmount: 63000,
        igstAmount: 0,
        totalAmount: 826000,
      },
    ],
    subtotal: 700000,
    totalDiscount: 0,
    taxableAmount: 700000,
    totalCgst: 63000,
    totalSgst: 63000,
    totalIgst: 0,
    totalTax: 126000,
    grandTotal: 826000,
    roundOff: 0,
    finalAmount: 826000,
    isInterState: false,
    status: 'sent',
    notes: 'Quotation valid for 15 days.',
  });
  await sampleQuotation.save();

  console.log('\n=============================================');
  console.log('   Apni Dukan — Seed Summary');
  console.log('=============================================');
  console.log(`✓ Demo User:        ${demoUser.email} (Password: Demo@12345)`);
  console.log(`✓ Demo Business:    ${demoBusiness.name} (GSTIN: ${demoBusiness.gstin})`);
  console.log(`✓ Ledger Accounts:  ${accounts.length} created`);
  console.log(`✓ Products:         ${products.length} created across 4 categories`);
  console.log(`✓ Customers:        ${customers.length} created`);
  console.log(`✓ Suppliers:        ${suppliers.length} created`);
  console.log(`✓ Sales Invoices:   ${createdInvoices.length} created (draft, issued, paid, partially_paid)`);
  console.log(`✓ Purchase Bills:   ${createdBills.length} created`);
  console.log(`✓ Payments:         ${payments.length} recorded and allocated`);
  console.log(`✓ Expenses:         ${expenses.length} recorded`);
  console.log(`✓ Notifications:    ${notifications.length} created`);
  console.log(`✓ Quotations:       1 created`);
  console.log('=============================================\n');

  await disconnectDB();
  console.log('Seed completed successfully!\n');
}

runSeed().catch((err) => {
  console.error('[Seed Error] Fatal error during seeding:', err);
  process.exit(1);
});

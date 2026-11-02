import { Types } from 'mongoose';
import { SalesInvoice } from '../models/SalesInvoice';
import { PurchaseBill } from '../models/PurchaseBill';
import { Customer } from '../models/Customer';
import { Supplier } from '../models/Supplier';

export class GstReportService {
  /**
   * Helper to build date range filter
   */
  private buildDateFilter(fromDate?: string | Date, toDate?: string | Date) {
    const filter: Record<string, any> = {};
    if (fromDate || toDate) {
      if (fromDate) filter.$gte = new Date(fromDate);
      if (toDate) filter.$lte = new Date(toDate);
    }
    return filter;
  }

  /**
   * GSTR-1: Outward supplies report with B2B, B2C Large, B2C Small, HSN summary, and Document summary
   */
  async getGSTR1Report(businessId: string, fromDate?: string | Date, toDate?: string | Date) {
    const bId = new Types.ObjectId(businessId);
    const dateMatch: Record<string, any> = {};
    if (fromDate || toDate) {
      dateMatch.invoiceDate = this.buildDateFilter(fromDate, toDate);
    }

    // Document summary (includes cancelled count)
    const allInvoices = await SalesInvoice.find({
      businessId: bId,
      ...dateMatch,
    }).lean();

    const totalCount = allInvoices.length;
    const cancelledCount = allInvoices.filter((inv) => inv.status === 'cancelled').length;
    const draftCount = allInvoices.filter((inv) => inv.status === 'draft').length;
    const activeInvoices = allInvoices.filter(
      (inv) => inv.status !== 'draft' && inv.status !== 'cancelled'
    );

    const docSummary = {
      totalInvoices: totalCount,
      activeInvoices: activeInvoices.length,
      cancelledInvoices: cancelledCount,
      draftInvoices: draftCount,
    };

    // Populate customer info for active invoices
    const customerIds = [...new Set(activeInvoices.map((inv) => inv.customerId.toString()))];
    const customers = await Customer.find({ _id: { $in: customerIds } }).lean();
    const customerMap = new Map(customers.map((c) => [c._id.toString(), c]));

    // B2B and B2C grouping
    const b2bMap = new Map<string, any>();
    const b2cLarge: any[] = [];
    const b2cSmallMap = new Map<string, any>();

    for (const inv of activeInvoices) {
      const customer = customerMap.get(inv.customerId.toString());
      const gstin = customer?.gstin?.trim()?.toUpperCase();

      if (gstin) {
        // B2B: Registered Customer
        if (!b2bMap.has(gstin)) {
          b2bMap.set(gstin, {
            gstin,
            customerName: customer?.name || 'Unknown',
            placeOfSupply: inv.placeOfSupply,
            totalTaxableAmount: 0,
            totalCgst: 0,
            totalSgst: 0,
            totalIgst: 0,
            totalAmount: 0,
            invoices: [],
          });
        }

        const b2bEntry = b2bMap.get(gstin)!;
        b2bEntry.totalTaxableAmount += inv.taxableAmount;
        b2bEntry.totalCgst += inv.totalCgst;
        b2bEntry.totalSgst += inv.totalSgst;
        b2bEntry.totalIgst += inv.totalIgst;
        b2bEntry.totalAmount += inv.finalAmount;

        b2bEntry.invoices.push({
          invoiceId: inv._id,
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.invoiceDate,
          taxableAmount: inv.taxableAmount,
          cgstAmount: inv.totalCgst,
          sgstAmount: inv.totalSgst,
          igstAmount: inv.totalIgst,
          finalAmount: inv.finalAmount,
          isInterState: inv.isInterState,
          placeOfSupply: inv.placeOfSupply,
        });
      } else {
        // B2C: Unregistered Customer
        // B2C Large: Inter-state invoice with taxable amount > ₹2,50,000 (25,000,000 paise)
        if (inv.isInterState && inv.taxableAmount > 25000000) {
          b2cLarge.push({
            invoiceId: inv._id,
            invoiceNumber: inv.invoiceNumber,
            invoiceDate: inv.invoiceDate,
            customerName: customer?.name || 'Unregistered Customer',
            placeOfSupply: inv.placeOfSupply,
            taxableAmount: inv.taxableAmount,
            igstAmount: inv.totalIgst,
            finalAmount: inv.finalAmount,
          });
        } else {
          // B2C Small: Grouped by Place of Supply
          const key = inv.placeOfSupply || 'Intra-State';
          if (!b2cSmallMap.has(key)) {
            b2cSmallMap.set(key, {
              placeOfSupply: key,
              isInterState: inv.isInterState,
              invoiceCount: 0,
              totalTaxableAmount: 0,
              totalCgst: 0,
              totalSgst: 0,
              totalIgst: 0,
              totalAmount: 0,
            });
          }
          const smallEntry = b2cSmallMap.get(key)!;
          smallEntry.invoiceCount++;
          smallEntry.totalTaxableAmount += inv.taxableAmount;
          smallEntry.totalCgst += inv.totalCgst;
          smallEntry.totalSgst += inv.totalSgst;
          smallEntry.totalIgst += inv.totalIgst;
          smallEntry.totalAmount += inv.finalAmount;
        }
      }
    }

    const [hsnSummary, taxRateSummary] = await Promise.all([
      this.getHSNSummary(businessId, fromDate, toDate),
      this.getTaxRateWiseSummary(businessId, fromDate, toDate),
    ]);

    return {
      b2b: Array.from(b2bMap.values()),
      b2cLarge,
      b2cSmall: Array.from(b2cSmallMap.values()),
      hsnSummary,
      taxRateSummary,
      docSummary,
    };
  }

  /**
   * HSN summary from sales invoices
   */
  async getHSNSummary(businessId: string, fromDate?: string | Date, toDate?: string | Date) {
    const match: Record<string, any> = {
      businessId: new Types.ObjectId(businessId),
      status: { $nin: ['draft', 'cancelled'] },
    };

    if (fromDate || toDate) {
      match.invoiceDate = this.buildDateFilter(fromDate, toDate);
    }

    const results = await SalesInvoice.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: { $ifNull: ['$items.hsnCode', 'OTHER'] },
          hsnCode: { $first: { $ifNull: ['$items.hsnCode', 'OTHER'] } },
          description: { $first: '$items.name' },
          totalQuantity: { $sum: '$items.quantity' },
          unit: { $first: '$items.unit' },
          taxableAmount: { $sum: '$items.taxableAmount' },
          cgstAmount: { $sum: '$items.cgstAmount' },
          sgstAmount: { $sum: '$items.sgstAmount' },
          igstAmount: { $sum: '$items.igstAmount' },
          totalTax: {
            $sum: {
              $add: ['$items.cgstAmount', '$items.sgstAmount', '$items.igstAmount'],
            },
          },
          totalAmount: { $sum: '$items.totalAmount' },
        },
      },
      { $sort: { taxableAmount: -1 } },
      { $project: { _id: 0 } },
    ]);

    return results;
  }

  /**
   * Tax rate-wise summary from sales invoices
   */
  async getTaxRateWiseSummary(businessId: string, fromDate?: string | Date, toDate?: string | Date) {
    const match: Record<string, any> = {
      businessId: new Types.ObjectId(businessId),
      status: { $nin: ['draft', 'cancelled'] },
    };

    if (fromDate || toDate) {
      match.invoiceDate = this.buildDateFilter(fromDate, toDate);
    }

    const results = await SalesInvoice.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.taxRate',
          taxRate: { $first: '$items.taxRate' },
          taxableAmount: { $sum: '$items.taxableAmount' },
          cgstAmount: { $sum: '$items.cgstAmount' },
          sgstAmount: { $sum: '$items.sgstAmount' },
          igstAmount: { $sum: '$items.igstAmount' },
          totalTax: {
            $sum: {
              $add: ['$items.cgstAmount', '$items.sgstAmount', '$items.igstAmount'],
            },
          },
          totalAmount: { $sum: '$items.totalAmount' },
        },
      },
      { $sort: { taxRate: 1 } },
      { $project: { _id: 0 } },
    ]);

    return results;
  }

  /**
   * GSTR-3B monthly summary:
   * 1. Outward supplies (taxable, exempt, zero-rated)
   * 2. Inward supplies (eligible ITC from registered & unregistered suppliers)
   * 3. Net tax payable = Output tax liability - Input tax credit
   */
  async getGSTR3BSummary(businessId: string, fromDate?: string | Date, toDate?: string | Date) {
    const bId = new Types.ObjectId(businessId);
    const invoiceDateMatch: Record<string, any> = {};
    const billDateMatch: Record<string, any> = {};

    if (fromDate || toDate) {
      const dateFilter = this.buildDateFilter(fromDate, toDate);
      invoiceDateMatch.invoiceDate = dateFilter;
      billDateMatch.billDate = dateFilter;
    }

    // 1. Outward supplies from SalesInvoices
    const salesInvoices = await SalesInvoice.find({
      businessId: bId,
      status: { $nin: ['draft', 'cancelled'] },
      ...invoiceDateMatch,
    }).lean();

    let outwardTaxable = 0;
    let outwardZeroRated = 0;
    let outwardNilExempt = 0;
    let outputCgst = 0;
    let outputSgst = 0;
    let outputIgst = 0;

    for (const inv of salesInvoices) {
      for (const item of inv.items) {
        if (item.taxRate === 0) {
          outwardNilExempt += item.taxableAmount;
        } else {
          outwardTaxable += item.taxableAmount;
        }
        outputCgst += item.cgstAmount;
        outputSgst += item.sgstAmount;
        outputIgst += item.igstAmount;
      }
    }

    const outputTaxLiability = {
      cgst: outputCgst,
      sgst: outputSgst,
      igst: outputIgst,
      total: outputCgst + outputSgst + outputIgst,
    };

    // 2. Inward supplies (Eligible ITC) from PurchaseBills
    const purchaseBills = await PurchaseBill.find({
      businessId: bId,
      status: { $nin: ['draft', 'cancelled'] },
      ...billDateMatch,
    }).lean();

    const supplierIds = [...new Set(purchaseBills.map((b) => b.supplierId.toString()))];
    const suppliers = await Supplier.find({ _id: { $in: supplierIds } }).lean();
    const supplierMap = new Map(suppliers.map((s) => [s._id.toString(), s]));

    let inwardRegisteredTaxable = 0;
    let inwardUnregisteredTaxable = 0;
    let inputCgst = 0;
    let inputSgst = 0;
    let inputIgst = 0;

    for (const bill of purchaseBills) {
      const supplier = supplierMap.get(bill.supplierId.toString());
      const hasGstin = Boolean(supplier?.gstin?.trim());

      if (hasGstin) {
        inwardRegisteredTaxable += bill.taxableAmount;
        inputCgst += bill.totalCgst;
        inputSgst += bill.totalSgst;
        inputIgst += bill.totalIgst;
      } else {
        inwardUnregisteredTaxable += bill.taxableAmount;
      }
    }

    const inputTaxCredit = {
      cgst: inputCgst,
      sgst: inputSgst,
      igst: inputIgst,
      total: inputCgst + inputSgst + inputIgst,
    };

    // 3. Net Tax Payable = Output Liability - Input Tax Credit
    const netCgst = Math.max(0, outputCgst - inputCgst);
    const netSgst = Math.max(0, outputSgst - inputSgst);
    const netIgst = Math.max(0, outputIgst - inputIgst);
    const netTotal = netCgst + netSgst + netIgst;

    const excessCgst = Math.max(0, inputCgst - outputCgst);
    const excessSgst = Math.max(0, inputSgst - outputSgst);
    const excessIgst = Math.max(0, inputIgst - outputIgst);

    return {
      outwardSupplies: {
        taxableValue: outwardTaxable,
        zeroRatedValue: outwardZeroRated,
        nilOrExemptValue: outwardNilExempt,
        totalTaxable: outwardTaxable + outwardZeroRated + outwardNilExempt,
      },
      inwardSupplies: {
        fromRegistered: inwardRegisteredTaxable,
        fromUnregistered: inwardUnregisteredTaxable,
        totalInwardTaxable: inwardRegisteredTaxable + inwardUnregisteredTaxable,
      },
      outputTaxLiability,
      inputTaxCredit,
      netTaxPayable: {
        cgst: netCgst,
        sgst: netSgst,
        igst: netIgst,
        total: netTotal,
      },
      excessItcCarriedForward: {
        cgst: excessCgst,
        sgst: excessSgst,
        igst: excessIgst,
        total: excessCgst + excessSgst + excessIgst,
      },
    };
  }
}

export const gstReportService = new GstReportService();
export default gstReportService;

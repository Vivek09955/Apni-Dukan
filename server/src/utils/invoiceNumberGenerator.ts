import { ClientSession } from 'mongoose';
import { Business } from '../models/Business';
import { NotFoundError } from './errors';

export async function getNextInvoiceNumber(businessId: string, session?: ClientSession): Promise<string> {
  const business = await Business.findByIdAndUpdate(
    businessId,
    { $inc: { invoiceNextNumber: 1 } },
    { new: false, session }
  );

  if (!business) {
    throw new NotFoundError('Business not found');
  }

  const rawPrefix = business.invoicePrefix || 'INV';
  const prefix = rawPrefix.endsWith('-') ? rawPrefix : `${rawPrefix}-`;
  const num = String(business.invoiceNextNumber || 1).padStart(5, '0');
  return `${prefix}${num}`;
}

export async function getNextPurchaseNumber(businessId: string, session?: ClientSession): Promise<string> {
  const business = await Business.findByIdAndUpdate(
    businessId,
    { $inc: { purchaseNextNumber: 1 } },
    { new: false, session }
  );

  if (!business) {
    throw new NotFoundError('Business not found');
  }

  const rawPrefix = business.purchasePrefix || 'BILL';
  const prefix = rawPrefix.endsWith('-') ? rawPrefix : `${rawPrefix}-`;
  const num = String(business.purchaseNextNumber || 1).padStart(5, '0');
  return `${prefix}${num}`;
}

export async function getNextPaymentNumber(businessId: string, session?: ClientSession): Promise<string> {
  const business = await Business.findByIdAndUpdate(
    businessId,
    { $inc: { paymentNextNumber: 1 } },
    { new: false, session }
  );

  if (!business) {
    throw new NotFoundError('Business not found');
  }

  const prefix = 'PAY-';
  const num = String(business.paymentNextNumber || 1).padStart(5, '0');
  return `${prefix}${num}`;
}

export async function getNextExpenseNumber(businessId: string, session?: ClientSession): Promise<string> {
  const business = await Business.findByIdAndUpdate(
    businessId,
    { $inc: { expenseNextNumber: 1 } },
    { new: false, session }
  );

  if (!business) {
    throw new NotFoundError('Business not found');
  }

  const prefix = 'EXP-';
  const num = String(business.expenseNextNumber || 1).padStart(5, '0');
  return `${prefix}${num}`;
}

export async function getNextIncomeNumber(businessId: string, session?: ClientSession): Promise<string> {
  const business = await Business.findByIdAndUpdate(
    businessId,
    { $inc: { incomeNextNumber: 1 } },
    { new: false, session }
  );

  if (!business) {
    throw new NotFoundError('Business not found');
  }

  const prefix = 'INC-';
  const num = String(business.incomeNextNumber || 1).padStart(5, '0');
  return `${prefix}${num}`;
}

export async function getNextJournalNumber(businessId: string, session?: ClientSession): Promise<string> {
  const business = await Business.findByIdAndUpdate(
    businessId,
    { $inc: { journalNextNumber: 1 } },
    { new: false, session }
  );

  if (!business) {
    throw new NotFoundError('Business not found');
  }

  const prefix = 'JV-';
  const num = String(business.journalNextNumber || 1).padStart(5, '0');
  return `${prefix}${num}`;
}

export async function getNextQuotationNumber(businessId: string, session?: ClientSession): Promise<string> {
  const business = await Business.findByIdAndUpdate(
    businessId,
    { $inc: { quotationNextNumber: 1 } },
    { new: false, session }
  );

  if (!business) {
    throw new NotFoundError('Business not found');
  }

  const rawPrefix = business.quotationPrefix || 'QTN';
  const prefix = rawPrefix.endsWith('-') || rawPrefix.endsWith('/') ? rawPrefix : `${rawPrefix}-`;
  const num = String(business.quotationNextNumber || 1).padStart(5, '0');
  return `${prefix}${num}`;
}

export async function getNextSalesOrderNumber(businessId: string, session?: ClientSession): Promise<string> {
  const business = await Business.findByIdAndUpdate(
    businessId,
    { $inc: { salesOrderNextNumber: 1 } },
    { new: false, session }
  );

  if (!business) {
    throw new NotFoundError('Business not found');
  }

  const rawPrefix = business.salesOrderPrefix || 'SO';
  const prefix = rawPrefix.endsWith('-') || rawPrefix.endsWith('/') ? rawPrefix : `${rawPrefix}-`;
  const num = String(business.salesOrderNextNumber || 1).padStart(5, '0');
  return `${prefix}${num}`;
}

export async function getNextPurchaseOrderNumber(businessId: string, session?: ClientSession): Promise<string> {
  const business = await Business.findByIdAndUpdate(
    businessId,
    { $inc: { purchaseOrderNextNumber: 1 } },
    { new: false, session }
  );

  if (!business) {
    throw new NotFoundError('Business not found');
  }

  const rawPrefix = business.purchaseOrderPrefix || 'PO';
  const prefix = rawPrefix.endsWith('-') || rawPrefix.endsWith('/') ? rawPrefix : `${rawPrefix}-`;
  const num = String(business.purchaseOrderNextNumber || 1).padStart(5, '0');
  return `${prefix}${num}`;
}

export async function getNextChallanNumber(businessId: string, session?: ClientSession): Promise<string> {
  const business = await Business.findByIdAndUpdate(
    businessId,
    { $inc: { challanNextNumber: 1 } },
    { new: false, session }
  );

  if (!business) {
    throw new NotFoundError('Business not found');
  }

  const rawPrefix = business.challanPrefix || 'DC';
  const prefix = rawPrefix.endsWith('-') || rawPrefix.endsWith('/') ? rawPrefix : `${rawPrefix}-`;
  const num = String(business.challanNextNumber || 1).padStart(5, '0');
  return `${prefix}${num}`;
}


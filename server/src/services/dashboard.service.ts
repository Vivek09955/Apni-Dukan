import { Types } from 'mongoose';
import { SalesInvoice } from '../models/SalesInvoice';
import { PurchaseBill } from '../models/PurchaseBill';
import { Product } from '../models/Product';
import { InventoryMovement } from '../models/InventoryMovement';

export class DashboardService {
  /**
   * Aggregate complete dashboard data for the business
   */
  async getDashboardData(businessId: string) {
    const businessObjectId = new Types.ObjectId(businessId);

    // Today's date range (local day boundary)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 6 months ago for trends
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);

    const [
      todaySalesAgg,
      todayPurchasesAgg,
      receivablesAgg,
      payablesAgg,
      monthlySalesAgg,
      monthlyPurchasesAgg,
      recentInvoices,
      recentBills,
      invoiceStatusesAgg,
      topSellingAgg,
      allActiveProducts,
    ] = await Promise.all([
      // 1. Today sales
      SalesInvoice.aggregate([
        {
          $match: {
            businessId: businessObjectId,
            invoiceDate: { $gte: startOfToday, $lte: endOfToday },
            status: { $ne: 'cancelled' },
          },
        },
        { $group: { _id: null, total: { $sum: '$finalAmount' }, count: { $sum: 1 } } },
      ]),

      // 2. Today purchases
      PurchaseBill.aggregate([
        {
          $match: {
            businessId: businessObjectId,
            billDate: { $gte: startOfToday, $lte: endOfToday },
            status: { $ne: 'cancelled' },
          },
        },
        { $group: { _id: null, total: { $sum: '$finalAmount' }, count: { $sum: 1 } } },
      ]),

      // 3. Total receivables
      SalesInvoice.aggregate([
        {
          $match: {
            businessId: businessObjectId,
            balanceDue: { $gt: 0 },
            status: { $ne: 'cancelled' },
          },
        },
        { $group: { _id: null, total: { $sum: '$balanceDue' } } },
      ]),

      // 4. Total payables
      PurchaseBill.aggregate([
        {
          $match: {
            businessId: businessObjectId,
            balanceDue: { $gt: 0 },
            status: { $ne: 'cancelled' },
          },
        },
        { $group: { _id: null, total: { $sum: '$balanceDue' } } },
      ]),

      // 5. Monthly sales trend (last 6 months)
      SalesInvoice.aggregate([
        {
          $match: {
            businessId: businessObjectId,
            invoiceDate: { $gte: sixMonthsAgo },
            status: { $ne: 'cancelled' },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$invoiceDate' },
              month: { $month: '$invoiceDate' },
            },
            totalSales: { $sum: '$finalAmount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),

      // 6. Monthly purchases trend (last 6 months)
      PurchaseBill.aggregate([
        {
          $match: {
            businessId: businessObjectId,
            billDate: { $gte: sixMonthsAgo },
            status: { $ne: 'cancelled' },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$billDate' },
              month: { $month: '$billDate' },
            },
            totalPurchases: { $sum: '$finalAmount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),

      // 7. Recent Invoices
      SalesInvoice.find({ businessId })
        .populate('customerId', 'name')
        .sort({ invoiceDate: -1, createdAt: -1 })
        .limit(10)
        .lean(),

      // Recent Bills
      PurchaseBill.find({ businessId })
        .populate('supplierId', 'name')
        .sort({ billDate: -1, createdAt: -1 })
        .limit(10)
        .lean(),

      // 8. Invoice status breakdown
      SalesInvoice.aggregate([
        { $match: { businessId: businessObjectId } },
        { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$finalAmount' } } },
      ]),

      // 9. Top selling products
      SalesInvoice.aggregate([
        {
          $match: {
            businessId: businessObjectId,
            status: { $ne: 'cancelled' },
          },
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            productName: { $first: '$items.name' },
            totalQuantity: { $sum: '$items.quantity' },
            totalRevenue: { $sum: '$items.totalAmount' },
          },
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 },
      ]),

      // Products for low-stock check
      Product.find({
        businessId,
        isActive: true,
        trackInventory: true,
      })
        .select('_id name sku unit reorderLevel')
        .lean(),
    ]);

    // Format Monthly Trends to include empty months if none
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlySalesTrend = [];
    const monthlyPurchasesTrend = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yr = d.getFullYear();
      const mo = d.getMonth() + 1;
      const label = `${monthNames[mo - 1]} ${yr}`;

      const sFound = monthlySalesAgg.find((s) => s._id.year === yr && s._id.month === mo);
      monthlySalesTrend.push({
        label,
        year: yr,
        month: mo,
        totalSales: sFound ? sFound.totalSales : 0,
        count: sFound ? sFound.count : 0,
      });

      const pFound = monthlyPurchasesAgg.find((p) => p._id.year === yr && p._id.month === mo);
      monthlyPurchasesTrend.push({
        label,
        year: yr,
        month: mo,
        totalPurchases: pFound ? pFound.totalPurchases : 0,
        count: pFound ? pFound.count : 0,
      });
    }

    // Merge recent transactions (top 10 combined)
    const combinedTransactions = [
      ...recentInvoices.map((inv) => ({
        id: inv._id,
        type: 'sale' as const,
        number: inv.invoiceNumber,
        partyName: (inv.customerId as any)?.name || 'Unknown Customer',
        date: inv.invoiceDate,
        amount: inv.finalAmount,
        status: inv.status,
      })),
      ...recentBills.map((b) => ({
        id: b._id,
        type: 'purchase' as const,
        number: b.billNumber,
        partyName: (b.supplierId as any)?.name || 'Unknown Supplier',
        date: b.billDate,
        amount: b.finalAmount,
        status: b.status,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    // Compute Low Stock Products
    const productIds = allActiveProducts.map((p) => p._id);
    const stockAgg = await InventoryMovement.aggregate([
      {
        $match: {
          businessId: businessObjectId,
          productId: { $in: productIds },
        },
      },
      {
        $group: {
          _id: '$productId',
          totalStock: { $sum: '$quantity' },
        },
      },
    ]);

    const stockMap: Record<string, number> = {};
    for (const item of stockAgg) {
      stockMap[item._id.toString()] = item.totalStock;
    }

    const lowStockProducts = allActiveProducts
      .map((p) => {
        const currentStock = stockMap[p._id.toString()] || 0;
        return {
          id: p._id,
          name: p.name,
          sku: p.sku,
          unit: p.unit,
          reorderLevel: p.reorderLevel,
          currentStock,
        };
      })
      .filter((p) => p.currentStock <= p.reorderLevel);

    // Status counts map
    const invoiceStatusCounts: Record<string, { count: number; amount: number }> = {};
    for (const stat of invoiceStatusesAgg) {
      invoiceStatusCounts[stat._id] = {
        count: stat.count,
        amount: stat.amount,
      };
    }

    return {
      metrics: {
        todaySales: todaySalesAgg[0]?.total || 0,
        todaySalesCount: todaySalesAgg[0]?.count || 0,
        todayPurchases: todayPurchasesAgg[0]?.total || 0,
        todayPurchasesCount: todayPurchasesAgg[0]?.count || 0,
        totalReceivables: receivablesAgg[0]?.total || 0,
        totalPayables: payablesAgg[0]?.total || 0,
      },
      monthlySalesTrend,
      monthlyPurchasesTrend,
      recentTransactions: combinedTransactions,
      lowStockProducts,
      invoiceStatusCounts,
      topSellingProducts: topSellingAgg.map((item) => ({
        productId: item._id,
        name: item.productName,
        totalQuantity: item.totalQuantity,
        totalRevenue: item.totalRevenue,
      })),
    };
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;

import { Router } from 'express';
import { authRouter } from './auth.routes';
import { businessRouter } from './business.routes';
import { productRouter } from './product.routes';
import { customerRouter } from './customer.routes';
import { supplierRouter } from './supplier.routes';
import { salesRouter } from './sales.routes';
import { purchaseRouter } from './purchase.routes';
import { dashboardRouter } from './dashboard.routes';
import { paymentRouter } from './payment.routes';
import { expenseRouter } from './expense.routes';
import { otherIncomeRouter } from './otherIncome.routes';
import { accountingRouter } from './accounting.routes';
import { quotationRouter } from './quotation.routes';
import { salesOrderRouter } from './salesOrder.routes';
import { purchaseOrderRouter } from './purchaseOrder.routes';
import { deliveryChallanRouter } from './deliveryChallan.routes';
import { notificationRouter } from './notification.routes';
import { gstReportRouter } from './gstReport.routes';
import { backupRouter } from './backup.routes';

export const apiRouter = Router();

// Mount route groups
apiRouter.use('/auth', authRouter);
apiRouter.use('/businesses', businessRouter);
apiRouter.use('/products', productRouter);
apiRouter.use('/customers', customerRouter);
apiRouter.use('/suppliers', supplierRouter);
apiRouter.use('/sales', salesRouter);
apiRouter.use('/purchases', purchaseRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/payments', paymentRouter);
apiRouter.use('/expenses', expenseRouter);
apiRouter.use('/income', otherIncomeRouter);
apiRouter.use('/accounting', accountingRouter);
apiRouter.use('/quotations', quotationRouter);
apiRouter.use('/sales-orders', salesOrderRouter);
apiRouter.use('/purchase-orders', purchaseOrderRouter);
apiRouter.use('/delivery-challans', deliveryChallanRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/gst', gstReportRouter);
apiRouter.use('/backup', backupRouter);

// Health check endpoint under /api/health
apiRouter.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Apni Dukan API is healthy and operational',
    timestamp: new Date().toISOString(),
  });
});

export default apiRouter;

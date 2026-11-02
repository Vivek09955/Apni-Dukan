import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';
import { attachBusiness } from '../middleware/rbac';

export const notificationRouter = Router();

// GET /api/notifications - List notifications (unread first)
notificationRouter.get(
  '/',
  authenticate,
  attachBusiness,
  notificationController.list
);

// GET /api/notifications/unread-count - Unread count (placed before /:id)
notificationRouter.get(
  '/unread-count',
  authenticate,
  attachBusiness,
  notificationController.getUnreadCount
);

// PATCH /api/notifications/read-all - Mark all as read
notificationRouter.patch(
  '/read-all',
  authenticate,
  attachBusiness,
  notificationController.markAllRead
);

// PATCH /api/notifications/:id/read - Mark specific notification as read
notificationRouter.patch(
  '/:id/read',
  authenticate,
  attachBusiness,
  notificationController.markRead
);

export default notificationRouter;

import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { UnauthorizedError } from '../utils/errors';

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const result = await notificationService.getNotifications(
      req.businessId!.toString(),
      req.user.id,
      req.query
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const count = await notificationService.getUnreadCount(
      req.businessId!.toString(),
      req.user.id
    );

    res.status(200).json({
      success: true,
      data: { unreadCount: count },
    });
  } catch (error) {
    next(error);
  }
};

export const markRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const notification = await notificationService.markAsRead(
      req.businessId!.toString(),
      req.params.id,
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

export const markAllRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const count = await notificationService.markAllAsRead(
      req.businessId!.toString(),
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: `${count} notifications marked as read`,
      data: { markedCount: count },
    });
  } catch (error) {
    next(error);
  }
};

export const notificationController = {
  list,
  getUnreadCount,
  markRead,
  markAllRead,
};
export default notificationController;

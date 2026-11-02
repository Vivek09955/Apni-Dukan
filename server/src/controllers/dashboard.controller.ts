import { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboard.service';

export const getDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await dashboardService.getDashboardData(req.businessId!.toString());
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const dashboardController = {
  getDashboard,
};
export default dashboardController;

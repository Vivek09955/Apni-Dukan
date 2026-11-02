import { Request, Response, NextFunction } from 'express';
import { gstReportService } from '../services/gstReport.service';

export const getGSTR1 = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fromDate, toDate } = req.query;
    const report = await gstReportService.getGSTR1Report(
      req.businessId!.toString(),
      fromDate as string,
      toDate as string
    );

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

export const getGSTR3B = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fromDate, toDate } = req.query;
    const report = await gstReportService.getGSTR3BSummary(
      req.businessId!.toString(),
      fromDate as string,
      toDate as string
    );

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

export const getHSNSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fromDate, toDate } = req.query;
    const summary = await gstReportService.getHSNSummary(
      req.businessId!.toString(),
      fromDate as string,
      toDate as string
    );

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

export const getTaxRateSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fromDate, toDate } = req.query;
    const summary = await gstReportService.getTaxRateWiseSummary(
      req.businessId!.toString(),
      fromDate as string,
      toDate as string
    );

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

export const gstReportController = {
  getGSTR1,
  getGSTR3B,
  getHSNSummary,
  getTaxRateSummary,
};
export default gstReportController;

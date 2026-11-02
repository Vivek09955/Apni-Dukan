import { Request, Response, NextFunction } from 'express';
import { accountingService } from '../services/accounting.service';
import { UnauthorizedError } from '../utils/errors';

export const listAccounts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const accounts = await accountingService.getAccounts(req.businessId!.toString());
    res.status(200).json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    next(error);
  }
};

export const createAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const account = await accountingService.createAccount(
      req.businessId!.toString(),
      req.user.id,
      req.body,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: account,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const account = await accountingService.updateAccount(
      req.businessId!.toString(),
      req.user.id,
      req.params.id,
      req.body,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Account updated successfully',
      data: account,
    });
  } catch (error) {
    next(error);
  }
};

export const createJournalEntry = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const entry = await accountingService.createJournalEntry(
      req.businessId!.toString(),
      req.user.id,
      req.body,
      undefined,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Journal entry created successfully',
      data: entry,
    });
  } catch (error) {
    next(error);
  }
};

export const listJournalEntries = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await accountingService.getJournalEntries(
      req.businessId!.toString(),
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

export const getJournalEntryById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const entry = await accountingService.getJournalEntryById(
      req.businessId!.toString(),
      req.params.id
    );

    res.status(200).json({
      success: true,
      data: entry,
    });
  } catch (error) {
    next(error);
  }
};

export const reverseJournalEntry = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const reversedEntry = await accountingService.reverseJournalEntry(
      req.businessId!.toString(),
      req.user.id,
      req.params.id,
      undefined,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Journal entry reversed successfully',
      data: reversedEntry,
    });
  } catch (error) {
    next(error);
  }
};

export const getAccountLedger = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await accountingService.getAccountLedger(
      req.businessId!.toString(),
      req.params.accountId,
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

export const getTrialBalance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const asOfDate = req.query.asOfDate as string | undefined;
    const report = await accountingService.getTrialBalance(
      req.businessId!.toString(),
      asOfDate
    );

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

export const getProfitAndLoss = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const fromDate = req.query.fromDate as string | undefined;
    const toDate = req.query.toDate as string | undefined;

    const report = await accountingService.getProfitAndLoss(
      req.businessId!.toString(),
      fromDate,
      toDate
    );

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

export const getBalanceSheet = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const asOfDate = req.query.asOfDate as string | undefined;
    const report = await accountingService.getBalanceSheet(
      req.businessId!.toString(),
      asOfDate
    );

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

export const getDayBook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const date = req.query.date as string | undefined;
    const report = await accountingService.getDayBook(req.businessId!.toString(), date);

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

export const getCashBook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await accountingService.getCashBook(req.businessId!.toString(), req.query);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getBankBook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await accountingService.getBankBook(req.businessId!.toString(), req.query);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

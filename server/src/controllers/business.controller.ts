import { Request, Response, NextFunction } from 'express';
import { businessService } from '../services/business.service';
import { UnauthorizedError } from '../utils/errors';

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const business = await businessService.createBusiness(req.user.id, req.body, req.ip);

    res.status(201).json({
      success: true,
      message: 'Business created successfully',
      data: { business },
    });
  } catch (error) {
    next(error);
  }
};

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const businesses = await businessService.getUserBusinesses(req.user.id);

    res.status(200).json({
      success: true,
      data: { businesses },
    });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const business = await businessService.getBusinessById(req.params.id, req.user.id);

    res.status(200).json({
      success: true,
      data: { business },
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const business = await businessService.updateBusiness(
      req.params.id,
      req.user.id,
      req.body,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Business updated successfully',
      data: { business },
    });
  } catch (error) {
    next(error);
  }
};

export const addMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const member = await businessService.addMember(
      req.params.id,
      req.body.email,
      req.body.role,
      req.body.permissions,
      req.ip,
      req.user?.id
    );

    res.status(201).json({
      success: true,
      message: 'Member added successfully',
      data: { member },
    });
  } catch (error) {
    next(error);
  }
};

export const getMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const members = await businessService.getMembers(req.params.id);

    res.status(200).json({
      success: true,
      data: { members },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const member = await businessService.updateMember(
      req.params.id,
      req.params.memberId,
      req.body.role,
      req.body.permissions,
      req.ip,
      req.user?.id
    );

    res.status(200).json({
      success: true,
      message: 'Member updated successfully',
      data: { member },
    });
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await businessService.removeMember(
      req.params.id,
      req.params.memberId,
      req.ip,
      req.user?.id
    );

    res.status(200).json({
      success: true,
      message: 'Member removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const businessController = {
  create,
  list,
  getById,
  update,
  addMember,
  getMembers,
  updateMember,
  removeMember,
};

export default businessController;

import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { BusinessMember, PERMISSIONS } from '../models/BusinessMember';
import { ForbiddenError, UnauthorizedError, BadRequestError } from '../utils/errors';

/**
 * Extracts businessId from request header or route params
 */
const getBusinessIdFromRequest = (req: Request): string | null => {
  const headerId = req.headers['x-business-id'];
  if (typeof headerId === 'string' && headerId.trim()) {
    return headerId.trim();
  }
  if (req.params.businessId) {
    return req.params.businessId;
  }
  if (req.params.id) {
    return req.params.id;
  }
  return null;
};

/**
 * Middleware that verifies the user is an active member of the business
 * and attaches businessId, memberRole, and memberPermissions to the request.
 */
export const attachBusiness = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const businessId = getBusinessIdFromRequest(req);
    if (!businessId) {
      throw new BadRequestError('Business ID is required in x-business-id header or path parameters');
    }

    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      throw new BadRequestError('Invalid Business ID format');
    }

    const member = await BusinessMember.findOne({
      userId: req.user.id,
      businessId,
      isActive: true,
    });

    if (!member) {
      throw new ForbiddenError('You are not an active member of this business');
    }

    req.businessId = businessId;
    req.memberRole = member.role;
    req.memberPermissions = member.permissions;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if user's role matches any of the allowed roles
 */
export const requireRole = (...roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      // If business membership is not attached yet, attach it
      if (!req.businessId || !req.memberRole) {
        await new Promise<void>((resolve, reject) => {
          attachBusiness(req, res, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      if (!req.memberRole || !roles.includes(req.memberRole)) {
        throw new ForbiddenError(
          `Access denied. Requires one of roles: [${roles.join(', ')}]`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user has ALL required permissions.
 * Owners automatically pass all permission checks.
 */
export const requirePermission = (...requiredPermissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      // If business membership is not attached yet, attach it
      if (!req.businessId || !req.memberRole || !req.memberPermissions) {
        await new Promise<void>((resolve, reject) => {
          attachBusiness(req, res, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      // Owners have full access to everything
      if (req.memberRole === 'owner') {
        return next();
      }

      const userPermissions = new Set(req.memberPermissions || []);
      const missingPermissions = requiredPermissions.filter(
        (perm) => !userPermissions.has(perm)
      );

      if (missingPermissions.length > 0) {
        throw new ForbiddenError(
          `Access denied. Missing required permissions: [${missingPermissions.join(', ')}]`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

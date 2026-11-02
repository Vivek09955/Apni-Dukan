import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { UnauthorizedError } from '../utils/errors';

export interface JwtAccessPayload {
  userId?: string;
  id?: string;
  email: string;
  iat?: number;
  exp?: number;
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token required');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Authentication token required');
    }

    const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET) as JwtAccessPayload;
    const userId = decoded.userId || decoded.id;

    if (!userId || !decoded.email) {
      throw new UnauthorizedError('Invalid token payload');
    }

    req.user = {
      id: userId,
      email: decoded.email,
    };

    next();
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else if (error.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Access token has expired'));
    } else if (error.name === 'JsonWebTokenError') {
      next(new UnauthorizedError('Invalid access token'));
    } else {
      next(new UnauthorizedError('Authentication failed'));
    }
  }
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET) as JwtAccessPayload;
    const userId = decoded.userId || decoded.id;

    if (userId && decoded.email) {
      req.user = {
        id: userId,
        email: decoded.email,
      };
    }

    next();
  } catch {
    // For optional auth, errors are ignored and user remains undefined
    next();
  }
};

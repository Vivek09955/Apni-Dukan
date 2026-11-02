import { Types } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
      businessId?: string | Types.ObjectId;
      memberRole?: string;
      memberPermissions?: string[];
      cookies?: Record<string, any>;
    }
  }
}

export {};

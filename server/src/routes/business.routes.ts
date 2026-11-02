import { Router } from 'express';
import { businessController } from '../controllers/business.controller';
import { authenticate } from '../middleware/auth';
import { attachBusiness, requireRole } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import {
  createBusinessSchema,
  updateBusinessSchema,
  addMemberSchema,
  updateMemberSchema,
} from '../validators/business.validator';

export const businessRouter = Router();

// POST /api/businesses - Create new business
businessRouter.post(
  '/',
  authenticate,
  validateBody(createBusinessSchema),
  businessController.create
);

// GET /api/businesses - List businesses for authenticated user
businessRouter.get(
  '/',
  authenticate,
  businessController.list
);

// GET /api/businesses/:id - Get business details by ID
businessRouter.get(
  '/:id',
  authenticate,
  businessController.getById
);

// PATCH /api/businesses/:id - Update business details (owner/admin)
businessRouter.patch(
  '/:id',
  authenticate,
  attachBusiness,
  requireRole('owner', 'admin'),
  validateBody(updateBusinessSchema),
  businessController.update
);

// POST /api/businesses/:id/members - Add member to business (owner/admin)
businessRouter.post(
  '/:id/members',
  authenticate,
  attachBusiness,
  requireRole('owner', 'admin'),
  validateBody(addMemberSchema),
  businessController.addMember
);

// GET /api/businesses/:id/members - List members of business
businessRouter.get(
  '/:id/members',
  authenticate,
  attachBusiness,
  businessController.getMembers
);

// PATCH /api/businesses/:id/members/:memberId - Update member role/permissions (owner/admin)
businessRouter.patch(
  '/:id/members/:memberId',
  authenticate,
  attachBusiness,
  requireRole('owner', 'admin'),
  validateBody(updateMemberSchema),
  businessController.updateMember
);

// DELETE /api/businesses/:id/members/:memberId - Remove member from business (owner only)
businessRouter.delete(
  '/:id/members/:memberId',
  authenticate,
  attachBusiness,
  requireRole('owner'),
  businessController.removeMember
);

export default businessRouter;

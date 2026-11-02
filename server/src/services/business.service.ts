import mongoose, { Types } from 'mongoose';
import { Business, IBusiness } from '../models/Business';
import { BusinessMember, IBusinessMember, PERMISSIONS, ROLE_PERMISSIONS, Role } from '../models/BusinessMember';
import { User } from '../models/User';
import { createAuditLog } from '../middleware/auditLog';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../utils/errors';
import {
  CreateBusinessInput,
  UpdateBusinessInput,
} from '../validators/business.validator';
import { createDefaultAccounts } from '../utils/defaultChartOfAccounts';

export interface UserBusinessMembership {
  business: IBusiness;
  role: Role;
  permissions: string[];
}

/**
 * Create a new business and assign the creator as the Owner
 */
export const createBusiness = async (
  userId: string,
  data: CreateBusinessInput,
  ipAddress?: string
): Promise<IBusiness> => {
  let business: IBusiness | null = null;
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const [newBusiness] = await Business.create(
        [
          {
            name: data.name,
            logo: data.logo,
            address: data.address,
            phone: data.phone,
            email: data.email,
            gstin: data.gstin || undefined,
            state: data.state,
            financialYearStart: data.financialYearStart ?? 4,
            currency: data.currency ?? 'INR',
            invoicePrefix: data.invoicePrefix ?? 'INV',
            invoiceNextNumber: data.invoiceNextNumber ?? 1,
            settings: data.settings,
          },
        ],
        { session }
      );

      business = newBusiness;

      // Assign creator as 'owner' with all permissions
      await BusinessMember.create(
        [
          {
            userId: new Types.ObjectId(userId),
            businessId: newBusiness._id,
            role: 'owner' as Role,
            permissions: Object.values(PERMISSIONS),
            isActive: true,
          },
        ],
        { session }
      );

      // Initialize default Chart of Accounts for the business
      await createDefaultAccounts(newBusiness._id, session);
    });
  } catch (error: any) {
    // Fallback if running on standalone MongoDB without replica set
    if (
      error.message?.includes('replica set') ||
      error.message?.includes('Transaction numbers')
    ) {
      business = await Business.create({
        name: data.name,
        logo: data.logo,
        address: data.address,
        phone: data.phone,
        email: data.email,
        gstin: data.gstin || undefined,
        state: data.state,
        financialYearStart: data.financialYearStart ?? 4,
        currency: data.currency ?? 'INR',
        invoicePrefix: data.invoicePrefix ?? 'INV',
        invoiceNextNumber: data.invoiceNextNumber ?? 1,
        settings: data.settings,
      });

      await BusinessMember.create({
        userId: new Types.ObjectId(userId),
        businessId: business._id,
        role: 'owner' as Role,
        permissions: Object.values(PERMISSIONS),
        isActive: true,
      });

      await createDefaultAccounts(business._id);
    } else {
      throw error;
    }
  } finally {
    await session.endSession();
  }

  if (!business) {
    throw new BadRequestError('Failed to create business');
  }

  // Audit log creation
  await createAuditLog(
    business._id,
    userId,
    'created',
    'business',
    business._id,
    { name: business.name },
    ipAddress
  );

  return business;
};

/**
 * Get all businesses the user is an active member of
 */
export const getUserBusinesses = async (
  userId: string
): Promise<UserBusinessMembership[]> => {
  const memberships = await BusinessMember.find({
    userId: new Types.ObjectId(userId),
    isActive: true,
  }).populate<{ businessId: IBusiness }>('businessId');

  const results: UserBusinessMembership[] = [];

  for (const m of memberships) {
    if (m.businessId && m.businessId.isActive) {
      results.push({
        business: m.businessId,
        role: m.role,
        permissions: m.permissions,
      });
    }
  }

  return results;
};

/**
 * Get business details by ID if user has active membership
 */
export const getBusinessById = async (
  businessId: string,
  userId: string
): Promise<IBusiness> => {
  if (!Types.ObjectId.isValid(businessId)) {
    throw new BadRequestError('Invalid business ID');
  }

  const membership = await BusinessMember.findOne({
    businessId: new Types.ObjectId(businessId),
    userId: new Types.ObjectId(userId),
    isActive: true,
  });

  if (!membership) {
    throw new ForbiddenError('You do not have access to this business');
  }

  const business = await Business.findOne({
    _id: new Types.ObjectId(businessId),
    isActive: true,
  });

  if (!business) {
    throw new NotFoundError('Business not found');
  }

  return business;
};

/**
 * Update business details
 */
export const updateBusiness = async (
  businessId: string,
  userId: string,
  data: UpdateBusinessInput,
  ipAddress?: string
): Promise<IBusiness> => {
  if (!Types.ObjectId.isValid(businessId)) {
    throw new BadRequestError('Invalid business ID');
  }

  const business = await Business.findOne({
    _id: new Types.ObjectId(businessId),
    isActive: true,
  });

  if (!business) {
    throw new NotFoundError('Business not found');
  }

  const previousData = business.toObject();

  if (data.name !== undefined) business.name = data.name;
  if (data.logo !== undefined) business.logo = data.logo;
  if (data.address !== undefined) {
    business.address = {
      ...business.address,
      ...data.address,
    };
  }
  if (data.phone !== undefined) business.phone = data.phone;
  if (data.email !== undefined) business.email = data.email;
  if (data.gstin !== undefined) business.gstin = data.gstin || undefined;
  if (data.state !== undefined) business.state = data.state;
  if (data.financialYearStart !== undefined) business.financialYearStart = data.financialYearStart;
  if (data.currency !== undefined) business.currency = data.currency;
  if (data.invoicePrefix !== undefined) business.invoicePrefix = data.invoicePrefix;
  if (data.invoiceNextNumber !== undefined) business.invoiceNextNumber = data.invoiceNextNumber;
  if (data.settings !== undefined) {
    business.settings = {
      ...business.settings,
      ...data.settings,
    };
  }

  await business.save();

  // Audit log update
  await createAuditLog(
    business._id,
    userId,
    'updated',
    'business',
    business._id,
    { previous: previousData, updated: data },
    ipAddress
  );

  return business;
};

/**
 * Add a member to a business by email
 */
export const addMember = async (
  businessId: string,
  email: string,
  role: Role,
  customPermissions?: string[],
  ipAddress?: string,
  performedByUserId?: string
): Promise<IBusinessMember> => {
  if (!Types.ObjectId.isValid(businessId)) {
    throw new BadRequestError('Invalid business ID');
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new NotFoundError('No user found with the specified email address');
  }

  const existingMember = await BusinessMember.findOne({
    businessId: new Types.ObjectId(businessId),
    userId: user._id,
  });

  const permissionsToAssign =
    customPermissions && customPermissions.length > 0
      ? customPermissions
      : ROLE_PERMISSIONS[role] || [];

  let member: IBusinessMember;

  if (existingMember) {
    if (existingMember.isActive) {
      throw new ConflictError('User is already a member of this business');
    }
    // Reactivate existing inactive member
    existingMember.isActive = true;
    existingMember.role = role;
    existingMember.permissions = permissionsToAssign;
    member = await existingMember.save();
  } else {
    member = await BusinessMember.create({
      businessId: new Types.ObjectId(businessId),
      userId: user._id,
      role,
      permissions: permissionsToAssign,
      isActive: true,
    });
  }

  if (performedByUserId) {
    await createAuditLog(
      businessId,
      performedByUserId,
      'created',
      'business_member',
      member._id,
      { addedUser: user.email, role, permissions: permissionsToAssign },
      ipAddress
    );
  }

  return member;
};

/**
 * Update member role or permissions
 */
export const updateMember = async (
  businessId: string,
  memberId: string,
  role?: Role,
  permissions?: string[],
  ipAddress?: string,
  performedByUserId?: string
): Promise<IBusinessMember> => {
  if (!Types.ObjectId.isValid(businessId) || !Types.ObjectId.isValid(memberId)) {
    throw new BadRequestError('Invalid business or member ID');
  }

  const member = await BusinessMember.findOne({
    _id: new Types.ObjectId(memberId),
    businessId: new Types.ObjectId(businessId),
    isActive: true,
  });

  if (!member) {
    throw new NotFoundError('Business member not found');
  }

  // Prevent demoting the last owner
  if (member.role === 'owner' && role && role !== 'owner') {
    const ownerCount = await BusinessMember.countDocuments({
      businessId: new Types.ObjectId(businessId),
      role: 'owner',
      isActive: true,
    });

    if (ownerCount <= 1) {
      throw new BadRequestError('Cannot change the role of the last business owner');
    }
  }

  const previous = { role: member.role, permissions: member.permissions };

  if (role) {
    member.role = role;
    if (!permissions) {
      member.permissions = ROLE_PERMISSIONS[role] || [];
    }
  }

  if (permissions) {
    member.permissions = permissions;
  }

  await member.save();

  if (performedByUserId) {
    await createAuditLog(
      businessId,
      performedByUserId,
      'updated',
      'business_member',
      member._id,
      { previous, updated: { role: member.role, permissions: member.permissions } },
      ipAddress
    );
  }

  return member;
};

/**
 * Soft remove (deactivate) a member from a business
 */
export const removeMember = async (
  businessId: string,
  memberId: string,
  ipAddress?: string,
  performedByUserId?: string
): Promise<void> => {
  if (!Types.ObjectId.isValid(businessId) || !Types.ObjectId.isValid(memberId)) {
    throw new BadRequestError('Invalid business or member ID');
  }

  const member = await BusinessMember.findOne({
    _id: new Types.ObjectId(memberId),
    businessId: new Types.ObjectId(businessId),
    isActive: true,
  });

  if (!member) {
    throw new NotFoundError('Business member not found');
  }

  // Don't allow removing the last owner
  if (member.role === 'owner') {
    const ownerCount = await BusinessMember.countDocuments({
      businessId: new Types.ObjectId(businessId),
      role: 'owner',
      isActive: true,
    });

    if (ownerCount <= 1) {
      throw new BadRequestError('Cannot remove the last owner of the business');
    }
  }

  member.isActive = false;
  await member.save();

  if (performedByUserId) {
    await createAuditLog(
      businessId,
      performedByUserId,
      'deleted',
      'business_member',
      member._id,
      { removedMemberId: memberId, userId: member.userId },
      ipAddress
    );
  }
};

/**
 * Get all active members of a business
 */
export const getMembers = async (businessId: string): Promise<IBusinessMember[]> => {
  if (!Types.ObjectId.isValid(businessId)) {
    throw new BadRequestError('Invalid business ID');
  }

  const members = await BusinessMember.find({
    businessId: new Types.ObjectId(businessId),
    isActive: true,
  }).populate('userId', 'name email phone avatar isEmailVerified');

  return members;
};

export const businessService = {
  createBusiness,
  getUserBusinesses,
  getBusinessById,
  updateBusiness,
  addMember,
  updateMember,
  removeMember,
  getMembers,
};

export default businessService;

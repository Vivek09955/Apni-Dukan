import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { config } from '../config/env';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors';
import { RegisterInput, LoginInput } from '../validators/auth.validator';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface SanitizedUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const sanitizeUser = (user: IUser): SanitizedUser => {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

/**
 * Generate JWT access token
 */
export const generateAccessToken = (userId: string, email: string): string => {
  return jwt.sign(
    { userId, email },
    config.JWT_ACCESS_SECRET,
    { expiresIn: config.JWT_ACCESS_EXPIRY as any }
  );
};

/**
 * Generate JWT refresh token
 */
export const generateRefreshToken = (userId: string): string => {
  return jwt.sign(
    { userId },
    config.JWT_REFRESH_SECRET,
    { expiresIn: config.JWT_REFRESH_EXPIRY as any }
  );
};

/**
 * Register a new user
 */
export const register = async (input: RegisterInput): Promise<SanitizedUser> => {
  const existingUser = await User.findOne({ email: input.email.toLowerCase() });
  if (existingUser) {
    throw new ConflictError('A user with this email already exists');
  }

  const user = await User.create({
    name: input.name,
    email: input.email.toLowerCase(),
    password: input.password,
    phone: input.phone,
  });

  return sanitizeUser(user);
};

/**
 * Login user and issue access & refresh tokens
 */
export const login = async (
  input: LoginInput
): Promise<{ user: SanitizedUser; tokens: TokenPair }> => {
  const user = await User.findOne({ email: input.email.toLowerCase() }).select('+password');
  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const isPasswordValid = await user.comparePassword(input.password);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const accessToken = generateAccessToken(user._id.toString(), user.email);
  const refreshToken = generateRefreshToken(user._id.toString());

  // 7 days expiration for refresh token in database
  const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Filter out expired refresh tokens and add the new one
  const validTokens = (user.refreshTokens || []).filter(
    (rt) => rt.expiresAt > new Date()
  );
  validTokens.push({ token: refreshToken, expiresAt: refreshExpiresAt });
  user.refreshTokens = validTokens;

  await user.save();

  return {
    user: sanitizeUser(user),
    tokens: {
      accessToken,
      refreshToken,
    },
  };
};

/**
 * Refresh access token using valid refresh token
 */
export const refreshToken = async (token: string): Promise<{ accessToken: string }> => {
  if (!token) {
    throw new UnauthorizedError('Refresh token is required');
  }

  let decoded: { userId?: string };
  try {
    decoded = jwt.verify(token, config.JWT_REFRESH_SECRET) as { userId?: string };
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const user = await User.findOne({
    _id: decoded.userId,
    'refreshTokens.token': token,
  });

  if (!user) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const storedToken = user.refreshTokens.find((t) => t.token === token);
  if (!storedToken || storedToken.expiresAt < new Date()) {
    // Remove expired token
    user.refreshTokens = user.refreshTokens.filter((t) => t.token !== token);
    await user.save();
    throw new UnauthorizedError('Refresh token has expired');
  }

  const newAccessToken = generateAccessToken(user._id.toString(), user.email);

  return { accessToken: newAccessToken };
};

/**
 * Log out user by revoking the specified refresh token
 */
export const logout = async (userId: string, token?: string): Promise<void> => {
  const user = await User.findById(userId);
  if (!user) return;

  if (token) {
    user.refreshTokens = user.refreshTokens.filter((rt) => rt.token !== token);
  } else {
    // If no token provided, clear all expired ones
    user.refreshTokens = user.refreshTokens.filter((rt) => rt.expiresAt > new Date());
  }

  await user.save();
};

/**
 * Request password reset token
 */
export const forgotPassword = async (email: string): Promise<string> => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // For security, don't reveal user existence in production,
    // but return simulated token or empty string; prompt specifies:
    // "Generate a reset token (crypto.randomBytes), store hash on user with expiry. Return the token"
    throw new NotFoundError('No account found with this email address');
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

  await user.save();

  return resetToken;
};

/**
 * Reset password using token
 */
export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: new Date() },
  }).select('+resetPasswordToken +resetPasswordExpires');

  if (!user) {
    throw new BadRequestError('Password reset token is invalid or has expired');
  }

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  // Revoke all existing refresh tokens for security
  user.refreshTokens = [];

  await user.save();
};

export const authService = {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  generateAccessToken,
  generateRefreshToken,
  sanitizeUser,
};

export default authService;

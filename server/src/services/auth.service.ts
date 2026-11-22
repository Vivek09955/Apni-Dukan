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
import { emailService } from './email.service';

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
 * Request password reset OTP — generates 6-digit OTP, hashes it, stores with 10min expiry, sends email
 */
export const forgotPassword = async (email: string): Promise<void> => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // For security, don't reveal whether the email exists in production
    // But in dev, throw to help debugging
    if (config.NODE_ENV === 'development') {
      throw new NotFoundError('No account found with this email address');
    }
    // In production, silently return success to prevent email enumeration
    return;
  }

  // Generate 6-digit OTP
  const otp = emailService.generateOTP();

  // Hash OTP before storing (never store plaintext OTP in DB)
  const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

  // Store hashed OTP with 10 minute expiry
  user.resetPasswordOTP = hashedOTP;
  user.resetPasswordOTPExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  // Clear any old token-based reset data
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  await user.save();

  // Send OTP email
  const emailSent = await emailService.sendPasswordResetOTP(
    user.email,
    otp,
    user.name
  );

  if (!emailSent && config.NODE_ENV === 'production') {
    throw new BadRequestError('Failed to send password reset email. Please try again.');
  }

  // In development, also log the OTP to console for testing
  if (config.NODE_ENV === 'development') {
    console.log(`[Auth] Password reset OTP for ${email}: ${otp}`);
  }
};

/**
 * Verify OTP for password reset
 */
export const verifyResetOTP = async (email: string, otp: string): Promise<string> => {
  const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

  const user = await User.findOne({
    email: email.toLowerCase(),
    resetPasswordOTP: hashedOTP,
    resetPasswordOTPExpiry: { $gt: new Date() },
  }).select('+resetPasswordOTP +resetPasswordOTPExpiry');

  if (!user) {
    throw new BadRequestError('Invalid or expired OTP. Please request a new one.');
  }

  // Generate a temporary reset token (valid for 5 minutes) so user can set new password
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  // Clear OTP after successful verification
  user.resetPasswordOTP = undefined;
  user.resetPasswordOTPExpiry = undefined;

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
  verifyResetOTP,
  resetPassword,
  generateAccessToken,
  generateRefreshToken,
  sanitizeUser,
};

export default authService;

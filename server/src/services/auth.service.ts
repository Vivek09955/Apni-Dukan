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
 * Register a new user — creates account with isEmailVerified=false, sends OTP email
 */
export const register = async (input: RegisterInput): Promise<SanitizedUser> => {
  const existingUser = await User.findOne({ email: input.email.toLowerCase() });
  if (existingUser) {
    // If existing user is unverified, allow re-registration (overwrite)
    if (!existingUser.isEmailVerified) {
      // Update with new data and send fresh OTP
      existingUser.name = input.name;
      existingUser.password = input.password;
      if (input.phone) existingUser.phone = input.phone;

      const otp = emailService.generateOTP();
      const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
      existingUser.emailVerificationOTP = hashedOTP;
      existingUser.emailVerificationOTPExpiry = new Date(Date.now() + 10 * 60 * 1000);
      await existingUser.save();

      // Send verification email
      const emailSent = await emailService.sendEmailVerificationOTP(
        existingUser.email,
        otp,
        existingUser.name
      );
      if (!emailSent && config.NODE_ENV === 'production') {
        throw new BadRequestError('Failed to send verification email. Please try again.');
      }
      if (config.NODE_ENV === 'development') {
        console.log(`[Auth] Registration OTP for ${existingUser.email}: ${otp}`);
      }

      return sanitizeUser(existingUser);
    }
    throw new ConflictError('A user with this email already exists');
  }

  // Generate OTP for email verification
  const otp = emailService.generateOTP();
  const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

  const user = await User.create({
    name: input.name,
    email: input.email.toLowerCase(),
    password: input.password,
    phone: input.phone,
    isEmailVerified: false,
    emailVerificationOTP: hashedOTP,
    emailVerificationOTPExpiry: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
  });

  // Send verification email
  const emailSent = await emailService.sendEmailVerificationOTP(
    user.email,
    otp,
    user.name
  );
  if (!emailSent && config.NODE_ENV === 'production') {
    throw new BadRequestError('Failed to send verification email. Please try again.');
  }
  if (config.NODE_ENV === 'development') {
    console.log(`[Auth] Registration OTP for ${user.email}: ${otp}`);
  }

  return sanitizeUser(user);
};

/**
 * Verify email OTP during registration — marks user as verified, returns tokens
 */
export const verifyRegistrationOTP = async (
  email: string,
  otp: string
): Promise<{ user: SanitizedUser; tokens: TokenPair }> => {
  const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

  const user = await User.findOne({
    email: email.toLowerCase(),
    emailVerificationOTP: hashedOTP,
    emailVerificationOTPExpiry: { $gt: new Date() },
  }).select('+emailVerificationOTP +emailVerificationOTPExpiry');

  if (!user) {
    throw new BadRequestError('Invalid or expired OTP. Please request a new one.');
  }

  // Mark as verified and clear OTP
  user.isEmailVerified = true;
  user.emailVerificationOTP = undefined;
  user.emailVerificationOTPExpiry = undefined;

  // Generate tokens for auto-login
  const accessToken = generateAccessToken(user._id.toString(), user.email);
  const refreshToken = generateRefreshToken(user._id.toString());

  const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  user.refreshTokens = [{ token: refreshToken, expiresAt: refreshExpiresAt }];

  await user.save();

  return {
    user: sanitizeUser(user),
    tokens: { accessToken, refreshToken },
  };
};

/**
 * Resend registration OTP
 */
export const resendRegistrationOTP = async (email: string): Promise<void> => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new NotFoundError('No account found with this email address');
  }

  if (user.isEmailVerified) {
    throw new BadRequestError('This email is already verified. Please login.');
  }

  const otp = emailService.generateOTP();
  const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

  user.emailVerificationOTP = hashedOTP;
  user.emailVerificationOTPExpiry = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  const emailSent = await emailService.sendEmailVerificationOTP(user.email, otp, user.name);
  if (!emailSent && config.NODE_ENV === 'production') {
    throw new BadRequestError('Failed to send verification email. Please try again.');
  }
  if (config.NODE_ENV === 'development') {
    console.log(`[Auth] Resent registration OTP for ${email}: ${otp}`);
  }
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

  // Block login for unverified emails
  if (!user.isEmailVerified) {
    throw new UnauthorizedError('Please verify your email address first. Check your inbox for the OTP.');
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
  verifyRegistrationOTP,
  resendRegistrationOTP,
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

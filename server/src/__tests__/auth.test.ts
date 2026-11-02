import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * Auth logic unit tests - testing password hashing and JWT generation
 * without requiring MongoDB connection.
 */

describe('Auth Logic', () => {
  describe('Password Hashing', () => {
    it('should hash passwords with bcrypt', async () => {
      const plainPassword = 'MySecurePassword123!';
      const salt = await bcryptjs.genSalt(10);
      const hashed = await bcryptjs.hash(plainPassword, salt);

      expect(hashed).not.toBe(plainPassword);
      expect(hashed.length).toBeGreaterThan(50);
      expect(hashed.startsWith('$2')).toBe(true); // bcrypt hash prefix
    });

    it('should verify correct password', async () => {
      const plainPassword = 'MySecurePassword123!';
      const salt = await bcryptjs.genSalt(10);
      const hashed = await bcryptjs.hash(plainPassword, salt);

      const isValid = await bcryptjs.compare(plainPassword, hashed);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const plainPassword = 'MySecurePassword123!';
      const wrongPassword = 'WrongPassword456!';
      const salt = await bcryptjs.genSalt(10);
      const hashed = await bcryptjs.hash(plainPassword, salt);

      const isValid = await bcryptjs.compare(wrongPassword, hashed);
      expect(isValid).toBe(false);
    });

    it('should generate different hashes for same password', async () => {
      const plainPassword = 'SamePassword123!';
      const salt1 = await bcryptjs.genSalt(10);
      const hash1 = await bcryptjs.hash(plainPassword, salt1);

      const salt2 = await bcryptjs.genSalt(10);
      const hash2 = await bcryptjs.hash(plainPassword, salt2);

      expect(hash1).not.toBe(hash2);

      // Both should still verify correctly
      expect(await bcryptjs.compare(plainPassword, hash1)).toBe(true);
      expect(await bcryptjs.compare(plainPassword, hash2)).toBe(true);
    });
  });

  describe('JWT Token Generation', () => {
    const ACCESS_SECRET = 'test-access-secret-key-12345678';
    const REFRESH_SECRET = 'test-refresh-secret-key-12345678';

    it('should generate valid access token', () => {
      const payload = { userId: '507f1f77bcf86cd799439011', email: 'test@test.com' };
      const token = jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should decode token and return correct payload', () => {
      const payload = { userId: '507f1f77bcf86cd799439011', email: 'test@test.com' };
      const token = jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });

      const decoded = jwt.verify(token, ACCESS_SECRET) as any;

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });

    it('should reject token signed with wrong secret', () => {
      const payload = { userId: '507f1f77bcf86cd799439011' };
      const token = jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });

      expect(() => jwt.verify(token, 'wrong-secret')).toThrow();
    });

    it('should generate different tokens for access and refresh', () => {
      const payload = { userId: '507f1f77bcf86cd799439011' };
      const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
      const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });

      expect(accessToken).not.toBe(refreshToken);
    });

    it('should detect expired tokens', () => {
      const payload = { userId: '507f1f77bcf86cd799439011' };
      // Token that expires in 0 seconds (already expired)
      const token = jwt.sign(payload, ACCESS_SECRET, { expiresIn: 0 });

      expect(() => jwt.verify(token, ACCESS_SECRET)).toThrow(jwt.TokenExpiredError);
    });

    it('should reject malformed tokens', () => {
      expect(() => jwt.verify('not-a-valid-token', ACCESS_SECRET)).toThrow();
    });
  });

  describe('Password Validation Rules', () => {
    const isStrongPassword = (password: string): boolean => {
      if (password.length < 8) return false;
      if (!/[A-Z]/.test(password)) return false;
      if (!/[a-z]/.test(password)) return false;
      if (!/[0-9]/.test(password)) return false;
      return true;
    };

    it('should accept strong passwords', () => {
      expect(isStrongPassword('MyPassword1')).toBe(true);
      expect(isStrongPassword('Abc12345')).toBe(true);
      expect(isStrongPassword('LongPassword99')).toBe(true);
    });

    it('should reject short passwords', () => {
      expect(isStrongPassword('Ab1')).toBe(false);
      expect(isStrongPassword('Abcd1')).toBe(false);
    });

    it('should reject passwords without uppercase', () => {
      expect(isStrongPassword('mypassword1')).toBe(false);
    });

    it('should reject passwords without lowercase', () => {
      expect(isStrongPassword('MYPASSWORD1')).toBe(false);
    });

    it('should reject passwords without numbers', () => {
      expect(isStrongPassword('MyPassword')).toBe(false);
    });
  });
});

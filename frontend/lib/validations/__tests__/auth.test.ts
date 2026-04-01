import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  twoFactorSchema,
} from '../auth';

describe('Auth Validation Schemas', () => {
  // ─── loginSchema ────────────────────────────────────────────────────────────
  describe('loginSchema', () => {
    const valid = { email: 'user@company.com', password: 'password123' };

    it('accepts valid login data', () => {
      expect(loginSchema.safeParse(valid).success).toBe(true);
    });

    it('accepts optional rememberMe flag', () => {
      expect(loginSchema.safeParse({ ...valid, rememberMe: true }).success).toBe(true);
    });

    it('rejects empty email', () => {
      const r = loginSchema.safeParse({ ...valid, email: '' });
      expect(r.success).toBe(false);
    });

    it('rejects invalid email format', () => {
      const r = loginSchema.safeParse({ ...valid, email: 'not-an-email' });
      expect(r.success).toBe(false);
    });

    it('rejects empty password', () => {
      const r = loginSchema.safeParse({ ...valid, password: '' });
      expect(r.success).toBe(false);
    });

    it('rejects password shorter than 6 characters', () => {
      const r = loginSchema.safeParse({ ...valid, password: '12345' });
      expect(r.success).toBe(false);
    });

    it('accepts password of exactly 6 characters', () => {
      const r = loginSchema.safeParse({ ...valid, password: '123456' });
      expect(r.success).toBe(true);
    });
  });

  // ─── registerSchema ─────────────────────────────────────────────────────────
  describe('registerSchema', () => {
    const valid = {
      email: 'new@company.com',
      password: 'Password1',
      confirmPassword: 'Password1',
      firstName: 'Jane',
      lastName: 'Doe',
      acceptTerms: true,
    };

    it('accepts valid registration', () => {
      expect(registerSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects mismatched passwords', () => {
      const r = registerSchema.safeParse({ ...valid, confirmPassword: 'Different1' });
      expect(r.success).toBe(false);
    });

    it('rejects password without uppercase', () => {
      const r = registerSchema.safeParse({ ...valid, password: 'password1', confirmPassword: 'password1' });
      expect(r.success).toBe(false);
    });

    it('rejects password without lowercase', () => {
      const r = registerSchema.safeParse({ ...valid, password: 'PASSWORD1', confirmPassword: 'PASSWORD1' });
      expect(r.success).toBe(false);
    });

    it('rejects password without digit', () => {
      const r = registerSchema.safeParse({ ...valid, password: 'PasswordAbc', confirmPassword: 'PasswordAbc' });
      expect(r.success).toBe(false);
    });

    it('rejects password shorter than 8 characters', () => {
      const r = registerSchema.safeParse({ ...valid, password: 'Pass1', confirmPassword: 'Pass1' });
      expect(r.success).toBe(false);
    });

    it('rejects when terms not accepted', () => {
      const r = registerSchema.safeParse({ ...valid, acceptTerms: false });
      expect(r.success).toBe(false);
    });

    it('rejects empty first name', () => {
      const r = registerSchema.safeParse({ ...valid, firstName: '' });
      expect(r.success).toBe(false);
    });

    it('rejects empty last name', () => {
      const r = registerSchema.safeParse({ ...valid, lastName: '' });
      expect(r.success).toBe(false);
    });

    it('rejects first name exceeding 100 chars', () => {
      const r = registerSchema.safeParse({ ...valid, firstName: 'a'.repeat(101) });
      expect(r.success).toBe(false);
    });
  });

  // ─── forgotPasswordSchema ───────────────────────────────────────────────────
  describe('forgotPasswordSchema', () => {
    it('accepts valid email', () => {
      expect(forgotPasswordSchema.safeParse({ email: 'user@co.com' }).success).toBe(true);
    });

    it('rejects empty email', () => {
      expect(forgotPasswordSchema.safeParse({ email: '' }).success).toBe(false);
    });

    it('rejects invalid email', () => {
      expect(forgotPasswordSchema.safeParse({ email: 'bad' }).success).toBe(false);
    });
  });

  // ─── resetPasswordSchema ────────────────────────────────────────────────────
  describe('resetPasswordSchema', () => {
    const valid = {
      token: 'abc123-reset-token',
      password: 'NewPass1x',
      confirmPassword: 'NewPass1x',
    };

    it('accepts valid reset', () => {
      expect(resetPasswordSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects empty token', () => {
      const r = resetPasswordSchema.safeParse({ ...valid, token: '' });
      expect(r.success).toBe(false);
    });

    it('rejects mismatched passwords', () => {
      const r = resetPasswordSchema.safeParse({ ...valid, confirmPassword: 'Other1xx' });
      expect(r.success).toBe(false);
    });

    it('rejects weak password', () => {
      const r = resetPasswordSchema.safeParse({ ...valid, password: 'weak', confirmPassword: 'weak' });
      expect(r.success).toBe(false);
    });
  });

  // ─── changePasswordSchema ───────────────────────────────────────────────────
  describe('changePasswordSchema', () => {
    const valid = {
      currentPassword: 'OldPass1',
      newPassword: 'NewPass1x',
      confirmNewPassword: 'NewPass1x',
    };

    it('accepts valid change', () => {
      expect(changePasswordSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects when new password equals current password', () => {
      const r = changePasswordSchema.safeParse({
        ...valid,
        newPassword: 'OldPass1',
        confirmNewPassword: 'OldPass1',
      });
      expect(r.success).toBe(false);
    });

    it('rejects mismatched new passwords', () => {
      const r = changePasswordSchema.safeParse({ ...valid, confirmNewPassword: 'Different1' });
      expect(r.success).toBe(false);
    });

    it('rejects empty current password', () => {
      const r = changePasswordSchema.safeParse({ ...valid, currentPassword: '' });
      expect(r.success).toBe(false);
    });
  });

  // ─── twoFactorSchema ───────────────────────────────────────────────────────
  describe('twoFactorSchema', () => {
    it('accepts valid 6-digit code', () => {
      expect(twoFactorSchema.safeParse({ code: '123456' }).success).toBe(true);
    });

    it('rejects code shorter than 6 digits', () => {
      expect(twoFactorSchema.safeParse({ code: '12345' }).success).toBe(false);
    });

    it('rejects code longer than 6 digits', () => {
      expect(twoFactorSchema.safeParse({ code: '1234567' }).success).toBe(false);
    });

    it('rejects non-numeric code', () => {
      expect(twoFactorSchema.safeParse({ code: 'abcdef' }).success).toBe(false);
    });

    it('rejects code with spaces', () => {
      expect(twoFactorSchema.safeParse({ code: '12 456' }).success).toBe(false);
    });
  });
});
